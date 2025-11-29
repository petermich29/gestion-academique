# app/routers/mentions_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os

from app.database import get_db
from app.models import Mention, Parcours, Composante
from app.schemas import MentionSchema, ParcoursSchema, ParcoursCreate, ParcoursUpdate

router = APIRouter(prefix="/mentions", tags=["Mentions & Parcours"])

# --- GESTION DES MENTIONS ---

@router.get("/next-id", response_model=str)
def get_next_mention_id(db: Session = Depends(get_db)):
    # Logique simpliste pour l'exemple, à adapter selon votre format (MEN_001)
    last = db.query(Mention).order_by(Mention.Mention_id.desc()).first()
    if not last: return "MEN_001"
    try:
        num = int(last.Mention_id.split('_')[1]) + 1
        return f"MEN_{num:03d}"
    except:
        return "MEN_ERR"

# Récupérer toutes les mentions d'une composante (pour la navigation)
@router.get("/composante/{composante_id}", response_model=List[MentionSchema])
def get_mentions_by_composante(composante_id: str, db: Session = Depends(get_db)):
    mentions = db.query(Mention).filter(Mention.Composante_id_fk == composante_id).all()
    return mentions

@router.get("/{mention_id}", response_model=MentionSchema)
def get_mention_detail(mention_id: str, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention introuvable")
    return mention

# ... (Le Create/Update/Delete Mention est supposé déjà fait ou similaire aux autres)

# --- GESTION DES PARCOURS (CRUD) ---

@router.get("/parcours/next-id", response_model=str)
def get_next_parcours_id(db: Session = Depends(get_db)):
    last = db.query(Parcours).order_by(Parcours.Parcours_id.desc()).first()
    if not last: return "PAR_0001"
    try:
        # Supposons format PAR_XXXX
        part = last.Parcours_id.split('_')
        num = int(part[1]) + 1
        return f"PAR_{num:04d}"
    except:
        return "PAR_NEW"

@router.post("/parcours/", response_model=ParcoursSchema)
def create_parcours(
    id_parcours: str = Form(...),
    code: str = Form(...),
    label: str = Form(...),
    id_mention: str = Form(...),
    id_type_formation: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # Gestion Logo
    logo_path = None
    if logo_file:
        os.makedirs("app/static/logos/parcours", exist_ok=True)
        file_location = f"app/static/logos/parcours/{id_parcours}_{logo_file.filename}"
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(logo_file.file, buffer)
        logo_path = f"/static/logos/parcours/{id_parcours}_{logo_file.filename}"

    new_parcours = Parcours(
        Parcours_id=id_parcours,
        Parcours_code=code,
        Parcours_label=label,
        Mention_id_fk=id_mention,
        Parcours_type_formation_defaut_id_fk=id_type_formation,
        Parcours_abbreviation=abbreviation,
        Parcours_description=description,
        Parcours_logo_path=logo_path
    )
    
    try:
        db.add(new_parcours)
        db.commit()
        db.refresh(new_parcours)
        return new_parcours
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/parcours/{parcours_id}", response_model=ParcoursSchema)
def update_parcours(
    parcours_id: str,
    code: str = Form(...),
    label: str = Form(...),
    id_type_formation: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    parcours = db.query(Parcours).filter(Parcours.Parcours_id == parcours_id).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    # Mise à jour champs
    parcours.Parcours_code = code
    parcours.Parcours_label = label
    parcours.Parcours_type_formation_defaut_id_fk = id_type_formation
    if abbreviation: parcours.Parcours_abbreviation = abbreviation
    if description: parcours.Parcours_description = description

    # Mise à jour Logo
    if logo_file:
        os.makedirs("app/static/logos/parcours", exist_ok=True)
        file_location = f"app/static/logos/parcours/{parcours_id}_{logo_file.filename}"
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(logo_file.file, buffer)
        parcours.Parcours_logo_path = f"/static/logos/parcours/{parcours_id}_{logo_file.filename}"

    try:
        db.commit()
        db.refresh(parcours)
        return parcours
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/parcours/{parcours_id}")
def delete_parcours(parcours_id: str, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.Parcours_id == parcours_id).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    
    db.delete(parcours)
    db.commit()
    return {"message": "Parcours supprimé"}