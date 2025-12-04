# backend/app/routers/mentions_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 

from app.models import Mention, Composante, Domaine, Parcours
from app.schemas import MentionSchema
from app.database import get_db

router = APIRouter(
    prefix="/mentions", 
    tags=["Mentions"]
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- UTILITAIRES (Génération ID & Fichiers) ---

MENTION_ID_PREFIX = "MEN_"
ID_REGEX = re.compile(r"MEN_(\d+)")

def get_next_mention_id(db: Session) -> str:
    """Génère le prochain ID disponible (ex: MEN_0001)"""
    existing_ids = db.query(Mention.Mention_id).all()
    used_numbers = []
    for (id_str,) in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match.group(1)))
    
    next_num = 1
    if used_numbers:
        used_numbers.sort()
        for num in used_numbers:
            if num == next_num:
                next_num += 1
            elif num > next_num:
                break
    
    return f"{MENTION_ID_PREFIX}{str(next_num).zfill(4)}"

def save_upload_file(upload_file: UploadFile, filename: str) -> str:
    """Sauvegarde le fichier et retourne le chemin relatif pour la DB"""
    file_location = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur sauvegarde fichier: {e}")
        
    return f"/static/logos/{filename}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_id(db: Session = Depends(get_db)):
    """Route utilitaire pour le frontend (affichage ID prévisionnel)"""
    return get_next_mention_id(db)

@router.get("/{mention_id}", response_model=MentionSchema)
def get_mention(mention_id: str, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention introuvable")
    return mention

@router.get("/composante/{composante_id}", response_model=List[MentionSchema])
def get_mentions_by_composante(composante_id: str, db: Session = Depends(get_db)):
    """Récupère les mentions d'une composante avec leurs parcours"""
    # Vérif composante
    if not db.query(Composante).filter(Composante.Composante_id == composante_id).first():
        raise HTTPException(status_code=404, detail="Composante introuvable")
    
    mentions = (
        db.query(Mention)
        .filter(Mention.Composante_id_fk == composante_id)
        .options(joinedload(Mention.parcours)) 
        .all()
    )
    return mentions

@router.post("/", response_model=MentionSchema)
def create_mention(
    nom: str = Form(..., description="Label de la mention"),
    code: str = Form(..., description="Code unique"),
    composante_id: str = Form(..., description="ID Composante"),
    domaine_id: str = Form(..., description="ID Domaine"),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    clean_code = code.upper().strip()
    
    # 1. Vérifications
    if not db.query(Composante).filter(Composante.Composante_id == composante_id).first():
        raise HTTPException(status_code=400, detail="Composante invalide.")
    if not db.query(Domaine).filter(Domaine.Domaine_id == domaine_id).first():
        raise HTTPException(status_code=400, detail="Domaine invalide.")
    
    # Unicité Code (Global)
    if db.query(Mention).filter(Mention.Mention_code == clean_code).first():
         raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' existe déjà.")

    # 2. ID & Logo
    new_id = get_next_mention_id(db)
    logo_path = None
    if logo_file and logo_file.filename:
        ext = os.path.splitext(logo_file.filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.svg']:
            raise HTTPException(400, "Format d'image non supporté")
        filename = f"{new_id}{ext}"
        logo_path = save_upload_file(logo_file, filename)

    # 3. Création
    new_mention = Mention(
        Mention_id=new_id,
        Mention_code=clean_code,
        Mention_label=nom.strip(),
        Mention_abbreviation=abbreviation,
        Mention_description=description,
        Mention_logo_path=logo_path,
        Composante_id_fk=composante_id,
        Domaine_id_fk=domaine_id
    )

    try:
        db.add(new_mention)
        db.commit()
        db.refresh(new_mention)
        return new_mention
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur d'intégrité.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{mention_id}", response_model=MentionSchema)
def update_mention(
    mention_id: str,
    nom: str = Form(...),
    code: str = Form(...),
    domaine_id: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention introuvable")

    # Vérif Domaine si changé
    if mention.Domaine_id_fk != domaine_id:
        if not db.query(Domaine).filter(Domaine.Domaine_id == domaine_id).first():
            raise HTTPException(400, "Nouveau domaine invalide")

    # Mise à jour
    mention.Mention_label = nom.strip()
    mention.Mention_code = code.upper().strip()
    mention.Mention_abbreviation = abbreviation
    mention.Mention_description = description
    mention.Domaine_id_fk = domaine_id

    # Gestion Logo
    if logo_file and logo_file.filename:
        # Supprimer l'ancien
        if mention.Mention_logo_path:
            old_path = f"app{mention.Mention_logo_path}"
            if os.path.exists(old_path):
                try: os.remove(old_path)
                except: pass
        
        ext = os.path.splitext(logo_file.filename)[1].lower()
        filename = f"{mention_id}{ext}"
        mention.Mention_logo_path = save_upload_file(logo_file, filename)

    try:
        db.commit()
        db.refresh(mention)
        return mention
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Code déjà utilisé.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{mention_id}", status_code=204)
def delete_mention(mention_id: str, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention introuvable")
    
    if mention.Mention_logo_path:
        path = f"app{mention.Mention_logo_path}"
        if os.path.exists(path):
            try: os.remove(path)
            except: pass

    db.delete(mention)
    db.commit()
    return