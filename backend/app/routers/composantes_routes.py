# \backend\app\routers\composantes_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os

# Importations des modèles et schémas (adapter si nécessaire)
from app.models import Composante, Institution # Assurez-vous d'importer tous les modèles utilisés
# Si vous utilisez des schémas Pydantic, assurez-vous de les importer ici
from app.schemas import ComposanteSchema # Supposons que vous ayez un schéma
from app.database import get_db

# Définition du routeur
router = APIRouter(
    prefix="/api/composantes",
    tags=["Composantes (Établissements)"]
)

# ------------------------------------
# FONCTIONS UTILITAIRES (Génération d'ID Minimal et Nettoyage)
# ------------------------------------
COMPOSANTE_ID_PREFIX = "COMP_"
ID_PAD_LENGTH = 8 # XXXXXXXX pour COMP_XXXXXXXX (total 12 caractères)

def get_next_minimal_composante_id(db: Session) -> str:
    """
    Détermine le prochain ID minimal disponible au format COMP_XXXXXXXX.
    Similaire à la logique utilisée pour les institutions.
    """
    # 1. Récupérer tous les IDs existants de la table Composantes
    existing_ids = db.query(Composante.Composante_id).all()
    
    used_numbers = []
    
    # 2. Extraire les numéros des IDs
    for (id_str,) in existing_ids:
        if id_str and id_str.startswith(COMPOSANTE_ID_PREFIX):
            try:
                # Supprimer le préfixe et tenter de convertir le reste en entier
                number_part = id_str[len(COMPOSANTE_ID_PREFIX):]
                # S'assurer que la partie est composée uniquement de chiffres
                if number_part.isdigit():
                    used_numbers.append(int(number_part))
            except ValueError:
                continue

    # 3. Trier les numéros et trouver le plus petit manquant
    used_numbers.sort()
    
    next_num = 1
    for n in used_numbers:
        if n == next_num:
            next_num += 1
        elif n > next_num:
            break # Trouvé le trou (le minimal)
            
    # 4. Formater l'ID
    return f"{COMPOSANTE_ID_PREFIX}{str(next_num).zfill(ID_PAD_LENGTH)}"

def clean_optional_field(value: Optional[str]) -> Optional[str]:
    """Convertit une chaîne vide ou None en None pour la base de données."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None

# ------------------------------------
# CRUD ENDPOINTS
# ------------------------------------

# 🔹 1. Créer une Composante (POST)
@router.post("/", response_model=ComposanteSchema, summary="Créer une nouvelle composante")
def create_composante(
    composante_code: str = Form(..., description="Code unique de la composante (ex: FDS)"),
    composante_label: str = Form(..., description="Nom de la composante"),
    institution_id: str = Form(..., description="ID de l'institution parente (Institution_id)"),
    composante_abbreviation: Optional[str] = Form(None, description="Abréviation de la composante"),
    composante_description: Optional[str] = Form(None, description="Description"),
    db: Session = Depends(get_db),
):
    clean_code = composante_code.strip().upper()

    # 1. Vérification d'unicité du CODE métier
    if db.query(Composante).filter(Composante.Composante_code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"Le code composante '{clean_code}' existe déjà.")
    
    # 2. Vérification de l'institution parente
    if not db.query(Institution).filter(Institution.Institution_id == institution_id).first():
        raise HTTPException(status_code=404, detail="Institution parente non trouvée.")

    # 3. Génération de l'ID CLÉ PRIMAIRE et Nettoyage
    abbreviation_db = clean_optional_field(composante_abbreviation)
    description_db = clean_optional_field(composante_description)
    
    new_composante_id = get_next_minimal_composante_id(db) # Génération de l'ID minimal

    composante = Composante(
        Composante_id=new_composante_id,
        Composante_code=clean_code, 
        Composante_label=composante_label.strip(), 
        Composante_abbreviation=abbreviation_db,
        Composante_description=description_db,
        Institution_id_fk=institution_id 
    ) 
    
    try:
        db.add(composante)
        db.commit()
        db.refresh(composante)
        return composante
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Une erreur d'intégrité de la base de données est survenue (Code peut déjà exister).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur inattendue: {e}")


# 🔹 2. Lire toutes les Composantes (GET)
@router.get("/", response_model=List[ComposanteSchema], summary="Obtenir la liste de toutes les composantes")
def get_all_composantes(db: Session = Depends(get_db)):
    composantes = db.query(Composante).all()
    return composantes


# 🔹 3. Lire les Composantes par Institution (GET)
@router.get("/institution", response_model=List[ComposanteSchema], summary="Obtenir les composantes d'une institution spécifique")
def get_composantes_by_institution(
    institution_id: str = Query(..., description="ID de l'institution parente"),
    db: Session = Depends(get_db)
):
    composantes = db.query(Composante).filter(Composante.Institution_id_fk == institution_id).all()
    
    if not composantes:
        # Retourne une liste vide (200 OK) ou 404 si vous voulez être strict. 
        # Ici, 200 avec liste vide est plus approprié pour un filtre.
        return [] 
    
    return composantes


# 🔹 4. Lire une Composante par son Code (GET)
@router.get("/{composante_code_path}", response_model=ComposanteSchema, summary="Obtenir une composante par son code")
def get_composante_by_code(
    composante_code_path: str,
    db: Session = Depends(get_db)
):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    return composante


# 🔹 5. Modifier une Composante (PUT)
@router.put("/{composante_code_path}", response_model=ComposanteSchema, summary="Modifier une composante existante (par son code)")
def update_composante(
    composante_code_path: str, # Code de la composante dans le chemin
    composante_label: str = Form(..., description="Nouveau nom de la composante"),
    institution_id: str = Form(..., description="ID de l'institution parente"),
    composante_abbreviation: Optional[str] = Form(None, description="Nouvelle abréviation"),
    composante_description: Optional[str] = Form(None, description="Nouvelle description"),
    db: Session = Depends(get_db),
):
    # 1. Trouver la composante
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
        
    # 2. Vérifier l'institution parente (si elle est modifiée ou non)
    if not db.query(Institution).filter(Institution.Institution_id == institution_id).first():
        raise HTTPException(status_code=404, detail="Nouvelle institution parente non trouvée.")

    # 3. Mise à jour des champs
    abbreviation_db = clean_optional_field(composante_abbreviation)
    description_db = clean_optional_field(composante_description)
    
    composante.Composante_label = composante_label.strip() 
    composante.Composante_abbreviation = abbreviation_db
    composante.Composante_description = description_db
    composante.Institution_id_fk = institution_id # Clé étrangère
    
    try:
        db.commit()
        db.refresh(composante)
        return composante
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur lors de la mise à jour: {e}")


# 🔹 6. Supprimer une Composante (DELETE)
@router.delete("/{composante_code_path}", status_code=204, summary="Supprimer une composante par son code")
def delete_composante(
    composante_code_path: str,
    db: Session = Depends(get_db)
):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    
    try:
        db.delete(composante)
        db.commit()
        return {"ok": True}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer cette composante car elle a des données liées (Domaines, Mentions, etc.).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur lors de la suppression: {e}")