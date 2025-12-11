# backend/app/routers/hr.py
import os
from pathlib import Path
import uuid
from datetime import datetime, date
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from ..database import get_db
from .. import models
from ..schemas import users as schemas

router = APIRouter(tags=["Ressources Humaines"])

# ---------------------------------------------------------
# Dossier d'upload (relatif au repo). On stocke le chemin
# relatif 'static/etudiant/<filename>' dans la BDD.
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parents[1]  # backend/app
UPLOAD_DIR = BASE_DIR / "static" / "etudiant"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------
# Helpers
# ---------------------------
def parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    # Attendre un format ISO 'YYYY-MM-DD' de <input type="date">
    try:
        return date.fromisoformat(value)
    except Exception:
        # Essayer quelques formats communs
        for fmt in ("%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(value, fmt).date()
            except Exception:
                continue
    return None


def save_profile_file(etudiant_numero: str, upload: UploadFile) -> Optional[str]:
    """
    Sauvegarde le fichier uploadé dans UPLOAD_DIR sous le nom:
       <Etudiant_numero>_profil.<ext>
    Retourne le chemin relatif (static/etudiant/...) ou None si pas de fichier.
    """
    if not upload:
        return None

    filename = upload.filename or ""
    if "." in filename:
        ext = filename.rsplit(".", 1)[1]
    else:
        ext = "jpg"

    safe_name = f"{etudiant_numero}_profil.{ext}"
    abs_path = UPLOAD_DIR / safe_name

    try:
        with abs_path.open("wb") as f:
            f.write(upload.file.read())
    finally:
        # assurez-vous de fermer le file-like si il est encore ouvert
        try:
            upload.file.close()
        except Exception:
            pass

    # on stocke le chemin relatif pour servir via static
    return str(Path("static") / "etudiant" / safe_name)


# ============================================================
#                GESTION DES ÉTUDIANTS (LIST, NEXT-ID)
# ============================================================

@router.get("/etudiants", response_model=schemas.EtudiantPaginatedResponse)
def get_etudiants(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
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
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                models.Etudiant.Etudiant_nom.ilike(search_fmt),
                models.Etudiant.Etudiant_prenoms.ilike(search_fmt),
                models.Etudiant.Etudiant_numero_inscription.ilike(search_fmt)
            )
        )

    total = query.count()
    etudiants = query.order_by(models.Etudiant.Etudiant_nom.asc()).offset(skip).limit(limit).all()

    return {"total": total, "items": etudiants}


# ============================================================
#     Génération du prochain ID étudiant (ex: ETU2025_000001)
# ============================================================
def get_next_student_id(db: Session) -> str:
    current_year = datetime.now().year
    prefix = f"ETU{current_year}_"

    max_id = db.query(
        func.max(models.Etudiant.Etudiant_numero_inscription)
    ).filter(
        models.Etudiant.Etudiant_numero_inscription.like(f"{prefix}%")
    ).scalar()

    next_num = 1

    if max_id:
        try:
            last_num = int(max_id.split("_")[-1])
            next_num = last_num + 1
        except Exception:
            next_num = 1

    return f"{prefix}{str(next_num).zfill(6)}"


@router.get("/etudiants/next-id", response_model=Dict[str, str])
def read_next_etudiant_id(db: Session = Depends(get_db)):
    try:
        next_id = get_next_student_id(db)
        return {"next_id": next_id}
    except Exception as e:
        print("Erreur génération d'ID :", e)
        raise HTTPException(status_code=500, detail="Erreur interne lors de la génération du prochain ID.")


