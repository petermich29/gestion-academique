# gestion-academique\backend\app\routers\composantes_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import shutil
import re 
import time
import uuid
from pydantic import ValidationError 

# IMPORT DES MODÈLES NÉCESSAIRES À LA DUPLICATION
from app.models import (
    Composante, Institution, Mention, ComposanteHistorique,
    MentionHistorique, Parcours, ParcoursHistorique, ParcoursNiveau,
    MaquetteUE, MaquetteEC, VolumeHoraire, AnneeUniversitaire
)
from app.schemas import ComposanteSchema, ComposanteCreate 
from app.schemas import HistoriqueDetailSchema, HistoriqueUpdateSchema 
from app.database import get_db

router = APIRouter(
    prefix="/composantes", 
    tags=["Composantes (Établissements)"]
)

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
# FONCTIONS UTILITAIRES
# ------------------------------------

COMPOSANTE_ID_PREFIX = "COMP_"
ID_PAD_LENGTH = 4 
ID_REGEX = re.compile(r"COMP_(\d+)")

@router.get("/next-id", response_model=str, summary="Obtenir le prochain ID disponible")
def get_next_available_id(db: Session = Depends(get_db)):
    existing_ids = [c.Composante_id for c in db.query(Composante.Composante_id).all()]
    used_numbers = []
    for id_str in existing_ids:
        match = ID_REGEX.match(id_str)
        if match:
            used_numbers.append(int(match.group(1)))
            
    next_num = 1
    used_numbers.sort()
    for n in used_numbers:
        if n == next_num:
            next_num += 1
        elif n > next_num:
            break
            
    return f"{COMPOSANTE_ID_PREFIX}{str(next_num).zfill(ID_PAD_LENGTH)}"


# Fonction utilitaire pour gérer l'upload de logo
def save_logo_file(file: Optional[UploadFile], code: str, current_path: Optional[str] = None) -> Optional[str]:
    if not file or not file.filename:
        return current_path if current_path else None

    if current_path:
        old_file_location = f"app{current_path}"
        if os.path.exists(old_file_location):
            # Suppression de l'ancien logo si existant
            try: 
                os.remove(old_file_location)
            except Exception as e: 
                print(f"Avertissement suppression logo: {e}")

    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ['.jpg', '.jpeg', '.png', '.svg']:
        raise HTTPException(status_code=400, detail="Type de fichier invalide.")

    file_name = f"COMP_{code}_{int(time.time())}{file_extension}" 
    file_location = os.path.join(UPLOAD_DIR, file_name)
    
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur sauvegarde logo: {e}")

    return file_location.replace("app", "")


# ------------------------------------
#   COMPOSANTE MANAGEMENT ENDPOINTS
# ------------------------------------

