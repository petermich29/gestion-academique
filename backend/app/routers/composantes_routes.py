# gestion-academique\backend\app\routers\composantes_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 

from app.models import Composante, Institution, Mention 
from app.schemas import ComposanteSchema 
from app.database import get_db

# CORRECTION ICI : On change "/api/composantes" en "/composantes"
# car main.py ajoute déjà "/api" lors de l'include_router.
router = APIRouter(
    prefix="/composantes", 
    tags=["Composantes (Établissements)"]
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
# FONCTIONS UTILITAIRES (Inchangées)
# ------------------------------------

COMPOSANTE_ID_PREFIX = "COMP_"
ID_PAD_LENGTH = 4 
ID_REGEX = re.compile(r"COMP_(\d+)")

# 🆕 AJOUT : Route pour récupérer le prochain ID disponible
@router.get("/next-id", response_model=str, summary="Obtenir le prochain ID disponible")
def get_next_available_id(db: Session = Depends(get_db)):
    """Retourne le prochain ID calculé (ex: COMP_00000001)."""
    return get_next_minimal_composante_id(db)

def get_next_minimal_composante_id(db: Session) -> str:
    existing_ids = db.query(Composante.Composante_id).all()
    used_numbers = []
    
    for (id_str,) in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match[1]))

    if not used_numbers:
        next_num = 1
    else:
        used_numbers.sort()
        next_num = 1
        for num in used_numbers:
            if num == next_num:
                next_num += 1
            elif num > next_num:
                break
        
    return f"{COMPOSANTE_ID_PREFIX}{str(next_num).zfill(ID_PAD_LENGTH)}"

def clean_optional_field(field: Optional[str]) -> Optional[str]:
    return field.strip() if field else None

def save_upload_file(upload_file: UploadFile, directory: str, filename: str) -> str:
    file_location = os.path.join(directory, filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return f"/static/logos/{filename}"


# ------------------------------------
# COMPOSANTE MANAGEMENT ENDPOINTS
# ------------------------------------

# 🔹 1. Lister toutes les Composantes (GET)
@router.get("/", response_model=List[ComposanteSchema], summary="Lister toutes les composantes")
def get_all_composantes(db: Session = Depends(get_db)):
    return db.query(Composante).all()

# 🚨 2. Récupérer toutes les Composantes d'une Institution (GET) 
@router.get(
    "/institution", 
    response_model=List[ComposanteSchema], 
    summary="Lister toutes les composantes d'une institution spécifique"
)
def get_composantes_by_institution(
    institution_id: str = Query(..., description="ID de l'institution parente (ex: INST_0001)"),
    db: Session = Depends(get_db)
):
    """
    Récupère la liste de toutes les composantes rattachées à une institution.
    INCLUT LES MENTIONS associées grâce à joinedload.
    """
    # Vérification optionnelle de l'institution
    # institution = db.query(Institution).filter(Institution.Institution_id == institution_id).first()
    # if not institution: return [] 

    composantes = (
        db.query(Composante)
        .filter(Composante.Institution_id_fk == institution_id)
        # 👇 C'est cette ligne qui est CRUCIALE pour charger les mentions
        .options(joinedload(Composante.mentions)) 
        .all()
    )
    
    return composantes

# 🔹 3. Récupérer une Composante par son code (GET)
@router.get("/{composante_code_path}", response_model=ComposanteSchema, summary="Obtenir une composante par son code")
def get_composante_by_code(composante_code_path: str, db: Session = Depends(get_db)):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    return composante


# 🔹 4. Ajouter une Composante (POST)
@router.post("/", response_model=ComposanteSchema, status_code=201)
def create_composante(
    composante_code: str = Form(...),
    composante_label: str = Form(...),
    institution_id: str = Form(...),
    composante_abbreviation: Optional[str] = Form(None),
    composante_description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    institution = db.query(Institution).filter(Institution.Institution_id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution parente non trouvée.")

    existing_comp = db.query(Composante).filter(Composante.Composante_code == composante_code.upper()).first()
    if existing_comp:
        raise HTTPException(status_code=400, detail="Un établissement avec ce code existe déjà.")

    new_id = get_next_minimal_composante_id(db)

    composante_logo_path = None
    if logo_file:
        file_extension = os.path.splitext(logo_file.filename)[1]
        filename = f"{composante_code.upper()}{file_extension}"
        composante_logo_path = save_upload_file(logo_file, UPLOAD_DIR, filename)

    new_composante = Composante(
        Composante_id=new_id,
        Composante_code=composante_code.upper(),
        Composante_label=composante_label.strip(),
        Composante_abbreviation=clean_optional_field(composante_abbreviation),
        Composante_description=clean_optional_field(composante_description),
        Composante_logo_path=composante_logo_path,
        Institution_id_fk=institution_id 
    )

    try:
        db.add(new_composante)
        db.commit()
        db.refresh(new_composante)
        return new_composante
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur d'intégrité (Code existant ou données invalides).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 🔹 5. Modifier une Composante (PUT)
@router.put("/{composante_code_path}", response_model=ComposanteSchema)
def update_composante(
    composante_code_path: str,
    composante_label: str = Form(...),
    institution_id: str = Form(...),
    composante_abbreviation: Optional[str] = Form(None),
    composante_description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")

    # Mise à jour des champs texte
    composante.Composante_label = composante_label.strip()
    composante.Composante_abbreviation = clean_optional_field(composante_abbreviation)
    composante.Composante_description = clean_optional_field(composante_description)
    composante.Institution_id_fk = institution_id

    # Mise à jour du logo si fourni
    if logo_file:
        # Suppression ancien logo si existant
        if composante.Composante_logo_path:
            old_path = f"app{composante.Composante_logo_path}"
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass
        
        file_extension = os.path.splitext(logo_file.filename)[1]
        filename = f"{composante.Composante_code.upper()}{file_extension}"
        composante.Composante_logo_path = save_upload_file(logo_file, UPLOAD_DIR, filename)

    try:
        db.commit()
        db.refresh(composante)
        return composante
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 🔹 6. Supprimer une Composante (DELETE)
@router.delete("/{composante_code_path}", status_code=204)
def delete_composante(composante_code_path: str, db: Session = Depends(get_db)):
    composante = db.query(Composante).filter(Composante.Composante_code == composante_code_path.upper()).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée.")
    
    if composante.Composante_logo_path:
        path = f"app{composante.Composante_logo_path}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    try:
        db.delete(composante)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer : l'établissement est lié à d'autres données.")
    return

@router.get("/institution", response_model=List[ComposanteSchema])
def get_composantes_by_institution(institution_id: str, db: Session = Depends(get_db)):
    """
    Récupère les composantes d'une institution.
    IMPORTANT : On doit charger les 'mentions' pour l'affichage dans InstitutionDetail.
    """
    composantes = (
        db.query(Composante)
        .filter(Composante.Institution_id_fk == institution_id)
        # 👇 C'est cette ligne qui permet d'afficher les mentions dans les cartes du frontend
        .options(joinedload(Composante.mentions)) 
        .all()
    )
    return composantes