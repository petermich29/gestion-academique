# app/services/notes_service.py
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models

class NotesService:

    @staticmethod
    def recalculer_tout(db: Session, inscription_semestre_id: str, session_id: str):
        """
        Fonction principale à appeler depuis la route.
        Elle recalcule TOUTES les UEs de ce semestre pour l'étudiant, 
        puis recalcule la moyenne générale du Semestre.
        """
        # 1. Récupérer l'inscription semestre pour avoir le contexte (Parcours, Semestre...)
        insc_sem = db.query(models.InscriptionSemestre).get(inscription_semestre_id)
        if not insc_sem:
            return

        inscription = insc_sem.inscription
        parcours_id = inscription.Parcours_id_fk
        annee_id = inscription.AnneeUniversitaire_id_fk
        semestre_id = insc_sem.Semestre_id_fk

        # 2. Récupérer toutes les Maquettes d'UE de ce semestre
        maquettes_ues = db.query(models.MaquetteUE).filter(
            models.MaquetteUE.Parcours_id_fk == parcours_id,
            models.MaquetteUE.Semestre_id_fk == semestre_id,
            models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
        ).all()

        total_points_semestre = 0.0
        total_credits_semestre = 0.0
        total_credits_acquis = 0.0

        # 3. Boucle sur chaque UE pour mettre à jour ResultatUE
        for mue in maquettes_ues:
            # A. Calcul de la moyenne de cette UE
            moyenne_ue = NotesService._calculer_moyenne_ue(db, inscription_semestre_id, mue.MaquetteUE_id, session_id)
            
            # B. Détermination validation UE (Exemple: >= 10)
            is_acquise = moyenne_ue >= 10.0
            credits_ue = float(mue.MaquetteUE_credit)
            credits_obtenus = credits_ue if is_acquise else 0.0

            # C. Sauvegarde ResultatUE
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
                    ResultatUE_moyenne=moyenne_ue,
                    ResultatUE_is_acquise=is_acquise,
                    ResultatUE_credit_obtenu=credits_obtenus
                )
                db.add(res_ue)
            else:
                res_ue.ResultatUE_moyenne = moyenne_ue
                res_ue.ResultatUE_is_acquise = is_acquise
                res_ue.ResultatUE_credit_obtenu = credits_obtenus

            # D. Accumulation pour le Semestre
            total_points_semestre += (moyenne_ue * credits_ue)
            total_credits_semestre += credits_ue
            total_credits_acquis += credits_obtenus

        # 4. Calcul Moyenne Semestre
        moyenne_semestre = 0.0
        if total_credits_semestre > 0:
            moyenne_semestre = total_points_semestre / total_credits_semestre
        
        moyenne_semestre = round(moyenne_semestre, 2)

        # 5. Sauvegarde ResultatSemestre
        statut_validation = "VAL" if moyenne_semestre >= 10 else "AJ" # Simplifié

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
    def _calculer_moyenne_ue(db: Session, insc_sem_id: str, mue_id: str, session_id: str) -> float:
        """
        Calcule la moyenne d'une UE spécifique pour une session donnée.
        """
        ecs = db.query(models.MaquetteEC).filter(models.MaquetteEC.MaquetteUE_id_fk == mue_id).all()
        
        if not ecs: 
            return 0.0

        somme_ponderee = 0.0
        somme_coeffs = 0.0

        for ec in ecs:
            coeff = float(ec.MaquetteEC_coefficient)
            
            # Récupère la note pour CETTE session précise
            note = db.query(models.Note).filter(
                models.Note.InscriptionSemestre_id_fk == insc_sem_id,
                models.Note.MaquetteEC_id_fk == ec.MaquetteEC_id,
                models.Note.SessionExamen_id_fk == session_id
            ).first()

            valeur = float(note.Note_valeur) if (note and note.Note_valeur is not None) else 0.0
            
            somme_ponderee += (valeur * coeff)
            somme_coeffs += coeff

        if somme_coeffs == 0:
            return 0.0

        return round(somme_ponderee / somme_coeffs, 2)
    
    @staticmethod
    def recalculer_semestre(db: Session, inscription_semestre_id: str, session_id: str):
        """
        Recalcule la moyenne générale du semestre basée sur les résultats des UEs déjà calculés.
        """
        # 1. Récupérer tous les résultats d'UE validés pour ce semestre/session
        resultats_ues = db.query(ResultatUE).filter(
            ResultatUE.InscriptionSemestre_id_fk == inscription_semestre_id,
            ResultatUE.SessionExamen_id_fk == session_id
        ).all()

        total_points = 0.0
        total_credits = 0.0
        total_credits_acquis = 0.0

        for res_ue in resultats_ues:
            # Récupérer les infos de la maquette UE pour avoir les crédits
            maquette_ue = db.query(models.MaquetteUE).get(res_ue.MaquetteUE_id_fk)
            if maquette_ue:
                credit = float(maquette_ue.MaquetteUE_credit)
                moyenne_ue = float(res_ue.ResultatUE_moyenne)
                
                total_points += (moyenne_ue * credit)
                total_credits += credit
                total_credits_acquis += float(res_ue.ResultatUE_credit_obtenu)

        # 2. Calcul Moyenne Semestre
        moyenne_semestre = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
        statut = "VAL" if moyenne_semestre >= 10 else "AJ"

        # 3. Sauvegarde ResultatSemestre
        res_sem = db.query(models.ResultatSemestre).filter(
            models.ResultatSemestre.InscriptionSemestre_id_fk == inscription_semestre_id,
            models.ResultatSemestre.SessionExamen_id_fk == session_id
        ).first()

        if not res_sem:
            res_sem = models.ResultatSemestre(
                ResultatSemestre_id=f"SEM-{uuid.uuid4().hex[:8]}", # Ou votre format d'ID
                InscriptionSemestre_id_fk=inscription_semestre_id,
                SessionExamen_id_fk=session_id
            )
            db.add(res_sem)
        
        res_sem.ResultatSemestre_moyenne_obtenue = moyenne_semestre
        res_sem.ResultatSemestre_statut_validation = statut
        res_sem.ResultatSemestre_credits_acquis = total_credits_acquis