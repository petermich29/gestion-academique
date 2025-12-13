from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pathlib import Path
from typing import Optional, List
import os
import shutil 

from app.database import get_db
# Importez bien Institution et Composante
from app.models import Enseignant, Institution, Composante 
from app.schemas import enseignants_schemas as schemas

router = APIRouter(
    prefix="/enseignants", # <--- CORRECTION CLÉ : AJOUT DU PRÉFIXE
    tags=["Ressources Humaines - Enseignants"]
)

BASE_DIR = Path(__file__).resolve().parents[2] 
UPLOAD_DIR = BASE_DIR / "app" / "static" / "enseignants" # <--- Chemin Corrigé ici
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --- ENDPOINTS UTILITAIRES POUR LE FORMULAIRE ---

@router.get("/form-options/institutions", response_model=List[dict])
def get_institutions_options(db: Session = Depends(get_db)):
    """Récupère la liste des institutions pour le formulaire"""
    insts = db.query(Institution).all()
    return [{"id": i.Institution_id, "nom": i.Institution_nom} for i in insts]

@router.get("/form-options/composantes", response_model=List[dict])
def get_composantes_options(db: Session = Depends(get_db)):
    """Récupère les composantes avec l'ID parent pour la cascade"""
    comps = db.query(Composante).all()
    return [{
        "id": c.Composante_id, 
        "nom": c.Composante_label, 
        "institution_id": c.Institution_id_fk
    } for c in comps]

# --- LOGIQUE D'ID ---

def compute_min_teacher_id(db: Session) -> str:
    prefix = "ENSE_"
    # On filtre pour ne récupérer que ceux qui commencent par ENSE_
    rows = db.query(Enseignant.Enseignant_id).filter(
        Enseignant.Enseignant_id.like(f"{prefix}%")
    ).all()
    
    used_nums = []
    for (val,) in rows:
        try:
            # On extrait la partie numérique après le "_"
            part = val.split("_")[1]
            used_nums.append(int(part))
        except: 
            continue
    
    used_nums.sort()
    
    new_num = 1
    for val in used_nums:
        if val == new_num: 
            new_num += 1
        else: 
            break
            
    # CORRECTION ICI : :06d pour 6 chiffres (ex: ENSE_000001)
    return f"{prefix}{new_num:06d}"

@router.get("/init-new")
def init_new_teacher(db: Session = Depends(get_db)):
    new_id = compute_min_teacher_id(db)
    return {"Enseignant_id": new_id}

# --- CRUD ENSEIGNANTS ---

# CORRECTION DU NOM DE SCHEMA ICI : EnseignantPaginatedResponse
@router.get("/", response_model=schemas.EnseignantPaginatedResponse) 
def read_teachers(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Enseignant)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Enseignant.Enseignant_nom.ilike(s),
                Enseignant.Enseignant_prenoms.ilike(s),
                Enseignant.Enseignant_id.ilike(s)
            )
        )
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {"total": total, "items": items}

@router.post("/", response_model=schemas.EnseignantSchema, status_code=status.HTTP_201_CREATED)
def create_teacher(
    # ... (Vos paramètres de formulaire) ...
    Enseignant_nom: str = Form(...),
    Enseignant_prenoms: Optional[str] = Form(None),
    Enseignant_sexe: Optional[str] = Form(None),
    Enseignant_grade: Optional[str] = Form(None),
    Enseignant_statut: str = Form(...),
    Enseignant_telephone: Optional[str] = Form(None),
    Enseignant_mail: Optional[str] = Form(None),
    Enseignant_cin: Optional[str] = Form(None),
    Enseignant_rib: Optional[str] = Form(None),
    Composante_id_affectation_fk: Optional[str] = Form(None),
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    new_id = compute_min_teacher_id(db)
    
    photo_path = None
    if photo_profil:
        ext = photo_profil.filename.split(".")[-1]
        filename = f"{new_id}.{ext}"
        file_location = UPLOAD_DIR / filename
        with open(file_location, "wb") as f:
            shutil.copyfileobj(photo_profil.file, f)
        photo_path = f"static/enseignants/{filename}"

    if Enseignant_statut != 'PERM':
        Composante_id_affectation_fk = None

    new_teacher = Enseignant(
        Enseignant_id=new_id,
        Enseignant_nom=Enseignant_nom.upper(),
        Enseignant_prenoms=Enseignant_prenoms,
        Enseignant_sexe=Enseignant_sexe,
        Enseignant_grade=Enseignant_grade,
        Enseignant_statut=Enseignant_statut,
        Enseignant_telephone=Enseignant_telephone,
        Enseignant_mail=Enseignant_mail,
        Enseignant_cin=Enseignant_cin,
        Enseignant_rib=Enseignant_rib,
        Composante_id_affectation_fk=Composante_id_affectation_fk,
        Enseignant_photo_profil_path=photo_path
    )
    
    db.add(new_teacher)
    try:
        db.commit()
        db.refresh(new_teacher)
        return new_teacher
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{enseignant_id}", response_model=schemas.EnseignantSchema)
def update_teacher(
    enseignant_id: str,
    # ... (Vos paramètres de formulaire) ...
    Enseignant_nom: str = Form(...),
    Enseignant_prenoms: Optional[str] = Form(None),
    Enseignant_sexe: Optional[str] = Form(None),
    Enseignant_grade: Optional[str] = Form(None),
    Enseignant_statut: str = Form(...),
    Enseignant_telephone: Optional[str] = Form(None),
    Enseignant_mail: Optional[str] = Form(None),
    Enseignant_cin: Optional[str] = Form(None),
    Enseignant_rib: Optional[str] = Form(None),
    Composante_id_affectation_fk: Optional[str] = Form(None),
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    teacher = db.query(Enseignant).filter(Enseignant.Enseignant_id == enseignant_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    # ... (Logique de mise à jour et photo) ...
    if photo_profil:
        if teacher.Enseignant_photo_profil_path:
             old_path = BASE_DIR / teacher.Enseignant_photo_profil_path
             if old_path.exists():
                 os.remove(old_path)
        
        ext = photo_profil.filename.split(".")[-1]
        filename = f"{enseignant_id}.{ext}"
        file_location = UPLOAD_DIR / filename
        with open(file_location, "wb") as f:
            shutil.copyfileobj(photo_profil.file, f)
        teacher.Enseignant_photo_profil_path = f"static/enseignants/{filename}"

    teacher.Enseignant_nom = Enseignant_nom.upper()
    teacher.Enseignant_prenoms = Enseignant_prenoms
    teacher.Enseignant_sexe = Enseignant_sexe
    teacher.Enseignant_grade = Enseignant_grade
    teacher.Enseignant_statut = Enseignant_statut
    teacher.Enseignant_telephone = Enseignant_telephone
    teacher.Enseignant_mail = Enseignant_mail
    teacher.Enseignant_cin = Enseignant_cin
    teacher.Enseignant_rib = Enseignant_rib
    
    if Enseignant_statut == 'PERM':
        teacher.Composante_id_affectation_fk = Composante_id_affectation_fk
    else:
        teacher.Composante_id_affectation_fk = None

    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{enseignant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(enseignant_id: str, db: Session = Depends(get_db)):
    teacher = db.query(Enseignant).filter(Enseignant.Enseignant_id == enseignant_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Introuvable")
    
    db.delete(teacher)
    db.commit()
    return