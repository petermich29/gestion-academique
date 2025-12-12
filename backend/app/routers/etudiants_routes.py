import os
import uuid
from pathlib import Path
from datetime import datetime, date
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

# Assurez-vous que ces imports correspondent à votre structure de projet
from app.database import get_db
from app import models # Assume 'app' est le dossier parent de 'routers'
from app.schemas import etudiants_schemas as schemas

# Note : On retire le prefix global pour pouvoir gérer /etudiants et /enseignants dans le même fichier
router = APIRouter(tags=["Ressources Humaines et Étudiants"])

# ---------------------------------------------------------
# CONFIGURATION UPLOAD (Robustesse: remonte à la racine du projet)
# ---------------------------------------------------------
# Assumer que etudiants_routes.py est dans app/routers. On remonte de 2 niveaux.
BASE_DIR = Path(__file__).resolve().parents[2] 
UPLOAD_DIR = BASE_DIR / "static" / "etudiant"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
# HELPERS (Fonctions utilitaires de l'ancien hr.py)
# ---------------------------------------------------------

def parse_date(value: Optional[str]) -> Optional[date]:
    """Tente de convertir une string en date (ISO ou formats courants)."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except Exception:
        for fmt in ("%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(value, fmt).date()
            except Exception:
                continue
    return None

def save_profile_file(identifiant: str, upload: UploadFile) -> Optional[str]:
    """
    Sauvegarde le fichier : static/etudiant/<ID>_profil.<ext>
    Retourne le chemin relatif pour la BDD.
    """
    if not upload or not upload.filename:
        return None

    filename = upload.filename
    ext = filename.rsplit(".", 1)[1] if "." in filename and len(filename.rsplit(".", 1)) > 1 else "jpg"
    
    safe_name = f"{identifiant}_profil.{ext}"
    abs_path = UPLOAD_DIR / safe_name

    try:
        upload.file.seek(0)
        with abs_path.open("wb") as f:
            f.write(upload.file.read())
    finally:
        try:
            upload.file.close()
        except Exception:
            pass

    return str(Path("static") / "etudiant" / safe_name)

def compute_minimal_available_id(db: Session) -> str:
    """
    Génère l'ID technique minimal disponible (cherche le 'trou').
    Utilisé pour Etudiant_id.
    """
    year = datetime.now().year
    prefix = f"ETU{year}_"
    
    rows = db.query(models.Etudiant.Etudiant_id).filter(
        models.Etudiant.Etudiant_id.like(f"{prefix}%")
    ).all()

    used_numbers = []
    for (value,) in rows:
        if value:
            parts = value.split("_")
            if len(parts) == 2 and parts[1].isdigit():
                used_numbers.append(int(parts[1]))

    used_numbers.sort()

    new_num = 1
    for val in used_numbers:
        if val == new_num:
            new_num += 1
        else:
            break

    return f"{prefix}{str(new_num).zfill(6)}"


# ============================================================
#                     GESTION ÉTUDIANTS
# ============================================================

@router.get("/etudiants/init-new")
def init_new_student(db: Session = Depends(get_db)):
    """Retourne l'ID minimal disponible pour affichage dans le formulaire."""
    return {
        "Etudiant_id": compute_minimal_available_id(db)
    }

@router.get("/etudiants", response_model=schemas.EtudiantPaginatedResponse)
def list_etudiants(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # CHARGEMENT PROFOND DES CURSUS (Repris de hr.py)
    query = db.query(models.Etudiant).options(
        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.annee_univ),

        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.parcours)
        .joinedload(models.Parcours.mention)
        .joinedload(models.Mention.composante)
        .joinedload(models.Composante.institution)
    )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Etudiant.Etudiant_nom.ilike(pattern),
                models.Etudiant.Etudiant_prenoms.ilike(pattern),
                models.Etudiant.Etudiant_numero_inscription.ilike(pattern),
                models.Etudiant.Etudiant_mail.ilike(pattern)
            )
        )

    total = query.count()
    items = query.order_by(models.Etudiant.Etudiant_nom.asc()).offset(skip).limit(limit).all()

    return {"items": items, "total": total}


