#\backend\app\routers\composantes_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import shutil
import os

# Importations des modèles et schémas
from app.models import Institution, Composante, Domaine, Mention, Parcours
from app.schemas import InstitutionSchema, ComposanteSchema, DomaineSchema, MentionSchema, ParcoursSchema
from app.database import get_db

# Définition du routeur pour les Composantes
router = APIRouter(
    prefix="/composantes", # ⬅️ Toutes les routes de ce fichier commenceront par /composantes
    tags=["Composantes"],
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
# COMPOSANTE MANAGEMENT ENDPOINTS (Chemins: /composantes/...)
# ------------------------------------

# 🔹 Ajouter une Composante (POST)
@router.post("/", response_model=ComposanteSchema, summary="Créer une nouvelle composante (Faculté, Département, etc.)")
def create_composante(
    composante_code: str = Form(..., description="Code unique de la composante (ex: FDS)"),
    nom: str = Form(..., description="Nom de la composante (Composante_label)"),
    id_institution: str = Form(..., description="ID de l'institution parente"),
    abbreviation: str = Form(None, description="Abréviation de la composante"),
    description: str = Form(None, description="Description"),
    db: Session = Depends(get_db),
):
    if db.query(Composante).filter(Composante.Composante_code == composante_code).first():
        raise HTTPException(status_code=400, detail=f"Le code composante '{composante_code}' existe déjà.")
    
    if not db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=404, detail="Institution parente non trouvée.")

    composante = Composante(
        Composante_code=composante_code, 
        Composante_label=nom, 
        Composante_abbreviation=abbreviation,
        Composante_description=description,
        Institution_id_fk=id_institution 
    ) 
    db.add(composante)
    db.commit()
    db.refresh(composante)
    return composante

# 🔹 Modifier une Composante (PUT)
@router.put("/", response_model=ComposanteSchema, summary="Modifier une composante existante")
def update_composante(
    composante_code: str = Form(..., description="Code de la composante à modifier"),
    nom: str = Form(..., description="Nouveau nom de la composante"),
    id_institution: str = Form(..., description="Nouvel ID de l'institution parente (pour rattachement)"),
    abbreviation: str = Form(None, description="Nouvelle abréviation"),
    description: str = Form(None, description="Nouvelle description"),
    db: Session = Depends(get_db),
):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
        
    if not db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=404, detail="Nouvelle institution parente non trouvée.")

    composante.Composante_label = nom
    composante.Composante_abbreviation = abbreviation
    composante.Composante_description = description
    composante.Institution_id_fk = id_institution 
    
    db.commit()
    db.refresh(composante)
    return composante

# 🔹 Liste des composantes d'une institution (GET)
@router.get("/institution", response_model=List[ComposanteSchema], summary="Liste des composantes pour une institution donnée")
def get_composantes_by_institution(institution_id: str = Query(..., description="ID de l'institution parente"), db: Session = Depends(get_db)):
    """Récupère toutes les composantes rattachées à l'ID institutionnel spécifié."""
    
    # POINT CLÉ : VÉRIFIEZ QUE 'INST_0001' EST BIEN PRÉSENT EN DB AVEC Institution_id
    #institution_check = db.query(Institution).filter(Institution.Institution_id == institution_id).first()
    #if not institution_check:
        #raise HTTPException(status_code=404, detail="Institution parente non trouvée")
          
    composantes = (
        db.query(Composante)
        .filter(Composante.Institution_id_fk == institution_id)
        .all()
    )
    return composantes

# 🔹 Détails d'une Composante (GET by Code)
@router.get("/{composante_code}", response_model=ComposanteSchema, summary="Détails d'une composante par Code")
def get_composante(composante_code: str, db: Session = Depends(get_db)):
    """Récupère les détails d'une composante spécifique en utilisant son Composante_code."""
    # Le chemin est /composantes/{composante_code}
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    return composante

# 🔹 Liste de toutes les Composantes (GET all)
@router.get("/all", response_model=List[ComposanteSchema], summary="Liste de toutes les composantes")
def get_all_composantes(db: Session = Depends(get_db)):
    return db.query(Composante).all()


# 🔹 Supprimer une Composante (DELETE)
@router.delete("/{composante_code}", status_code=204, summary="Supprimer une composante")
def delete_composante(composante_code: str, db: Session = Depends(get_db)):
    """Supprime une composante par son code unique."""
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée")
    
    db.delete(composante)
    db.commit()
    return {"detail": "Composante supprimée avec succès"}