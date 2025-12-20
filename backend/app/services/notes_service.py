from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Note, MaquetteEC, ResultatUE #

class NotesService:
    @staticmethod
    def calculer_moyenne_ue_meilleure_note(db: Session, inscription_semestre_id: str, maquette_ue_id: str):
        """
        Calcule la moyenne d'une UE en prenant la note MAX entre 
        Session Normale et Rattrapage pour chaque EC.
        """
        # 1. Récupérer tous les EC appartenant à cette UE dans la maquette
        ecs = db.query(MaquetteEC).filter(MaquetteEC.MaquetteUE_id_fk == maquette_ue_id).all() #
        
        if not ecs:
            return 0.0

        total_points = 0.0
        total_coefficients = 0.0
        
        for ec in ecs:
            # 2. Chercher la meilleure note pour cet EC (SN ou RAT)
            # La table 'notes' contient plusieurs entrées si l'étudiant a fait le rattrapage
            meilleure_note = db.query(func.max(Note.Note_valeur)).filter(
                Note.InscriptionSemestre_id_fk == inscription_semestre_id,
                Note.MaquetteEC_id_fk == ec.MaquetteEC_id
            ).scalar() #
            
            # Si pas de note, on considère 0 par défaut
            valeur_note = float(meilleure_note) if meilleure_note is not None else 0.0
            
            # 3. Pondération par le coefficient de l'EC défini dans la maquette
            total_points += (valeur_note * float(ec.MaquetteEC_coefficient)) #
            total_coefficients += float(ec.MaquetteEC_coefficient) #

        if total_coefficients == 0:
            return 0.0
            
        return round(total_points / total_coefficients, 2)
    
    @staticmethod
    def enregistrer_resultat_ue(db: Session, inscription_semestre_id: str, maquette_ue_id: str, session_id: str):
        # Calcul de la moyenne avec la règle de la meilleure note
        moyenne = NotesService.calculer_moyenne_ue_meilleure_note(db, inscription_semestre_id, maquette_ue_id)
        
        # Détermination de l'acquisition (ex: moyenne >= 10)
        est_acquise = moyenne >= 10.0
        
        # Création ou mise à jour du résultat dans la table resultats_ue
        nouveau_resultat = ResultatUE(
            ResultatUE_id=f"RES-{inscription_semestre_id}-{maquette_ue_id}-{session_id}",
            InscriptionSemestre_id_fk=inscription_semestre_id,
            MaquetteUE_id_fk=maquette_ue_id,
            SessionExamen_id_fk=session_id,
            ResultatUE_moyenne=moyenne,
            ResultatUE_is_acquise=est_acquise
        ) #
        
        db.merge(nouveau_resultat) # merge crée ou met à jour si l'ID existe
        db.commit()
        return nouveau_resultat