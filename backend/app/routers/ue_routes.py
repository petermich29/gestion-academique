# backend/app/routers/ue_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/ues",  # L'URL sera: http://.../api/ues
    tags=["Unités d'Enseignement (UE)"]
)

# --- UTILITAIRE ID ---
def generate_next_ue_id(db: Session) -> str:
    """Génère le prochain ID (UE_0000000001)"""
    last_ue = db.query(models.UniteEnseignement).order_by(models.UniteEnseignement.UE_id.desc()).first()
    if not last_ue:
        return "UE_0000000001"
    
    try:
        # Format attendu: UE_ + 10 chiffres
        part_num = last_ue.UE_id.split('_')[1]
        next_num = int(part_num) + 1
        return f"UE_{str(next_num).zfill(10)}"
    except:
        # Fallback de sécurité
        count = db.query(models.UniteEnseignement).count() + 1
        return f"UE_{str(count).zfill(10)}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_ue_id_endpoint(db: Session = Depends(get_db)):
    """Retourne le prochain ID disponible pour affichage dans le formulaire"""
    return generate_next_ue_id(db)

@router.post("/", response_model=schemas.UniteEnseignementSchema)
def create_ue(
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: str = Form(...),
    parcours_id: str = Form(...), # Crucial pour lier au Niveau
    db: Session = Depends(get_db)
):
    # 1. Récupération du Semestre et de son Niveau parent
    semestre = db.query(models.Semestre).filter(models.Semestre.Semestre_id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=400, detail="Semestre invalide")
    
    niveau_id = semestre.Niveau_id_fk
    
    # 2. LOGIQUE AUTOMATIQUE : Liaison Parcours <-> Niveau
    # On vérifie si le parcours est déjà lié à ce niveau dans ParcoursNiveau
    lien_pn = db.query(models.ParcoursNiveau).filter(
        models.ParcoursNiveau.Parcours_id_fk == parcours_id,
        models.ParcoursNiveau.Niveau_id_fk == niveau_id
    ).first()

    if not lien_pn:
        # Création du lien automatique
        pn_id = f"PN_{parcours_id}_{niveau_id}" # ID Composite simple
        
        # Calcul de l'ordre (facultatif, on met à la suite)
        count_ord = db.query(models.ParcoursNiveau).filter(models.ParcoursNiveau.Parcours_id_fk == parcours_id).count()
        
        new_pn = models.ParcoursNiveau(
            ParcoursNiveau_id=pn_id,
            Parcours_id_fk=parcours_id,
            Niveau_id_fk=niveau_id,
            ParcoursNiveau_ordre=count_ord + 1
        )
        db.add(new_pn)
        db.flush() # Important pour valider la foreign key potentielle

    # 3. Vérification unicité Code UE
    if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
         db.rollback()
         raise HTTPException(status_code=400, detail=f"Le code UE '{code}' existe déjà.")

    # 4. Création de l'UE
    new_id = generate_next_ue_id(db)
    
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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

    if code.strip() != ue.UE_code:
        if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
            raise HTTPException(status_code=400, detail="Code UE déjà utilisé.")

    ue.UE_code = code.strip()
    ue.UE_intitule = intitule.strip()
    ue.UE_credit = credit
    
    if semestre_id:
        ue.Semestre_id_fk = semestre_id
    
    try:
        db.commit()
        db.refresh(ue)
        return ue
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ue_id}", status_code=204)
def delete_ue(ue_id: str, db: Session = Depends(get_db)):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    if not ue:
        raise HTTPException(status_code=404, detail="UE introuvable")
    
    try:
        db.delete(ue)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer : Cette UE contient des données liées (EC, Notes...).")