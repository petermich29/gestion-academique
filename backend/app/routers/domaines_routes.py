# app/routers/domaines_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import re

from app.models import Domaine
from app.schemas import DomaineSchema
from app.database import get_db

router = APIRouter(
    prefix="/domaines",
    tags=["Domaines"],
)

# --- UTILS : Génération ID (DOMA_XX) ---
ID_PREFIX = "DOMA_"
ID_REGEX = re.compile(r"DOMA_(\d+)")

def get_next_domaine_id(db: Session) -> str:
    """Génère le prochain ID sous la forme DOMA_01, DOMA_02..."""
    existing_ids = db.query(Domaine.Domaine_id).all()
    used_numbers = []
    
    for (id_str,) in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match[1]))
    
    if not used_numbers:
        return f"{ID_PREFIX}01"

    used_numbers.sort()
    # Trouver le premier trou ou prendre le max + 1
    next_num = 1
    for num in used_numbers:
        if num == next_num:
            next_num += 1
        elif num > next_num:
            break
    
    # Formatage sur 2 chiffres (01, 02, ..., 99)
    return f"{ID_PREFIX}{str(next_num).zfill(2)}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_id(db: Session = Depends(get_db)):
    return get_next_domaine_id(db)

@router.get("/", response_model=List[DomaineSchema])
def get_domaines(db: Session = Depends(get_db)):
    """Liste tous les domaines disponibles."""
    return db.query(Domaine).all()

@router.post("/", response_model=DomaineSchema)
def create_domaine(
    code: str = Form(..., description="Code court unique (ex: ST)"),
    label: str = Form(..., description="Libellé complet (ex: Sciences et Technologies)"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Créer un nouveau domaine."""
    clean_code = code.strip().upper()
    
    # Vérification unicité du code
    if db.query(Domaine).filter(Domaine.Domaine_code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"Le code domaine '{clean_code}' existe déjà.")
    
    # Vérification unicité du label
    if db.query(Domaine).filter(Domaine.Domaine_label == label.strip()).first():
        raise HTTPException(status_code=400, detail=f"Le domaine '{label}' existe déjà.")

    new_id = get_next_domaine_id(db)
    
    domaine = Domaine(
        Domaine_id=new_id,
        Domaine_code=clean_code,
        Domaine_label=label.strip(),
        Domaine_description=description
    )
    
    try:
        db.add(domaine)
        db.commit()
        db.refresh(domaine)
        return domaine
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur d'intégrité lors de la création.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id_domaine}", response_model=DomaineSchema)
def update_domaine(
    id_domaine: str,
    code: str = Form(...),
    label: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Mettre à jour un domaine existant."""
    domaine = db.query(Domaine).filter(Domaine.Domaine_id == id_domaine).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine introuvable")

    clean_code = code.strip().upper()

    # Vérification unicité Code (si changé)
    if clean_code != domaine.Domaine_code:
        if db.query(Domaine).filter(Domaine.Domaine_code == clean_code).first():
            raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' est déjà utilisé.")

    domaine.Domaine_code = clean_code
    domaine.Domaine_label = label.strip()
    domaine.Domaine_description = description

    try:
        db.commit()
        db.refresh(domaine)
        return domaine
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur de mise à jour (doublon possible).")

@router.delete("/{id_domaine}", status_code=204)
def delete_domaine(id_domaine: str, db: Session = Depends(get_db)):
    """Supprimer un domaine."""
    domaine = db.query(Domaine).filter(Domaine.Domaine_id == id_domaine).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine introuvable")
    
    # Attention: Si des mentions sont liées, cela lèvera une IntegrityError (ForeignKey)
    try:
        db.delete(domaine)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer ce domaine car il est lié à des Mentions.")
    
    return