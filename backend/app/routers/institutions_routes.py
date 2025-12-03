#gestion-academique\backend\app\routers\institutions_routes.py
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError 

# Importations des modèles et schémas
from app.models import Institution, InstitutionHistorique, AnneeUniversitaire
from app.schemas import HistoriqueDetailSchema, HistoriqueUpdateSchema, InstitutionSchema
from app.database import get_db

router = APIRouter(
    prefix="/institutions",
    tags=["Institutions"],
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
#   INSTITUTION MANAGEMENT ENDPOINTS
# ------------------------------------

# 🔹 Ajouter une institution (POST)
@router.post("/", response_model=InstitutionSchema, summary="Ajouter une nouvelle institution")
def create_institution(
    id_institution: str = Form(..., description="Identifiant unique (ex: INST_0001)"),
    code: str = Form(..., description="Code court unique (ex: UFIV)"), 
    nom: str = Form(..., description="Nom complet de l'institution"),
    type_institution: str = Form(..., description="Type (ex: PRIVE, PUBLIC)"),
    abbreviation: Optional[str] = Form(None, description="Abréviation"),
    description: Optional[str] = Form(None, description="Description"),
    logo_file: UploadFile = File(None, description="Fichier du logo"),
    annees_universitaires: Optional[List[str]] = Form(None, description="IDs des années historiques"),
    db: Session = Depends(get_db),
):
    if not code.strip():
        raise HTTPException(status_code=400, detail="Le code est obligatoire.")
    
    clean_code = code.strip()
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    description_db = description.strip() if description and description.strip() else None
    
    if db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=400, detail=f"L'ID '{id_institution}' existe déjà.")
    
    # Vérifications d'unicité (code/nom)
    if db.query(Institution).filter(Institution.Institution_code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"Le code '{clean_code}' existe déjà.")

    logo_path = None
    if logo_file and logo_file.filename:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        try:
            os.makedirs(os.path.dirname(f"app{logo_path}"), exist_ok=True)
            with open(f"app{logo_path}", "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur logo: {e}")

    institution = Institution(
        Institution_id=id_institution,
        Institution_code=clean_code,
        Institution_nom=nom,
        Institution_type=type_institution,
        Institution_abbreviation=abbreviation_db,
        Institution_description=description_db,
        Institution_logo_path=logo_path
    )
    db.add(institution)

    # Création historique initial
    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = InstitutionHistorique(
                Institution_id_fk=id_institution,
                AnneeUniversitaire_id_fk=annee_id,
                Institution_nom_historique=nom,
                Institution_code_historique=clean_code,
                Institution_description_historique=description_db
            )
            db.add(hist)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur d'intégrité (données dupliquées).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {e}")
        
    db.refresh(institution)
    return institution


# 🔹 Liste de toutes les institutions (GET) - LOGIQUE MODIFIÉE ICI
@router.get("/", response_model=list[InstitutionSchema], summary="Liste des institutions (avec noms historiques dynamiques)")
def get_institutions(
    annees: Optional[List[str]] = Query(None, description="Filtre et adaptation dynamique des noms par année"),
    db: Session = Depends(get_db)
):
    query = db.query(Institution)

    # 1. Si pas de filtre, on retourne la liste standard (noms actuels)
    if not annees or len(annees) == 0:
        return query.all()

    # 2. Si filtre actif : on ne garde que les institutions actives ces années-là
    query = query.join(InstitutionHistorique).filter(
        InstitutionHistorique.AnneeUniversitaire_id_fk.in_(annees)
    ).distinct()
    
    results = query.all()
    if not results:
        return []

    # 3. Logique de remplacement du nom (Le plus récent parmi la sélection)
    #    On récupère l'historique pertinent pour ces institutions et ces années
    inst_ids = [i.Institution_id for i in results]
    
    histories = (
        db.query(InstitutionHistorique)
        .join(AnneeUniversitaire, InstitutionHistorique.AnneeUniversitaire_id_fk == AnneeUniversitaire.AnneeUniversitaire_id)
        .filter(
            InstitutionHistorique.Institution_id_fk.in_(inst_ids),
            InstitutionHistorique.AnneeUniversitaire_id_fk.in_(annees)
        )
        .options(joinedload(InstitutionHistorique.annee_univ))
        .all()
    )

    # On cherche l'entrée historique avec l'ORDRE le plus élevé pour chaque institution
    best_history_map = {} # { inst_id: (max_ordre, history_obj) }

    for h in histories:
        i_id = h.Institution_id_fk
        # On utilise l'ordre de l'année pour savoir laquelle est la "plus récente"
        current_ordre = h.annee_univ.AnneeUniversitaire_ordre if h.annee_univ else 0
        
        if i_id not in best_history_map:
            best_history_map[i_id] = (current_ordre, h)
        else:
            if current_ordre > best_history_map[i_id][0]:
                best_history_map[i_id] = (current_ordre, h)

    # 4. On applique les remplacements sur les objets Python (transitoire, pas de commit DB)
    for inst in results:
        if inst.Institution_id in best_history_map:
            best_h = best_history_map[inst.Institution_id][1]
            # Surcharge des champs pour l'affichage
            inst.Institution_nom = best_h.Institution_nom_historique
            inst.Institution_code = best_h.Institution_code_historique
            inst.Institution_description = best_h.Institution_description_historique

    return results