@router.post("/", response_model=ComposanteSchema)
def create_composante(
    id_composante: str = Form(..., description="ID unique"),
    code: str = Form(..., description="Code court unique"),
    label: str = Form(..., alias="Composante_label"),
    institution_id_fk: str = Form(..., description="ID Institution"),
    type_composante: str = Form(..., alias="Composante_type"), # Reçoit la valeur du front
    description: Optional[str] = Form(None, alias="Composante_description"),
    abbreviation: Optional[str] = Form(None, alias="Composante_abbreviation"),
    logo: Optional[UploadFile] = File(None),
    annees_universitaires: Optional[List[str]] = Form(None),
    db: Session = Depends(get_db)
):
    institution = db.query(Institution).filter(Institution.Institution_id == institution_id_fk).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée.")
    
    clean_code = code.upper().strip()
    clean_label = label.strip()
    description_db = description.strip() if description and description.strip() else None
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    
    # ✅ CORRECTION: Gérer la valeur vide ("") pour un champ nullable
    clean_type = type_composante if type_composante and type_composante.strip() != "" else None

    # Validation Pydantic
    try:
        ComposanteCreate(
            Composante_id=id_composante, 
            Composante_code=clean_code,
            Composante_label=clean_label,
            Institution_id_fk=institution_id_fk,
            Composante_type=clean_type, # Utilise la valeur nettoyée
            Composante_description=description_db,
            Composante_abbreviation=abbreviation_db
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Données invalides: {e.errors()}")

    composante_data = {
        "Composante_id": id_composante,
        "Composante_code": clean_code,
        "Composante_label": clean_label,
        "Institution_id_fk": institution_id_fk,
        "Composante_type": clean_type, # Utilise la valeur nettoyée
        "Composante_description": description_db,
        "Composante_abbreviation": abbreviation_db
    }
    
    composante_data["Composante_logo_path"] = save_logo_file(logo, clean_code)
    
    db_composante = Composante(**composante_data)
    db.add(db_composante)

    if annees_universitaires:
        for annee_id in annees_universitaires:
            hist = ComposanteHistorique(
                Composante_id_fk=id_composante,
                AnneeUniversitaire_id_fk=annee_id,
                Composante_label_historique=clean_label,
                Composante_code_historique=clean_code,
                Composante_description_historique=description_db,
                Composante_abbreviation_historique=abbreviation_db 
            )
            db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur d'intégrité (ID ou Code).")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {e}")
        
    db.refresh(db_composante)
    # ✅ CORRECTION: Ajout du joinedload pour le type
    db_composante = db.query(Composante).filter(Composante.Composante_id == id_composante).options(
        joinedload(Composante.institution),
        joinedload(Composante.mentions),
        joinedload(Composante.type_composante) 
    ).first()
    
    return db_composante

@router.get("/{composante_id}/annees-historique", response_model=List[str])
def get_composante_years_history(composante_id: str, db: Session = Depends(get_db)):
    history_records = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id
    ).all()
    return [rec.AnneeUniversitaire_id_fk for rec in history_records]

@router.put("/{composante_id_path}", response_model=ComposanteSchema)
def update_composante(
    composante_id_path: str,
    code: str = Form(...),
    label: str = Form(..., alias="Composante_label"),
    institution_id_fk: str = Form(...),
    type_composante: str = Form(..., alias="Composante_type"), # Reçoit la valeur du front
    description: Optional[str] = Form(None, alias="Composante_description"),
    abbreviation: Optional[str] = Form(None, alias="Composante_abbreviation"),
    logo: Optional[UploadFile] = File(None),
    remove_logo: bool = Form(False), 
    annees_universitaires: Optional[List[str]] = Form(None),
    db: Session = Depends(get_db)
):
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante non trouvée")

    clean_code = code.upper().strip()
    clean_label = label.strip()
    description_db = description.strip() if description and description.strip() else None
    abbreviation_db = abbreviation.strip() if abbreviation and abbreviation.strip() else None
    
    # ✅ CORRECTION: Gérer la valeur vide ("") pour un champ nullable
    clean_type = type_composante if type_composante and type_composante.strip() != "" else None


    # Mise à jour champs principaux
    composante.Composante_code = clean_code
    composante.Composante_label = clean_label
    composante.Institution_id_fk = institution_id_fk
    # ✅ CORRECTION: Utiliser la valeur nettoyée
    composante.Composante_type = clean_type 
    composante.Composante_description = description_db
    composante.Composante_abbreviation = abbreviation_db
    
    # Gestion Logo
    if remove_logo:
        if composante.Composante_logo_path:
            old_path = f"app{composante.Composante_logo_path}"
            if os.path.exists(old_path): 
                try: 
                    os.remove(old_path) 
                except: 
                    pass
        composante.Composante_logo_path = None 
    elif logo:
        composante.Composante_logo_path = save_logo_file(logo, clean_code, composante.Composante_logo_path)
    
    # Synchronisation Historique
    if annees_universitaires is not None:
        historique_existant = db.query(ComposanteHistorique).filter(
            ComposanteHistorique.Composante_id_fk == composante.Composante_id
        ).all()
        
        map_historique = {h.AnneeUniversitaire_id_fk: h for h in historique_existant}
        annees_cible = set(annees_universitaires)

        for annee_id, hist_obj in map_historique.items():
            if annee_id not in annees_cible:
                db.delete(hist_obj)

        for annee_id in annees_cible:
            if annee_id not in map_historique:
                hist = ComposanteHistorique(
                    Composante_id_fk=composante.Composante_id,
                    AnneeUniversitaire_id_fk=annee_id,
                    Composante_label_historique=clean_label,
                    Composante_code_historique=clean_code,
                    Composante_description_historique=description_db,
                    Composante_abbreviation_historique=abbreviation_db 
                )
                db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur DB.")
    
    db.refresh(composante)
    # ✅ CORRECTION: Ajout du joinedload pour le type
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).options(
        joinedload(Composante.institution),
        joinedload(Composante.mentions),
        joinedload(Composante.type_composante) 
    ).first()
    
    return composante

