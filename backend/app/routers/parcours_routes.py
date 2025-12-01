# backend/app/routers/parcours_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exc # Import nécessaire pour le diagnostic
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
    liée au parcours.
    """
    
    # 💥 Solution potentielle au problème de rafraîchissement
    # S'assurer que la session de lecture ne réutilise pas des objets périmés.
    # En général, une nouvelle session via Depends(get_db) suffit, mais 
    # db.expire_all() peut forcer une nouvelle lecture depuis la DB si le problème 
    # persiste dans un environnement transactionnel complexe.
    try:
        db.expire_all() 
    except exc.InvalidRequestError:
        # Ignore si la session est fermée ou sans transaction active
        pass

    # 1. Récupérer les niveaux liés à ce parcours via la table d'association
    liens = (
        db.query(models.ParcoursNiveau)
        .filter(models.ParcoursNiveau.Parcours_id_fk == parcours_id)
        .options(
            # Utilisation de joinedload pour optimiser les requêtes (N+1)
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
        
        semestres_data = []
        # Trier les semestres par numéro (S1, S2, etc.)
        sorted_semestres = sorted(niveau.semestres, key=lambda x: x.Semestre_numero)
        
        for sem in sorted_semestres:
            ues_data = []
            
            # Trier les UEs par code pour un affichage stable
            sorted_ues = sorted(sem.unites_enseignement, key=lambda x: x.UE_code)
            
            for ue in sorted_ues:
                # On mappe vers le schéma StructureUE (vérification du mapping)
                ues_data.append(schemas.StructureUE(
                    id=ue.UE_id,
                    code=ue.UE_code,
                    intitule=ue.UE_intitule,
                    credit=ue.UE_credit,
                    ec_count=len(ue.elements_constitutifs)
                ))
            
            semestres_data.append(schemas.StructureSemestre(
                id=sem.Semestre_id,
                numero=sem.Semestre_numero,
                code=sem.Semestre_code,
                ues=ues_data
            ))

        structure_response.append(schemas.StructureNiveau(
            niveau_id=niveau.Niveau_id,
            niveau_label=niveau.Niveau_label,
            semestres=semestres_data
        ))
        
    return structure_response