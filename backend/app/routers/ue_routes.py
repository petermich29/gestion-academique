# backend/app/routers/ue_routes.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import uuid

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ues", tags=["Gestion UEs (Maquette & Catalogue)"])

# ---------------------------------------------------------
# Fonction de Génération d'ID robuste
# ---------------------------------------------------------
def generate_ue_id(db: Session) -> str:
    """Génère un ID unique et séquentiel pour le CATALOGUE"""
    
    # Recherche l'ID le plus grand (méthode robuste post-suppression)
    last_ue = db.query(models.UniteEnseignement.UE_id)\
        .filter(models.UniteEnseignement.UE_id.like("UE_%"))\
        .order_by(models.UniteEnseignement.UE_id.desc())\
        .first()

    if not last_ue:
        return "UE_00000001"
    
    try:
        last_num = int(last_ue[0].split('_')[1])
        return f"UE_{str(last_num + 1).zfill(8)}"
    except (IndexError, ValueError):
        return f"UE_{uuid.uuid4().hex[:8].upper()}"


@router.get("/next-id", response_model=str)
def get_next_ue_id_endpoint(db: Session = Depends(get_db)):
    return generate_ue_id(db)

# ---------------------------------------------------------
# POST /ues (Création/Ajout)
# ---------------------------------------------------------
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
    # Logique de création/ajout (Gardée intacte car fonctionnait pour la création)
    code_clean = code.strip().upper()
    ue_catalog = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code_clean).first()
    
    if not ue_catalog:
        ue_catalog = models.UniteEnseignement(
            UE_id=generate_ue_id(db), 
            UE_code=code_clean,
            UE_intitule=intitule.strip(),
            UE_description=description
        )
        db.add(ue_catalog)
        db.flush()
    
    existing_link = db.query(models.MaquetteUE).filter(
        models.MaquetteUE.Parcours_id_fk == parcours_id,
        models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id,
        models.MaquetteUE.UE_id_fk == ue_catalog.UE_id
    ).first()
    
    if existing_link:
        raise HTTPException(400, f"L'UE {code_clean} est déjà présente dans cette maquette pour cette année.")

    maquette_id = f"MUE_{uuid.uuid4().hex[:8]}"
    new_maquette = models.MaquetteUE(
        MaquetteUE_id=maquette_id,
        Parcours_id_fk=parcours_id,
        AnneeUniversitaire_id_fk=annee_id,
        UE_id_fk=ue_catalog.UE_id,
        Semestre_id_fk=semestre_id,
        MaquetteUE_credit=credit 
    )
    
    # Gestion ParcoursNiveau (simplifié)
    semestre = db.query(models.Semestre).get(semestre_id)
    niveau_id = semestre.Niveau_id_fk if semestre else None
    
    if niveau_id:
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
        
        return schemas.StructureUE(
            id=new_maquette.MaquetteUE_id,
            id_maquette=new_maquette.MaquetteUE_id,
            id_catalog=ue_catalog.UE_id,
            code=ue_catalog.UE_code,
            intitule=ue_catalog.UE_intitule,
            credit=new_maquette.MaquetteUE_credit,
            ec_count=0
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

# ---------------------------------------------------------
# PUT /ues/{maquette_ue_id} (Mise à jour avec Fork Conditionnel)
# ---------------------------------------------------------
@router.put("/{maquette_ue_id}", response_model=schemas.StructureUE)
def update_ue_in_maquette(
    maquette_ue_id: str,
    credit: int = Form(...),
    semestre_id: str = Form(...),
    code: str = Form(...),
    intitule: str = Form(...),
    update_mode: str = Form("global"), # "global" ou "fork"
    db: Session = Depends(get_db)
):
    # 1. Récupération de la maquette existante
    maquette = db.query(models.MaquetteUE).filter(models.MaquetteUE.MaquetteUE_id == maquette_ue_id).first()
    if not maquette: 
        raise HTTPException(404, "UE (Maquette) introuvable")

    ue_catalog_old = maquette.ue_catalog
    code_clean = code.strip().upper()
    intitule_clean = intitule.strip()

    # 2. LOGIQUE DE FORK (Nouvelle UE Catalogue)
    if update_mode == "fork":
        # Vérification si le code existe déjà pour éviter les doublons
        existing = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code_clean).first()
        if existing:
            raise HTTPException(400, f"Le code {code_clean} existe déjà dans le catalogue. Impossible de créer un Fork avec ce code.")

        new_ue_id = generate_ue_id(db)
        ue_catalog_new = models.UniteEnseignement(
            UE_id=new_ue_id,
            UE_code=code_clean,
            UE_intitule=intitule_clean,
            UE_description=ue_catalog_old.UE_description
        )
        db.add(ue_catalog_new)
        db.flush() # Pour avoir l'ID disponible
        
        # On change la référence : cette maquette pointe maintenant vers la nouvelle UE
        maquette.UE_id_fk = new_ue_id

    # 3. LOGIQUE GLOBALE (Modification de l'existant)
    else:
        # Si on change le code, vérifier qu'il n'est pas pris ailleurs
        if ue_catalog_old.UE_code != code_clean:
             existing = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code_clean).first()
             # On s'assure que ce n'est pas la même UE qu'on modifie
             if existing and existing.UE_id != ue_catalog_old.UE_id: 
                 raise HTTPException(400, "Ce code appartient déjà à une autre UE.")
        
        ue_catalog_old.UE_code = code_clean
        ue_catalog_old.UE_intitule = intitule_clean

    # 4. Mise à jour des paramètres de maquette (Communs)
    maquette.MaquetteUE_credit = credit
    maquette.Semestre_id_fk = semestre_id
    
    try:
        db.commit()
        db.refresh(maquette)
        
        # IMPORTANT : On récupère l'UE fraîchement liée pour construire la réponse
        # (Nécessaire car si on a fork, maquette.ue_catalog peut être obsolète dans la session sans refresh profond)
        current_ue = db.query(models.UniteEnseignement).get(maquette.UE_id_fk)

        # 5. Construction explicite de l'objet de retour (C'est ici que l'erreur se produisait)
        return schemas.StructureUE(
            id=maquette.MaquetteUE_id,
            id_maquette=maquette.MaquetteUE_id,
            id_catalog=current_ue.UE_id,
            code=current_ue.UE_code,
            intitule=current_ue.UE_intitule,
            credit=maquette.MaquetteUE_credit,
            # On renvoie des valeurs par défaut pour les ECs car on vient de faire une mise à jour d'entête UE
            ec_count=0, 
            ecs=[]
        )
    except Exception as e:
        db.rollback()
        # Log l'erreur dans la console serveur pour debug
        print(f"ERREUR UPDATE UE: {e}")
        raise HTTPException(500, f"Erreur serveur lors de la mise à jour: {str(e)}")

@router.delete("/{maquette_ue_id}", status_code=204)
def remove_ue_from_maquette(maquette_ue_id: str, db: Session = Depends(get_db)):
    """Supprime le lien Maquette (n'efface pas l'UE du catalogue)"""
    maquette = db.query(models.MaquetteUE).filter(models.MaquetteUE.MaquetteUE_id == maquette_ue_id).first()
    if not maquette: raise HTTPException(404, "Introuvable")
    
    db.delete(maquette)
    db.commit()