# gestion-academique\backend\app\routers\composantes_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 
from pydantic import ValidationError 

from app.models import Composante, Institution, Mention, ComposanteHistorique
from app.schemas import ComposanteSchema, ComposanteCreate 
from app.database import get_db

router = APIRouter(
    prefix="/composantes", 
    tags=["Composantes (Établissements)"]
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
# FONCTIONS UTILITAIRES
# ------------------------------------

COMPOSANTE_ID_PREFIX = "COMP_"
ID_PAD_LENGTH = 4 
ID_REGEX = re.compile(r"COMP_(\d+)")

# 🆕 Route pour récupérer le prochain ID disponible
@router.get("/next-id", response_model=str, summary="Obtenir le prochain ID disponible")
def get_next_available_id(db: Session = Depends(get_db)):
    """Trouve le prochain ID Composante séquentiel disponible (ex: COMP_0001)."""
    existing_ids = [c.Composante_id for c in db.query(Composante.Composante_id).all()]
    used_numbers = []
    for id_str in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match.group(1)))
            
    next_num = 1
    used_numbers.sort()
    for n in used_numbers:
        if n == next_num:
            next_num += 1
        elif n > next_num:
            break
            
    return f"{COMPOSANTE_ID_PREFIX}{str(next_num).zfill(ID_PAD_LENGTH)}"


# Fonction utilitaire pour gérer l'upload de logo
def save_logo_file(file: Optional[UploadFile], code: str, current_path: Optional[str] = None) -> Optional[str]:
    """Sauvegarde le logo et retourne le chemin d'accès relatif."""
    if not file or not file.filename:
        return current_path if current_path else None

    # Si un ancien fichier existe, le supprimer
    if current_path:
        old_file_location = f"app{current_path}"
        if os.path.exists(old_file_location):
            try:
                os.remove(old_file_location)
            except Exception as e:
                print(f"Avertissement: Impossible de supprimer l'ancien logo {old_file_location}. Erreur: {e}")

    # Créer le nouveau nom de fichier et le chemin
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ['.jpg', '.jpeg', '.png', '.svg']:
        raise HTTPException(status_code=400, detail="Type de fichier de logo non supporté. Utilisez .jpg, .jpeg, .png ou .svg.")

    # Formatage : COMP_CODE_TIMESTAMP.ext
    file_name = f"COMP_{code}_{int(os.time())}{file_extension}"
    file_location = os.path.join(UPLOAD_DIR, file_name)
    
    # Écrire le fichier
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement du logo : {e}")


    # Retourner le chemin relatif pour la DB (ex: /static/logos/COMP_...)
    return file_location.replace("app", "")


# ------------------------------------
#   COMPOSANTE MANAGEMENT ENDPOINTS
# ------------------------------------

# 🔹 Ajouter une Composante (POST) - CORRIGÉ : Ajout gestion historique
@router.post("/", response_model=ComposanteSchema, summary="Ajouter une nouvelle composante")
def create_composante(
    id_composante: str = Form(..., description="ID unique (ex: COMP_0001)"),
    code: str = Form(..., description="Code court unique (ex: FS)"),
    label: str = Form(..., alias="Composante_label"),
    institution_id_fk: str = Form(..., description="ID de l'institution parente"),
    type_composante: str = Form(..., alias="Composante_type"),
    description: Optional[str] = Form(None, alias="Composante_description"),
    abbreviation: Optional[str] = Form(None, alias="Composante_abbreviation"),
    logo: Optional[UploadFile] = File(None, description="Logo de la composante"),
    annees_universitaires: Optional[List[str]] = Form(None, description="IDs des années universitaires à lier."),
    db: Session = Depends(get_db)
):
    # 1. Validation de l'Institution parente
    institution = db.query(Institution).filter(Institution.Institution_id == institution_id_fk).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution parente non trouvée.")
    
    clean_code = code.upper().strip()
    clean_label = label.strip()
    description_db = description.strip() if description and description.strip() else None
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None


    # 2. Validation du Pydantic Schema (pour les champs non-fichier)
    try:
        ComposanteCreate(
            Composante_id=id_composante, 
            Composante_code=clean_code,
            Composante_label=clean_label,
            Institution_id_fk=institution_id_fk,
            Composante_type=type_composante,
            Composante_description=description_db,
            Composante_abbreviation=abbreviation_db
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Données de formulaire invalides: {e.errors()}")

    # 3. Préparation des données Composante
    composante_data = {
        "Composante_id": id_composante,
        "Composante_code": clean_code,
        "Composante_label": clean_label,
        "Institution_id_fk": institution_id_fk,
        "Composante_type": type_composante,
        "Composante_description": description_db,
        "Composante_abbreviation": abbreviation_db
    }
    
    # 4. Gestion de l'Upload de Logo
    composante_data["Composante_logo_path"] = save_logo_file(logo, clean_code)
    
    db_composante = Composante(**composante_data)
    db.add(db_composante)

    # 5. AJOUT : Gestion Historique
    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = ComposanteHistorique(
                Composante_id_fk=id_composante,
                AnneeUniversitaire_id_fk=annee_id,
                Composante_label_historique=clean_label,
                Composante_code_historique=clean_code,
                Composante_description_historique=description_db
            )
            db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Violation de contrainte de base de données (Code ou ID déjà utilisé)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue lors de la création: {e}")
        
    db.refresh(db_composante)
    # Recharger avec l'institution et les mentions pour le modèle de réponse
    db_composante = db.query(Composante).filter(Composante.Composante_id == id_composante).options(
        joinedload(Composante.institution),
        joinedload(Composante.mentions)
    ).first()
    
    return db_composante

# 🔹 Récupérer les IDs d'années universitaires liées à une composante (NOUVEAU)
@router.get("/{composante_id}/annees-historique", response_model=List[str], summary="Récupérer les IDs d'années liées à une composante")
def get_composante_years_history(composante_id: str, db: Session = Depends(get_db)):
    """
    Récupère la liste des IDs d'années universitaires pour lesquelles la composante est enregistrée dans l'historique.
    """
    history_records = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id
    ).all()
    
    return [rec.AnneeUniversitaire_id_fk for rec in history_records]

