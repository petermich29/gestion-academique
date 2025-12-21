# app/services/notes_service.py
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app import models

class NotesService:

    @staticmethod
    def recalculer_tout(db: Session, inscription_semestre_id: str, session_id: str):
        """
        Recalcule TOUTES les UEs puis le Semestre pour une session donnée.
        Gère la logique LMD : 
        - Conservation des UE acquises en Session 1.
        - Règle du MAX(Note S1, Note S2) pour les EC des UE non acquises.
        """
        # 1. Contexte
        insc_sem = db.query(models.InscriptionSemestre).get(inscription_semestre_id)
        if not insc_sem:
            return

        inscription = insc_sem.inscription
        parcours_id = inscription.Parcours_id_fk
        annee_id = inscription.AnneeUniversitaire_id_fk
        semestre_id = insc_sem.Semestre_id_fk

        # 2. Récupérer les Maquettes d'UE
        maquettes_ues = db.query(models.MaquetteUE).filter(
            models.MaquetteUE.Parcours_id_fk == parcours_id,
            models.MaquetteUE.Semestre_id_fk == semestre_id,
            models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
        ).all()

        total_points_semestre = 0.0
        total_credits_semestre = 0.0
        total_credits_acquis = 0.0

        # Identifiants des sessions (pour comparer S1 et S2)
        # Note : On suppose ici que les codes sont standards "SESS_1" et "SESS_2"
        # Si vos IDs en base sont différents, il faut adapter cette logique.
        IS_SESSION_RATTRAPAGE = (session_id == "SESS_2")
        ID_SESSION_NORMALE = "SESS_1" 

        # 3. Boucle sur chaque UE
        for mue in maquettes_ues:
            moyenne_finale_ue = 0.0
            is_acquise = False
            
            credits_ue = float(mue.MaquetteUE_credit)

            # --- LOGIQUE LMD : GESTION SESSION 2 & UE DÉJÀ ACQUISE ---
            calculer_nouveau = True
            
            if IS_SESSION_RATTRAPAGE:
                # Vérifier si l'UE a été validée en Session 1
                res_ue_s1 = db.query(models.ResultatUE).filter(
                    models.ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.ResultatUE.MaquetteUE_id_fk == mue.MaquetteUE_id,
                    models.ResultatUE.SessionExamen_id_fk == ID_SESSION_NORMALE
                ).first()

                if res_ue_s1 and res_ue_s1.ResultatUE_is_acquise:
                    # CAS 1 : UE déjà acquise en S1 => On conserve la note S1
                    moyenne_finale_ue = float(res_ue_s1.ResultatUE_moyenne)
                    is_acquise = True
                    calculer_nouveau = False # Pas besoin de recalculer les ECs
            
            if calculer_nouveau:
                # CAS 2 : Calcul normal ou Recalcul avec règle du MAX
                moyenne_finale_ue = NotesService._calculer_moyenne_ue(
                    db, inscription_semestre_id, mue.MaquetteUE_id, session_id, ID_SESSION_NORMALE
                )
                is_acquise = moyenne_finale_ue >= 10.0

            credits_obtenus = credits_ue if is_acquise else 0.0

            # C. Sauvegarde ResultatUE pour la session EN COURS (session_id)
            res_ue = db.query(models.ResultatUE).filter(
                models.ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
                models.ResultatUE.MaquetteUE_id_fk == mue.MaquetteUE_id,
                models.ResultatUE.SessionExamen_id_fk == session_id
            ).first()

            if not res_ue:
                res_ue = models.ResultatUE(
                    ResultatUE_id=f"RESUE_{uuid.uuid4().hex[:10].upper()}",
                    InscriptionSemestre_id_fk=inscription_semestre_id,
                    MaquetteUE_id_fk=mue.MaquetteUE_id,
                    SessionExamen_id_fk=session_id,
                    ResultatUE_moyenne=moyenne_finale_ue,
                    ResultatUE_is_acquise=is_acquise,
                    ResultatUE_credit_obtenu=credits_obtenus
                )
                db.add(res_ue)
            else:
                res_ue.ResultatUE_moyenne = moyenne_finale_ue
                res_ue.ResultatUE_is_acquise = is_acquise
                res_ue.ResultatUE_credit_obtenu = credits_obtenus

            # D. Accumulation pour le Semestre (On utilise les résultats calculés ou reportés)
            total_points_semestre += (moyenne_finale_ue * credits_ue)
            total_credits_semestre += credits_ue
            total_credits_acquis += credits_obtenus

        # 4. Calcul Moyenne Semestre
        moyenne_semestre = 0.0
        if total_credits_semestre > 0:
            moyenne_semestre = total_points_semestre / total_credits_semestre
        
        moyenne_semestre = round(moyenne_semestre, 2)

        # 5. Sauvegarde ResultatSemestre
        # Simplification validation semestre : Moyenne >= 10 OU tous crédits acquis
        statut_validation = "VAL" if moyenne_semestre >= 10 else "AJ"

        res_sem = db.query(models.ResultatSemestre).filter(
            models.ResultatSemestre.InscriptionSemestre_id_fk == inscription_semestre_id,
            models.ResultatSemestre.SessionExamen_id_fk == session_id
        ).first()

        if not res_sem:
            res_sem = models.ResultatSemestre(
                ResultatSemestre_id=f"RESSEM_{uuid.uuid4().hex[:10].upper()}",
                InscriptionSemestre_id_fk=inscription_semestre_id,
                SessionExamen_id_fk=session_id,
                ResultatSemestre_statut_validation=statut_validation,
                ResultatSemestre_moyenne_obtenue=moyenne_semestre,
                ResultatSemestre_credits_acquis=total_credits_acquis
            )
            db.add(res_sem)
        else:
            res_sem.ResultatSemestre_moyenne_obtenue = moyenne_semestre
            res_sem.ResultatSemestre_statut_validation = statut_validation
            res_sem.ResultatSemestre_credits_acquis = total_credits_acquis

    @staticmethod
    def _calculer_moyenne_ue(db: Session, insc_sem_id: str, mue_id: str, session_actuelle_id: str, session_normale_id: str) -> float:
        """
        Calcule la moyenne d'une UE.
        - Si Session 1 : Moyenne pondérée classique.
        - Si Session 2 : Moyenne pondérée utilisant MAX(Note_S1, Note_S2) pour chaque EC.
        """
        ecs = db.query(models.MaquetteEC).filter(models.MaquetteEC.MaquetteUE_id_fk == mue_id).all()
        
        if not ecs: 
            return 0.0

        somme_ponderee = 0.0
        somme_coeffs = 0.0
        
        is_rattrapage = (session_actuelle_id == "SESS_2")

        for ec in ecs:
            coeff = float(ec.MaquetteEC_coefficient)
            
            # 1. Récupérer note Session Actuelle (ex: Rattrapage)
            note_actuelle_obj = db.query(models.Note).filter(
                models.Note.InscriptionSemestre_id_fk == insc_sem_id,
                models.Note.MaquetteEC_id_fk == ec.MaquetteEC_id,
                models.Note.SessionExamen_id_fk == session_actuelle_id
            ).first()
            val_actuelle = float(note_actuelle_obj.Note_valeur) if (note_actuelle_obj and note_actuelle_obj.Note_valeur is not None) else 0.0
            
            valeur_retenue = val_actuelle

            # 2. Si Rattrapage, comparer avec Session Normale (Règle du MAX)
            if is_rattrapage:
                note_s1_obj = db.query(models.Note).filter(
                    models.Note.InscriptionSemestre_id_fk == insc_sem_id,
                    models.Note.MaquetteEC_id_fk == ec.MaquetteEC_id,
                    models.Note.SessionExamen_id_fk == session_normale_id
                ).first()
                val_s1 = float(note_s1_obj.Note_valeur) if (note_s1_obj and note_s1_obj.Note_valeur is not None) else 0.0
                
                # LA REGLE CLÉ : On garde la meilleure note
                valeur_retenue = max(val_s1, val_actuelle)

            somme_ponderee += (valeur_retenue * coeff)
            somme_coeffs += coeff

        if somme_coeffs == 0:
            return 0.0

        return round(somme_ponderee / somme_coeffs, 2)