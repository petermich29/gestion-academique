# backend/app/routers/parcours_routes.py

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/parcours", 
    tags=["Parcours & Enseignements"]
)

UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- UTILITAIRES ---
PARCOURS_ID_PREFIX = "PARC_"
# Regex simple pour trouver le max ID numéraire
ID_REGEX = re.compile(r"PARC_(\d+)")

def get_next_parcours_id(db: Session) -> str:
    existing_ids = db.query(models.Parcours.Parcours_id).all()
    used_numbers = []
    for (id_str,) in existing_ids:
        match = ID_REGEX.match(id_str)
        if match: used_numbers.append(int(match.group(1)))
    
    next_num = 1
    if used_numbers:
        used_numbers.sort()
        for num in used_numbers:
            if num == next_num: next_num += 1
            elif num > next_num: break
            
    return f"{PARCOURS_ID_PREFIX}{str(next_num).zfill(5)}"

def save_upload_file(upload_file: UploadFile, filename: str) -> str:
    file_location = os.path.join(UPLOAD_DIR, filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return f"/static/logos/{filename}"


# ==========================================
# 1. LECTURE (GET) AVEC HISTORIQUE
# ==========================================

@router.get("/next-id", response_model=str)
def get_next_id(db: Session = Depends(get_db)):
    return get_next_parcours_id(db)

@router.get("/mention/{mention_id}", response_model=List[schemas.ParcoursSchema])
def get_parcours_by_mention(
    mention_id: str,
    annees: Optional[List[str]] = Query(None), # Filtre années
    db: Session = Depends(get_db)
):
    """
    Récupère les parcours d'une mention.
    Si 'annees' est fourni :
      1. Filtre les parcours ayant une entrée historique dans ces années.
      2. Remplace Label/Code par ceux de l'historique le plus récent.
    """
    query = db.query(models.Parcours).filter(models.Parcours.Mention_id_fk == mention_id)
    
    # 🟢 CORRECTION : Application réelle du filtre si des années sont fournies
    if annees and len(annees) > 0:
        query = query.join(models.ParcoursHistorique).filter(
            models.ParcoursHistorique.AnneeUniversitaire_id_fk.in_(annees)
        ).distinct()

    parcours_list = query.all()

    # Application du Snapshot Historique (Label/Code à l'époque)
    if annees and len(annees) > 0:
        p_ids = [p.Parcours_id for p in parcours_list]
        # On ne récupère que l'historique pertinent pour l'affichage
        histories = (
            db.query(models.ParcoursHistorique)
            .join(models.AnneeUniversitaire, models.ParcoursHistorique.AnneeUniversitaire_id_fk == models.AnneeUniversitaire.AnneeUniversitaire_id)
            .filter(
                models.ParcoursHistorique.Parcours_id_fk.in_(p_ids),
                models.ParcoursHistorique.AnneeUniversitaire_id_fk.in_(annees)
            )
            .order_by(models.AnneeUniversitaire.AnneeUniversitaire_ordre.desc()) # Le plus récent en premier
            .all()
        )

        # Map pour accès rapide : ParcoursID -> Historique le plus récent
        history_map = {}
        for h in histories:
            if h.Parcours_id_fk not in history_map:
                history_map[h.Parcours_id_fk] = h
        
        # Application des données historiques sur l'objet retourné
        for p in parcours_list:
            if p.Parcours_id in history_map:
                h = history_map[p.Parcours_id]
                if h.Parcours_label_historique: p.Parcours_label = h.Parcours_label_historique
                if h.Parcours_code_historique: p.Parcours_code = h.Parcours_code_historique
                if h.Parcours_description_historique: p.Parcours_description = h.Parcours_description_historique
                if h.Parcours_abbreviation_historique: p.Parcours_abbreviation = h.Parcours_abbreviation_historique

    return parcours_list

@router.get("/{parcours_id}", response_model=schemas.ParcoursSchema)
def get_parcours(parcours_id: str, db: Session = Depends(get_db)):
    parcours = db.query(models.Parcours).filter(models.Parcours.Parcours_id == parcours_id).first()
    if not parcours: raise HTTPException(404, "Introuvable")
    return parcours

@router.get("/{parcours_id}/structure", response_model=List[schemas.StructureNiveau])
def get_parcours_structure(
    parcours_id: str, 
    annee_id: Optional[str] = Query(None, description="Année universitaire cible"),
    db: Session = Depends(get_db)
):
    # 1. Déterminer l'année
    if not annee_id:
        active_year = db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_is_active == True).first()
        if not active_year:
            raise HTTPException(404, "Aucune année active définie.")
        annee_target = active_year.AnneeUniversitaire_id
    else:
        annee_target = annee_id

    # 2. Récupérer la structure Niveaux -> Semestres via ParcoursNiveau
    # On vérifie quels niveaux sont ouverts pour ce parcours cette année-là
    liens_niveaux = (
        db.query(models.ParcoursNiveau)
        .filter(
            models.ParcoursNiveau.Parcours_id_fk == parcours_id,
            models.ParcoursNiveau.AnneeUniversitaire_id_fk == annee_target
        )
        .options(
            joinedload(models.ParcoursNiveau.niveau_lie)
            .joinedload(models.Niveau.semestres)
        )
        .order_by(models.ParcoursNiveau.ParcoursNiveau_ordre)
        .all()
    )
    
    structure_response = []
    
    for lien in liens_niveaux:
        niveau = lien.niveau_lie
        if not niveau: continue
        
        semestres_data = []
        # Pour chaque semestre du niveau
        for sem in sorted(niveau.semestres, key=lambda x: x.Semestre_numero):
            ues_data = []
            
            # 3. CRITIQUE : Récupérer les MaquetteUE (Liaison) et non les UE catalogue directes
            # On cherche : Les Maquettes pour ce Parcours + Cette Année + Ce Semestre
            maquettes = (
                db.query(models.MaquetteUE)
                .join(models.UniteEnseignement, models.MaquetteUE.UE_id_fk == models.UniteEnseignement.UE_id)
                .filter(
                    models.MaquetteUE.Parcours_id_fk == parcours_id,
                    models.MaquetteUE.AnneeUniversitaire_id_fk == annee_target,
                    models.MaquetteUE.Semestre_id_fk == sem.Semestre_id
                )
                .options(
                    joinedload(models.MaquetteUE.ue_catalog),
                    joinedload(models.MaquetteUE.maquette_ecs)
                )
                .all()
            )
            
            # Transformation vers le schéma frontend
            for mq in maquettes:
                # 🟢 CORRECTION : Construction de la liste des ECs
                ecs_data = []
                for mec in mq.maquette_ecs:
                    if mec.ec_catalog: # Sécurité
                        ecs_data.append(schemas.StructureEC(
                            id=mec.MaquetteEC_id,
                            id_catalog=mec.ec_catalog.EC_id,
                            code=mec.ec_catalog.EC_code,
                            intitule=mec.ec_catalog.EC_intitule,
                            coefficient=mec.MaquetteEC_coefficient
                        ))
                
                # Tri des EC par code pour un affichage propre
                ecs_data.sort(key=lambda x: x.code)

                ues_data.append(schemas.StructureUE(
                    id=mq.MaquetteUE_id,
                    id_maquette=mq.MaquetteUE_id,
                    id_catalog=mq.ue_catalog.UE_id,
                    code=mq.ue_catalog.UE_code,
                    intitule=mq.ue_catalog.UE_intitule,
                    credit=mq.MaquetteUE_credit,
                    ec_count=len(ecs_data),
                    ecs=ecs_data # <--- Injection ici
                ))
            
            # Tri par code UE
            ues_data.sort(key=lambda x: x.code)

            semestres_data.append(schemas.StructureSemestre(
                id=sem.Semestre_id,            # Mappage correct vers 'id'
                numero=str(sem.Semestre_numero), # Mappage vers 'numero' (converti en str si besoin)
                code=sem.Semestre_code,        # Mappage vers 'code'
                ues=ues_data
            ))
            
        structure_response.append(schemas.StructureNiveau(
            niveau_id=niveau.Niveau_id, 
            niveau_label=niveau.Niveau_label, 
            semestres=semestres_data,
        ))

    return structure_response

