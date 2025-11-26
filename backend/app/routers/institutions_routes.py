# \backend\app\routers\institutions_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os

# Importations des modèles et schémas
from app.models import Institution, Composante, Domaine, Mention, Parcours
from app.schemas import InstitutionSchema, ComposanteSchema, DomaineSchema, MentionSchema, ParcoursSchema
from app.database import get_db
from sqlalchemy.exc import IntegrityError # 🚨 IMPORTANT : Importez IntegrityError
import inspect

router = APIRouter(
    prefix="/institutions",
    tags=["Institutions"],
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
#  INSTITUTION MANAGEMENT ENDPOINTS
# ------------------------------------

# 🔹 Ajouter une institution (POST)
@router.post("/", response_model=InstitutionSchema, summary="Ajouter une nouvelle institution")
def create_institution(
    id_institution: str = Form(..., description="Identifiant unique de l'institution (ex: INST_0001)"),
    # IMPORTANT : Gardez Optional[str] ici pour la flexibilité du formulaire
    code: Optional[str] = Form(..., description="Code court unique de l'institution (ex: UFIV)"), 
    nom: str = Form(..., description="Nom complet de l'institution (ex: Université de Fianarantsoa)"),
    type_institution: str = Form(..., description="Type de l'institution (ex: PRIVE, PUBLIC)"),
    abbreviation: Optional[str] = Form(None, description="Abréviation (ex: UF)"),
    description: Optional[str] = Form(None, description="Description ou mission"),
    logo_file: UploadFile = File(None, description="Fichier du logo de l'institution"),
    db: Session = Depends(get_db),
):
    """
    Crée une nouvelle institution académique dans la base de données.
    """
    # 🧪 VÉRIFICATION DE LA VERSION : Affiche le nom du fichier en cours d'exécution
    print(f"--- [DEBUG] FICHIER ACTIF : {inspect.getfile(create_institution)} ---")

    # --- ÉTAPE 1: DÉBOGAGE ET VÉRIFICATION OBLIGATOIRE DU CODE ---
    print(f"--- [DEBUG 1] Valeur brute reçue pour 'code': {code} (Type: {type(code)}) ---")

    # Si 'code' est None ou une chaîne vide après nettoyage (strip).
    if code is None or (isinstance(code, str) and not code.strip()):
        print("--- [DEBUG ÉCHEC] Condition Code obligatoire (400) atteinte. Code manquant ou vide. ---")
        raise HTTPException(
            status_code=400,
            detail="Le code de l'institution est obligatoire et ne peut pas être vide.",
            headers={"X-Error-Code": "CodeRequired"}
        )
    
    # Le code est maintenant garanti d'être une chaîne non vide
    clean_code = code.strip()
    
    # 🚨 POINT DE CONTRÔLE 2: Valeur finale pour la DB
    print(f"--- [DEBUG 2] 'clean_code' (pour DB et Vérif): {clean_code} (Type: {type(clean_code)}) ---")
    
    # Conversion des chaînes vides en None pour la base de données (champs optionnels)
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    description_db = description.strip() if description and description.strip() else None
    
    # --- ÉTAPE 2: VÉRIFICATION D'UNICITÉ ---
    
    if db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=400, detail=f"L'ID institution '{id_institution}' existe déjà.")
    
    if db.query(Institution).filter(Institution.Institution_nom == nom).first():
        raise HTTPException(status_code=400, detail=f"Le nom '{nom}' existe déjà.")

    if db.query(Institution).filter(Institution.Institution_code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' existe déjà.")
    
    # --- ÉTAPE 3: GESTION DU LOGO ---

    logo_path = None
    if logo_file and logo_file.filename:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        file_location = f"app{logo_path}"
        
        try:
            os.makedirs(os.path.dirname(file_location), exist_ok=True)
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement du logo: {e}")

    # --- ÉTAPE 4: CRÉATION ET INSERTION EN DB ---

    institution = Institution(
        Institution_id=id_institution,
        Institution_code=clean_code, # Code est garanti non-None/non-vide
        Institution_nom=nom,
        Institution_type=type_institution,
        Institution_abbreviation=abbreviation_db,
        Institution_description=description_db,
        Institution_logo_path=logo_path
    )
    
    # 🚨 POINT DE CONTRÔLE 3: Valeur envoyée à la base de données
    print(f"--- [DEBUG 3] Tentative d'insertion avec Code: {institution.Institution_code} ---")
    
    db.add(institution)
    
    try:
        db.commit()
        print("--- [DEBUG 4] COMMIT réussi. Insertion terminée. ---")
    except IntegrityError as e:
        db.rollback()
        # 🟢 CORRECTION : Capture spécifique de l'erreur de contrainte DB (NotNullViolation, UniqueViolation)
        print(f"--- [DEBUG ERREUR DB] IntegrityError: {e} ---")
        # Renvoie un 400 Bad Request au lieu du 500
        raise HTTPException(
            status_code=400, 
            detail="Violation de contrainte de base de données (Code ou ID non unique/vide). Assurez-vous que le code est rempli et unique."
        )
    except Exception as e:
        db.rollback()
        print(f"--- [DEBUG ERREUR INCONNUE] Exception: {e} ---")
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue lors de l'enregistrement: {e}")
        
    db.refresh(institution)
    return institution


# ------------------------------------
# 🔹 Liste de toutes les institutions (GET)
@router.get("/", response_model=list[InstitutionSchema], summary="Liste de toutes les institutions")
def get_institutions(db: Session = Depends(get_db)):
    """Retourne la liste complète de toutes les institutions."""
    return db.query(Institution).all()

# 🔹 Détails d'une institution (GET by ID)
@router.get("/{id_institution}", response_model=InstitutionSchema, summary="Détails d'une institution par ID")
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    """
    Récupère les détails d'une institution spécifique.
    Retourne 404 si non trouvée.
    """
    institution = (
        db.query(Institution)
        .filter(Institution.Institution_id == id_institution) 
        .first()
    )
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# ------------------------------------
# 🔹 Modifier une institution (PUT)
@router.put("/", response_model=InstitutionSchema, summary="Modifier une institution existante")
def update_institution(
    id_institution: str = Form(..., description="Identifiant de l'institution à modifier"),
    code: str = Form(..., description="Nouveau code court unique"),
    nom: str = Form(..., description="Nouveau nom complet"),
    type_institution: str = Form(..., description="Nouveau type"),
    abbreviation: Optional[str] = Form(None, description="Nouvelle abréviation"),
    description: Optional[str] = Form(None, description="Nouvelle description"),
    logo_file: UploadFile = File(None, description="Nouveau fichier de logo (optionnel)"),
    db: Session = Depends(get_db),
):
    """Met à jour les informations d'une institution existante identifiée par id_institution."""
    
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    # Vérification de l'unicité du CODE (excluant l'institution actuelle)
    existing_code = db.query(Institution).filter(
        Institution.Institution_code == code, 
        Institution.Institution_id != id_institution
    ).first()
    if existing_code:
        raise HTTPException(status_code=400, detail=f"Le code '{code}' existe déjà pour une autre institution.")

    # Vérification de l'unicité du NOM (excluant l'institution actuelle)
    existing_nom = db.query(Institution).filter(
        Institution.Institution_nom == nom, 
        Institution.Institution_id != id_institution
    ).first()
    if existing_nom:
        raise HTTPException(status_code=400, detail=f"Le nom '{nom}' existe déjà pour une autre institution.")

    # Mise à jour des champs
    institution.Institution_code = code 
    institution.Institution_nom = nom
    institution.Institution_type = type_institution
    institution.Institution_abbreviation = abbreviation
    institution.Institution_description = description

    # Gestion du logo (si un nouveau fichier est fourni)
    if logo_file and logo_file.filename:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        file_location = f"app{logo_path}"
        
        try:
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
            institution.Institution_logo_path = logo_path 
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement du nouveau logo: {e}")

    db.commit()
    db.refresh(institution)
    return institution

# ------------------------------------

# 🔹 Supprimer une institution (DELETE)
@router.delete("/{id_institution}", status_code=204, summary="Supprimer une institution")
def delete_institution(id_institution: str, db: Session = Depends(get_db)):
    """Supprime une institution par son identifiant unique."""
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
        
    # Supprimer le logo s'il existe (Institution_logo_path)
    if institution.Institution_logo_path:
        file_location = f"app{institution.Institution_logo_path}"
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except Exception as e:
                print(f"Avertissement: Impossible de supprimer le fichier logo {file_location}. Erreur: {e}")

    db.delete(institution)
    db.commit()
    # Retourne une réponse vide (204 No Content)
    return