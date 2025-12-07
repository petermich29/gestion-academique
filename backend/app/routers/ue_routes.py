# backend/app/routers/ue_routes.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ues", tags=["Gestion UEs (Maquette & Catalogue)"])

def generate_ue_id(db: Session) -> str:
    """Génère un ID pour le CATALOGUE"""
    count = db.query(models.UniteEnseignement).count()
    return f"UE_{str(count + 1).zfill(8)}"

@router.get("/next-id", response_model=str)
def get_next_ue_id_endpoint(db: Session = Depends(get_db)):
    return generate_ue_id(db)

@router.post("/", response_model=schemas.StructureUE)
def create_or_add_ue_to_maquette(
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: str = Form(...),
    parcours_id: str = Form(...), 
    annee_id: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    1. Vérifie si l'UE existe dans le catalogue (par Code). Sinon, la crée.
    2. Ajoute l'UE à la maquette (MaquetteUE) pour l'année/parcours/semestre donnés.
    """
    # A. Gestion du Catalogue
    code_clean = code.strip().upper()
    ue_catalog = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code_clean).first()
    
    if not ue_catalog:
        # Création dans le catalogue
        ue_catalog = models.UniteEnseignement(
            UE_id=generate_ue_id(db),
            UE_code=code_clean,
            UE_intitule=intitule.strip(),
            UE_description=description
        )
        db.add(ue_catalog)
        db.flush() # Pour avoir l'ID disponible
    else:
        # (Optionnel) Mise à jour du libellé catalogue si nécessaire ? 
        # Pour l'instant on garde le catalogue intact pour éviter les effets de bord sur d'autres années.
        pass

    # B. Vérification doublon dans la Maquette
    existing_link = db.query(models.MaquetteUE).filter(
        models.MaquetteUE.Parcours_id_fk == parcours_id,
        models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id,
        models.MaquetteUE.UE_id_fk == ue_catalog.UE_id
    ).first()
    
    if existing_link:
        raise HTTPException(400, f"L'UE {code_clean} est déjà présente dans cette maquette pour cette année.")

    # C. Ajout à la Maquette (Le lien contextuel)
    # Génération ID Maquette : MUE_{Parcours}_{Annee}_{UE} ou UUID
    maquette_id = f"MUE_{uuid.uuid4().hex[:8]}"
    
    new_maquette = models.MaquetteUE(
        MaquetteUE_id=maquette_id,
        Parcours_id_fk=parcours_id,
        AnneeUniversitaire_id_fk=annee_id,
        UE_id_fk=ue_catalog.UE_id,
        Semestre_id_fk=semestre_id,
        MaquetteUE_credit=credit # Le crédit est spécifique à cette maquette !
    )
    
    # D. Gestion automatique du ParcoursNiveau (Si le niveau n'est pas encore lié à l'année)
    semestre = db.query(models.Semestre).get(semestre_id)
    niveau_id = semestre.Niveau_id_fk
    
    pn_link = db.query(models.ParcoursNiveau).filter(
        models.ParcoursNiveau.Parcours_id_fk == parcours_id,
        models.ParcoursNiveau.Niveau_id_fk == niveau_id,
        models.ParcoursNiveau.AnneeUniversitaire_id_fk == annee_id
    ).first()
    
    if not pn_link:
        count = db.query(models.ParcoursNiveau).filter(
            models.ParcoursNiveau.Parcours_id_fk == parcours_id,
            models.ParcoursNiveau.AnneeUniversitaire_id_fk == annee_id
        ).count()
        new_pn = models.ParcoursNiveau(
            ParcoursNiveau_id=f"PN_{uuid.uuid4().hex[:8]}",
            Parcours_id_fk=parcours_id,
            Niveau_id_fk=niveau_id,
            AnneeUniversitaire_id_fk=annee_id,
            ParcoursNiveau_ordre=count + 1
        )
        db.add(new_pn)

    try:
        db.add(new_maquette)
        db.commit()
        db.refresh(new_maquette)
        
        # 🟢 CORRECTION DU RETOUR
        # On mappe correctement les champs définis dans le Schema mis à jour
        return schemas.StructureUE(
            id=new_maquette.MaquetteUE_id,          # ID utilisé comme clé React
            id_maquette=new_maquette.MaquetteUE_id, # ID spécifique pour suppression/modif
            id_catalog=ue_catalog.UE_id,            # ID catalogue pour réutilisation
            code=ue_catalog.UE_code,
            intitule=ue_catalog.UE_intitule,
            credit=new_maquette.MaquetteUE_credit,
            ec_count=0
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.put("/{maquette_ue_id}", response_model=schemas.StructureUE)
def update_ue_in_maquette(
    maquette_ue_id: str,
    credit: int = Form(...),
    semestre_id: str = Form(...),
    # On permet de changer le code/intitulé, mais attention : cela change le CATALOGUE
    # ou change l'UE pointée ? Ici on change simplement les attributs Maquette + Catalogue
    code: str = Form(...),
    intitule: str = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Récupérer la Maquette
    maquette = db.query(models.MaquetteUE).filter(models.MaquetteUE.MaquetteUE_id == maquette_ue_id).first()
    if not maquette: raise HTTPException(404, "UE (Maquette) introuvable")

    # 2. Update Maquette (Spécifique année)
    maquette.MaquetteUE_credit = credit
    maquette.Semestre_id_fk = semestre_id
    
    # 3. Update Catalogue (Attention: Impact global !)
    # Si on veut permettre de corriger une faute de frappe :
    ue_catalog = maquette.ue_catalog
    ue_catalog.UE_code = code.strip().upper()
    ue_catalog.UE_intitule = intitule.strip()
    
    try:
        db.commit()
        return schemas.StructureUE(
            id_maquette=maquette.MaquetteUE_id,
            id_catalog=ue_catalog.UE_id,
            code=ue_catalog.UE_code,
            intitule=ue_catalog.UE_intitule,
            credit=maquette.MaquetteUE_credit,
            ec_count=len(maquette.maquette_ecs)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.delete("/{maquette_ue_id}", status_code=204)
def remove_ue_from_maquette(maquette_ue_id: str, db: Session = Depends(get_db)):
    """Supprime le lien Maquette (n'efface pas l'UE du catalogue)"""
    maquette = db.query(models.MaquetteUE).filter(models.MaquetteUE.MaquetteUE_id == maquette_ue_id).first()
    if not maquette: raise HTTPException(404, "Introuvable")
    
    db.delete(maquette)
    db.commit()