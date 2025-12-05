# backend/app/routers/mentions_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 

from app.models import Mention, Composante, Domaine, MentionHistorique, AnneeUniversitaire
from app.schemas import MentionSchema, HistoriqueDetailSchema, HistoriqueUpdateSchema
from app.database import get_db

router = APIRouter(
    prefix="/mentions", 
    tags=["Mentions"]
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- UTILITAIRES (Génération ID & Fichiers) ---

MENTION_ID_PREFIX = "MENT_"
ID_REGEX = re.compile(r"MENT_(\d+)")

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
    
    return f"{MENTION_ID_PREFIX}{str(next_num).zfill(6)}"

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
def get_mentions_by_composante(
    composante_id: str, 
    annees: Optional[List[str]] = Query(None), # 🆕 Ajout du filtre années
    db: Session = Depends(get_db)
):
    """Récupère les mentions d'une composante avec support de l'historique"""
    if not db.query(Composante).filter(Composante.Composante_id == composante_id).first():
        raise HTTPException(status_code=404, detail="Composante introuvable")
    
    query = db.query(Mention).filter(Mention.Composante_id_fk == composante_id)

    # 1. Filtrage par année (si historique existant pour cette année)
    if annees and len(annees) > 0:
        query = query.join(MentionHistorique).filter(
            MentionHistorique.AnneeUniversitaire_id_fk.in_(annees)
        ).distinct()

    mentions = query.options(joinedload(Mention.parcours)).all()

    # 2. Remplacement par les données historiques (Snapshot)
    if annees and len(annees) > 0:
        m_ids = [m.Mention_id for m in mentions]
        histories = (
            db.query(MentionHistorique)
            .join(AnneeUniversitaire, MentionHistorique.AnneeUniversitaire_id_fk == AnneeUniversitaire.AnneeUniversitaire_id)
            .filter(
                MentionHistorique.Mention_id_fk.in_(m_ids),
                MentionHistorique.AnneeUniversitaire_id_fk.in_(annees)
            )
            .all()
        )

        # On garde l'historique de l'année la plus récente (ordre le plus élevé)
        best_history_map = {}
        for h in histories:
            m_id = h.Mention_id_fk
            current_ordre = h.annee_univ.AnneeUniversitaire_ordre if h.annee_univ else 0
            if m_id not in best_history_map or current_ordre > best_history_map[m_id][0]:
                best_history_map[m_id] = (current_ordre, h)
        
        for m in mentions:
            if m.Mention_id in best_history_map:
                best_h = best_history_map[m.Mention_id][1]
                m.Mention_label = best_h.Mention_label_historique
                m.Mention_code = best_h.Mention_code_historique
                m.Mention_description = best_h.Mention_description_historique
                m.Mention_abbreviation = best_h.Mention_abbreviation_historique

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
    
    # 1. Vérifications standards
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

    # 3. Création de l'Entité Principale (Mention)
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
        # On ne commit pas encore, on attend l'historique
        
        # 4. 🆕 FIX : Historisation Automatique pour l'Année Active
        active_year = db.query(AnneeUniversitaire).filter(AnneeUniversitaire.AnneeUniversitaire_is_active == True).first()
        
        if active_year:
            # Création de la ligne d'historique miroir
            hist = MentionHistorique(
                Mention_id_fk=new_id,
                AnneeUniversitaire_id_fk=active_year.AnneeUniversitaire_id,
                Mention_label_historique=nom.strip(),
                Mention_code_historique=clean_code,
                Mention_description_historique=description,
                Mention_abbreviation_historique=abbreviation
            )
            db.add(hist)
        
        db.commit() # Commit global (Mention + Historique)
        db.refresh(new_mention)
        return new_mention

    except IntegrityError as e:
        db.rollback()
        print(f"Erreur intégrité: {e}")
        raise HTTPException(status_code=400, detail="Erreur d'intégrité (Code ou liaison incorrecte).")
    except Exception as e:
        db.rollback()
        print(f"Erreur serveur: {e}")
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
    # 🆕 Ajout pour gérer l'historique auto
    annees_universitaires: Optional[List[str]] = Form(None), 
    db: Session = Depends(get_db)
):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention: raise HTTPException(404, "Introuvable")

    # Mise à jour champs principaux
    mention.Mention_label = nom.strip()
    mention.Mention_code = code.upper().strip()
    mention.Mention_abbreviation = abbreviation
    mention.Mention_description = description
    mention.Domaine_id_fk = domaine_id

    # Gestion Logo (inchangée)
    if logo_file and logo_file.filename:
        if mention.Mention_logo_path:
            old_path = f"app{mention.Mention_logo_path}"
            if os.path.exists(old_path):
                try: os.remove(old_path)
                except: pass
        ext = os.path.splitext(logo_file.filename)[1].lower()
        filename = f"{mention_id}{ext}"
        mention.Mention_logo_path = save_upload_file(logo_file, filename)

    # 🆕 Synchronisation Historique
    if annees_universitaires is not None:
        historique_existant = db.query(MentionHistorique).filter(
            MentionHistorique.Mention_id_fk == mention.Mention_id
        ).all()
        
        map_hist = {h.AnneeUniversitaire_id_fk: h for h in historique_existant}
        annees_cible = set(annees_universitaires)

        # Supprimer ceux qui ne sont plus cochés
        for annee_id, hist_obj in map_hist.items():
            if annee_id not in annees_cible:
                db.delete(hist_obj)

        # Ajouter ou mettre à jour ceux cochés
        for annee_id in annees_cible:
            if annee_id not in map_hist:
                hist = MentionHistorique(
                    Mention_id_fk=mention.Mention_id,
                    AnneeUniversitaire_id_fk=annee_id,
                    Mention_label_historique=nom.strip(),
                    Mention_code_historique=code.upper().strip(),
                    Mention_description_historique=description,
                    Mention_abbreviation_historique=abbreviation
                )
                db.add(hist)

    try:
        db.commit()
        db.refresh(mention)
        return mention
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Erreur intégrité ou Code déjà utilisé.")

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

