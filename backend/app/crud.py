# app/crud.py

from sqlalchemy.orm import Session
from app import models, schemas # Assurez-vous que les imports sont corrects
from fastapi import HTTPException
from typing import Optional

# ----------------------------------------
# Opérations de lecture (Existantes)
# ----------------------------------------

# Récupérer une institution par son ID (clé primaire)
def get_institution_by_id(db: Session, institution_id: str):
    return db.query(models.Institution).filter(
        # Utilisation de l'attribut réel du modèle
        models.Institution.Institution_id == institution_id 
    ).first()

# Fonction utilitaire pour vérifier l'unicité du code
def get_institution_by_code(db: Session, institution_code: str):
    return db.query(models.Institution).filter(
        models.Institution.Institution_code == institution_code
    ).first()

# Récupérer toutes les composantes d'une institution (inchangée)
def get_composantes_by_institution_id(db: Session, institution_id: str):
    return db.query(models.Composante).filter(
        # Utilisation de la clé étrangère définie dans Composante
        models.Composante.Institution_id_fk == institution_id 
    ).all()

# Récupérer toutes les institutions
def get_institutions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Institution).offset(skip).limit(limit).all()


# ----------------------------------------
# Opération de CRÉATION (POST)
# ----------------------------------------

def create_institution(db: Session, institution: schemas.InstitutionCreate, logo_path: Optional[str] = None):
    
    # 1. Vérification de l'ID (pk)
    if get_institution_by_id(db, institution.id_institution):
        raise HTTPException(status_code=400, detail=f"L'Institution_id '{institution.id_institution}' existe déjà.")

    # 2. Vérification de l'unicité du Code
    if get_institution_by_code(db, institution.code):
        raise HTTPException(status_code=400, detail=f"Le code '{institution.code}' est déjà utilisé.")

    # 3. Vérification de l'unicité du Nom
    if db.query(models.Institution).filter(models.Institution.Institution_nom == institution.nom).first():
        raise HTTPException(status_code=400, detail=f"Une institution nommée '{institution.nom}' existe déjà.")

    # Création de l'objet
    db_institution = models.Institution(
        Institution_id=institution.id_institution,
        Institution_code=institution.code, # NOUVEAU : Champ code obligatoire
        Institution_nom=institution.nom,
        Institution_type=institution.type_institution,
        Institution_abbreviation=institution.abbreviation,
        Institution_description=institution.description,
        Institution_logo_path=logo_path
    )
    
    db.add(db_institution)
    db.commit()
    db.refresh(db_institution)
    return db_institution

# ----------------------------------------
# Opération de MISE À JOUR (PUT)
# ----------------------------------------

# ----------------------------------------
# Opération de MISE À JOUR (PUT)
# ----------------------------------------

def update_institution(db: Session, institution_id: str, institution_update: schemas.InstitutionUpdate, logo_path: Optional[str] = None):
    
    db_institution = get_institution_by_id(db, institution_id)
    if not db_institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée.")

    # 1. Vérification de l'unicité du Code (Exclut l'institution actuelle)
    existing_by_code = db.query(models.Institution).filter(
        models.Institution.Institution_code == institution_update.code,
        models.Institution.Institution_id != institution_id 
    ).first()
    
    if existing_by_code:
        raise HTTPException(
            status_code=400,
            detail=f"Le code '{institution_update.code}' est déjà utilisé par une autre institution."
        )

    # 2. Vérification de l'unicité du Nom (Exclut l'institution actuelle)
    existing_by_name = db.query(models.Institution).filter(
        models.Institution.Institution_nom == institution_update.nom,
        models.Institution.Institution_id != institution_id
    ).first()
    
    if existing_by_name:
        raise HTTPException(
            status_code=400,
            detail=f"Le nom '{institution_update.nom}' est déjà utilisé par une autre institution."
        )

    # 3. Mise à jour des champs
    # L'Institution_id n'est pas modifiée (clé primaire)
    db_institution.Institution_code = institution_update.code # Mise à jour du code
    db_institution.Institution_nom = institution_update.nom
    db_institution.Institution_type = institution_update.type_institution
    db_institution.Institution_abbreviation = institution_update.abbreviation
    db_institution.Institution_description = institution_update.description
    
    # 4. Logique de mise à jour du Logo 
    if logo_path is not None:
        db_institution.Institution_logo_path = logo_path
    elif institution_update.logo_path is not None:
        db_institution.Institution_logo_path = institution_update.logo_path

    # 5. Enregistrement des changements
    db.commit()
    db.refresh(db_institution)
    return db_institution

# ----------------------------------------
# Opération de SUPPRESSION (DELETE)
# ----------------------------------------

def delete_institution(db: Session, institution_id: str):
    db_institution = get_institution_by_id(db, institution_id)
    if not db_institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée.")
    
    # TODO: Vous pourriez vouloir ajouter une vérification pour s'assurer qu'il n'y a pas
    # de composantes ou d'autres entités liées (clés étrangères) avant de supprimer.

    db.delete(db_institution)
    db.commit()
    return {"detail": f"Institution {institution_id} supprimée avec succès."}