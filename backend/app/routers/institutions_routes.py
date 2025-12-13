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

from app.models import (
    Composante, ComposanteHistorique, 
    Mention, MentionHistorique, 
    Parcours, ParcoursHistorique, ParcoursNiveau,
    MaquetteUE, MaquetteEC, VolumeHoraire # Ajout des modèles enfants pour la cascade
) 
import uuid # Pour la génération des IDs des nouvelles MaquetteUE et MaquetteEC

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
                Institution_description_historique=description_db,
                Institution_abbreviation_historique=abbreviation_db
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
            # 🆕 Surcharge Abbreviation
            if best_h.Institution_abbreviation_historique:
                inst.Institution_abbreviation = best_h.Institution_abbreviation_historique

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

# =========================================================
# 🔹 MODIFICATION 1 : CORRECTION DE LA ROUTE PUT
# =========================================================

# On ajoute {id_institution} dans le chemin pour correspondre au Frontend
@router.put("/{id_institution}", response_model=InstitutionSchema)
def update_institution(
    id_institution: str,  # Récupéré depuis l'URL
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

    # Recherche de l'institution
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    # Mise à jour des champs de base
    institution.Institution_code = clean_code
    institution.Institution_nom = clean_nom
    institution.Institution_type = type_institution
    institution.Institution_abbreviation = abbreviation_db
    institution.Institution_description = description_db

    # Gestion du logo
    if logo_file and logo_file.filename:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        try:
            full_path = f"app{logo_path}"
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
            institution.Institution_logo_path = logo_path 
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur logo upload: {str(e)}")

    # Gestion de l'historique (inchangée, mais le contexte est préservé)
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
                    Institution_description_historique=description_db,
                    Institution_abbreviation_historique=abbreviation_db
                )
                db.add(hist)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur DB : Code probablement dupliqué.")
        
    db.refresh(institution)
    return institution


# =========================================================
# 🔹 MODIFICATION 2 : SUPPRESSION AVEC HISTORIQUE
# =========================================================

@router.delete("/{id_institution}", status_code=204)
def delete_institution(id_institution: str, db: Session = Depends(get_db)):
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Introuvable")
        
    # 1. Suppression du fichier Logo physique s'il existe
    if institution.Institution_logo_path:
        p = f"app{institution.Institution_logo_path}"
        if os.path.exists(p):
            try: os.remove(p)
            except: pass
    
    # 2. Suppression explicite des historiques liés
    # Même si 'cascade' est configuré dans le modèle, cela force le nettoyage explicite
    db.query(InstitutionHistorique).filter(
        InstitutionHistorique.Institution_id_fk == id_institution
    ).delete(synchronize_session=False)

    # 3. Suppression de l'institution
    db.delete(institution)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")
        
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
            "description_historique": h.Institution_description_historique,
            "abbreviation_historique": h.Institution_abbreviation_historique # 🆕
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

# ------------------------------------
#   FONCTION UTILITAIRE DE COPIE DES DONNÉES HISTORIQUES
# ------------------------------------

def _copy_history_data(source_entity, source_hist, entity_type):
    """
    Récupère les données à copier, soit depuis l'historique source, soit depuis l'entité de base.
    """
    mapping = {}
    if entity_type == "institution":
        mapping = {
            "nom": ("Institution_nom", "Institution_nom_historique"),
            "code": ("Institution_code", "Institution_code_historique"),
            "description": ("Institution_description", "Institution_description_historique"),
            "abbreviation": ("Institution_abbreviation", "Institution_abbreviation_historique")
        }
    elif entity_type == "composante":
        mapping = {
            "label": ("Composante_label", "Composante_label_historique"),
            "code": ("Composante_code", "Composante_code_historique"),
            "description": ("Composante_description", "Composante_description_historique"),
            "abbreviation": ("Composante_abbreviation", "Composante_abbreviation_historique")
        }
    elif entity_type == "mention":
        mapping = {
            "label": ("Mention_label", "Mention_label_historique"),
            "code": ("Mention_code", "Mention_code_historique"),
            "description": ("Mention_description", "Mention_description_historique"),
            "abbreviation": ("Mention_abbreviation", "Mention_abbreviation_historique")
        }
    elif entity_type == "parcours":
        mapping = {
            "label": ("Parcours_label", "Parcours_label_historique"),
            "code": ("Parcours_code", "Parcours_code_historique"),
            "description": ("Parcours_description", "Parcours_description_historique"),
            "abbreviation": ("Parcours_abbreviation", "Parcours_abbreviation_historique")
        }

    data = {}
    for _, (current_field, hist_field) in mapping.items():
        # Priorité à l'historique source, sinon l'entité de base
        data[hist_field] = getattr(source_hist, hist_field) if source_hist else getattr(source_entity, current_field, None)
    
    return data