# ------------------------------------
#   NOUVEAUX ENDPOINTS HISTORIQUE
# ------------------------------------

@router.get("/{mention_id}/historique-details", response_model=List[HistoriqueDetailSchema])
def get_mention_history_details(mention_id: str, db: Session = Depends(get_db)):
    historiques = db.query(MentionHistorique).filter(
        MentionHistorique.Mention_id_fk == mention_id
    ).all()
    
    result = []
    for h in historiques:
        result.append({
            "annee_id": h.AnneeUniversitaire_id_fk,
            "annee_label": h.annee_univ.AnneeUniversitaire_annee if h.annee_univ else h.AnneeUniversitaire_id_fk,
            "nom_historique": h.Mention_label_historique,
            "code_historique": h.Mention_code_historique,
            "description_historique": h.Mention_description_historique,
            "abbreviation_historique": h.Mention_abbreviation_historique
        })
    return sorted(result, key=lambda x: x['annee_label'], reverse=True)

@router.post("/{mention_id}/historique")
def add_mention_history_line(mention_id: str, annee_id: str = Body(..., embed=True), db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.Mention_id == mention_id).first()
    if not mention: raise HTTPException(404, "Mention introuvable")

    exists = db.query(MentionHistorique).filter(
        MentionHistorique.Mention_id_fk == mention_id,
        MentionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if exists: return {"message": "Déjà présent"}

    hist = MentionHistorique(
        Mention_id_fk=mention_id,
        AnneeUniversitaire_id_fk=annee_id,
        Mention_label_historique=mention.Mention_label,
        Mention_code_historique=mention.Mention_code,
        Mention_description_historique=mention.Mention_description,
        Mention_abbreviation_historique=mention.Mention_abbreviation
    )
    db.add(hist)
    db.commit()
    return {"message": "Ajouté"}

@router.delete("/{mention_id}/historique/{annee_id}")
def remove_mention_history_line(mention_id: str, annee_id: str, db: Session = Depends(get_db)):
    hist = db.query(MentionHistorique).filter(
        MentionHistorique.Mention_id_fk == mention_id,
        MentionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if hist:
        db.delete(hist)
        db.commit()
    return {"message": "Retiré"}

@router.put("/{mention_id}/historique/{annee_id}")
def update_mention_history_line(mention_id: str, annee_id: str, payload: HistoriqueUpdateSchema, db: Session = Depends(get_db)):
    history_item = db.query(MentionHistorique).filter(
        MentionHistorique.Mention_id_fk == mention_id,
        MentionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if not history_item: raise HTTPException(404, "Introuvable")
    
    history_item.Mention_label_historique = payload.nom
    history_item.Mention_code_historique = payload.code
    history_item.Mention_description_historique = payload.description
    history_item.Mention_abbreviation_historique = payload.abbreviation
    
    db.commit()
    return {"message": "Mis à jour"}