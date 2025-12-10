from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_ # <--- IMPORTANT : Pour le OU logique dans la recherche
from typing import List, Optional
import uuid

# ... vos imports existants (database, models, schemas) ...
from ..database import get_db 
from .. import models 
from ..schemas import users as schemas

router = APIRouter(tags=["Ressources Humaines"])

# =================================================================
# --- GESTION DES ÉTUDIANTS ---
# =================================================================

# On change le response_model pour utiliser le schéma paginé défini dans users.py
@router.get("/etudiants", response_model=schemas.EtudiantPaginatedResponse)
def get_etudiants(
    skip: int = 0, 
    limit: int = 10, 
    search: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    # On charge l'inscription ET l'année universitaire
    query = db.query(models.Etudiant).options(
        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.annee_univ), # Important pour afficher l'année
        
        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.parcours)
        .joinedload(models.Parcours.mention)
        .joinedload(models.Mention.composante)
        .joinedload(models.Composante.institution)
    )

    # ... (le reste de la logique de recherche, total_count et pagination reste inchangé) ...
    # 2. Application du filtre de recherche (si présent)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                models.Etudiant.Etudiant_nom.ilike(search_fmt),
                models.Etudiant.Etudiant_prenoms.ilike(search_fmt),
                models.Etudiant.Etudiant_numero_inscription.ilike(search_fmt)
            )
        )

    # 3. Calcul du total (avant la pagination)
    total_count = query.count()

    # 4. Application de la pagination
    etudiants = query.order_by(models.Etudiant.Etudiant_nom.asc()).offset(skip).limit(limit).all()

    # 5. Retour au format PaginatedResponse
    return {
        "total": total_count,
        "items": etudiants
    }

# Ancienne route: @router.post("/api/etudiants", ...), Nouvelle route:
@router.post("/etudiants", response_model=schemas.EtudiantSchema, status_code=status.HTTP_201_CREATED)
def create_etudiant(etudiant: schemas.EtudiantCreate, db: Session = Depends(get_db)):
    # ... (logique de création inchangée)
    # ...
    db_etudiant = models.Etudiant(Etudiant_id=new_id, **etudiant.model_dump(by_alias=True))
    try:
        db.add(db_etudiant)
        db.commit()
        db.refresh(db_etudiant)
        return db_etudiant
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur création étudiant: {str(e)}")

# Ancienne route: @router.put("/api/etudiants/{etudiant_id}", ...), Nouvelle route:
@router.put("/etudiants/{etudiant_id}", response_model=schemas.EtudiantSchema)
def update_etudiant(etudiant_id: str, etudiant_data: schemas.EtudiantCreate, db: Session = Depends(get_db)):
    # ... (logique de mise à jour inchangée)
    db_etudiant = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()
    if not db_etudiant:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    # ...
    try:
        # ... mise à jour des attributs ...
        db.commit()
        db.refresh(db_etudiant)
        return db_etudiant
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur modification")

# Ancienne route: @router.delete("/api/etudiants/{etudiant_id}", ...), Nouvelle route:
@router.delete("/etudiants/{etudiant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_etudiant(etudiant_id: str, db: Session = Depends(get_db)):
    # ... (logique de suppression inchangée)
    db_etudiant = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()
    if not db_etudiant:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    try:
        db.delete(db_etudiant)
        db.commit()
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer cet étudiant (données liées existantes ?)")

# =================================================================
# --- GESTION DES ENSEIGNANTS --- (CHEMIN CORRIGÉ)
# =================================================================

# Ancienne route: @router.get("/api/enseignants", ...), Nouvelle route:
@router.get("/enseignants", response_model=List[schemas.EnseignantSchema])
def get_enseignants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Récupérer la liste des enseignants"""
    enseignants = db.query(models.Enseignant).offset(skip).limit(limit).all()
    return enseignants

# Ancienne route: @router.post("/api/enseignants", ...), Nouvelle route:
@router.post("/enseignants", response_model=schemas.EnseignantSchema, status_code=status.HTTP_201_CREATED)
def create_enseignant(enseignant: schemas.EnseignantCreate, db: Session = Depends(get_db)):
    # ... (logique de création inchangée)
    new_id = str(uuid.uuid4())
    db_enseignant = models.Enseignant(Enseignant_id=new_id, **enseignant.model_dump(by_alias=True))
    try:
        db.add(db_enseignant)
        db.commit()
        db.refresh(db_enseignant)
        return db_enseignant
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur création enseignant")

# Ancienne route: @router.put("/api/enseignants/{enseignant_id}", ...), Nouvelle route:
@router.put("/enseignants/{enseignant_id}", response_model=schemas.EnseignantSchema)
def update_enseignant(enseignant_id: str, enseignant_data: schemas.EnseignantCreate, db: Session = Depends(get_db)):
    # ... (logique de mise à jour inchangée)
    db_enseignant = db.query(models.Enseignant).filter(models.Enseignant.Enseignant_id == enseignant_id).first()
    if not db_enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")
    # ...
    try:
        # ... mise à jour des attributs ...
        db.commit()
        db.refresh(db_enseignant)
        return db_enseignant
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur modification")

# Ancienne route: @router.delete("/api/enseignants/{enseignant_id}", ...), Nouvelle route:
@router.delete("/enseignants/{enseignant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enseignant(enseignant_id: str, db: Session = Depends(get_db)):
    # ... (logique de suppression inchangée)
    db_enseignant = db.query(models.Enseignant).filter(models.Enseignant.Enseignant_id == enseignant_id).first()
    if not db_enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")
    try:
        db.delete(db_enseignant)
        db.commit()
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer (données liées ?)")