# ------------------------------------
#   NOUVEL ENDPOINT DE DUPLICATION (CASCADE)
# ------------------------------------

@router.post("/{id_institution}/duplicate")
def duplicate_institution_structure(
    id_institution: str,
    source_annee_id: str = Body(..., embed=True),
    target_annee_id: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Duplique toute la structure (Institution -> Maquettes -> Volumes Horaires)
    """
    
    inst = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not inst: raise HTTPException(404, "Institution introuvable")
    
    # Vérification des années
    if source_annee_id == target_annee_id:
        raise HTTPException(400, "L'année source et l'année cible doivent être différentes.")

    results = {
        "institution": "Ignoré",
        "composantes_created": 0,
        "mentions_created": 0,
        "parcours_created": 0,
        "parcours_niveaux_created": 0,
        "maquettes_ue_created": 0,
        "maquettes_ec_created": 0,
        "volumes_horaires_created": 0 
    }

    try:
        # 1. INSTITUTION
        hist_inst_exists = db.query(InstitutionHistorique).filter(
            InstitutionHistorique.Institution_id_fk == id_institution,
            InstitutionHistorique.AnneeUniversitaire_id_fk == target_annee_id
        ).first()
        
        source_hist_inst = db.query(InstitutionHistorique).filter(
            InstitutionHistorique.Institution_id_fk == id_institution,
            InstitutionHistorique.AnneeUniversitaire_id_fk == source_annee_id
        ).first()

        if not hist_inst_exists:
            data = _copy_history_data(inst, source_hist_inst, "institution")
            new_hist = InstitutionHistorique(
                Institution_id_fk=id_institution,
                AnneeUniversitaire_id_fk=target_annee_id,
                **data
            )
            db.add(new_hist)
            results["institution"] = "Dupliqué"

        # 2. COMPOSANTES
        composantes = db.query(Composante).filter(Composante.Institution_id_fk == id_institution).all()
        for comp in composantes:
            hist_comp_exists = db.query(ComposanteHistorique).filter(
                ComposanteHistorique.Composante_id_fk == comp.Composante_id,
                ComposanteHistorique.AnneeUniversitaire_id_fk == target_annee_id
            ).first()
            source_hist_comp = db.query(ComposanteHistorique).filter(
                ComposanteHistorique.Composante_id_fk == comp.Composante_id,
                ComposanteHistorique.AnneeUniversitaire_id_fk == source_annee_id
            ).first()

            if not hist_comp_exists:
                data = _copy_history_data(comp, source_hist_comp, "composante")
                new_hist = ComposanteHistorique(
                    Composante_id_fk=comp.Composante_id,
                    AnneeUniversitaire_id_fk=target_annee_id,
                    **data
                )
                db.add(new_hist)
                results["composantes_created"] += 1
            
            # 3. MENTIONS
            mentions = db.query(Mention).filter(Mention.Composante_id_fk == comp.Composante_id).all()
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

                    # 4.5. DUPLICATION DES NIVEAUX (ParcoursNiveau)
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
                        # >>> CORRECTION ICI : Vérifier existence cible pour ne PAS dupliquer si déjà présent <<<
                        exists_m_ue = db.query(MaquetteUE).filter(
                            MaquetteUE.Parcours_id_fk == parc.Parcours_id,
                            MaquetteUE.AnneeUniversitaire_id_fk == target_annee_id,
                            MaquetteUE.UE_id_fk == source_m_ue.UE_id_fk
                        ).first()

                        if exists_m_ue:
                            continue # On passe à la suivante si l'UE est déjà dans la maquette cible

                        # Création nouvelle MaquetteUE
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

                        # 6. MAQUETTE EC
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
    