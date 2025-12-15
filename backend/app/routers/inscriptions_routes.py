# app/routers/inscriptions_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import date
from typing import List, Optional

from app.database import get_db
# Assurez-vous d'importer vos modèles mis à jour (DossierInscription doit avoir les colonnes FK)
from app.models import DossierInscription, AnneeUniversitaire, Mention, Etudiant
from app.schemas.inscriptions_schemas import InscriptionCreatePayload, InscriptionResponse, InscriptionRead

router = APIRouter(prefix="/inscriptions", tags=["Dossiers d'Inscription"])

# --- GET : Récupérer les inscriptions filtrées (Colonne Droite) ---
@router.get("/", response_model=List[InscriptionRead])
def get_inscriptions_list(
    annee_id: str = Query(...),
    mention_id: Optional[str] = Query(None),
    parcours_id: Optional[str] = Query(None),
    niveau_id: Optional[str] = Query(None),
    semestre_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupère les étudiants déjà inscrits selon les filtres"""
    query = db.query(DossierInscription).options(
        joinedload(DossierInscription.etudiant)
    ).filter(
        DossierInscription.AnneeUniversitaire_id_fk == annee_id
    )

    if mention_id:
        query = query.filter(DossierInscription.Mention_id_fk == mention_id)
    # Note: Assurez-vous que votre modèle DossierInscription possède ces colonnes
    if parcours_id:
        query = query.filter(DossierInscription.Parcours_id_fk == parcours_id)
    if niveau_id:
        query = query.filter(DossierInscription.Niveau_id_fk == niveau_id)
    if semestre_id:
        query = query.filter(DossierInscription.Semestre_id_fk == semestre_id)

    return query.all()

# --- POST : Inscription en masse ---
@router.post("/bulk", response_model=InscriptionResponse)
def create_bulk_dossiers(payload: InscriptionCreatePayload, db: Session = Depends(get_db)):
    
    # 1. Récupération contextuelle (Mention & Année)
    mention = db.query(Mention).filter(Mention.Mention_id == payload.mention_id).first()
    annee = db.query(AnneeUniversitaire).filter(AnneeUniversitaire.AnneeUniversitaire_id == payload.annee_id).first()

    if not mention or not annee:
        raise HTTPException(status_code=404, detail="Mention ou Année introuvable.")

    # 2. Préparation matricule (Logique existante conservée)
    annee_label = annee.AnneeUniversitaire_annee
    yy = annee_label.split("-")[-1][-2:] if annee_label and "-" in annee_label else annee_label[-2:]
    abbr = mention.Mention_abbreviation or mention.Mention_code or "UNK"
    prefix_numero = f"{yy}{abbr}_"

    # 3. Séquence
    last_dossier = db.query(DossierInscription).filter(
        DossierInscription.DossierInscription_numero.like(f"{prefix_numero}%")
    ).order_by(DossierInscription.DossierInscription_numero.desc()).first()

    current_sequence = 0
    if last_dossier and last_dossier.DossierInscription_numero:
        try:
            num_part = last_dossier.DossierInscription_numero.split("_")[-1]
            current_sequence = int(num_part)
        except ValueError:
            current_sequence = 0

    students_newly_registered = 0
    students_already_registered = 0

    try:
        for etu_id in payload.etudiants_ids:
            # ID Dossier unique par année/étudiant/mention pour éviter doublons
            dossier_id = f"{etu_id}_{payload.mention_id}_{payload.annee_id}"
            
            existing = db.query(DossierInscription).filter(
                DossierInscription.DossierInscription_id == dossier_id
            ).first()

            if existing:
                students_already_registered += 1
                continue

            current_sequence += 1
            numero_final = f"{prefix_numero}{str(current_sequence).zfill(5)}"
            
            new_dossier = DossierInscription(
                DossierInscription_id=dossier_id,
                Etudiant_id_fk=etu_id,
                Mention_id_fk=payload.mention_id,
                AnneeUniversitaire_id_fk=payload.annee_id,
                # Mapping des nouveaux champs optionnels
                Parcours_id_fk=payload.parcours_id,
                Niveau_id_fk=payload.niveau_id,
                Semestre_id_fk=payload.semestre_id,
                ModeInscription_id_fk=payload.mode_inscription_id,
                
                DossierInscription_numero=numero_final,
                DossierInscription_date_creation=date.today()
            )
            db.add(new_dossier)
            students_newly_registered += 1
        
        db.commit()
        
        msg = f"{students_newly_registered} inscrits avec succès."
        if students_already_registered > 0:
            msg += f" ({students_already_registered} déjà existants)."

        return {
            "success": True, 
            "message": msg, 
            "inscrits_count": students_newly_registered
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))