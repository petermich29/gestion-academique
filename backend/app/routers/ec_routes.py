# backend/app/routers/ec_routes.py
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import uuid
from typing import Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ecs", tags=["Elements Constitutifs (Maquette)"])

@router.post("/", response_model=schemas.MaquetteElementConstitutifSchema) # <-- CORRECTION
def add_ec_to_maquette(
    maquette_ue_id: str = Form(...), # ID de la MaquetteUE parente
    code: str = Form(...),
    intitule: str = Form(...),
    coefficient: int = Form(1),
    db: Session = Depends(get_db)
):
    # 1. Gestion Catalogue EC
    code_clean = code.strip().upper()
    ec_catalog = db.query(models.ElementConstitutif).filter(models.ElementConstitutif.EC_code == code_clean).first()
    
    if not ec_catalog:
        count = db.query(models.ElementConstitutif).count()
        ec_id = f"EC_{str(count + 1).zfill(8)}"
        ec_catalog = models.ElementConstitutif(
            EC_id=ec_id,
            EC_code=code_clean,
            EC_intitule=intitule.strip()
        )
        db.add(ec_catalog)
        db.flush()

    # 2. Création Lien MaquetteEC
    new_mec_id = f"MEC_{uuid.uuid4().hex[:8]}"
    new_mec = models.MaquetteEC(
        MaquetteEC_id=new_mec_id,
        MaquetteUE_id_fk=maquette_ue_id,
        EC_id_fk=ec_catalog.EC_id,
        MaquetteEC_coefficient=coefficient
    )
    
    try:
        db.add(new_mec)
        db.commit()
        db.refresh(new_mec)
        return new_mec
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.delete("/{maquette_ec_id}", status_code=204)
def delete_ec_from_maquette(maquette_ec_id: str, db: Session = Depends(get_db)):
    mec = db.query(models.MaquetteEC).get(maquette_ec_id)
    if not mec: raise HTTPException(404, "Non trouvé")
    db.delete(mec)
    db.commit()