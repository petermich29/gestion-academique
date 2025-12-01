# backend/app/routers/parcours_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/parcours", 
    tags=["Parcours & Enseignements"]
)

# ==========================================
# 1. GESTION DU PARCOURS (DETAILS)
# ==========================================

@router.get("/{parcours_id}", response_model=schemas.ParcoursSchema)
def get_parcours(parcours_id: str, db: Session = Depends(get_db)):
    """
    Récupère les détails d'un parcours spécifique.
    """
    parcours = db.query(models.Parcours).filter(models.Parcours.Parcours_id == parcours_id).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    return parcours

@router.get("/{parcours_id}/structure", response_model=List[schemas.StructureNiveau])
def get_parcours_structure(parcours_id: str, db: Session = Depends(get_db)):
    """
    Récupère la structure académique : Niveaux -> Semestres -> UEs
    liée au parcours via la table d'association ParcoursNiveau.
    """
    # 1. Récupérer les niveaux liés à ce parcours via la table d'association
    liens = (
        db.query(models.ParcoursNiveau)
        .filter(models.ParcoursNiveau.Parcours_id_fk == parcours_id)
        .options(
            joinedload(models.ParcoursNiveau.niveau_lie)
            .joinedload(models.Niveau.semestres)
            .joinedload(models.Semestre.unites_enseignement)
            .joinedload(models.UniteEnseignement.elements_constitutifs)
        )
        .order_by(models.ParcoursNiveau.ParcoursNiveau_ordre)
        .all()
    )
    
    structure_response = []
    
    for lien in liens:
        niveau = lien.niveau_lie
        if not niveau: continue
        
        # Préparation des semestres pour ce niveau
        semestres_data = []
        # Trier les semestres par numéro (ex: S1, S2...)
        sorted_semestres = sorted(niveau.semestres, key=lambda x: x.Semestre_numero)
        
        for sem in sorted_semestres:
            ues_data = []
            for ue in sem.unites_enseignement:
                # On mappe vers le schéma StructureUE
                ues_data.append(schemas.StructureUE(
                    UE_id=ue.UE_id,
                    UE_code=ue.UE_code,
                    UE_intitule=ue.UE_intitule,
                    UE_credit=ue.UE_credit,
                    ec_count=len(ue.elements_constitutifs)
                ))
            
            # On mappe vers le schéma StructureSemestre
            semestres_data.append(schemas.StructureSemestre(
                Semestre_id=sem.Semestre_id,
                Semestre_numero=sem.Semestre_numero,
                Semestre_code=sem.Semestre_code,
                ues=ues_data
            ))

        # On mappe vers le schéma StructureNiveau
        structure_response.append(schemas.StructureNiveau(
            niveau_id=niveau.Niveau_id,
            niveau_label=niveau.Niveau_label,
            semestres=semestres_data
        ))
        
    return structure_response