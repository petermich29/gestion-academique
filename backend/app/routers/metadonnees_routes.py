# backend/app/routers/metadonnees_routes.py

# backend/app/routers/metadonnees_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from sqlalchemy.exc import IntegrityError

# Import de la configuration DB et des modèles/schémas
from app.database import get_db
from app import models, schemas


router = APIRouter(
    prefix="/metadonnees",
    tags=["Métadonnées (Domaines, Types, Années)"]
)

def get_next_id(db: Session, model, id_column, prefix: str, width: int):
    """
    Génère le prochain ID disponible en comblant les trous.
    Ex: Si DOMA_01 et DOMA_03 existent, retourne DOMA_02.
    """
    existing_ids = db.query(id_column).filter(id_column.like(f"{prefix}%")).all()
    
    existing_nums = set()
    for (r_id,) in existing_ids:
        if r_id.startswith(prefix):
            try:
                num_part = r_id[len(prefix):]
                existing_nums.add(int(num_part))
            except ValueError:
                continue 

    next_num = 1
    while next_num in existing_nums:
        next_num += 1
    
    return f"{prefix}{str(next_num).zfill(width)}"


# =================================================================
# 1. DOMAINES (ID: DOMA_XX)
# =================================================================

# --- 1a. Routes Générales et Statiques ---

@router.get("/domaines/next-id", response_model=str)
def get_domaine_next_id(db: Session = Depends(get_db)):
    """Récupère le prochain ID de domaine disponible (DOMA_XX)."""
    return get_next_id(db, models.Domaine, models.Domaine.Domaine_id, "DOMA_", 2)

@router.post("/domaines", response_model=schemas.DomaineSchema)
def create_domaine(item: schemas.DomaineCreate, db: Session = Depends(get_db)):
    # Vérifier unicité du code
    if db.query(models.Domaine).filter(models.Domaine.Domaine_code == item.code).first():
        raise HTTPException(status_code=400, detail="Ce code domaine existe déjà.")

    new_id = get_next_id(db, models.Domaine, models.Domaine.Domaine_id, "DOMA_", 2)
    
    db_item = models.Domaine(
        Domaine_id=new_id,
        Domaine_code=item.code.strip().upper(),
        Domaine_label=item.label.strip(),
        Domaine_description=item.description
    )
    try:
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du domaine: {str(e)}")
    
@router.get("/domaines", response_model=List[schemas.DomaineSchema])
def get_domaines(db: Session = Depends(get_db)):
    # On utilise .options(joinedload(...)) pour inclure les mentions ET leurs composantes
    domaines = db.query(models.Domaine).options(
        joinedload(models.Domaine.mentions).joinedload(models.Mention.composante)
    ).order_by(models.Domaine.Domaine_id).all()
    return domaines

# --- 1b. Routes Dynamiques ({id}) ---

