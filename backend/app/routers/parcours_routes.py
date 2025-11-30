# backend/app/routers/parcours_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/parcours", 
    tags=["Parcours & Enseignements"]
)

# --- UTILS ID ---
def get_next_ue_id(db: Session) -> str:
    """
    Génère un ID au format UE_XXXXXXXXXX (10 chiffres)
    Exemple : UE_0000000001
    """
    last_ue = db.query(models.UniteEnseignement).order_by(models.UniteEnseignement.UE_id.desc()).first()
    if not last_ue:
        return "UE_0000000001"
    
    try:
        # On suppose le format UE_ + 10 chiffres
        part_num = last_ue.UE_id.split('_')[1]
        next_num = int(part_num) + 1
        return f"UE_{str(next_num).zfill(10)}"
    except:
        # Fallback si le format précédent était différent
        count = db.query(models.UniteEnseignement).count() + 1
        return f"UE_{str(count).zfill(10)}"

# ==========================================
# 1. GESTION DU PARCOURS (DETAILS)
# ==========================================

@router.get("/{parcours_id}", response_model=schemas.ParcoursSchema)
def get_parcours(parcours_id: str, db: Session = Depends(get_db)):
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

# ==========================================
# 2. CRUD UNITÉS D'ENSEIGNEMENT (UE)
# ==========================================

@router.post("/ue", response_model=schemas.UniteEnseignementSchema)
def create_ue(
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: str = Form(...),
    parcours_id: str = Form(...), # <-- OBLIGATOIRE POUR L'AUTO-LINK
    db: Session = Depends(get_db)
):
    # 1. Vérification du Semestre et Récupération du Niveau
    semestre = db.query(models.Semestre).filter(models.Semestre.Semestre_id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=400, detail="Semestre invalide")
    
    # Le semestre possède déjà une FK vers le Niveau (ex: S1 -> L1)
    niveau_id = semestre.Niveau_id_fk
    
    # 2. Gestion Automatique Parcours-Niveau
    # Vérifier si ce parcours est déjà lié à ce niveau
    lien_pn = db.query(models.ParcoursNiveau).filter(
        models.ParcoursNiveau.Parcours_id_fk == parcours_id,
        models.ParcoursNiveau.Niveau_id_fk == niveau_id
    ).first()

    if not lien_pn:
        # Création automatique du lien
        # Format ID : PN_<idParcours>_<idNiveau>
        pn_id = f"PN_{parcours_id}_{niveau_id}"
        
        # Ordre par défaut (optionnel, simple incrément)
        count_ord = db.query(models.ParcoursNiveau).filter(models.ParcoursNiveau.Parcours_id_fk == parcours_id).count()
        
        new_pn = models.ParcoursNiveau(
            ParcoursNiveau_id=pn_id,
            Parcours_id_fk=parcours_id,
            Niveau_id_fk=niveau_id,
            ParcoursNiveau_ordre=count_ord + 1
        )
        db.add(new_pn)
        # On flush pour s'assurer que le lien existe avant de commiter l'UE
        db.flush()

    # 3. Vérification Code Unique UE
    if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
         # On rollback le flush précédent si erreur
         db.rollback()
         raise HTTPException(status_code=400, detail=f"Le code UE '{code}' existe déjà.")

    # 4. Création de l'UE
    new_id = get_next_ue_id(db)
    
    new_ue = models.UniteEnseignement(
        UE_id=new_id,
        UE_code=code.strip(),
        UE_intitule=intitule.strip(),
        UE_credit=credit,
        Semestre_id_fk=semestre_id
    )
    
    try:
        db.add(new_ue)
        db.commit()
        db.refresh(new_ue)
        return new_ue
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur d'intégrité : {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/ue/{ue_id}", response_model=schemas.UniteEnseignementSchema)
def update_ue(
    ue_id: str,
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: Optional[str] = Form(None), # Optionnel en update
    db: Session = Depends(get_db)
):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    if not ue:
        raise HTTPException(status_code=404, detail="UE introuvable")

    # Vérif unicité si code change
    if code.strip() != ue.UE_code:
        if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
            raise HTTPException(status_code=400, detail="Code UE déjà utilisé.")

    ue.UE_code = code.strip()
    ue.UE_intitule = intitule.strip()
    ue.UE_credit = credit
    
    if semestre_id and semestre_id != ue.Semestre_id_fk:
        # Note: Si on change de semestre, on pourrait potentiellement devoir créer un nouveau lien PN
        # Mais pour l'instant, on se contente de déplacer l'UE.
        ue.Semestre_id_fk = semestre_id
    
    try:
        db.commit()
        db.refresh(ue)
        return ue
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ue/{ue_id}", status_code=204)
def delete_ue(ue_id: str, db: Session = Depends(get_db)):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    if not ue:
        raise HTTPException(status_code=404, detail="UE introuvable")
    
    try:
        db.delete(ue)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer : Cette UE contient des éléments constitutifs (EC) ou des notes.")
    return