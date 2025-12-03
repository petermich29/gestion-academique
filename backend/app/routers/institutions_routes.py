#gestion-academique\backend\app\routers\institutions_routes.py
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError 
import inspect 

# Importations des modèles et schémas
from app.models import Institution, InstitutionHistorique, AnneeUniversitaire
from app.schemas import InstitutionSchema
from app.database import get_db

router = APIRouter(
    prefix="/institutions",
    tags=["Institutions"],
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
#   INSTITUTION MANAGEMENT ENDPOINTS
# ------------------------------------

# 🔹 Ajouter une institution (POST)
@router.post("/", response_model=InstitutionSchema, summary="Ajouter une nouvelle institution")
def create_institution(
    id_institution: str = Form(..., description="Identifiant unique de l'institution (ex: INST_0001)"),
    code: str = Form(..., description="Code court unique de l'institution (ex: UFIV)"), 
    nom: str = Form(..., description="Nom complet de l'institution (ex: Université de Fianarantsoa)"),
    type_institution: str = Form(..., description="Type de l'institution (ex: PRIVE, PUBLIC)"),
    abbreviation: Optional[str] = Form(None, description="Abréviation (ex: UF)"),
    description: Optional[str] = Form(None, description="Description ou mission"),
    logo_file: UploadFile = File(None, description="Fichier du logo de l'institution"),
    annees_universitaires: Optional[List[str]] = Form(None, description="IDs des années universitaires à lier."),
    db: Session = Depends(get_db),
):
    """
    Crée une nouvelle institution académique et l'associe optionnellement à des années historiques.
    """
    if not code.strip():
        raise HTTPException(
            status_code=400,
            detail="Le code de l'institution est obligatoire et ne peut pas être vide."
        )
    
    clean_code = code.strip()
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    description_db = description.strip() if description and description.strip() else None
    
    if db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=400, detail=f"L'ID institution '{id_institution}' existe déjà.")
    
    if db.query(Institution).filter(Institution.Institution_nom == nom).first():
        raise HTTPException(status_code=400, detail=f"Le nom '{nom}' existe déjà.")

    if db.query(Institution).filter(Institution.Institution_code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' existe déjà.")
    
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

    institution = Institution(
        Institution_id=id_institution,
        Institution_code=clean_code,
        Institution_nom=nom,
        Institution_type=type_institution,
        Institution_abbreviation=abbreviation_db,
        Institution_description=description_db,
        Institution_logo_path=logo_path
    )
    
    db.add(institution)

    # Création de l'historique des années pour cette institution
    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = InstitutionHistorique(
                Institution_id_fk=id_institution,
                AnneeUniversitaire_id_fk=annee_id,
                Institution_nom_historique=nom,
                Institution_code_historique=clean_code,
                Institution_description_historique=description_db
            )
            db.add(hist)
    
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Violation de contrainte de base de données (Code ou ID non unique/vide)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue: {e}")
        
    db.refresh(institution)
    return institution

# 🔹 Liste de toutes les institutions (GET)
@router.get("/", response_model=list[InstitutionSchema], summary="Liste de toutes les institutions (filtrables par années)")
def get_institutions(
    annees: Optional[List[str]] = Query(None, description="Liste des ID d'années universitaires pour filtrer l'historique"),
    db: Session = Depends(get_db)
):
    query = db.query(Institution)

    # Filtrage par historique des années
    if annees and len(annees) > 0:
        query = query.join(InstitutionHistorique).filter(
            InstitutionHistorique.AnneeUniversitaire_id_fk.in_(annees)
        ).distinct()

    return query.all()

# 🔹 Détails d'une institution (GET by ID)
@router.get("/{id_institution}", response_model=InstitutionSchema, summary="Détails d'une institution par ID")
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = (
        db.query(Institution)
        .filter(Institution.Institution_id == id_institution) 
        .first()
    )
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# 🆕 Récupérer les IDs d'années universitaires liées à une institution
@router.get("/{id_institution}/annees-historique", response_model=List[str], summary="Récupérer les IDs d'années liées à une institution")
def get_institution_years_history(id_institution: str, db: Session = Depends(get_db)):
    """
    Récupère la liste des IDs d'années universitaires pour lesquelles l'institution est enregistrée dans l'historique.
    """
    history_records = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution
    ).all()
    
    # Retourne uniquement les IDs d'années
    return [rec.AnneeUniversitaire_id_fk for rec in history_records]


# 🔹 Modifier une institution (PUT)
@router.put("/", response_model=InstitutionSchema, summary="Modifier une institution existante")
def update_institution(
    id_institution: str = Form(...),
    code: str = Form(...),
    nom: str = Form(...),
    type_institution: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: UploadFile = File(None),
    annees_universitaires: Optional[List[str]] = Form(None, description="IDs des années universitaires à synchroniser dans l'historique."),
    db: Session = Depends(get_db),
):
    clean_code = code.strip()
    clean_nom = nom.strip()
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    description_db = description.strip() if description and description.strip() else None

    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    if not clean_code:
        raise HTTPException(status_code=400, detail="Le code de l'institution ne peut pas être vide.")

    # Vérification unicité code/nom
    existing_code = db.query(Institution).filter(
        Institution.Institution_code == clean_code, 
        Institution.Institution_id != id_institution
    ).first()
    if existing_code:
        raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' existe déjà pour une autre institution.")

    existing_nom = db.query(Institution).filter(
        Institution.Institution_nom == clean_nom, 
        Institution.Institution_id != id_institution
    ).first()
    if existing_nom:
        raise HTTPException(status_code=400, detail=f"Le nom '{clean_nom}' existe déjà pour une autre institution.")

    # Mise à jour des champs de l'institution
    institution.Institution_code = clean_code
    institution.Institution_nom = clean_nom
    institution.Institution_type = type_institution
    institution.Institution_abbreviation = abbreviation_db
    institution.Institution_description = description_db

    # Gestion du logo
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

    # LOGIQUE DE SYNCHRONISATION D'HISTORIQUE DES ANNÉES (Correction Appliquée)
    # 1. Supprimer tous les enregistrements d'historique existants pour cette institution
    db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution
    ).delete(synchronize_session=False)

    # 2. Recréer les enregistrements à partir de la liste reçue dans le formulaire
    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = InstitutionHistorique(
                Institution_id_fk=id_institution,
                AnneeUniversitaire_id_fk=annee_id,
                Institution_nom_historique=clean_nom,
                Institution_code_historique=clean_code,
                Institution_description_historique=description_db
            )
            db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Violation de contrainte de base de données lors de la mise à jour."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue: {e}")
        
    db.refresh(institution)
    return institution

# 🔹 Supprimer une institution (DELETE)
@router.delete("/{id_institution}", status_code=204, summary="Supprimer une institution")
def delete_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
        
    if institution.Institution_logo_path:
        file_location = f"app{institution.Institution_logo_path}"
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except Exception as e:
                print(f"Avertissement: Impossible de supprimer le fichier logo {file_location}. Erreur: {e}")

    # La suppression des Composantes/Historique devrait idéalement être gérée par la cascade de la DB
    # S'assurer que le modèle SQLAlchemy a `cascade="all, delete"` sur la relation `InstitutionHistorique`.
    # Si non, la suppression de l'historique doit être manuelle ici :
    # db.query(InstitutionHistorique).filter(InstitutionHistorique.Institution_id_fk == id_institution).delete()
    
    db.delete(institution)
    db.commit()
    return