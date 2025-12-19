# backend/app/routers/attributions_routes.py
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
import uuid
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app import models

router = APIRouter(prefix="/attributions", tags=["Gestion des Attributions (Charges)"])

# --- SCHEMAS (Nettoyés et fusionnés) ---

class AttributionPayload(BaseModel):
    maquette_ec_id: str
    type_enseignement_id: str
    enseignant_id: Optional[str] = None 

# Une seule définition claire
class AttributionViewItem(BaseModel):
    attribution_id: Optional[str]
    enseignant_id: Optional[str]
    enseignant_nom: Optional[str]
    enseignant_photo: Optional[str]
    type_id: str
    type_label: str  # Ce champ est maintenant garanti
    heures: float

class ECViewItem(BaseModel):
    ec_id: str
    ec_label: str
    ec_code: str
    slots: List[AttributionViewItem]

class UEViewItem(BaseModel):
    ue_id: str
    ue_label: str
    ue_code: str
    ecs: List[ECViewItem]

# --- ENDPOINTS ---

@router.get("/matrice", response_model=List[UEViewItem])
def get_attribution_matrix(
    parcours_id: str,
    semestre_id: str,
    annee_id: str,
    db: Session = Depends(get_db)
):
    # 1. Récupérer les Maquettes UE
    maquettes_ue = db.query(models.MaquetteUE).filter(
        models.MaquetteUE.Parcours_id_fk == parcours_id,
        models.MaquetteUE.Semestre_id_fk == semestre_id,
        models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
    ).all()

    result_ue = []

    for mue in maquettes_ue:
        ecs_data = []
        
        for mec in mue.maquette_ecs:
            slots_data = []
            
            # 3. Récupérer les volumes avec le JOIN sur TypeEnseignement pour avoir Label et Code
            volumes = db.query(models.VolumeHoraire)\
                .options(joinedload(models.VolumeHoraire.type_enseignement))\
                .filter(models.VolumeHoraire.MaquetteEC_id_fk == mec.MaquetteEC_id)\
                .all()

            # 4. Récupérer les attributions existantes
            attributions = db.query(models.AttributionEnseignant).filter(
                models.AttributionEnseignant.MaquetteEC_id_fk == mec.MaquetteEC_id
            ).options(joinedload(models.AttributionEnseignant.enseignant)).all()
            
            attr_map = {attr.TypeEnseignement_id_fk: attr for attr in attributions}

            for vol in volumes:
                existing_attr = attr_map.get(vol.TypeEnseignement_id_fk)
                
                ens_id = None
                ens_nom = None
                ens_photo = None
                attr_id = None

                if existing_attr and existing_attr.enseignant:
                    ens_id = existing_attr.enseignant.Enseignant_id
                    ens_nom = f"{existing_attr.enseignant.Enseignant_nom} {existing_attr.enseignant.Enseignant_prenoms or ''}"
                    ens_photo = existing_attr.enseignant.Enseignant_photo_profil_path
                    attr_id = existing_attr.Attribution_id

                # --- CONSTRUCTION DU LABEL ---
                # On veut : "Cours Magistral (CM)" ou juste "CM" selon vos préférences
                display_label = vol.TypeEnseignement_id_fk # fallback
                
                if vol.type_enseignement:
                    label = vol.type_enseignement.TypeEnseignement_label
                    code = vol.type_enseignement.TypeEnseignement_code
                    # Option A: Label (Code)
                    display_label = f"{label} ({code})" if code else label
                    # Option B: Juste le Code (Décommentez la ligne ci-dessous si vous préférez)
                    # display_label = code if code else label

                slots_data.append(AttributionViewItem(
                    attribution_id=attr_id,
                    enseignant_id=ens_id,
                    enseignant_nom=ens_nom,
                    enseignant_photo=ens_photo,
                    type_id=vol.TypeEnseignement_id_fk,
                    type_label=display_label, # On envoie le texte formaté ici
                    heures=vol.Volume_heures
                ))
            
            ecs_data.append(ECViewItem(
                ec_id=mec.MaquetteEC_id,
                ec_label=mec.ec_catalog.EC_intitule,
                ec_code=mec.ec_catalog.EC_code,
                slots=slots_data
            ))

        result_ue.append(UEViewItem(
            ue_id=mue.MaquetteUE_id,
            ue_label=mue.ue_catalog.UE_intitule,
            ue_code=mue.ue_catalog.UE_code,
            ecs=ecs_data
        ))

    return result_ue

# ... (Le reste du fichier : endpoint /assign reste inchangé) ...
@router.post("/assign")
def assign_teacher(payload: AttributionPayload, db: Session = Depends(get_db)):
    # ... (code inchangé) ...
    # Assurez-vous d'inclure tout le code du endpoint assign ici
    # Je ne le répète pas pour abréger, mais il doit rester tel quel.
    existing = db.query(models.AttributionEnseignant).filter(
        models.AttributionEnseignant.MaquetteEC_id_fk == payload.maquette_ec_id,
        models.AttributionEnseignant.TypeEnseignement_id_fk == payload.type_enseignement_id
    ).first()

    if not payload.enseignant_id:
        if existing:
            db.delete(existing)
            db.commit()
        return {"message": "Attribution retirée"}

    if existing:
        existing.Enseignant_id_fk = payload.enseignant_id
    else:
        new_attr = models.AttributionEnseignant(
            Attribution_id=f"ATTR_{uuid.uuid4().hex[:8]}",
            MaquetteEC_id_fk=payload.maquette_ec_id,
            TypeEnseignement_id_fk=payload.type_enseignement_id,
            Enseignant_id_fk=payload.enseignant_id,
            Attribution_heures=0
        )
        db.add(new_attr)

    try:
        db.commit()
        return {"message": "Attribution enregistrée"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))