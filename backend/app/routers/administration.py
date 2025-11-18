#E:\VSCode_Projects\gestion-academique\backend\app\routers\administration.py
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from app.models import Institution, Composante
from app.schemas import InstitutionSchema, ComposanteSchema
from app.database import get_db

import shutil
import os

router = APIRouter()

UPLOAD_DIR = "app/static/logos"  # dossier où stocker les logos
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 🔹 Ajouter une institution
@router.post("/institutions", response_model=InstitutionSchema)
def create_institution(
    id_institution: str = Form(...),
    nom: str = Form(...),
    type_institution: str = Form(...),
    abbreviation: str = Form(None),
    description: str = Form(None),
    logo_file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    # Vérifier les doublons
    if db.query(Institution).filter(Institution.id_institution == id_institution).first():
        raise HTTPException(status_code=400, detail="id_institution existe déjà")
    if db.query(Institution).filter(Institution.nom == nom).first():
        raise HTTPException(status_code=400, detail="nom existe déjà")
    
    # Gestion du logo
    logo_path = None
    if logo_file:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        with open(f"app{logo_path}", "wb") as buffer:
            shutil.copyfileobj(logo_file.file, buffer)

    # Création de l'institution
    institution = Institution(
        id_institution=id_institution,
        nom=nom,
        type_institution=type_institution,
        abbreviation=abbreviation,
        description=description,
        logo_path=logo_path
    )
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution

# 🔹 Modifier une institution
@router.put("/institutions", response_model=InstitutionSchema)
def update_institution(
    id_institution: str = Form(...),
    nom: str = Form(...),
    type_institution: str = Form(...),
    abbreviation: str = Form(None),
    description: str = Form(None),
    logo_file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    institution = db.query(Institution).filter(Institution.id_institution == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    # Vérifier doublons pour le nom (sauf pour l'institution elle-même)
    existing_nom = db.query(Institution).filter(Institution.nom == nom, Institution.id_institution != id_institution).first()
    if existing_nom:
        raise HTTPException(status_code=400, detail="Nom existe déjà")

    # Mettre à jour les champs
    institution.nom = nom
    institution.type_institution = type_institution
    institution.abbreviation = abbreviation
    institution.description = description

    # Gestion du logo
    if logo_file:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        with open(f"app{logo_path}", "wb") as buffer:
            shutil.copyfileobj(logo_file.file, buffer)
        institution.logo_path = logo_path

    db.commit()
    db.refresh(institution)
    return institution


# 🔹 Liste de toutes les institutions
@router.get("/institutions", response_model=List[InstitutionSchema])
def get_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).all()

# 🔹 Détails d'une institution
@router.get("/institutions/{id_institution}", response_model=InstitutionSchema)
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = (
        db.query(Institution)
        .filter(Institution.id_institution == id_institution)
        .first()
    )
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# 🔹 Liste des composantes d'une institution
@router.get("/composantes", response_model=List[ComposanteSchema])
def get_composantes(institution_id: str = Query(...), db: Session = Depends(get_db)):
    composantes = (
        db.query(Composante)
        .filter(Composante.id_institution == institution_id)
        .all()
    )
    return composantes