# ============================================================
#                CREATE ETUDIANT (multipart + photo)
# ============================================================
@router.post("/etudiants", response_model=schemas.EtudiantSchema, status_code=status.HTTP_201_CREATED)
async def create_etudiant(
    # Champs comme Form(...) ou Form(None)
    Etudiant_numero_inscription: Optional[str] = Form(None),
    Etudiant_nom: str = Form(...),
    Etudiant_prenoms: Optional[str] = Form(None),
    Etudiant_sexe: Optional[str] = Form(None),
    Etudiant_naissance_date: Optional[str] = Form(None),
    Etudiant_naissance_lieu: Optional[str] = Form(None),
    Etudiant_nationalite: Optional[str] = Form(None),
    Etudiant_bacc_annee: Optional[int] = Form(None),
    Etudiant_bacc_serie: Optional[str] = Form(None),
    Etudiant_bacc_numero: Optional[str] = Form(None),
    Etudiant_bacc_centre: Optional[str] = Form(None),
    Etudiant_bacc_mention: Optional[str] = Form(None),
    Etudiant_adresse: Optional[str] = Form(None),
    Etudiant_telephone: Optional[str] = Form(None),
    Etudiant_mail: Optional[str] = Form(None),
    Etudiant_cin: Optional[str] = Form(None),
    Etudiant_cin_date: Optional[str] = Form(None),
    Etudiant_cin_lieu: Optional[str] = Form(None),
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    # Générer automatiquement si non fourni
    if not Etudiant_numero_inscription:
        Etudiant_numero_inscription = get_next_student_id(db)

    try:
        # Sauvegarde fichier (si fourni)
        photo_path_rel = None
        if photo_profil:
            photo_path_rel = save_profile_file(Etudiant_numero_inscription, photo_profil)

        db_etudiant = models.Etudiant(
            Etudiant_id = Etudiant_numero_inscription,
            Etudiant_numero_inscription = Etudiant_numero_inscription,
            Etudiant_nom = Etudiant_nom,
            Etudiant_prenoms = Etudiant_prenoms,
            Etudiant_sexe = Etudiant_sexe,
            Etudiant_naissance_date = parse_date(Etudiant_naissance_date),
            Etudiant_naissance_lieu = Etudiant_naissance_lieu,
            Etudiant_nationalite = Etudiant_nationalite,
            Etudiant_bacc_annee = Etudiant_bacc_annee,
            Etudiant_bacc_serie = Etudiant_bacc_serie,
            Etudiant_bacc_numero = Etudiant_bacc_numero,
            Etudiant_bacc_centre = Etudiant_bacc_centre,
            Etudiant_bacc_mention = Etudiant_bacc_mention,
            Etudiant_adresse = Etudiant_adresse,
            Etudiant_telephone = Etudiant_telephone,
            Etudiant_mail = Etudiant_mail,
            Etudiant_cin = Etudiant_cin,
            Etudiant_cin_date = parse_date(Etudiant_cin_date),
            Etudiant_cin_lieu = Etudiant_cin_lieu,
            Etudiant_photo_profil_path = photo_path_rel
        )

        db.add(db_etudiant)
        db.commit()
        db.refresh(db_etudiant)
        return db_etudiant

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur création étudiant: {str(e)}")


# ============================================================
#                UPDATE ETUDIANT (multipart + photo possible)
# ============================================================
@router.put("/etudiants/{etudiant_id}", response_model=schemas.EtudiantSchema)
async def update_etudiant(
    etudiant_id: str,
    # Tous les champs sont optionnels en Form pour la mise à jour
    Etudiant_nom: Optional[str] = Form(None),
    Etudiant_prenoms: Optional[str] = Form(None),
    Etudiant_sexe: Optional[str] = Form(None),
    Etudiant_naissance_date: Optional[str] = Form(None),
    Etudiant_naissance_lieu: Optional[str] = Form(None),
    Etudiant_nationalite: Optional[str] = Form(None),
    Etudiant_bacc_annee: Optional[int] = Form(None),
    Etudiant_bacc_serie: Optional[str] = Form(None),
    Etudiant_bacc_numero: Optional[str] = Form(None),
    Etudiant_bacc_centre: Optional[str] = Form(None),
    Etudiant_bacc_mention: Optional[str] = Form(None),
    Etudiant_adresse: Optional[str] = Form(None),
    Etudiant_telephone: Optional[str] = Form(None),
    Etudiant_mail: Optional[str] = Form(None),
    Etudiant_cin: Optional[str] = Form(None),
    Etudiant_cin_date: Optional[str] = Form(None),
    Etudiant_cin_lieu: Optional[str] = Form(None),
    photo_profil: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    db_etudiant = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()

    if not db_etudiant:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    try:
        # Si photo fournie -> sauvegarde et met à jour le champ chemin
        if photo_profil:
            photo_path_rel = save_profile_file(etudiant_id, photo_profil)
            db_etudiant.Etudiant_photo_profil_path = photo_path_rel

        # Pour chaque champ fourni, on met à jour
        if Etudiant_nom is not None:
            db_etudiant.Etudiant_nom = Etudiant_nom
        if Etudiant_prenoms is not None:
            db_etudiant.Etudiant_prenoms = Etudiant_prenoms
        if Etudiant_sexe is not None:
            db_etudiant.Etudiant_sexe = Etudiant_sexe
        if Etudiant_naissance_date is not None:
            db_etudiant.Etudiant_naissance_date = parse_date(Etudiant_naissance_date)
        if Etudiant_naissance_lieu is not None:
            db_etudiant.Etudiant_naissance_lieu = Etudiant_naissance_lieu
        if Etudiant_nationalite is not None:
            db_etudiant.Etudiant_nationalite = Etudiant_nationalite
        if Etudiant_bacc_annee is not None:
            db_etudiant.Etudiant_bacc_annee = Etudiant_bacc_annee
        if Etudiant_bacc_serie is not None:
            db_etudiant.Etudiant_bacc_serie = Etudiant_bacc_serie
        if Etudiant_bacc_numero is not None:
            db_etudiant.Etudiant_bacc_numero = Etudiant_bacc_numero
        if Etudiant_bacc_centre is not None:
            db_etudiant.Etudiant_bacc_centre = Etudiant_bacc_centre
        if Etudiant_bacc_mention is not None:
            db_etudiant.Etudiant_bacc_mention = Etudiant_bacc_mention
        if Etudiant_adresse is not None:
            db_etudiant.Etudiant_adresse = Etudiant_adresse
        if Etudiant_telephone is not None:
            db_etudiant.Etudiant_telephone = Etudiant_telephone
        if Etudiant_mail is not None:
            db_etudiant.Etudiant_mail = Etudiant_mail
        if Etudiant_cin is not None:
            db_etudiant.Etudiant_cin = Etudiant_cin
        if Etudiant_cin_date is not None:
            db_etudiant.Etudiant_cin_date = parse_date(Etudiant_cin_date)
        if Etudiant_cin_lieu is not None:
            db_etudiant.Etudiant_cin_lieu = Etudiant_cin_lieu

        db.commit()
        db.refresh(db_etudiant)
        return db_etudiant

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur modification étudiant: {str(e)}")


# ============================================================
#                DELETE ETUDIANT
# ============================================================
@router.delete("/etudiants/{etudiant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_etudiant(etudiant_id: str, db: Session = Depends(get_db)):

    db_etudiant = db.query(models.Etudiant).filter(models.Etudiant.Etudiant_id == etudiant_id).first()

    if not db_etudiant:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    try:
        # Optionnel : supprimer le fichier physique si existant
        try:
            if db_etudiant.Etudiant_photo_profil_path:
                p = BASE_DIR / db_etudiant.Etudiant_photo_profil_path
                if p.exists():
                    p.unlink()
        except Exception:
            # ne pas bloquer la suppression si suppression fichier échoue
            pass

        db.delete(db_etudiant)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer cet étudiant.")


# ============================================================
#                GESTION DES ENSEIGNANTS (inchangé)
# ============================================================
@router.get("/enseignants", response_model=List[schemas.EnseignantSchema])
def get_enseignants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Enseignant).offset(skip).limit(limit).all()


@router.post("/enseignants", response_model=schemas.EnseignantSchema, status_code=status.HTTP_201_CREATED)
def create_enseignant(enseignant: schemas.EnseignantCreate, db: Session = Depends(get_db)):
    new_id = str(uuid.uuid4())
    db_enseignant = models.Enseignant(Enseignant_id=new_id, **enseignant.model_dump(by_alias=True))

    try:
        db.add(db_enseignant)
        db.commit()
        db.refresh(db_enseignant)
        return db_enseignant
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur création enseignant")


@router.put("/enseignants/{enseignant_id}", response_model=schemas.EnseignantSchema)
def update_enseignant(enseignant_id: str, enseignant_data: schemas.EnseignantCreate, db: Session = Depends(get_db)):
    db_enseignant = db.query(models.Enseignant).filter(models.Enseignant.Enseignant_id == enseignant_id).first()

    if not db_enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    for field, value in enseignant_data.model_dump(by_alias=True).items():
        setattr(db_enseignant, field, value)

    try:
        db.commit()
        db.refresh(db_enseignant)
        return db_enseignant
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur modification")


@router.delete("/enseignants/{enseignant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enseignant(enseignant_id: str, db: Session = Depends(get_db)):
    db_enseignant = db.query(models.Enseignant).filter(models.Enseignant.Enseignant_id == enseignant_id).first()

    if not db_enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    try:
        db.delete(db_enseignant)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossible de supprimer l'enseignant.")
