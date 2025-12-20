from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import Inscription, InscriptionSemestre, AnneeUniversitaire, DossierInscription

class InscriptionService:
    @staticmethod
    def determiner_regime_inscription(db: Session, etudiant_id: str, parcours_id: str, niveau_id: str, annee_actuelle_id: str) -> str:
        """
        Analyse l'historique pour déterminer si l'étudiant est PASSANT, REDOUBLANT ou TRIPLAN.
        """
        # 1. Récupérer l'ordre de l'année universitaire actuelle pour comparer
        annee_actuelle = db.query(AnneeUniversitaire).filter(
            AnneeUniversitaire.AnneeUniversitaire_id == annee_actuelle_id
        ).first()
        
        if not annee_actuelle:
            return "PASSANT"

        # 2. Compter les inscriptions précédentes au même niveau et parcours
        # On exclut l'inscription en cours de création (si elle existe déjà) 
        # et on ne regarde que les années avec un ordre inférieur ou égal
        nb_inscriptions_precedentes = db.query(Inscription).join(AnneeUniversitaire).filter(
            Inscription.DossierInscription_id_fk.in_(
                # Sous-requête pour obtenir les dossiers de l'étudiant
                db.query(DossierInscription.DossierInscription_id).filter(
                    DossierInscription.Etudiant_id_fk == etudiant_id
                )
            ),
            Inscription.Parcours_id_fk == parcours_id,
            Inscription.Niveau_id_fk == niveau_id,
            AnneeUniversitaire.AnneeUniversitaire_ordre < annee_actuelle.AnneeUniversitaire_ordre
        ).count()

        # 3. Logique de décision
        if nb_inscriptions_precedentes == 0:
            return "PASSANT"
        elif nb_inscriptions_precedentes == 1:
            return "REDOUBLANT"
        else:
            return "TRIPLAN"

    @staticmethod
    def inscrire_etudiant_au_semestre(db: Session, inscription_id: str, semestre_id: str):
        """
        Une fois l'inscription administrative faite, on l'inscrit aux semestres correspondants.
        """
        new_insc_sem = InscriptionSemestre(
            InscriptionSemestre_id=f"{inscription_id}_{semestre_id}",
            Inscription_id_fk=inscription_id,
            Semestre_id_fk=semestre_id,
            InscriptionSemestre_statut='INSCRIT'
        )
        db.add(new_insc_sem)
        db.commit()