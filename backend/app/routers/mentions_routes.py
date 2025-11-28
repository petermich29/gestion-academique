# backend/app/routers/mentions_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 

from app.models import Mention, Composante, Domaine
from app.schemas import MentionSchema
from app.database import get_db

router = APIRouter(
    prefix="/mentions", 
    tags=["Mentions"]
)

UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- UTILS ---
MENTION_ID_PREFIX = "MENT_"
ID_REGEX = re.compile(r"MENT_(\d+)")

def get_next_mention_id(db: Session) -> str:
    existing_ids = db.query(Mention.Mention_id).all()
    used_numbers = []
    for (id_str,) in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match[1]))
    
    if not used_numbers:
        return f"{MENTION_ID_PREFIX}0001"

    used_numbers.sort()
    next_num = 1
    for num in used_numbers:
        if num == next_num:
            next_num += 1
        elif num > next_num:
            break
    return f"{MENTION_ID_PREFIX}{str(next_num).zfill(4)}"

def save_upload_file(upload_file: UploadFile, filename: str) -> str:
    file_location = os.path.join(UPLOAD_DIR, filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return f"/static/logos/{filename}"

# --- ROUTES ---

@router.get("/next-id", response_model=str)
def get_next_id(db: Session = Depends(get_db)):
    return get_next_mention_id(db)

# Lister les mentions d'une composante spécifique
@router.get("/composante/{composante_id}", response_model=List[MentionSchema])
def get_mentions_by_composante(composante_id: str, db: Session = Depends(get_db)):
    # Vérifie si la composante existe
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante introuvable")
        
    mentions = db.query(Mention).filter(Mention.Composante_id_fk == composante_id).all()
    return mentions

# Créer une Mention
@router.post("/", response_model=MentionSchema)
def create_mention(
    nom: str = Form(..., description="Libellé de la mention (Correspond à Mention_label)"),
    code: str = Form(..., description="Code unique de la mention (ex: MEN_INFO)"),
    composante_id: str = Form(..., description="ID de la composante parente"),
    domaine_id: str = Form(..., description="ID du domaine de rattachement"),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # 1. Nettoyage
    clean_code = code.strip()
    
    # 2. Vérifications préalables
    # Vérifier si la composante existe
    if not db.query(Composante).filter(Composante.Composante_id == composante_id).first():
        raise HTTPException(status_code=400, detail="Composante invalide.")
        
    # Vérifier si le domaine existe
    if not db.query(Domaine).filter(Domaine.Domaine_id == domaine_id).first():
        raise HTTPException(status_code=400, detail="Domaine invalide. Veuillez vérifier l'ID du domaine.")

    # Vérifier unicité du code (Global ou par composante selon vos contraintes, ici global par sécurité)
    if db.query(Mention).filter(Mention.Mention_code == clean_code).first():
         raise HTTPException(status_code=400, detail=f"Le code mention '{clean_code}' existe déjà.")

    # 3. Génération ID
    new_id = get_next_mention_id(db)
    
    # 4. Gestion Logo
    logo_path = None
    if logo_file:
        ext = os.path.splitext(logo_file.filename)[1]
        filename = f"{new_id}{ext}"
        logo_path = save_upload_file(logo_file, filename)

    # 5. Création (Mapping correct avec models.py)
    new_mention = Mention(
        Mention_id=new_id,
        Mention_code=clean_code,       # CHAMP OBLIGATOIRE AJOUTÉ
        Mention_label=nom,             # CORRECTION: Mention_label au lieu de Mention_nom
        Mention_abbreviation=abbreviation,
        Mention_description=description,
        Mention_logo_path=logo_path,
        Composante_id_fk=composante_id,
        Domaine_id_fk=domaine_id       # CHAMP OBLIGATOIRE AJOUTÉ
    )

    try:
        db.add(new_mention)
        db.commit()
        db.refresh(new_mention)
        return new_mention
    except IntegrityError as e:
        db.rollback()
        print(f"Erreur DB: {e}")
        raise HTTPException(status_code=400, detail="Erreur d'intégrité (Code existant ou référence manquante).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Modifier une Mention
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

    # Mise à jour des champs
    mention.Mention_label = nom # CORRECTION: Label
    mention.Mention_code = code.strip()
    mention.Mention_abbreviation = abbreviation
    mention.Mention_description = description
    mention.Domaine_id_fk = domaine_id # Mise à jour du domaine

    if logo_file:
        # Supprimer vieux logo
        if mention.Mention_logo_path:
            old_path = f"app{mention.Mention_logo_path}"
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass
        
        ext = os.path.splitext(logo_file.filename)[1]
        filename = f"{mention_id}{ext}"
        mention.Mention_logo_path = save_upload_file(logo_file, filename)

    try:
        db.commit()
        db.refresh(mention)
        return mention
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur : Code mention déjà utilisé ou Domaine invalide.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Supprimer une Mention
@router.delete("/{mention_id}", status_code=204)
def delete_mention(mention_id: str, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention introuvable")
    
    if mention.Mention_logo_path:
        path = f"app{mention.Mention_logo_path}"
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    db.delete(mention)
    db.commit()
    return