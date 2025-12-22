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
        - Nettoyage automatique des données de rattrapage (C1 et C2).
        """
        # 1. Contexte
        insc_sem = db.query(models.InscriptionSemestre).get(inscription_semestre_id)
        if not insc_sem:
            return

        inscription = insc_sem.inscription
        parcours_id = inscription.Parcours_id_fk
        annee_id = inscription.AnneeUniversitaire_id_fk
        semestre_id = insc_sem.Semestre_id_fk

        # --- Check existant pour Rattrapage (inchangé) ---
        if session_id == "SESS_2":
            count_notes_rattrapage = db.query(models.Note).filter(
                models.Note.InscriptionSemestre_id_fk == inscription_semestre_id,
                models.Note.SessionExamen_id_fk == "SESS_2"
            ).count()

            if count_notes_rattrapage == 0:
                existing_res = db.query(models.ResultatSemestre).filter(
                    models.ResultatSemestre.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.ResultatSemestre.SessionExamen_id_fk == "SESS_2"
                ).first()
                if existing_res:
                    db.delete(existing_res)
                return

        # 2. Récupérer les Maquettes d'UE
        maquettes_ues = db.query(models.MaquetteUE).filter(
            models.MaquetteUE.Parcours_id_fk == parcours_id,
            models.MaquetteUE.Semestre_id_fk == semestre_id,
            models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
        ).all()

        total_points_semestre = 0.0
        total_credits_semestre = 0.0
        total_credits_acquis = 0.0

        ID_SESSION_NORMALE = "SESS_1" 
        IS_SESSION_RATTRAPAGE = (session_id == "SESS_2")

        # ### MODIF 1 : Liste pour stocker les résultats calculés (nécessaire pour C1)
        resultats_ue_calcules = []

        # 3. Boucle sur chaque UE
        for mue in maquettes_ues:
            moyenne_finale_ue = 0.0
            is_acquise = False
            
            credits_ue = float(mue.MaquetteUE_credit)
            calculer_nouveau = True
            
            if IS_SESSION_RATTRAPAGE:
                res_ue_s1 = db.query(models.ResultatUE).filter(
                    models.ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.ResultatUE.MaquetteUE_id_fk == mue.MaquetteUE_id,
                    models.ResultatUE.SessionExamen_id_fk == ID_SESSION_NORMALE
                ).first()

                if res_ue_s1 and res_ue_s1.ResultatUE_is_acquise:
                    moyenne_finale_ue = float(res_ue_s1.ResultatUE_moyenne)
                    is_acquise = True
                    calculer_nouveau = False 
            
            if calculer_nouveau:
                moyenne_finale_ue = NotesService._calculer_moyenne_ue(
                    db, inscription_semestre_id, mue.MaquetteUE_id, session_id, ID_SESSION_NORMALE
                )
                is_acquise = moyenne_finale_ue >= 10.0

            credits_obtenus = credits_ue if is_acquise else 0.0

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
            
            # ### MODIF 2 : On ajoute l'objet à notre liste temporaire
            resultats_ue_calcules.append(res_ue)

            total_points_semestre += (moyenne_finale_ue * credits_ue)
            total_credits_semestre += credits_ue
            total_credits_acquis += credits_obtenus

        # 4. Calcul Moyenne Semestre
        moyenne_semestre = 0.0
        if total_credits_semestre > 0:
            moyenne_semestre = total_points_semestre / total_credits_semestre
        
        moyenne_semestre = round(moyenne_semestre, 2)
        statut_validation = "VAL" if total_credits_acquis >= 30 else "AJ"

        # 5. Sauvegarde ResultatSemestre
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

        # ### MODIF 3 : IMPORTANT - On valide les changements en mémoire avant le nettoyage
        db.flush() 

        # ==============================================================================
        #  NETTOYAGE AUTOMATIQUE (C1 & C2) - Uniquement déclenché sur modif Session 1
        # ==============================================================================
        if session_id == "SESS_1":
            
            # --- Condition C2 : Si le semestre est validé (VAL) en S1 ---
            # Action : Supprimer TOUT (Résultats Semestre, Résultats UE, Notes EC) en Session 2
            if res_sem.ResultatSemestre_statut_validation == "VAL":
                
                # Suppr Notes EC Session 2
                db.query(models.Note).filter(
                    models.Note.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.Note.SessionExamen_id_fk == "SESS_2"
                ).delete()

                # Suppr Résultats UE Session 2
                db.query(models.ResultatUE).filter(
                    models.ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.ResultatUE.SessionExamen_id_fk == "SESS_2"
                ).delete()

                # Suppr Résultat Semestre Session 2
                db.query(models.ResultatSemestre).filter(
                    models.ResultatSemestre.InscriptionSemestre_id_fk == inscription_semestre_id,
                    models.ResultatSemestre.SessionExamen_id_fk == "SESS_2"
                ).delete()

            # --- Condition C1 : Si semestre non validé, on regarde UE par UE ---
            else:
                for res_ue_s1 in resultats_ue_calcules:
                    # Si l'UE est acquise en Session 1
                    if res_ue_s1.ResultatUE_is_acquise:
                        ue_id = res_ue_s1.MaquetteUE_id_fk
                        
                        # Suppr Résultat UE en Session 2
                        db.query(models.ResultatUE).filter(
                            models.ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
                            models.ResultatUE.MaquetteUE_id_fk == ue_id,
                            models.ResultatUE.SessionExamen_id_fk == "SESS_2"
                        ).delete()

                        # Suppr Notes EC en Session 2 liées à cette UE
                        # On récupère d'abord les IDs des EC de cette UE
                        ecs_subquery = db.query(models.MaquetteEC.MaquetteEC_id).filter(
                            models.MaquetteEC.MaquetteUE_id_fk == ue_id
                        ).subquery()

                        db.query(models.Note).filter(
                            models.Note.InscriptionSemestre_id_fk == inscription_semestre_id,
                            models.Note.SessionExamen_id_fk == "SESS_2",
                            models.Note.MaquetteEC_id_fk.in_(ecs_subquery)
                        ).delete(synchronize_session=False)

    @staticmethod
    def _calculer_moyenne_ue(db: Session, insc_sem_id: str, mue_id: str, session_actuelle_id: str, session_normale_id: str) -> float:
        """
        Calcule la moyenne d'une UE.
        (Code inchangé)
        """
        ecs = db.query(models.MaquetteEC).filter(models.MaquetteEC.MaquetteUE_id_fk == mue_id).all()
        
        if not ecs: 
            return 0.0

        somme_ponderee = 0.0
        somme_coeffs = 0.0
        
        is_rattrapage = (session_actuelle_id == "SESS_2")

        for ec in ecs:
            coeff = float(ec.MaquetteEC_coefficient)
            
            # Note Actuelle
            note_actuelle_obj = db.query(models.Note).filter(
                models.Note.InscriptionSemestre_id_fk == insc_sem_id,
                models.Note.MaquetteEC_id_fk == ec.MaquetteEC_id,
                models.Note.SessionExamen_id_fk == session_actuelle_id
            ).first()
            val_actuelle = float(note_actuelle_obj.Note_valeur) if (note_actuelle_obj and note_actuelle_obj.Note_valeur is not None) else 0.0
            
            valeur_retenue = val_actuelle

            # Règle du MAX pour rattrapage
            if is_rattrapage:
                note_s1_obj = db.query(models.Note).filter(
                    models.Note.InscriptionSemestre_id_fk == insc_sem_id,
                    models.Note.MaquetteEC_id_fk == ec.MaquetteEC_id,
                    models.Note.SessionExamen_id_fk == session_normale_id
                ).first()
                val_s1 = float(note_s1_obj.Note_valeur) if (note_s1_obj and note_s1_obj.Note_valeur is not None) else 0.0
                
                if note_actuelle_obj is None or note_actuelle_obj.Note_valeur is None:
                    valeur_retenue = val_s1
                else:
                    valeur_retenue = max(val_s1, val_actuelle)

            somme_ponderee += (valeur_retenue * coeff)
            somme_coeffs += coeff

        if somme_coeffs == 0:
            return 0.0

        return round(somme_ponderee / somme_coeffs, 2)