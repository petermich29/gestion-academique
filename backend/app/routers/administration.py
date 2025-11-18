#E:\VSCode_Projects\gestion-academique\backend\app\routers\administration.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.models import Institution, Composante
from app.schemas import InstitutionSchema, ComposanteSchema
from app.database import get_db

router = APIRouter()

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