# 🔹 Mettre à jour une Composante (PUT) - CORRIGÉ : Ajout gestion historique
@router.put("/{composante_id_path}", response_model=ComposanteSchema, summary="Mettre à jour une composante existante")
def update_composante(
    composante_id_path: str,
    code: str = Form(..., description="Code court unique (ex: FS)"),
    label: str = Form(..., alias="Composante_label"),
    institution_id_fk: str = Form(..., description="ID de l'institution parente"),
    type_composante: str = Form(..., alias="Composante_type"),
    description: Optional[str] = Form(None, alias="Composante_description"),
    abbreviation: Optional[str] = Form(None, alias="Composante_abbreviation"),
    logo: Optional[UploadFile] = File(None, description="Nouveau logo de la composante"),
    remove_logo: bool = Form(False, description="Indique s'il faut supprimer le logo existant"), 
    annees_universitaires: Optional[List[str]] = Form(None, description="IDs des années universitaires à synchroniser."),
    db: Session = Depends(get_db)
):
    # 1. Trouver l'objet Composante
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée")

    # 2. Validation de l'Institution parente
    institution = db.query(Institution).filter(Institution.Institution_id == institution_id_fk).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution parente non trouvée.")

    clean_code = code.upper().strip()
    clean_label = label.strip()
    description_db = description.strip() if description and description.strip() else None
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None

    # 3. Mise à jour des données (sauf logo)
    update_data = {
        "Composante_code": clean_code,
        "Composante_label": clean_label,
        "Institution_id_fk": institution_id_fk,
        "Composante_type": type_composante,
        "Composante_description": description_db,
        "Composante_abbreviation": abbreviation_db
    }
    
    # 4. Gestion du Logo
    current_logo_path = composante.Composante_logo_path
    
    if remove_logo:
        if current_logo_path:
            old_file_location = f"app{current_logo_path}"
            if os.path.exists(old_file_location):
                try: os.remove(old_file_location)
                except Exception as e: print(f"Avertissement: Impossible de supprimer l'ancien logo {old_file_location}. Erreur: {e}")
        update_data["Composante_logo_path"] = None 
    elif logo:
        update_data["Composante_logo_path"] = save_logo_file(logo, clean_code, current_logo_path)
    
    # 5. AJOUT : Synchronisation Historique (Suppression puis recréation)
    db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante.Composante_id
    ).delete(synchronize_session=False)

    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = ComposanteHistorique(
                Composante_id_fk=composante.Composante_id,
                AnneeUniversitaire_id_fk=annee_id,
                Composante_label_historique=clean_label,
                Composante_code_historique=clean_code,
                Composante_description_historique=description_db
            )
            db.add(hist)


    # 6. Application des changements et commit
    for key, value in update_data.items():
        setattr(composante, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Violation de contrainte de base de données lors de la mise à jour (Code non unique ou champ obligatoire manquant)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue lors de la mise à jour: {e}")
        
    db.refresh(composante)
    # Recharger avec l'institution et les mentions pour le modèle de réponse
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).options(
        joinedload(Composante.institution),
        joinedload(Composante.mentions)
    ).first()
    
    return composante


# 🔹 Supprimer une Composante (DELETE)
@router.delete("/{composante_id_path}", status_code=204, summary="Supprimer une composante")
def delete_composante(composante_id_path: str, db: Session = Depends(get_db)):
    """Supprime une composante par son identifiant unique (Composante_id)."""
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    
    # Supprimer le logo s'il existe (Composante_logo_path)
    if composante.Composante_logo_path:
        path = f"app{composante.Composante_logo_path}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Avertissement: Impossible de supprimer le fichier logo {path}. Erreur: {e}")

    # Nettoyage Historique
    db.query(ComposanteHistorique).filter(ComposanteHistorique.Composante_id_fk == composante.Composante_id).delete()

    try:
        db.delete(composante)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer : la composante est liée à d'autres données.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue lors de la suppression: {e}")
        
    return

# 🔹 Liste des composantes par institution (CORRIGÉ : Ajout du filtre par années)
@router.get("/institution", response_model=List[ComposanteSchema], summary="Liste des composantes par institution (filtrable par années)")
def get_composantes_by_institution(
    institution_id: str, 
    annees: Optional[List[str]] = Query(None, description="Liste des ID d'années universitaires pour filtrer l'historique"),
    db: Session = Depends(get_db)
):
    query = db.query(Composante).filter(Composante.Institution_id_fk == institution_id)

    # AJOUT : Filtrage par historique des années
    if annees and len(annees) > 0:
        query = query.join(ComposanteHistorique).filter(
            ComposanteHistorique.AnneeUniversitaire_id_fk.in_(annees)
        ).distinct()
    
    # Le joinedload est maintenu pour l'affichage
    composantes = (
        query
        .options(
            joinedload(Composante.institution), 
            joinedload(Composante.mentions) 
        )
        .all()
    )
    return composantes