@router.get("/domaines/{id}", response_model=schemas.DomaineSchema)
def get_domaine_by_id(id: str, db: Session = Depends(get_db)):
    """Récupère un domaine par son ID (DOMA_XX)."""
    db_item = db.query(models.Domaine).filter(models.Domaine.Domaine_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Domaine introuvable")
    return db_item

@router.put("/domaines/{id}", response_model=schemas.DomaineSchema)
def update_domaine(id: str, item: schemas.DomaineCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Domaine).filter(models.Domaine.Domaine_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Domaine introuvable")
    
    # Vérification code unique (sauf si c'est le même ID)
    existing = db.query(models.Domaine).filter(models.Domaine.Domaine_code == item.code.strip().upper()).first()
    if existing and existing.Domaine_id != id:
        raise HTTPException(status_code=400, detail="Ce code est déjà utilisé par un autre domaine.")

    db_item.Domaine_code = item.code.strip().upper()
    db_item.Domaine_label = item.label.strip()
    db_item.Domaine_description = item.description
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/domaines/{id}")
def delete_domaine(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.Domaine).filter(models.Domaine.Domaine_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Domaine introuvable")
    
    try:
        db.delete(db_item)
        db.commit()
        return {"message": "Domaine supprimé"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer (domaine lié).")
    
@router.get("/domaines", response_model=List[schemas.DomaineSchema], summary="Récupérer tous les Domaines")
def get_all_domaines(db: Session = Depends(get_db)):
    """
    Récupère la liste complète des domaines, triés par label.
    Utilisé par le frontend pour les listes déroulantes.
    """
    return db.query(models.Domaine).order_by(models.Domaine.Domaine_label).all()


# =================================================================
# 2. TYPES DE COMPOSANTE (ID: TYCO_XX) - [MODIFIÉ]
# =================================================================

@router.get("/types-composante", response_model=List[schemas.TypeComposanteSchema])
def get_types_composante(db: Session = Depends(get_db)):
    # ✅ CORRECTION MAJEURE ICI :
    # On ajoute .options(joinedload(models.TypeComposante.composantes))
    # Cela dit à SQLAlchemy de faire une jointure pour récupérer les composantes liées
    # en une seule requête, ce qui permet à Pydantic de remplir le champ 'composantes'.
    return db.query(models.TypeComposante)\
             .options(joinedload(models.TypeComposante.composantes))\
             .order_by(models.TypeComposante.TypeComposante_id).all()


@router.post("/types-composante", response_model=schemas.TypeComposanteSchema, status_code=status.HTTP_201_CREATED)
def create_type_composante(item: schemas.TypeComposanteCreate, db: Session = Depends(get_db)):
    # Validation ID
    if db.query(models.TypeComposante).filter(models.TypeComposante.TypeComposante_id == item.id_type_composante).first():
        raise HTTPException(status_code=400, detail="Cet ID existe déjà.")
    
    # Validation Libellé
    if db.query(models.TypeComposante).filter(models.TypeComposante.TypeComposante_label == item.label).first():
        raise HTTPException(status_code=400, detail="Ce libellé existe déjà.")

    db_item = models.TypeComposante(
        TypeComposante_id=item.id_type_composante,
        TypeComposante_label=item.label,
        TypeComposante_description=item.description
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/types-composante/{id}", response_model=schemas.TypeComposanteSchema)
def update_type_composante(id: str, item: schemas.TypeComposanteUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeComposante).filter(models.TypeComposante.TypeComposante_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Type introuvable")

    if item.label:
        db_item.TypeComposante_label = item.label
    if item.description is not None:
        db_item.TypeComposante_description = item.description

    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/types-composante/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_type_composante(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeComposante).filter(models.TypeComposante.TypeComposante_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Type introuvable")
    
    try:
        db.delete(db_item)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer ce type (lié à des composantes).")

# =================================================================
# 3. TYPES DE FORMATION (ID: TYPE_XX)
# =================================================================

@router.get("/types-formation", response_model=List[schemas.TypeFormationSchema])
def get_types_formation(db: Session = Depends(get_db)):
    return db.query(models.TypeFormation).order_by(models.TypeFormation.TypeFormation_id).all()

@router.post("/types-formation", response_model=schemas.TypeFormationSchema)
def create_type_formation(item: schemas.TypeFormationBase, db: Session = Depends(get_db)):
    if db.query(models.TypeFormation).filter(models.TypeFormation.TypeFormation_code == item.code).first():
        raise HTTPException(status_code=400, detail="Ce code existe déjà.")

    new_id = get_next_id(db, models.TypeFormation, models.TypeFormation.TypeFormation_id, "TYPE_", 2)
    
    db_item = models.TypeFormation(
        TypeFormation_id=new_id,
        TypeFormation_code=item.code,
        TypeFormation_label=item.label,
        TypeFormation_description=item.description
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/types-formation/{id}", response_model=schemas.TypeFormationSchema)
def update_type_formation(id: str, item: schemas.TypeFormationBase, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeFormation).filter(models.TypeFormation.TypeFormation_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Type de formation introuvable")

    existing = db.query(models.TypeFormation).filter(models.TypeFormation.TypeFormation_code == item.code).first()
    if existing and existing.TypeFormation_id != id:
        raise HTTPException(status_code=400, detail="Ce code est déjà utilisé.")

    db_item.TypeFormation_code = item.code
    db_item.TypeFormation_label = item.label
    db_item.TypeFormation_description = item.description
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/types-formation/{id}")
def delete_type_formation(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeFormation).filter(models.TypeFormation.TypeFormation_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Introuvable")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Supprimé"}


# =================================================================
# 4. MODES D'INSCRIPTION (ID: MODE_XXX)
# =================================================================

@router.get("/modes-inscription", response_model=List[schemas.ModeInscriptionSchema])
def get_modes_inscription(db: Session = Depends(get_db)):
    return db.query(models.ModeInscription).order_by(models.ModeInscription.ModeInscription_id).all()

@router.post("/modes-inscription", response_model=schemas.ModeInscriptionSchema)
def create_mode_inscription(item: schemas.ModeInscriptionBase, db: Session = Depends(get_db)):
    # Note: Le schéma Base a 'code' optionnel, mais pour la création on préfère qu'il soit là ou géré
    code_val = item.code if item.code else item.label[:3].upper()

    if db.query(models.ModeInscription).filter(models.ModeInscription.ModeInscription_code == code_val).first():
        raise HTTPException(status_code=400, detail="Ce code existe déjà.")

    new_id = get_next_id(db, models.ModeInscription, models.ModeInscription.ModeInscription_id, "MODE_", 3)

    db_item = models.ModeInscription(
        ModeInscription_id=new_id,
        ModeInscription_code=code_val,
        ModeInscription_label=item.label,
        ModeInscription_description=item.description
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/modes-inscription/{id}", response_model=schemas.ModeInscriptionSchema)
def update_mode_inscription(id: str, item: schemas.ModeInscriptionBase, db: Session = Depends(get_db)):
    db_item = db.query(models.ModeInscription).filter(models.ModeInscription.ModeInscription_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Mode introuvable")

    code_val = item.code if item.code else db_item.ModeInscription_code
    
    existing = db.query(models.ModeInscription).filter(models.ModeInscription.ModeInscription_code == code_val).first()
    if existing and existing.ModeInscription_id != id:
        raise HTTPException(status_code=400, detail="Code déjà utilisé.")

    db_item.ModeInscription_code = code_val
    db_item.ModeInscription_label = item.label
    db_item.ModeInscription_description = item.description
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/modes-inscription/{id}")
def delete_mode_inscription(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.ModeInscription).filter(models.ModeInscription.ModeInscription_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Introuvable")
    db.delete(db_item)
    db.commit()
    return {"message": "Supprimé"}


# =================================================================
# 5. TYPES D'ENSEIGNEMENT (ID: TYEN_XX)
# =================================================================

@router.get("/types-enseignement", response_model=List[schemas.TypeEnseignementSchema])
def get_types_enseignement(db: Session = Depends(get_db)):
    return db.query(models.TypeEnseignement).order_by(models.TypeEnseignement.TypeEnseignement_id).all()

@router.post("/types-enseignement", response_model=schemas.TypeEnseignementSchema)
def create_type_enseignement(item: schemas.TypeEnseignementBase, db: Session = Depends(get_db)):
    code_val = item.code if item.code else item.label[:3].upper()

    if db.query(models.TypeEnseignement).filter(models.TypeEnseignement.TypeEnseignement_code == code_val).first():
        raise HTTPException(status_code=400, detail="Ce code existe déjà.")

    new_id = get_next_id(db, models.TypeEnseignement, models.TypeEnseignement.TypeEnseignement_id, "TYEN_", 2)
    
    db_item = models.TypeEnseignement(
        TypeEnseignement_id=new_id,
        TypeEnseignement_code=code_val,
        TypeEnseignement_label=item.label
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/types-enseignement/{id}", response_model=schemas.TypeEnseignementSchema)
def update_type_enseignement(id: str, item: schemas.TypeEnseignementBase, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeEnseignement).filter(models.TypeEnseignement.TypeEnseignement_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Introuvable")

    code_val = item.code if item.code else db_item.TypeEnseignement_code
    
    existing = db.query(models.TypeEnseignement).filter(models.TypeEnseignement.TypeEnseignement_code == code_val).first()
    if existing and existing.TypeEnseignement_id != id:
        raise HTTPException(status_code=400, detail="Code déjà utilisé.")

    db_item.TypeEnseignement_code = code_val
    db_item.TypeEnseignement_label = item.label
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/types-enseignement/{id}")
def delete_type_enseignement(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.TypeEnseignement).filter(models.TypeEnseignement.TypeEnseignement_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Introuvable")
    db.delete(db_item)
    db.commit()
    return {"message": "Supprimé"}


# =================================================================
# 6. ANNÉES UNIVERSITAIRES (ID: ANNE_XXXX)
# =================================================================

@router.get("/annees-universitaires", response_model=List[schemas.AnneeUniversitaireSchema])
def get_annees_univ(db: Session = Depends(get_db)):
    # Tri par ordre décroissant (plus récent en premier)
    return db.query(models.AnneeUniversitaire).order_by(models.AnneeUniversitaire.AnneeUniversitaire_ordre.desc()).all()

@router.post("/annees-universitaires", response_model=schemas.AnneeUniversitaireSchema)
def create_annee_univ(item: schemas.AnneeUniversitaireCreate, db: Session = Depends(get_db)):
    # 1. Vérifications unicité
    if db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_annee == item.annee).first():
        raise HTTPException(status_code=400, detail="Cette année existe déjà.")
        
    if db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_ordre == item.ordre).first():
        raise HTTPException(status_code=400, detail="Cet ordre est déjà utilisé.")

    # 2. Gestion de l'année active (Exclusion mutuelle)
    if item.is_active:
        # Si la nouvelle année est active, on désactive toutes les autres
        db.query(models.AnneeUniversitaire).update({models.AnneeUniversitaire.AnneeUniversitaire_is_active: False})

    # 3. Génération ID : ANNE_XXXX
    new_id = get_next_id(db, models.AnneeUniversitaire, models.AnneeUniversitaire.AnneeUniversitaire_id, "ANNE_", 4)

    db_item = models.AnneeUniversitaire(
        AnneeUniversitaire_id=new_id,
        AnneeUniversitaire_annee=item.annee,
        AnneeUniversitaire_description=item.description,
        AnneeUniversitaire_ordre=item.ordre,
        AnneeUniversitaire_is_active=item.is_active
    )
    
    try:
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/annees-universitaires/{id}", response_model=schemas.AnneeUniversitaireSchema)
def update_annee_univ(id: str, item: schemas.AnneeUniversitaireUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Année introuvable")

    # Vérification unicité année
    if item.annee and item.annee != db_item.AnneeUniversitaire_annee:
        if db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_annee == item.annee).first():
            raise HTTPException(status_code=400, detail="Cette année existe déjà.")

    # Vérification unicité ordre
    if item.ordre is not None and item.ordre != db_item.AnneeUniversitaire_ordre:
        if db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_ordre == item.ordre).first():
            raise HTTPException(status_code=400, detail="Cet ordre est déjà utilisé.")

    # Gestion de l'année active lors de l'update
    if item.is_active is True:
        # On désactive tout le monde (sauf celle qu'on va activer juste après, mais le update global est plus simple)
        db.query(models.AnneeUniversitaire).update({models.AnneeUniversitaire.AnneeUniversitaire_is_active: False})
        db_item.AnneeUniversitaire_is_active = True
    elif item.is_active is False:
        db_item.AnneeUniversitaire_is_active = False

    # Mise à jour des autres champs si présents
    if item.annee: db_item.AnneeUniversitaire_annee = item.annee
    if item.description: db_item.AnneeUniversitaire_description = item.description
    if item.ordre: db_item.AnneeUniversitaire_ordre = item.ordre
    
    try:
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/annees-universitaires/{id}")
def delete_annee_univ(id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Année introuvable")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Année supprimée"}

# =================================================================
# 7. SEMESTRES (Lecture seule pour liste déroulante)
# =================================================================

@router.get("/semestres", response_model=List[schemas.SemestreSchema])
def get_semestres_list(db: Session = Depends(get_db)):
    # On renvoie la liste triée par ID ou par Numéro
    return db.query(models.Semestre).order_by(models.Semestre.Semestre_numero).all()