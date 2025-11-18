from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil, os, uuid

from app.models import Institution
from app.schemas import InstitutionSchema, InstitutionCreate
from app.database import get_db

router = APIRouter()

# ---------------------------
# Liste de toutes les institutions
# ---------------------------
@router.get("/institutions", response_model=List[InstitutionSchema])
def get_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).all()

# ---------------------------
# Détails d'une institution
# ---------------------------
@router.get("/institutions/{id_institution}", response_model=InstitutionSchema)
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = db.query(Institution).filter(Institution.id_institution == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# ---------------------------
# Liste des types d'institution (pour dropdown)
# ---------------------------
@router.get("/types_institution", response_model=List[str])
def get_types_institution():
    # Remplace par les types existants dans ta base si nécessaire
    return ["Université", "École", "Centre de formation", "Autre"]

# ---------------------------
# Création d'une nouvelle institution
# ---------------------------
@router.post("/institutions", response_model=InstitutionSchema)
def create_institution(
    id_institution: str = Form(...),
    nom: str = Form(...),
    type_institution: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    # Vérifier si l'ID existe déjà
    existing = db.query(Institution).filter(Institution.id_institution == id_institution).first()
    if existing:
        raise HTTPException(status_code=400, detail="L'ID existe déjà")

    # Gestion du logo
    logo_path = None
    if logo:
        ext = os.path.splitext(logo.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        logo_dir = "app/static/logos"
        os.makedirs(logo_dir, exist_ok=True)
        logo_path = os.path.join(logo_dir, filename)
        with open(logo_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        logo_path = f"/static/logos/{filename}"  # chemin accessible depuis frontend

    # Création de l'institution
    new_inst = Institution(
        id_institution=id_institution,
        nom=nom,
        type_institution=type_institution,
        abbreviation=abbreviation,
        description=description,
        logo_path=logo_path
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)
    return new_inst