@router.get("/etudiants/{etudiant_id}", response_model=schemas.EtudiantSchema)
def get_etudiant(etudiant_id: str, db: Session = Depends(get_db)):
    # Utilisation du même chargement profond pour l'affichage du détail
    etu = db.query(models.Etudiant).options(
        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.annee_univ),

        joinedload(models.Etudiant.inscriptions)
        .joinedload(models.Inscription.parcours)
        .joinedload(models.Parcours.mention)
        .joinedload(models.Mention.composante)
        .joinedload(models.Composante.institution)
    ).filter(models.Etudiant.Etudiant_id == etudiant_id).first()

    if not etu:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    return etu


@router.post("/etudiants", response_model=schemas.EtudiantSchema, status_code=status.HTTP_201_CREATED)
async def create_etudiant(
    # Etudiant_numero_inscription est maintenant optionnel et non rempli par défaut
    Etudiant_id: Optional[str] = Form(None), 
    Etudiant_numero_inscription: Optional[str] = Form(None),
    Etudiant_nom: str = Form(...),
    Etudiant_prenoms: Optional[str] = Form(None),
    Etudiant_sexe: Optional[str] = Form(None),
    Etudiant_naissance_date: Optional[str] = Form(None),
    Etudiant_naissance_lieu: Optional[str] = Form(None),
    Etudiant_nationalite: Optional[str] = Form(None),
    Etudiant_cin: Optional[str] = Form(None),
    Etudiant_cin_date: Optional[str] = Form(None),
    Etudiant_cin_lieu: Optional[str] = Form(None),
    Etudiant_telephone: Optional[str] = Form(None),
    Etudiant_mail: Optional[str] = Form(None),
    Etudiant_bacc_serie: Optional[str] = Form(None),
    Etudiant_bacc_annee: Optional[int] = Form(None),
    Etudiant_bacc_numero: Optional[str] = Form(None),
    Etudiant_bacc_centre: Optional[str] = Form(None),
    Etudiant_bacc_mention: Optional[str] = Form(None),
    Etudiant_adresse: Optional[str] = Form(None),
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Génération de l'ID technique (le matricule officiel Etudiant_numero_inscription est laissé vide)
    final_id = compute_minimal_available_id(db)

    # Gestion Photo
    photo_path_rel = None
    if photo_profil:
        photo_path_rel = save_profile_file(final_id, photo_profil)

    etu = models.Etudiant(
        Etudiant_id=final_id,
        
        # Le numéro d'inscription est laissé vide (None)
        Etudiant_numero_inscription=None, 
        
        Etudiant_nom=Etudiant_nom.upper(),
        Etudiant_prenoms=Etudiant_prenoms,
        Etudiant_sexe=Etudiant_sexe,
        Etudiant_naissance_date=parse_date(Etudiant_naissance_date),
        Etudiant_naissance_lieu=Etudiant_naissance_lieu,
        Etudiant_nationalite=Etudiant_nationalite,
        Etudiant_cin=Etudiant_cin,
        Etudiant_cin_date=parse_date(Etudiant_cin_date),
        Etudiant_cin_lieu=Etudiant_cin_lieu,
        Etudiant_telephone=Etudiant_telephone,
        Etudiant_mail=Etudiant_mail,
        Etudiant_bacc_serie=Etudiant_bacc_serie,
        Etudiant_bacc_annee=Etudiant_bacc_annee,
        Etudiant_bacc_numero=Etudiant_bacc_numero,
        Etudiant_bacc_centre=Etudiant_bacc_centre,
        Etudiant_bacc_mention=Etudiant_bacc_mention,
        Etudiant_adresse=Etudiant_adresse,
        Etudiant_photo_profil_path=photo_path_rel
    )

    try:
        db.add(etu)
        db.commit()
        db.refresh(etu)
        return etu
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur création: {str(e)}")


@router.put("/etudiants/{etudiant_id}", response_model=schemas.EtudiantSchema)
async def update_etudiant(
    etudiant_id: str,
    Etudiant_nom: Optional[str] = Form(None),
    Etudiant_prenoms: Optional[str] = Form(None),
    Etudiant_sexe: Optional[str] = Form(None),
    Etudiant_naissance_date: Optional[str] = Form(None),
    Etudiant_naissance_lieu: Optional[str] = Form(None),
    Etudiant_nationalite: Optional[str] = Form(None),
    Etudiant_cin: Optional[str] = Form(None),
    Etudiant_cin_date: Optional[str] = Form(None),
    Etudiant_cin_lieu: Optional[str] = Form(None),
    Etudiant_telephone: Optional[str] = Form(None),
    Etudiant_mail: Optional[str] = Form(None),
    Etudiant_bacc_serie: Optional[str] = Form(None),
    Etudiant_bacc_annee: Optional[int] = Form(None),
    Etudiant_bacc_numero: Optional[str] = Form(None),
    Etudiant_bacc_centre: Optional[str] = Form(None),
    Etudiant_bacc_mention: Optional[str] = Form(None),
    Etudiant_adresse: Optional[str] = Form(None),
    Etudiant_numero_inscription: Optional[str] = Form(None), # Permet de mettre à jour le numéro d'inscription
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    etu = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()
    if not etu:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    try:
        # LOGIQUE DE MISE À JOUR (Repris de hr.py)
        if photo_profil:
            photo_path_rel = save_profile_file(etudiant_id, photo_profil)
            etu.Etudiant_photo_profil_path = photo_path_rel

        if Etudiant_nom is not None: etu.Etudiant_nom = Etudiant_nom.upper()
        if Etudiant_prenoms is not None: etu.Etudiant_prenoms = Etudiant_prenoms
        if Etudiant_sexe is not None: etu.Etudiant_sexe = Etudiant_sexe
        if Etudiant_naissance_date is not None: etu.Etudiant_naissance_date = parse_date(Etudiant_naissance_date)
        if Etudiant_naissance_lieu is not None: etu.Etudiant_naissance_lieu = Etudiant_naissance_lieu
        if Etudiant_nationalite is not None: etu.Etudiant_nationalite = Etudiant_nationalite
        if Etudiant_cin is not None: etu.Etudiant_cin = Etudiant_cin
        if Etudiant_cin_date is not None: etu.Etudiant_cin_date = parse_date(Etudiant_cin_date)
        if Etudiant_cin_lieu is not None: etu.Etudiant_cin_lieu = Etudiant_cin_lieu
        if Etudiant_telephone is not None: etu.Etudiant_telephone = Etudiant_telephone
        if Etudiant_mail is not None: etu.Etudiant_mail = Etudiant_mail
        if Etudiant_bacc_serie is not None: etu.Etudiant_bacc_serie = Etudiant_bacc_serie
        if Etudiant_bacc_annee is not None: etu.Etudiant_bacc_annee = Etudiant_bacc_annee
        if Etudiant_bacc_numero is not None: etu.Etudiant_bacc_numero = Etudiant_bacc_numero
        if Etudiant_bacc_centre is not None: etu.Etudiant_bacc_centre = Etudiant_bacc_centre
        if Etudiant_bacc_mention is not None: etu.Etudiant_bacc_mention = Etudiant_bacc_mention
        if Etudiant_adresse is not None: etu.Etudiant_adresse = Etudiant_adresse
        # Mise à jour du numéro d'inscription si fourni
        if Etudiant_numero_inscription is not None: etu.Etudiant_numero_inscription = Etudiant_numero_inscription

        db.commit()
        db.refresh(etu)
        return etu
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur update: {str(e)}")


@router.delete("/etudiants/{etudiant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_etudiant(etudiant_id: str, db: Session = Depends(get_db)):
    etu = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()
    if not etu:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    
    # Suppression fichier physique (Repris de hr.py)
    if etu.Etudiant_photo_profil_path:
        try:
            p = BASE_DIR / etu.Etudiant_photo_profil_path
            if p.exists():
                p.unlink()
        except Exception:
            pass

    db.delete(etu)
    db.commit()