# ==========================================
# 2. CRUD (CREATE, UPDATE, DELETE)
# ==========================================

@router.post("/", response_model=schemas.ParcoursSchema)
def create_parcours(
    id_parcours: str = Form(...),
    id_mention: str = Form(...),
    code: str = Form(...),
    label: str = Form(...),
    id_type_formation: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # 1. Vérification Unicité
    if db.query(models.Parcours).filter(models.Parcours.Parcours_code == code, models.Parcours.Mention_id_fk == id_mention).first():
        raise HTTPException(400, "Ce code parcours existe déjà dans cette mention.")

    # 2. Logo
    logo_path = None
    if logo_file and logo_file.filename:
        ext = os.path.splitext(logo_file.filename)[1].lower()
        logo_path = save_upload_file(logo_file, f"{id_parcours}{ext}")

    # 3. Création
    new_parcours = models.Parcours(
        Parcours_id=id_parcours,
        Parcours_code=code,
        Parcours_label=label,
        Parcours_abbreviation=abbreviation,
        Parcours_description=description,
        Parcours_logo_path=logo_path,
        Mention_id_fk=id_mention,
        Parcours_type_formation_defaut_id_fk=id_type_formation
    )
    
    try:
        db.add(new_parcours)
        db.commit()
        
        # 🆕 4. Liaison automatique à l'année ACTIVE
        active_year = db.query(models.AnneeUniversitaire).filter(models.AnneeUniversitaire.AnneeUniversitaire_is_active == True).first()
        if active_year:
            hist = models.ParcoursHistorique(
                Parcours_id_fk=new_parcours.Parcours_id,
                AnneeUniversitaire_id_fk=active_year.AnneeUniversitaire_id,
                Parcours_label_historique=label,
                Parcours_code_historique=code,
                Parcours_abbreviation_historique=abbreviation,
                Parcours_description_historique=description
            )
            db.add(hist)
            db.commit()

        db.refresh(new_parcours)
        return new_parcours
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.put("/{parcours_id}", response_model=schemas.ParcoursSchema)
def update_parcours(
    parcours_id: str,
    code: str = Form(...),
    label: str = Form(...),
    id_type_formation: str = Form(...),
    abbreviation: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    logo_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    parcours = db.query(models.Parcours).filter(models.Parcours.Parcours_id == parcours_id).first()
    if not parcours: raise HTTPException(404, "Introuvable")

    parcours.Parcours_code = code
    parcours.Parcours_label = label
    parcours.Parcours_abbreviation = abbreviation
    parcours.Parcours_description = description
    parcours.Parcours_type_formation_defaut_id_fk = id_type_formation

    if logo_file:
        ext = os.path.splitext(logo_file.filename)[1].lower()
        parcours.Parcours_logo_path = save_upload_file(logo_file, f"{parcours_id}{ext}")

    db.commit()
    db.refresh(parcours)
    return parcours

@router.delete("/{parcours_id}", status_code=204)
def delete_parcours(parcours_id: str, db: Session = Depends(get_db)):
    parcours = db.query(models.Parcours).filter(models.Parcours.Parcours_id == parcours_id).first()
    if not parcours: raise HTTPException(404, "Introuvable")
    
    # Nettoyage fichier logo
    if parcours.Parcours_logo_path:
        path = f"app{parcours.Parcours_logo_path}"
        if os.path.exists(path): os.remove(path)
        
    db.delete(parcours)
    db.commit()
    return

# ==========================================
# 3. GESTION DE L'HISTORIQUE
# ==========================================

@router.get("/{parcours_id}/historique-details", response_model=List[schemas.HistoriqueDetailSchema])
def get_parcours_history_details(parcours_id: str, db: Session = Depends(get_db)):
    historiques = db.query(models.ParcoursHistorique).filter(
        models.ParcoursHistorique.Parcours_id_fk == parcours_id
    ).all()
    
    result = []
    for h in historiques:
        result.append({
            "annee_id": h.AnneeUniversitaire_id_fk,
            "annee_label": h.annee_univ.AnneeUniversitaire_annee if h.annee_univ else h.AnneeUniversitaire_id_fk,
            "nom_historique": h.Parcours_label_historique,
            "code_historique": h.Parcours_code_historique,
            "description_historique": h.Parcours_description_historique,
            "abbreviation_historique": h.Parcours_abbreviation_historique
        })
    return sorted(result, key=lambda x: x['annee_label'], reverse=True)

@router.post("/{parcours_id}/historique")
def add_parcours_history_line(parcours_id: str, annee_id: str = Body(..., embed=True), db: Session = Depends(get_db)):
    parcours = db.query(models.Parcours).filter(models.Parcours.Parcours_id == parcours_id).first()
    if not parcours: raise HTTPException(404, "Parcours introuvable")

    exists = db.query(models.ParcoursHistorique).filter(
        models.ParcoursHistorique.Parcours_id_fk == parcours_id,
        models.ParcoursHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if exists: return {"message": "Déjà présent"}

    hist = models.ParcoursHistorique(
        Parcours_id_fk=parcours_id,
        AnneeUniversitaire_id_fk=annee_id,
        Parcours_label_historique=parcours.Parcours_label,
        Parcours_code_historique=parcours.Parcours_code,
        Parcours_abbreviation_historique=parcours.Parcours_abbreviation,
        Parcours_description_historique=parcours.Parcours_description
    )
    db.add(hist)
    db.commit()
    return {"message": "Ajouté"}

@router.delete("/{parcours_id}/historique/{annee_id}")
def remove_parcours_history_line(parcours_id: str, annee_id: str, db: Session = Depends(get_db)):
    hist = db.query(models.ParcoursHistorique).filter(
        models.ParcoursHistorique.Parcours_id_fk == parcours_id,
        models.ParcoursHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if hist:
        db.delete(hist)
        db.commit()
    return {"message": "Retiré"}

@router.put("/{parcours_id}/historique/{annee_id}")
def update_parcours_history_line(parcours_id: str, annee_id: str, payload: schemas.HistoriqueUpdateSchema, db: Session = Depends(get_db)):
    hist = db.query(models.ParcoursHistorique).filter(
        models.ParcoursHistorique.Parcours_id_fk == parcours_id,
        models.ParcoursHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if not hist: raise HTTPException(404, "Introuvable")
    
    hist.Parcours_label_historique = payload.nom
    hist.Parcours_code_historique = payload.code
    hist.Parcours_description_historique = payload.description
    hist.Parcours_abbreviation_historique = payload.abbreviation
    
    db.commit()
    return {"message": "Mis à jour"}