@router.delete("/{composante_id_path}", status_code=204)
def delete_composante(composante_id_path: str, db: Session = Depends(get_db)):
    composante = db.query(Composante).filter(Composante.Composante_id == composante_id_path).first()
    if not composante:
        raise HTTPException(status_code=404, detail="Composante introuvable.")
    
    if composante.Composante_logo_path:
        path = f"app{composante.Composante_logo_path}"
        if os.path.exists(path): 
            try: 
                os.remove(path) 
            except: 
                pass

    db.query(ComposanteHistorique).filter(ComposanteHistorique.Composante_id_fk == composante.Composante_id).delete()
    db.delete(composante)
    db.commit()
    return

@router.get("/institution", response_model=List[ComposanteSchema])
def get_composantes_by_institution(
    institution_id: str, 
    annees: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Composante).filter(Composante.Institution_id_fk == institution_id)

    # Logique de filtrage historique
    if annees and len(annees) > 0:
        query = query.join(ComposanteHistorique).filter(
            ComposanteHistorique.AnneeUniversitaire_id_fk.in_(annees)
        ).distinct()
    
    # Ajout du type_composante pour l'affichage en liste
    results = query.options(
        joinedload(Composante.institution), 
        joinedload(Composante.mentions),
        joinedload(Composante.type_composante)
    ).all()
    
    # Logique de remplacement (Nom/Code) selon l'historique le plus récent
    if annees and len(annees) > 0:
        from app.models import AnneeUniversitaire
        comp_ids = [c.Composante_id for c in results]
        histories = (
            db.query(ComposanteHistorique)
            .join(AnneeUniversitaire, ComposanteHistorique.AnneeUniversitaire_id_fk == AnneeUniversitaire.AnneeUniversitaire_id)
            .filter(
                ComposanteHistorique.Composante_id_fk.in_(comp_ids),
                ComposanteHistorique.AnneeUniversitaire_id_fk.in_(annees)
            )
            .all()
        )
        
        best_history_map = {}
        for h in histories:
            i_id = h.Composante_id_fk
            current_ordre = h.annee_univ.AnneeUniversitaire_ordre if h.annee_univ else 0
            if i_id not in best_history_map or current_ordre > best_history_map[i_id][0]:
                best_history_map[i_id] = (current_ordre, h)
        
        for comp in results:
            if comp.Composante_id in best_history_map:
                best_h = best_history_map[comp.Composante_id][1]
                comp.Composante_label = best_h.Composante_label_historique
                comp.Composante_code = best_h.Composante_code_historique
                comp.Composante_description = best_h.Composante_description_historique
                if hasattr(best_h, 'Composante_abbreviation_historique') and best_h.Composante_abbreviation_historique:
                    comp.Composante_abbreviation = best_h.Composante_abbreviation_historique

    return results

@router.get("/{composante_id}/historique-details", response_model=List[HistoriqueDetailSchema])
def get_composante_history_details(composante_id: str, db: Session = Depends(get_db)):
    historiques = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id
    ).all()
    
    result = []
    for h in historiques:
        abbreviation = getattr(h, "Composante_abbreviation_historique", None)
        
        result.append({
            "annee_id": h.AnneeUniversitaire_id_fk,
            "annee_label": h.annee_univ.AnneeUniversitaire_annee if h.annee_univ else h.AnneeUniversitaire_id_fk,
            "nom_historique": h.Composante_label_historique,
            "code_historique": h.Composante_code_historique,
            "description_historique": h.Composante_description_historique,
            "abbreviation_historique": abbreviation
        })
    return sorted(result, key=lambda x: x['annee_label'], reverse=True)

