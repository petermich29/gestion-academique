# backend/app/routers/ue_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/ues", 
    tags=["Unités d'Enseignement (UE)"]
)

# --- UTILITAIRE ID ---
def generate_next_ue_id(db: Session) -> str:
    """Génère le prochain ID (UE_0000000001)"""
    last_ue = db.query(models.UniteEnseignement).order_by(models.UniteEnseignement.UE_id.desc()).first()
    if not last_ue:
        return "UE_0000000001"
    
    try:
        part_num = last_ue.UE_id.split('_')[1]
        next_num = int(part_num) + 1
        return f"UE_{str(next_num).zfill(10)}"
    except:
        count = db.query(models.UniteEnseignement).count() + 1
        return f"UE_{str(count).zfill(10)}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_ue_id_endpoint(db: Session = Depends(get_db)):
    return generate_next_ue_id(db)

@router.post("/", response_model=schemas.UniteEnseignementSchema)
def create_ue(
    code: str = Form(...),
    intitule: str = Form(...),
    credit: int = Form(...),
    semestre_id: str = Form(...),
    # On récupère le parcours_id pour la logique métier, 
    # même s'il n'est pas stocké dans l'UE
    parcours_id: str = Form(...), 
    db: Session = Depends(get_db)
):
    # 1. Vérifications préalables
    semestre = db.query(models.Semestre).filter(models.Semestre.Semestre_id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=400, detail="Semestre invalide")
    
    niveau_id = semestre.Niveau_id_fk

    if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
        raise HTTPException(status_code=400, detail=f"Le code UE '{code}' existe déjà.")

    # 2. LOGIQUE INTELLIGENTE : Mise à jour de ParcoursNiveau
    # Vérifier si le lien entre le Parcours et ce Niveau existe déjà
    lien_pn = db.query(models.ParcoursNiveau).filter(
        models.ParcoursNiveau.Parcours_id_fk == parcours_id,
        models.ParcoursNiveau.Niveau_id_fk == niveau_id
    ).first()

    # S'il n'existe pas, on le crée (cela active le niveau dans l'affichage du parcours)
    if not lien_pn:
        pn_id = f"PN_{parcours_id}_{niveau_id}"
        # Calcul de l'ordre pour placer le niveau correctement
        count_ord = db.query(models.ParcoursNiveau).filter(models.ParcoursNiveau.Parcours_id_fk == parcours_id).count()
        
        new_pn = models.ParcoursNiveau(
            ParcoursNiveau_id=pn_id,
            Parcours_id_fk=parcours_id,
            Niveau_id_fk=niveau_id,
            ParcoursNiveau_ordre=count_ord + 1
        )
        db.add(new_pn)

    # 3. Création de l'UE (Sans toucher au modèle, champs standards uniquement)
    # 3. Création de l'UE 
    new_id = generate_next_ue_id(db)
    
    new_ue = models.UniteEnseignement(
        UE_id=new_id,
        UE_code=code.strip(),
        UE_intitule=intitule.strip(),
        UE_credit=credit,
        Semestre_id_fk=semestre_id,
        # 🟢 AJOUT : On enregistre enfin le Parcours ID !
        Parcours_id_fk=parcours_id
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

    # Vérification unicité code seulement si changé
    if code.strip() != ue.UE_code:
        if db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_code == code.strip()).first():
            raise HTTPException(status_code=400, detail="Code UE déjà utilisé.")

    ue.UE_code = code.strip()
    ue.UE_intitule = intitule.strip()
    ue.UE_credit = credit
    
    if semestre_id is not None:
        ue.Semestre_id_fk = semestre_id
    
    try:
        db.commit()
        db.refresh(ue)
        return ue
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{ue_id}", status_code=204)
def delete_ue(
    ue_id: str, 
    # On demande le parcours_id pour savoir quel lien nettoyer potentiellement
    parcours_id: str = Query(..., description="ID du parcours courant"),
    db: Session = Depends(get_db)
):
    ue = db.query(models.UniteEnseignement).filter(models.UniteEnseignement.UE_id == ue_id).first()
    
    if not ue:
        raise HTTPException(status_code=404, detail="UE introuvable")

    # On garde les infos avant suppression
    semestre_id = ue.Semestre_id_fk

    # 🟢 CORRECTION : On vérifie que l'UE qu'on supprime appartient bien au parcours courant
    # (Sécurité supplémentaire)
    if ue.Parcours_id_fk != parcours_id:
         raise HTTPException(status_code=400, detail="Cette UE n'appartient pas au parcours spécifié.")
    
    try:
        # 1. Suppression de l'UE
        db.delete(ue)
        db.commit() # Important de commiter ici pour que le compte suivant soit juste
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    # 2. LOGIQUE DE NETTOYAGE (Sans colonne Parcours_id_fk)
    # On regarde si le niveau contient encore des UEs.
    # Si le niveau est vide (tous semestres confondus), on supprime le lien ParcoursNiveau.
    
    semestre = db.query(models.Semestre).filter(models.Semestre.Semestre_id == semestre_id).first()
    
    if semestre:
        niveau_id = semestre.Niveau_id_fk
        
        # Trouver tous les semestres de ce niveau (ex: S1, S2)
        semestres_du_niveau = db.query(models.Semestre).filter(models.Semestre.Niveau_id_fk == niveau_id).all()
        ids_semestres = [s.Semestre_id for s in semestres_du_niveau]

        # Compter les UEs restantes dans TOUT le niveau
        # Note: Puisqu'on n'a pas Parcours_id_fk dans UE, on vérifie si le niveau est globalement vide.
        # C'est le comportement le plus logique sans modifier le modèle.
        # 🟢 CORRECTION MAJEURE : Compter les UEs restantes UNIQUEMENT POUR CE PARCOURS
        count_remaining = (
            db.query(models.UniteEnseignement)
            .filter(
                and_(
                    models.UniteEnseignement.Semestre_id_fk.in_(ids_semestres),
                    models.UniteEnseignement.Parcours_id_fk == parcours_id # <-- LE FILTRE CLÉ
                )
            )
            .count()
        )
        
        # Si plus aucune UE dans ce niveau, on retire le niveau du parcours
        if count_remaining == 0:
            lien_a_supprimer = db.query(models.ParcoursNiveau).filter(
                models.ParcoursNiveau.Parcours_id_fk == parcours_id,
                models.ParcoursNiveau.Niveau_id_fk == niveau_id
            ).first()
            
            if lien_a_supprimer:
                db.delete(lien_a_supprimer)
                db.commit()

    return