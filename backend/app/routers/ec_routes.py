# backend/app/routers/ec_routes.py
from fastapi import APIRouter, Depends, HTTPException, Form, Body
from sqlalchemy.orm import Session
import uuid
from typing import Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ecs", tags=["Elements Constitutifs (Maquette)"])

# ---------------------------------------------------------
# 1. GESTION DES EC (MODULES)
# ---------------------------------------------------------

@router.post("/", response_model=schemas.MaquetteElementConstitutifSchema)
def add_ec_to_maquette(
    maquette_ue_id: str = Form(...), 
    code: str = Form(...),
    intitule: str = Form(...),
    coefficient: float = Form(1.0), 
    db: Session = Depends(get_db)
):
    # A. Vérifier ou Créer l'EC dans le catalogue global
    code_clean = code.strip().upper()
    ec_catalog = db.query(models.ElementConstitutif).filter(models.ElementConstitutif.EC_code == code_clean).first()
    
    if not ec_catalog:
        # CORRECTION : Utilisation UUID au lieu de count()
        ec_id = f"EC_{uuid.uuid4().hex[:8].upper()}"
        ec_catalog = models.ElementConstitutif(
            EC_id=ec_id,
            EC_code=code_clean,
            EC_intitule=intitule.strip()
        )
        db.add(ec_catalog)
        db.flush() # Pour avoir l'ID disponible

    # B. Lier l'EC à la Maquette (via l'UE)
    # Vérifier doublon dans cette UE
    existing_link = db.query(models.MaquetteEC).filter(
        models.MaquetteEC.MaquetteUE_id_fk == maquette_ue_id,
        models.MaquetteEC.EC_id_fk == ec_catalog.EC_id
    ).first()

    if existing_link:
        raise HTTPException(400, "Cet EC est déjà présent dans cette UE.")

    mec_id = f"MEC_{uuid.uuid4().hex[:8]}"
    new_mec = models.MaquetteEC(
        MaquetteEC_id=mec_id,
        MaquetteUE_id_fk=maquette_ue_id,
        EC_id_fk=ec_catalog.EC_id,
        MaquetteEC_coefficient=coefficient
    )
    
    try:
        db.add(new_mec)
        db.commit()
        db.refresh(new_mec)
        
        # Construction de la réponse conforme au schéma
        return schemas.MaquetteElementConstitutifSchema(
            id_maquette_ec=new_mec.MaquetteEC_id,
            coefficient=new_mec.MaquetteEC_coefficient,
            id_ue=new_mec.MaquetteUE_id_fk,
            id_ec=new_mec.EC_id_fk,
            ec_catalogue=schemas.ElementConstitutifSchema(
                id_ec=ec_catalog.EC_id,
                code=ec_catalog.EC_code,
                intitule=ec_catalog.EC_intitule,
                coefficient=new_mec.MaquetteEC_coefficient
            ),
            volumes_horaires=[]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Erreur serveur : {str(e)}")

@router.delete("/{maquette_ec_id}")
def delete_ec_from_maquette(maquette_ec_id: str, db: Session = Depends(get_db)):
    # Suppression en cascade manuelle pour être sûr
    db.query(models.VolumeHoraire).filter(models.VolumeHoraire.MaquetteEC_id_fk == maquette_ec_id).delete()
    
    mec = db.query(models.MaquetteEC).get(maquette_ec_id)
    if not mec:
        raise HTTPException(404, "EC non trouvé dans la maquette")
        
    db.delete(mec)
    db.commit()
    return {"message": "EC supprimé"}

# ---------------------------------------------------------
# 2. GESTION DES VOLUMES HORAIRES (CRUD COMPLET)
# ---------------------------------------------------------

@router.post("/{maquette_ec_id}/volumes", response_model=schemas.VolumeHoraireSchema)
def add_volume_horaire(
    maquette_ec_id: str,
    type_enseignement_id: str = Form(...),
    heures: float = Form(...),
    db: Session = Depends(get_db)
):
    # Vérifier existence EC
    mec = db.query(models.MaquetteEC).get(maquette_ec_id)
    if not mec: raise HTTPException(404, "EC introuvable")

    # Vérifier unicité (ex: pas 2 volumes de CM pour le même cours)
    existing = db.query(models.VolumeHoraire).filter(
        models.VolumeHoraire.MaquetteEC_id_fk == maquette_ec_id,
        models.VolumeHoraire.TypeEnseignement_id_fk == type_enseignement_id
    ).first()

    if existing:
        raise HTTPException(400, "Ce type d'enseignement existe déjà pour cet EC. Modifiez-le.")

    vol_id = f"VOL_{uuid.uuid4().hex[:8]}"
    new_vol = models.VolumeHoraire(
        Volume_id=vol_id,
        MaquetteEC_id_fk=maquette_ec_id,
        TypeEnseignement_id_fk=type_enseignement_id,
        Volume_heures=heures
    )
    db.add(new_vol)
    db.commit()
    db.refresh(new_vol)

    # Récupérer infos pour le frontend (CM, TD, TP...)
    type_ens = db.query(models.TypeEnseignement).get(type_enseignement_id)

    return schemas.VolumeHoraireSchema(
        id=new_vol.Volume_id,
        heures=new_vol.Volume_heures,
        type_enseignement_id=new_vol.TypeEnseignement_id_fk,
        maquette_ec_id=new_vol.MaquetteEC_id_fk,
        type_enseignement_label=type_ens.TypeEnseignement_label,
        type_enseignement_code=type_ens.TypeEnseignement_code
    )

@router.put("/volumes/{volume_id}", response_model=schemas.VolumeHoraireSchema)
def update_volume_horaire(
    volume_id: str,
    heures: float = Form(...),
    db: Session = Depends(get_db)
):
    vol = db.query(models.VolumeHoraire).get(volume_id)
    if not vol:
        raise HTTPException(404, "Volume introuvable")
    
    vol.Volume_heures = hours
    db.commit()
    db.refresh(vol)
    
    type_ens = db.query(models.TypeEnseignement).get(vol.TypeEnseignement_id_fk)
    
    return schemas.VolumeHoraireSchema(
        id=vol.Volume_id,
        heures=vol.Volume_heures,
        type_enseignement_id=vol.TypeEnseignement_id_fk,
        maquette_ec_id=vol.MaquetteEC_id_fk,
        type_enseignement_label=type_ens.TypeEnseignement_label,
        type_enseignement_code=type_ens.TypeEnseignement_code
    )

@router.delete("/volumes/{volume_id}")
def delete_volume_horaire(volume_id: str, db: Session = Depends(get_db)):
    vol = db.query(models.VolumeHoraire).get(volume_id)
    if not vol:
        raise HTTPException(404, "Volume introuvable")
    
    db.delete(vol)
    db.commit()
    return {"message": "Volume supprimé"}

@router.put("/maquette/bulk-update", response_model=bool)
def bulk_update_ue_structure(
    payload: schemas.BulkUpdateUeSchema,
    db: Session = Depends(get_db)
):
    """
    Synchronise la liste des ECs et Volumes d'une UE en une seule transaction.
    Gère: Ajout, Modification, Suppression (si absent de la liste).
    """
    ue_id = payload.ue_id
    incoming_ecs = payload.ecs
    
    # 1. Récupérer tous les MaquetteEC existants pour cette UE
    existing_links = db.query(models.MaquetteEC).filter(
        models.MaquetteEC.MaquetteUE_id_fk == ue_id
    ).all()
    
    # Map pour accès rapide par ID
    existing_map = {mec.MaquetteEC_id: mec for mec in existing_links}
    
    # IDs reçus (pour identifier ce qu'il faut supprimer)
    incoming_ids = [ec.id_maquette_ec for ec in incoming_ecs if ec.id_maquette_ec]

    try:
        # --- A. SUPPRESSION ---
        incoming_ids = [item.id_maquette_ec for item in payload.ecs if item.id_maquette_ec]
        for existing_id, existing_obj in existing_map.items():
            if existing_id not in incoming_ids:
                # IMPORTANT : Supprimer d'abord tous les volumes liés à cet EC
                db.query(models.VolumeHoraire).filter(
                    models.VolumeHoraire.MaquetteEC_id_fk == existing_id
                ).delete(synchronize_session=False)
                
                # Maintenant on peut supprimer l'EC
                db.delete(existing_obj)
        
        db.flush() # Appliquer les suppressions avant la suite

        # --- B. AJOUT / MISE À JOUR ---
        for item in incoming_ecs:
            
            current_mec = None
            
            # --- Gestion de l'EC Catalogue ---
            # On vérifie si le code EC existe dans le catalogue global, sinon on le crée
            code_clean = item.code.strip().upper()
            ec_catalog = db.query(models.ElementConstitutif).filter(models.ElementConstitutif.EC_code == code_clean).first()
            
            if not ec_catalog:
                ec_catalog = models.ElementConstitutif(
                    EC_id=f"EC_{uuid.uuid4().hex[:8].upper()}",
                    EC_code=code_clean,
                    EC_intitule=item.intitule.strip()
                )
                db.add(ec_catalog)
                db.flush() # Pour avoir l'ID
            else:
                # Optionnel : Mettre à jour le libellé catalogue si changé ?
                # ec_catalog.EC_intitule = item.intitule 
                pass

            # --- Gestion du lien MaquetteEC ---
            if item.id_maquette_ec and item.id_maquette_ec in existing_map:
                # UPDATE Existant
                current_mec = existing_map[item.id_maquette_ec]
                current_mec.MaquetteEC_coefficient = item.coefficient
                current_mec.EC_id_fk = ec_catalog.EC_id # Au cas où le code a changé
            else:
                # CREATE Nouveau lien
                new_id = f"MEC_{uuid.uuid4().hex[:8]}"
                current_mec = models.MaquetteEC(
                    MaquetteEC_id=new_id,
                    MaquetteUE_id_fk=ue_id,
                    EC_id_fk=ec_catalog.EC_id,
                    MaquetteEC_coefficient=item.coefficient
                )
                db.add(current_mec)
                db.flush() # Pour avoir l'ID pour les volumes

            # --- C. GESTION DES VOLUMES HORAIRES (Sous-liste) ---
            # On récupère les volumes actuels de cet EC spécifique
            existing_vols = db.query(models.VolumeHoraire).filter(models.VolumeHoraire.MaquetteEC_id_fk == current_mec.MaquetteEC_id).all()
            existing_vol_map = {v.Volume_id: v for v in existing_vols}
            incoming_vol_ids = [v.id for v in item.volumes if v.id]

            # Supprimer volumes retirés
            for v_id, v_obj in existing_vol_map.items():
                if v_id not in incoming_vol_ids:
                    db.delete(v_obj)
            
            # Ajouter / Mettre à jour volumes
            for vol_in in item.volumes:
                if vol_in.id and vol_in.id in existing_vol_map:
                    # Update
                    v_obj = existing_vol_map[vol_in.id]
                    v_obj.Volume_heures = vol_in.heures
                    v_obj.TypeEnseignement_id_fk = vol_in.type_enseignement_id
                else:
                    # Create
                    new_vol = models.VolumeHoraire(
                        Volume_id=f"VOL_{uuid.uuid4().hex[:8]}",
                        MaquetteEC_id_fk=current_mec.MaquetteEC_id,
                        TypeEnseignement_id_fk=vol_in.type_enseignement_id,
                        Volume_heures=vol_in.heures
                    )
                    db.add(new_vol)

        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print(f"Erreur Bulk Update: {e}")
        raise HTTPException(500, f"Erreur lors de la sauvegarde : {str(e)}")