@router.post("/{composante_id}/historique")
def add_composante_history_line(composante_id: str, annee_id: str = Body(..., embed=True), db: Session = Depends(get_db)):
    comp = db.query(Composante).filter(Composante.Composante_id == composante_id).first()
    if not comp: raise HTTPException(404, "Composante introuvable")

    exists = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id,
        ComposanteHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if exists: return {"message": "Déjà présent"}

    hist = ComposanteHistorique(
        Composante_id_fk=composante_id,
        AnneeUniversitaire_id_fk=annee_id,
        Composante_label_historique=comp.Composante_label,
        Composante_code_historique=comp.Composante_code,
        Composante_description_historique=comp.Composante_description,
        Composante_abbreviation_historique=comp.Composante_abbreviation
    )
    db.add(hist)
    db.commit()
    return {"message": "Ajouté"}

@router.delete("/{composante_id}/historique/{annee_id}")
def remove_composante_history_line(composante_id: str, annee_id: str, db: Session = Depends(get_db)):
    hist = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id,
        ComposanteHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if hist:
        db.delete(hist)
        db.commit()
    return {"message": "Retiré"}

@router.put("/{composante_id}/historique/{annee_id}")
def update_composante_history_line(composante_id: str, annee_id: str, payload: HistoriqueUpdateSchema, db: Session = Depends(get_db)):
    history_item = db.query(ComposanteHistorique).filter(
        ComposanteHistorique.Composante_id_fk == composante_id,
        ComposanteHistorique.AnneeUniversitaire_id_fk == annee_id
    ).first()
    if not history_item: raise HTTPException(404, "Introuvable")
    
    history_item.Composante_label_historique = payload.nom
    history_item.Composante_code_historique = payload.code
    history_item.Composante_description_historique = payload.description
    
    if hasattr(history_item, 'Composante_abbreviation_historique'):
        history_item.Composante_abbreviation_historique = payload.abbreviation
    
    db.commit()
    return {"message": "Mis à jour"}


# ------------------------------------
#   FONCTION UTILITAIRE (COPIE LOCALE)
# ------------------------------------
def _copy_history_data(source_entity, source_hist, entity_type):
    """
    Récupère les données à copier (Nom, Code, Desc, Abbr)
    """
    mapping = {
        "composante": {
            "label": ("Composante_label", "Composante_label_historique"),
            "code": ("Composante_code", "Composante_code_historique"),
            "description": ("Composante_description", "Composante_description_historique"),
            "abbreviation": ("Composante_abbreviation", "Composante_abbreviation_historique")
        },
        "mention": {
            "label": ("Mention_label", "Mention_label_historique"),
            "code": ("Mention_code", "Mention_code_historique"),
            "description": ("Mention_description", "Mention_description_historique"),
            "abbreviation": ("Mention_abbreviation", "Mention_abbreviation_historique")
        },
        "parcours": {
            "label": ("Parcours_label", "Parcours_label_historique"),
            "code": ("Parcours_code", "Parcours_code_historique"),
            "description": ("Parcours_description", "Parcours_description_historique"),
            "abbreviation": ("Parcours_abbreviation", "Parcours_abbreviation_historique")
        }
    }
    
    current_map = mapping.get(entity_type)
    if not current_map: return {}

    data = {}
    for _, (current_field, hist_field) in current_map.items():
        # Priorité à l'historique source, sinon l'entité de base
        data[hist_field] = getattr(source_hist, hist_field) if source_hist else getattr(source_entity, current_field, None)
    
    return data


# ------------------------------------
#   ENDPOINT DE DUPLICATION (ETABLISSEMENT)
# ------------------------------------