# 🔹 Détails d'une institution (GET by ID)
@router.get("/{id_institution}", response_model=InstitutionSchema)
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# 🔹 IDs d'années historiques liés
@router.get("/{id_institution}/annees-historique", response_model=List[str])
def get_institution_years_history(id_institution: str, db: Session = Depends(get_db)):
    history_records = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution
    ).all()
    return [rec.AnneeUniversitaire_id_fk for rec in history_records]

# 🔹 Modifier une institution (PUT)
@router.put("/", response_model=InstitutionSchema)
def update_institution(
    id_institution: str = Form(...),
    code: str = Form(...),
    nom: str = Form(...),
    type_institution: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: UploadFile = File(None),
    annees_universitaires: Optional[List[str]] = Form(None),
    db: Session = Depends(get_db),
):
    clean_code = code.strip()
    clean_nom = nom.strip()
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    description_db = description.strip() if description and description.strip() else None

    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    # Mise à jour des champs de base (État "Actuel")
    institution.Institution_code = clean_code
    institution.Institution_nom = clean_nom
    institution.Institution_type = type_institution
    institution.Institution_abbreviation = abbreviation_db
    institution.Institution_description = description_db

    if logo_file and logo_file.filename:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        try:
            with open(f"app{logo_path}", "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
            institution.Institution_logo_path = logo_path 
        except Exception:
            raise HTTPException(status_code=500, detail="Erreur logo upload")

    # Logique de synchronisation historique (uniquement si liste fournie)
    if annees_universitaires is not None:
        historique_existant = db.query(InstitutionHistorique).filter(
            InstitutionHistorique.Institution_id_fk == id_institution
        ).all()
        
        map_historique = {h.AnneeUniversitaire_id_fk: h for h in historique_existant}
        annees_cible = set(annees_universitaires)

        for annee_id, hist_obj in map_historique.items():
            if annee_id not in annees_cible:
                db.delete(hist_obj)

        for annee_id in annees_cible:
            if annee_id not in map_historique:
                hist = InstitutionHistorique(
                    Institution_id_fk=id_institution,
                    AnneeUniversitaire_id_fk=annee_id,
                    Institution_nom_historique=clean_nom,
                    Institution_code_historique=clean_code,
                    Institution_description_historique=description_db
                )
                db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur DB.")
        
    db.refresh(institution)
    return institution

# 🔹 Supprimer
@router.delete("/{id_institution}", status_code=204)
def delete_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Introuvable")
        
    if institution.Institution_logo_path:
        p = f"app{institution.Institution_logo_path}"
        if os.path.exists(p):
            try: os.remove(p)
            except: pass
    
    db.delete(institution)
    db.commit()
    return

# 🆕 Détails historique
@router.get("/{id_institution}/historique-details", response_model=List[HistoriqueDetailSchema])
def get_institution_history_details(id_institution: str, db: Session = Depends(get_db)):
    historiques = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution
    ).all()
    result = []
    for h in historiques:
        result.append({
            "annee_id": h.AnneeUniversitaire_id_fk,
            "annee_label": h.annee_univ.AnneeUniversitaire_annee if h.annee_univ else "N/A", 
            "nom_historique": h.Institution_nom_historique,
            "code_historique": h.Institution_code_historique,
            "description_historique": h.Institution_description_historique
        })
    return sorted(result, key=lambda x: x['annee_label'], reverse=True)

# 🆕 Switch ON (Ajout année)
@router.post("/{id_institution}/historique")
def add_institution_history_line(id_institution: str, annee_id: str = Body(..., embed=True), db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not inst: raise HTTPException(404, "Institution introuvable")

    exists = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution,
        InstitutionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    
    if exists: return {"message": "Déjà présent"}

    hist = InstitutionHistorique(
        Institution_id_fk=id_institution,
        AnneeUniversitaire_id_fk=annee_id,
        Institution_nom_historique=inst.Institution_nom,
        Institution_code_historique=inst.Institution_code,
        Institution_description_historique=inst.Institution_description
    )
    db.add(hist)
    db.commit()
    return {"message": "Ajouté"}

# 🆕 Switch OFF (Retrait année)
@router.delete("/{id_institution}/historique/{annee_id}")
def remove_institution_history_line(id_institution: str, annee_id: str, db: Session = Depends(get_db)):
    hist = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution,
        InstitutionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if hist:
        db.delete(hist)
        db.commit()
    return {"message": "Retiré"}

# 🆕 Modifier détail historique
@router.put("/{id_institution}/historique/{annee_id}")
def update_institution_history_line(id_institution: str, annee_id: str, payload: HistoriqueUpdateSchema, db: Session = Depends(get_db)):
    history_item = db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution,
        InstitutionHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if not history_item: raise HTTPException(404, "Introuvable")
    
    history_item.Institution_nom_historique = payload.nom
    history_item.Institution_code_historique = payload.code
    history_item.Institution_description_historique = payload.description
    db.commit()
    return {"message": "Mis à jour"}