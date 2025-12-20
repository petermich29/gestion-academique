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
    enseignant_statut: Optional[str]      # Nouveau
    enseignant_affiliation: Optional[str] # Nouveau
    type_id: str
    type_label: str
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
            
            # 2. Récupérer les volumes horaires
            volumes = db.query(models.VolumeHoraire)\
                .options(joinedload(models.VolumeHoraire.type_enseignement))\
                .filter(models.VolumeHoraire.MaquetteEC_id_fk == mec.MaquetteEC_id)\
                .all()

            # 3. Récupérer les attributions avec les relations CORRECTES :
            # Enseignant -> composante_attachement -> institution
            attributions = db.query(models.AttributionEnseignant).filter(
                models.AttributionEnseignant.MaquetteEC_id_fk == mec.MaquetteEC_id
            ).options(
                joinedload(models.AttributionEnseignant.enseignant).joinedload(
                    models.Enseignant.composante_attachement
                ).joinedload(
                    models.Composante.institution
                )
            ).all()
            
            attr_map = {attr.TypeEnseignement_id_fk: attr for attr in attributions}

            for vol in volumes:
                existing_attr = attr_map.get(vol.TypeEnseignement_id_fk)
                
                ens_id = ens_nom = ens_photo = ens_statut = ens_affiliation = None
                attr_id = None

                if existing_attr and existing_attr.enseignant:
                    e = existing_attr.enseignant
                    ens_id = e.Enseignant_id
                    ens_nom = f"{e.Enseignant_nom} {e.Enseignant_prenoms or ''}"
                    ens_photo = e.Enseignant_photo_profil_path
                    ens_statut = e.Enseignant_statut
                    attr_id = existing_attr.Attribution_id

                    # Construction de l'affiliation si Permanent
                    if e.Enseignant_statut == 'PERM' and e.composante_attachement:
                        comp = e.composante_attachement
                        inst_nom = comp.institution.Institution_nom if comp.institution else ""
                        # Format: "Université de Toamasina (Faculté des Sciences)"
                        ens_affiliation = f"{inst_nom} ({comp.Composante_label})" if inst_nom else comp.Composante_label

                # Construction du label du type d'enseignement
                display_label = vol.TypeEnseignement_id_fk
                if vol.type_enseignement:
                    label = vol.type_enseignement.TypeEnseignement_label
                    code = vol.type_enseignement.TypeEnseignement_code
                    display_label = f"{label} ({code})" if code else label

                slots_data.append(AttributionViewItem(
                    attribution_id=attr_id,
                    enseignant_id=ens_id,
                    enseignant_nom=ens_nom,
                    enseignant_photo=ens_photo,
                    enseignant_statut=ens_statut,
                    enseignant_affiliation=ens_affiliation,
                    type_id=vol.TypeEnseignement_id_fk,
                    type_label=display_label,
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