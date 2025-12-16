# app/routers/inscriptions_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc
from datetime import date
from typing import List, Optional

from app.database import get_db
from app.models import (
    DossierInscription, 
    Inscription, 
    InscriptionSemestre, 
    Etudiant,
    Semestre,
    Niveau,
    Parcours,
    Mention,
    AnneeUniversitaire
)
from app.schemas.inscriptions_schemas import InscriptionCreatePayload, InscriptionResponse

router = APIRouter(prefix="/inscriptions", tags=["Dossiers d'Inscription"])

# ==============================================================================
# GET : Récupérer la liste des inscrits (Affichage Panneau Droite)
# ==============================================================================
@router.get("/")
def get_inscriptions_list(
    annee_id: str = Query(...),
    mention_id: Optional[str] = Query(None),
    parcours_id: Optional[str] = Query(None),
    niveau_id: Optional[str] = Query(None),
    semestre_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Récupère les inscriptions pédagogiques (table 'Inscription') 
    qui contiennent les infos de Niveau et Parcours.
    """
    
    # 1. On interroge la table Inscription (c'est elle qui porte Niveau et Parcours)
    query = db.query(Inscription)

    # 2. Jointures obligatoires pour filtrer et charger les données
    query = query.join(Inscription.dossier_inscription) # Lien vers le dossier (Mention/Etudiant)
    
    # 3. Chargement optimisé (Eager Loading) pour éviter les requêtes N+1
    query = query.options(
        # Récupérer l'étudiant via le dossier
        joinedload(Inscription.dossier_inscription).joinedload(DossierInscription.etudiant),
        # Récupérer Niveau et Parcours (directement liés à Inscription)
        joinedload(Inscription.niveau),
        joinedload(Inscription.parcours),
        # Récupérer les semestres (via la table de liaison InscriptionSemestre)
        joinedload(Inscription.semestres).joinedload(InscriptionSemestre.semestre)
    )

    # 4. Filtres
    # Filtre Année (sur Inscription ou Dossier, ici Inscription est plus sûr)
    query = query.filter(Inscription.AnneeUniversitaire_id_fk == annee_id)
    
    # Filtre Mention (sur DossierInscription)
    if mention_id:
        query = query.filter(DossierInscription.Mention_id_fk == mention_id)

    # Filtres Pédagogiques (sur Inscription)
    if parcours_id:
        query = query.filter(Inscription.Parcours_id_fk == parcours_id)
    
    if niveau_id:
        query = query.filter(Inscription.Niveau_id_fk == niveau_id)

    # Filtre Semestre (Complexe car Many-to-Many via InscriptionSemestre)
    if semestre_id:
        query = query.join(Inscription.semestres).filter(
            InscriptionSemestre.Semestre_id_fk == semestre_id
        )

    # 5. Tri par Nom d'étudiant
    query = query.join(DossierInscription.etudiant).order_by(Etudiant.Etudiant_nom.asc())

    results = query.all()

    # 6. Transformation manuelle des données pour le Frontend
    # Cela évite les erreurs de sérialisation Pydantic complexes
    response_data = []
    
    for insc in results:
        # Correction ici : Utilisation de Semestre_code ou Semestre_numero
        semestres_labels = [
            s.semestre.Semestre_numero for s in insc.semestres if s.semestre
        ]
        semestre_str = ", ".join(semestres_labels) if semestres_labels else "—"

        dossier = insc.dossier_inscription
        etudiant = dossier.etudiant

        response_data.append({
            "id": insc.Inscription_id,
            "DossierInscription_id": dossier.DossierInscription_id,
            "matricule": dossier.DossierInscription_numero,
            "etudiant_nom": etudiant.Etudiant_nom,
            "etudiant_prenom": etudiant.Etudiant_prenoms,
            "niveau_label": insc.niveau.Niveau_label if insc.niveau else "",
            "parcours_label": insc.parcours.Parcours_label if insc.parcours else "",
            "semestre_label": semestre_str
        })

    return response_data


# ==============================================================================
# POST : Inscription en masse
# ==============================================================================
@router.post("/bulk", response_model=InscriptionResponse)
def create_bulk_dossiers(payload: InscriptionCreatePayload, db: Session = Depends(get_db)):
    
    # 1. Vérifications
    mention = db.query(Mention).filter(Mention.Mention_id == payload.mention_id).first()
    annee = db.query(AnneeUniversitaire).filter(AnneeUniversitaire.AnneeUniversitaire_id == payload.annee_id).first()
    semestre = db.query(Semestre).filter(Semestre.Semestre_id == payload.semestre_id).first()

    if not mention or not annee:
        raise HTTPException(status_code=404, detail="Mention ou Année introuvable.")

    # 2. Génération ID Dossier (Séquence)
    annee_label = annee.AnneeUniversitaire_annee
    yy = annee_label.split("-")[-1][-2:] if annee_label and "-" in annee_label else annee_label[-2:]
    abbr = mention.Mention_abbreviation or mention.Mention_code or "UNK"
    prefix_numero = f"{yy}{abbr}_"

    last_dossier = db.query(DossierInscription).filter(
        DossierInscription.DossierInscription_numero.like(f"{prefix_numero}%")
    ).order_by(desc(DossierInscription.DossierInscription_numero)).first()

    current_sequence = 0
    if last_dossier and last_dossier.DossierInscription_numero:
        try:
            num_part = last_dossier.DossierInscription_numero.split("_")[-1]
            current_sequence = int(num_part)
        except ValueError:
            current_sequence = 0

    students_newly_registered = 0
    students_already_registered = 0

    try:
        for etu_id in payload.etudiants_ids:
            
            # --- A. GESTION DU DOSSIER (Administratif) ---
            # Un dossier est unique par Etudiant + Mention + Année
            dossier_id = f"{etu_id}_{payload.mention_id}_{payload.annee_id}"
            
            dossier = db.query(DossierInscription).filter(
                DossierInscription.DossierInscription_id == dossier_id
            ).first()

            if not dossier:
                # Création du dossier si inexistant
                current_sequence += 1
                numero_final = f"{prefix_numero}{str(current_sequence).zfill(5)}"
                
                dossier = DossierInscription(
                    DossierInscription_id=dossier_id,
                    Etudiant_id_fk=etu_id,
                    Mention_id_fk=payload.mention_id,
                    DossierInscription_numero=numero_final,
                    DossierInscription_date_creation=date.today()
                )
                db.add(dossier)
                db.flush() # Pour avoir l'ID disponible tout de suite

            # --- B. GESTION DE L'INSCRIPTION (Pédagogique) ---
            # Une inscription est unique par Dossier + Année + Parcours + Niveau
            # ID composite pour éviter doublons : DossierID_ParcoursID_NiveauID
            inscription_id = f"{dossier_id}_{payload.parcours_id}_{payload.niveau_id}"
            
            inscription = db.query(Inscription).filter(
                Inscription.Inscription_id == inscription_id
            ).first()

            if not inscription:
                inscription = Inscription(
                    Inscription_id=inscription_id,
                    DossierInscription_id_fk=dossier.DossierInscription_id,
                    AnneeUniversitaire_id_fk=payload.annee_id,
                    Parcours_id_fk=payload.parcours_id,
                    Niveau_id_fk=payload.niveau_id,
                    ModeInscription_id_fk=payload.mode_inscription_id,
                    Inscription_date=date.today()
                )
                db.add(inscription)
                db.flush()
                students_newly_registered += 1
            else:
                students_already_registered += 1

            # --- C. GESTION DES SEMESTRES (Détail) ---
            # On ajoute le semestre s'il n'est pas déjà lié à cette inscription
            sem_link_id = f"{inscription.Inscription_id}_{payload.semestre_id}"
            existing_sem = db.query(InscriptionSemestre).filter(
                InscriptionSemestre.InscriptionSemestre_id == sem_link_id
            ).first()

            if not existing_sem:
                new_sem_link = InscriptionSemestre(
                    InscriptionSemestre_id=sem_link_id,
                    Inscription_id_fk=inscription.Inscription_id,
                    Semestre_id_fk=payload.semestre_id,
                    InscriptionSemestre_statut='INSCRIT'
                )
                db.add(new_sem_link)

        db.commit()
        
        return {
            "success": True, 
            "message": "Inscriptions traitées", 
            "inscrits_count": students_newly_registered
        }

    except Exception as e:
        db.rollback()
        print(f"Erreur SQL: {str(e)}") # Log serveur pour debug
        raise HTTPException(status_code=500, detail=str(e))