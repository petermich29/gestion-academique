# backend/app/routers/ec_routes.py
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import uuid
from typing import Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ecs", tags=["Elements Constitutifs (Maquette)"])

@router.post("/", response_model=schemas.MaquetteElementConstitutifSchema)
def add_ec_to_maquette(
    maquette_ue_id: str = Form(...), 
    code: str = Form(...),
    intitule: str = Form(...),
    # CHANGEMENT : int -> float
    coefficient: float = Form(1.0), 
    db: Session = Depends(get_db)
):
    # ... (Le reste de la logique reste identique)
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
    
@router.put("/{maquette_ec_id}", response_model=schemas.StructureEC)
def update_ec_in_maquette(
    maquette_ec_id: str,
    code: str = Form(...),
    intitule: str = Form(...),
    # CHANGEMENT : int -> float
    coefficient: float = Form(...),
    db: Session = Depends(get_db)
):
    # ... (Le reste de la logique reste identique)
    mec = db.query(models.MaquetteEC).filter(models.MaquetteEC.MaquetteEC_id == maquette_ec_id).first()
    if not mec:
        raise HTTPException(404, "Élément constitutif introuvable dans la maquette")

    mec.MaquetteEC_coefficient = coefficient

    if mec.ec_catalog:
        mec.ec_catalog.EC_code = code.strip().upper()
        mec.ec_catalog.EC_intitule = intitule.strip()

    try:
        db.commit()
        db.refresh(mec)
        
        return schemas.StructureEC(
            id=mec.MaquetteEC_id,
            id_catalog=mec.ec_catalog.EC_id,
            code=mec.ec_catalog.EC_code,
            intitule=mec.ec_catalog.EC_intitule,
            coefficient=mec.MaquetteEC_coefficient
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    

@router.delete("/{maquette_ec_id}", status_code=204)
def delete_ec_from_maquette(maquette_ec_id: str, db: Session = Depends(get_db)):
    mec = db.query(models.MaquetteEC).get(maquette_ec_id)
    if not mec: raise HTTPException(404, "Non trouvé")
    db.delete(mec)
    db.commit()