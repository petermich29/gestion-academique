# backend/app/routers/ue_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app import models, schemas
from app.database import get_db
from app.models import AnneeUniversitaire, ParcoursNiveau

router = APIRouter(
    prefix="/ues", 
    tags=["Unités d'Enseignement (UE)"]
)

# --- UTILITAIRE ID ---
def generate_next_ue_id(db: Session) -> str:
    """Génère le prochain ID (UE_0000000001)"""
    last_ue = db.query(models.UniteEnseignement).order_by(models.UniteEnseignement.UE_id.desc()).first()
    if not last_ue:
        return "UE_0000000001"
    
    try:
        part_num = last_ue.UE_id.split('_')[1]
        next_num = int(part_num) + 1
        return f"UE_{str(next_num).zfill(10)}"
    except:
        count = db.query(models.UniteEnseignement).count() + 1
        return f"UE_{str(count).zfill(10)}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_ue_id_endpoint(db: Session = Depends(get_db)):
    return generate_next_ue_id(db)

@router.post("/", response_model=schemas.UniteEnseignementSchema)
def create_ue(
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: str = Form(...),
    parcours_id: str = Form(...), 
    annee_id: str = Form(...), # 👈 OBLIGATOIRE MAINTENANT
    db: Session = Depends(get_db)
):
    # 1. Vérif semestre
    semestre = db.query(models.Semestre).filter(models.Semestre.Semestre_id == semestre_id).first()
    if not semestre: raise HTTPException(400, "Semestre invalide")
    niveau_id = semestre.Niveau_id_fk

    # 2. Vérif doublon code (Optionnel: on peut autoriser le même code sur des années différentes, 
    # ou l'interdire globalement. Ici, on l'interdit par année/parcours via la contrainte DB, 
    # mais vérifions-le proprement)
    exists = db.query(models.UniteEnseignement).filter(
        models.UniteEnseignement.UE_code == code.strip(),
        models.UniteEnseignement.Parcours_id_fk == parcours_id,
        models.UniteEnseignement.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if exists: raise HTTPException(400, f"Ce code UE existe déjà pour ce parcours cette année.")

    # 3. GESTION LIEN PARCOURS-NIVEAU (Pour l'année cible)
    lien_pn = db.query(models.ParcoursNiveau).filter(
        models.ParcoursNiveau.Parcours_id_fk == parcours_id,
        models.ParcoursNiveau.Niveau_id_fk == niveau_id,
        models.ParcoursNiveau.AnneeUniversitaire_id_fk == annee_id # 👈 Important
    ).first()

    if not lien_pn:
        # Création du lien niveau <-> parcours pour cette année
        pn_id = f"PN_{parcours_id}_{niveau_id}_{annee_id}" # ID Composite unique
        # Calcul ordre
        count_ord = db.query(models.ParcoursNiveau).filter(
            models.ParcoursNiveau.Parcours_id_fk == parcours_id,
            models.ParcoursNiveau.AnneeUniversitaire_id_fk == annee_id
        ).count()
        
        new_pn = models.ParcoursNiveau(
            ParcoursNiveau_id=pn_id,
            Parcours_id_fk=parcours_id,
            Niveau_id_fk=niveau_id,
            AnneeUniversitaire_id_fk=annee_id,
            ParcoursNiveau_ordre=count_ord + 1
        )
        db.add(new_pn)

    # 4. Création UE
    new_id = generate_next_ue_id(db)
    new_ue = models.UniteEnseignement(
        UE_id=new_id,
        UE_code=code.strip(),
        UE_intitule=intitule.strip(),
        UE_credit=credit,
        Semestre_id_fk=semestre_id,
        Parcours_id_fk=parcours_id,
        AnneeUniversitaire_id_fk=annee_id # 👈 On attache l'année
    )
    
    try:
        db.add(new_ue)
        db.commit()
        db.refresh(new_ue)
        return new_ue
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))


@router.put("/{ue_id}", response_model=schemas.UniteEnseignementSchema)
def update_ue(
    ue_id: str,
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    if not ue:
        raise HTTPException(status_code=404, detail="UE introuvable")

    # Vérification unicité code seulement si changé
    if code.strip() != ue.UE_code:
        if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
            raise HTTPException(status_code=400, detail="Code UE déjà utilisé.")

    ue.UE_code = code.strip()
    ue.UE_intitule = intitule.strip()
    ue.UE_credit = credit
    
    if semestre_id is not None:
        ue.Semestre_id_fk = semestre_id
    
    try:
        db.commit()
        db.refresh(ue)
        return ue
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Pour le DELETE, ajoutez également le nettoyage basé sur l'année :
@router.delete("/{ue_id}", status_code=204)
def delete_ue(
    ue_id: str, 
    parcours_id: str = Query(...),
    # On a besoin de connaître l'année pour nettoyer le ParcoursNiveau si nécessaire
    # On peut la récupérer depuis l'UE avant suppression
    db: Session = Depends(get_db)
):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    if not ue: raise HTTPException(404, "UE introuvable")
    
    annee_ref = ue.AnneeUniversitaire_id_fk
    niveau_ref = ue.semestre.Niveau_id_fk
    
    if ue.Parcours_id_fk != parcours_id:
         raise HTTPException(400, "Erreur de parcours.")
    
    db.delete(ue)
    db.commit()