@router.post("/{composante_id}/duplicate")
def duplicate_composante_structure(
    composante_id: str,
    source_annee_id: str = Body(..., embed=True),
    target_annee_id: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Duplique la structure d'un Établissement spécifique vers une autre année.
    Inclus: Historique Composante -> Mentions -> Parcours (Niveaux) -> Maquettes (UE/EC) -> Volumes.
    """
    
    # 1. Vérifications initiales
    comp = db.query(Composante).filter(Composante.Composante_id == composante_id).first()
    if not comp: raise HTTPException(404, "Composante introuvable")
    
    if source_annee_id == target_annee_id:
        raise HTTPException(400, "L'année source et l'année cible doivent être différentes.")

    results = {
        "composante": "Ignoré",
        "mentions_created": 0,
        "parcours_created": 0,
        "parcours_niveaux_created": 0,
        "maquettes_ue_created": 0, # Correspond aux UEs attachées
        "maquettes_ec_created": 0,
        "volumes_horaires_created": 0
    }

    try:
        # 2. DUPLICATION HISTORIQUE COMPOSANTE
        hist_comp_exists = db.query(ComposanteHistorique).filter(
            ComposanteHistorique.Composante_id_fk == composante_id,
            ComposanteHistorique.AnneeUniversitaire_id_fk == target_annee_id
        ).first()
        
        source_hist_comp = db.query(ComposanteHistorique).filter(
            ComposanteHistorique.Composante_id_fk == composante_id,
            ComposanteHistorique.AnneeUniversitaire_id_fk == source_annee_id
        ).first()

        if not hist_comp_exists:
            data = _copy_history_data(comp, source_hist_comp, "composante")
            new_hist = ComposanteHistorique(
                Composante_id_fk=composante_id,
                AnneeUniversitaire_id_fk=target_annee_id,
                **data
            )
            db.add(new_hist)
            results["composante"] = "Dupliqué"

        # 3. MENTIONS
        mentions = db.query(Mention).filter(Mention.Composante_id_fk == composante_id).all()
        for ment in mentions:
            hist_ment_exists = db.query(MentionHistorique).filter(
                MentionHistorique.Mention_id_fk == ment.Mention_id,
                MentionHistorique.AnneeUniversitaire_id_fk == target_annee_id
            ).first()
            source_hist_ment = db.query(MentionHistorique).filter(
                MentionHistorique.Mention_id_fk == ment.Mention_id,
                MentionHistorique.AnneeUniversitaire_id_fk == source_annee_id
            ).first()

            if not hist_ment_exists:
                data = _copy_history_data(ment, source_hist_ment, "mention")
                new_hist = MentionHistorique(
                    Mention_id_fk=ment.Mention_id,
                    AnneeUniversitaire_id_fk=target_annee_id,
                    **data
                )
                db.add(new_hist)
                results["mentions_created"] += 1

            # 4. PARCOURS
            parcours_list = db.query(Parcours).filter(Parcours.Mention_id_fk == ment.Mention_id).all()
            for parc in parcours_list:
                hist_parc_exists = db.query(ParcoursHistorique).filter(
                    ParcoursHistorique.Parcours_id_fk == parc.Parcours_id,
                    ParcoursHistorique.AnneeUniversitaire_id_fk == target_annee_id
                ).first()
                source_hist_parc = db.query(ParcoursHistorique).filter(
                    ParcoursHistorique.Parcours_id_fk == parc.Parcours_id,
                    ParcoursHistorique.AnneeUniversitaire_id_fk == source_annee_id
                ).first()

                if not hist_parc_exists:
                    data = _copy_history_data(parc, source_hist_parc, "parcours")
                    new_hist = ParcoursHistorique(
                        Parcours_id_fk=parc.Parcours_id,
                        AnneeUniversitaire_id_fk=target_annee_id,
                        **data
                    )
                    db.add(new_hist)
                    results["parcours_created"] += 1

                # 4.5 NIVEAUX (ParcoursNiveau)
                source_parcours_niveaux = db.query(ParcoursNiveau).filter(
                    ParcoursNiveau.Parcours_id_fk == parc.Parcours_id,
                    ParcoursNiveau.AnneeUniversitaire_id_fk == source_annee_id
                ).all()

                for src_pn in source_parcours_niveaux:
                    exists_pn = db.query(ParcoursNiveau).filter(
                        ParcoursNiveau.Parcours_id_fk == parc.Parcours_id,
                        ParcoursNiveau.Niveau_id_fk == src_pn.Niveau_id_fk,
                        ParcoursNiveau.AnneeUniversitaire_id_fk == target_annee_id
                    ).first()

                    if not exists_pn:
                        new_pn_id = f"PN_{uuid.uuid4().hex[:12]}"
                        new_pn = ParcoursNiveau(
                            ParcoursNiveau_id=new_pn_id,
                            Parcours_id_fk=parc.Parcours_id,
                            Niveau_id_fk=src_pn.Niveau_id_fk,
                            AnneeUniversitaire_id_fk=target_annee_id,
                            ParcoursNiveau_ordre=getattr(src_pn, 'ParcoursNiveau_ordre', None) 
                        )
                        db.add(new_pn)
                        results["parcours_niveaux_created"] += 1

                # 5. MAQUETTE UE
                source_maquettes_ue = db.query(MaquetteUE).filter(
                    MaquetteUE.Parcours_id_fk == parc.Parcours_id,
                    MaquetteUE.AnneeUniversitaire_id_fk == source_annee_id
                ).all()

                for source_m_ue in source_maquettes_ue:
                    # >>> VÉRIFICATION DE L'EXISTENCE (Skip si existe) <<<
                    exists_m_ue = db.query(MaquetteUE).filter(
                        MaquetteUE.Parcours_id_fk == parc.Parcours_id,
                        MaquetteUE.AnneeUniversitaire_id_fk == target_annee_id,
                        MaquetteUE.UE_id_fk == source_m_ue.UE_id_fk # Même UE Catalogue
                    ).first()

                    # Si la maquette existe déjà pour cette UE dans l'année cible, on PASSE (continue)
                    if exists_m_ue:
                        continue 

                    # Création de la Maquette UE
                    new_m_ue_id = f"MUE_{uuid.uuid4().hex[:12]}"
                    new_m_ue = MaquetteUE(
                        MaquetteUE_id=new_m_ue_id,
                        Parcours_id_fk=parc.Parcours_id,
                        AnneeUniversitaire_id_fk=target_annee_id,
                        UE_id_fk=source_m_ue.UE_id_fk,
                        Semestre_id_fk=source_m_ue.Semestre_id_fk,
                        MaquetteUE_credit=source_m_ue.MaquetteUE_credit
                    )
                    db.add(new_m_ue)
                    results["maquettes_ue_created"] += 1

                    # 6. MAQUETTE EC (Enfants de la Maquette UE)
                    source_maquettes_ec = db.query(MaquetteEC).filter(
                        MaquetteEC.MaquetteUE_id_fk == source_m_ue.MaquetteUE_id
                    ).all()
                    
                    for source_m_ec in source_maquettes_ec:
                        new_m_ec_id = f"MEC_{uuid.uuid4().hex[:12]}"
                        new_m_ec = MaquetteEC(
                            MaquetteEC_id=new_m_ec_id,
                            MaquetteUE_id_fk=new_m_ue_id,
                            EC_id_fk=source_m_ec.EC_id_fk,
                            MaquetteEC_coefficient=source_m_ec.MaquetteEC_coefficient
                        )
                        db.add(new_m_ec)
                        results["maquettes_ec_created"] += 1

                        # 7. VOLUMES HORAIRES
                        source_vols = db.query(VolumeHoraire).filter(
                            VolumeHoraire.MaquetteEC_id_fk == source_m_ec.MaquetteEC_id
                        ).all()

                        for vol in source_vols:
                            new_vol = VolumeHoraire(
                                Volume_id=f"VOL_{uuid.uuid4().hex[:12]}",
                                MaquetteEC_id_fk=new_m_ec_id,
                                TypeEnseignement_id_fk=vol.TypeEnseignement_id_fk,
                                Volume_heures=vol.Volume_heures
                            )
                            db.add(new_vol)
                            results["volumes_horaires_created"] += 1

        db.commit()
        return {"message": "Duplication terminée avec succès.", "details": results}

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Erreur lors de la duplication: {str(e)}")
    
@router.get("/options", response_model=List[dict]) 
def get_composantes_options_standalone(db: Session = Depends(get_db)):
    """
    Endpoint pour charger la liste simplifiée de toutes les composantes
    utilisée par les listes déroulantes de l'application.
    URL finale : /api/composantes/options
    """
    composantes = db.query(Composante).all()
    
    # Assurez-vous que les clés 'id', 'nom', 'institution_id' correspondent 
    # à ce que votre frontend attend pour les options
    return [{
        "id": c.Composante_id, 
        "nom": c.Composante_label, 
        "institution_id": c.Institution_id_fk
    } for c in composantes]