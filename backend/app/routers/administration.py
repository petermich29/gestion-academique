from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import shutil
import os

# Importations des modèles et schémas
from app.models import Institution, Composante, Domaine, Mention, Parcours
from app.schemas import InstitutionSchema, ComposanteSchema, DomaineSchema, MentionSchema, ParcoursSchema
from app.database import get_db

# CORRECTION 1: Le préfixe /api est retiré ici car il est ajouté dans main.py
router = APIRouter(tags=["Administration"]) 

# Configuration du dossier d'upload
UPLOAD_DIR = "app/static/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------------------------
#  INSTITUTION MANAGEMENT ENDPOINTS (Chemins: /institutions/...)
# ------------------------------------

# 🔹 Ajouter une institution (POST)
# Chemin réel grâce à main.py: /api/institutions
@router.post("/institutions", response_model=InstitutionSchema, summary="Ajouter une nouvelle institution")
def create_institution(
    id_institution: str = Form(..., description="Identifiant unique de l'institution (ex: UNIV_FIAN)"),
    nom: str = Form(..., description="Nom complet de l'institution (ex: Université de Fianarantsoa)"),
    type_institution: str = Form(..., description="Type de l'institution (ex: Université, École, Centre)"),
    abbreviation: str = Form(None, description="Abréviation (ex: UF)"),
    description: str = Form(None, description="Description ou mission"),
    logo_file: UploadFile = File(None, description="Fichier du logo de l'institution"),
    db: Session = Depends(get_db),
):
    """
    Crée une nouvelle institution académique dans la base de données.
    """
    
    if db.query(Institution).filter(Institution.Institution_id == id_institution).first():
        raise HTTPException(status_code=400, detail=f"L'ID institution '{id_institution}' existe déjà.")
    
    if db.query(Institution).filter(Institution.Institution_nom == nom).first():
        raise HTTPException(status_code=400, detail=f"Le nom '{nom}' existe déjà.")
    
    # Gestion du logo
    logo_path = None
    if logo_file:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        file_location = f"app{logo_path}"
        
        try:
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement du logo: {e}")

    institution = Institution(
        Institution_id=id_institution,
        Institution_nom=nom,
        Institution_type=type_institution,
        Institution_abbreviation=abbreviation,
        Institution_description=description,
        Institution_logo_path=logo_path
    )
    
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution

# 🔹 Liste de toutes les institutions (GET)
@router.get("/institutions", response_model=list[InstitutionSchema], summary="Liste de toutes les institutions")
def get_institutions(db: Session = Depends(get_db)):
    """Retourne la liste complète de toutes les institutions."""
    return db.query(Institution).all()

# 🔹 Détails d'une institution (GET by ID)
@router.get("/institutions/{id_institution}", response_model=InstitutionSchema, summary="Détails d'une institution par ID")
def get_institution(id_institution: str, db: Session = Depends(get_db)):
    """
    Récupère les détails d'une institution spécifique.
    Retourne 404 si non trouvée.
    """
    institution = (
        db.query(Institution)
        .filter(Institution.Institution_id == id_institution) 
        .first()
    )
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    return institution

# 🔹 Modifier une institution (PUT)
@router.put("/institutions", response_model=InstitutionSchema, summary="Modifier une institution existante")
def update_institution(
    id_institution: str = Form(..., description="Identifiant de l'institution à modifier"),
    nom: str = Form(..., description="Nouveau nom complet"),
    type_institution: str = Form(..., description="Nouveau type"),
    abbreviation: str = Form(None, description="Nouvelle abréviation"),
    description: str = Form(None, description="Nouvelle description"),
    logo_file: UploadFile = File(None, description="Nouveau fichier de logo (optionnel)"),
    db: Session = Depends(get_db),
):
    """Met à jour les informations d'une institution existante identifiée par id_institution."""
    
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")

    existing_nom = db.query(Institution).filter(
        Institution.Institution_nom == nom, 
        Institution.Institution_id != id_institution
    ).first()
    if existing_nom:
        raise HTTPException(status_code=400, detail=f"Le nom '{nom}' existe déjà pour une autre institution.")

    institution.Institution_nom = nom
    institution.Institution_type = type_institution
    institution.Institution_abbreviation = abbreviation
    institution.Institution_description = description

    # Gestion du logo (si un nouveau fichier est fourni)
    if logo_file:
        file_ext = os.path.splitext(logo_file.filename)[1]
        logo_path = f"/static/logos/{id_institution}{file_ext}"
        file_location = f"app{logo_path}"
        
        try:
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(logo_file.file, buffer)
            institution.Institution_logo_path = logo_path 
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement du nouveau logo: {e}")

    db.commit()
    db.refresh(institution)
    return institution

# 🔹 Supprimer une institution (DELETE)
@router.delete("/institutions/{id_institution}", status_code=204, summary="Supprimer une institution")
def delete_institution(id_institution: str, db: Session = Depends(get_db)):
    """Supprime une institution par son identifiant unique."""
    institution = db.query(Institution).filter(Institution.Institution_id == id_institution).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
        
    # Supprimer le logo s'il existe (Institution_logo_path)
    if institution.Institution_logo_path:
        file_location = f"app{institution.Institution_logo_path}"
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except Exception as e:
                print(f"Avertissement: Impossible de supprimer le fichier logo {file_location}. Erreur: {e}")

    db.delete(institution)
    db.commit()
    return {"detail": "Institution supprimée avec succès"}



# ------------------------------------
#  DOMAINE MANAGEMENT ENDPOINTS (Chemins: /domaines/...)
# ------------------------------------

# 🔹 Ajouter un Domaine (POST)
@router.post("/domaines", response_model=DomaineSchema, summary="Créer un nouveau domaine d'étude")
def create_domaine(
    id_domaine: str = Form(..., description="Identifiant unique du domaine"),
    nom: str = Form(..., description="Nom du domaine (ex: Science et Technologie)"),
    db: Session = Depends(get_db)
):
    """Crée un nouveau domaine d'étude."""
    if db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first():
        raise HTTPException(status_code=400, detail="L'ID domaine existe déjà.")
    
    domaine = Domaine(id_domaine=id_domaine, nom=nom)
    db.add(domaine)
    db.commit()
    db.refresh(domaine)
    return domaine

# 🔹 Modifier un Domaine (PUT)
@router.put("/domaines", response_model=DomaineSchema, summary="Modifier un domaine existant")
def update_domaine(
    id_domaine: str = Form(..., description="Identifiant du domaine à modifier"),
    nom: str = Form(..., description="Nouveau nom du domaine"),
    db: Session = Depends(get_db)
):
    """Met à jour un domaine existant."""
    domaine = db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé.")
        
    domaine.nom = nom
    db.commit()
    db.refresh(domaine)
    return domaine

# 🔹 Liste de tous les Domaines (GET all)
@router.get("/domaines", response_model=List[DomaineSchema], summary="Liste de tous les domaines d'étude")
def get_domaines(db: Session = Depends(get_db)):
    """Retourne la liste complète de tous les domaines."""
    return db.query(Domaine).all()

# 🔹 Détails d'un Domaine (GET by ID)
@router.get("/domaines/{id_domaine}", response_model=DomaineSchema, summary="Détails d'un domaine par ID")
def get_domaine(id_domaine: str, db: Session = Depends(get_db)):
    """Récupère les détails d'un domaine spécifique."""
    domaine = db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé.")
    return domaine

# 🔹 Supprimer un Domaine (DELETE)
@router.delete("/domaines/{id_domaine}", status_code=204, summary="Supprimer un domaine")
def delete_domaine(id_domaine: str, db: Session = Depends(get_db)):
    """Supprime un domaine par son identifiant unique."""
    domaine = db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")
    
    db.delete(domaine)
    db.commit()
    return {"detail": "Domaine supprimé avec succès"}

# ------------------------------------
#  MENTION MANAGEMENT ENDPOINTS (Chemins: /mentions/...)
# ------------------------------------

# 🔹 Ajouter une Mention (POST)
@router.post("/mentions", response_model=MentionSchema, summary="Créer une nouvelle mention d'étude")
def create_mention(
    id_mention: str = Form(..., description="Identifiant unique de la mention"),
    nom: str = Form(..., description="Nom de la mention (ex: Informatique)"),
    id_domaine: str = Form(..., description="ID du domaine de rattachement"),
    db: Session = Depends(get_db)
):
    """Crée une nouvelle mention, vérifiant l'existence du domaine parent."""
    if db.query(Mention).filter(Mention.id_mention == id_mention).first():
        raise HTTPException(status_code=400, detail="L'ID mention existe déjà.")
    
    if not db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first():
        raise HTTPException(status_code=404, detail="Domaine de rattachement non trouvé.")

    mention = Mention(id_mention=id_mention, nom=nom, id_domaine=id_domaine)
    db.add(mention)
    db.commit()
    db.refresh(mention)
    return mention

# 🔹 Modifier une Mention (PUT)
@router.put("/mentions", response_model=MentionSchema, summary="Modifier une mention existante")
def update_mention(
    id_mention: str = Form(..., description="Identifiant de la mention à modifier"),
    nom: str = Form(..., description="Nouveau nom de la mention"),
    id_domaine: str = Form(..., description="Nouvel ID du domaine de rattachement"),
    db: Session = Depends(get_db)
):
    """Met à jour une mention existante."""
    mention = db.query(Mention).filter(Mention.id_mention == id_mention).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention non trouvée.")
        
    if not db.query(Domaine).filter(Domaine.id_domaine == id_domaine).first():
        raise HTTPException(status_code=404, detail="Nouveau domaine de rattachement non trouvé.")

    mention.nom = nom
    mention.id_domaine = id_domaine
    db.commit()
    db.refresh(mention)
    return mention

# 🔹 Liste de toutes les Mentions (GET all)
@router.get("/mentions", response_model=List[MentionSchema], summary="Liste de toutes les mentions d'étude")
def get_mentions(db: Session = Depends(get_db)):
    """Retourne la liste complète de toutes les mentions."""
    return db.query(Mention).all()

# 🔹 Détails d'une Mention (GET by ID)
@router.get("/mentions/{id_mention}", response_model=MentionSchema, summary="Détails d'une mention par ID")
def get_mention(id_mention: str, db: Session = Depends(get_db)):
    """Récupère les détails d'une mention spécifique."""
    mention = db.query(Mention).filter(Mention.id_mention == id_mention).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention non trouvée.")
    return mention

# 🔹 Supprimer une Mention (DELETE)
@router.delete("/mentions/{id_mention}", status_code=204, summary="Supprimer une mention")
def delete_mention(id_mention: str, db: Session = Depends(get_db)):
    """Supprime une mention par son identifiant unique."""
    mention = db.query(Mention).filter(Mention.id_mention == id_mention).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention non trouvée")
    
    db.delete(mention)
    db.commit()
    return {"detail": "Mention supprimée avec succès"}

# ------------------------------------
#  PARCOURS MANAGEMENT ENDPOINTS (Chemins: /parcours/...)
# ------------------------------------

# 🔹 Ajouter un Parcours (POST)
@router.post("/parcours", response_model=ParcoursSchema, summary="Créer un nouveau parcours (Spécialisation)")
def create_parcours(
    id_parcours: str = Form(..., description="Identifiant unique du parcours"),
    nom: str = Form(..., description="Nom du parcours (ex: Intelligence Artificielle et Data Science)"),
    id_mention: str = Form(..., description="ID de la mention de rattachement"),
    db: Session = Depends(get_db)
):
    """Crée un nouveau parcours, vérifiant l'existence de la mention parente."""
    if db.query(Parcours).filter(Parcours.id_parcours == id_parcours).first():
        raise HTTPException(status_code=400, detail="L'ID parcours existe déjà.")
    
    if not db.query(Mention).filter(Mention.id_mention == id_mention).first():
        raise HTTPException(status_code=404, detail="Mention de rattachement non trouvée.")

    parcours = Parcours(id_parcours=id_parcours, nom=nom, id_mention=id_mention)
    db.add(parcours)
    db.commit()
    db.refresh(parcours)
    return parcours

# 🔹 Modifier un Parcours (PUT)
@router.put("/parcours", response_model=ParcoursSchema, summary="Modifier un parcours existant")
def update_parcours(
    id_parcours: str = Form(..., description="Identifiant du parcours à modifier"),
    nom: str = Form(..., description="Nouveau nom du parcours"),
    id_mention: str = Form(..., description="Nouvel ID de la mention de rattachement"),
    db: Session = Depends(get_db)
):
    """Met à jour un parcours existant."""
    parcours = db.query(Parcours).filter(Parcours.id_parcours == id_parcours).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours non trouvé.")
        
    if not db.query(Mention).filter(Mention.id_mention == id_mention).first():
        raise HTTPException(status_code=404, detail="Nouvelle mention de rattachement non trouvée.")

    parcours.nom = nom
    parcours.id_mention = id_mention
    db.commit()
    db.refresh(parcours)
    return parcours

# 🔹 Liste de tous les Parcours (GET all)
@router.get("/parcours", response_model=List[ParcoursSchema], summary="Liste de tous les parcours")
def get_parcours(db: Session = Depends(get_db)):
    """Retourne la liste complète de tous les parcours."""
    return db.query(Parcours).all()

# 🔹 Détails d'un Parcours (GET by ID)
@router.get("/parcours/{id_parcours}", response_model=ParcoursSchema, summary="Détails d'un parcours par ID")
def get_single_parcours(id_parcours: str, db: Session = Depends(get_db)):
    """Récupère les détails d'un parcours spécifique."""
    parcours = db.query(Parcours).filter(Parcours.id_parcours == id_parcours).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours non trouvé.")
    return parcours

# 🔹 Supprimer un Parcours (DELETE)
@router.delete("/parcours/{id_parcours}", status_code=204, summary="Supprimer un parcours")
def delete_parcours(id_parcours: str, db: Session = Depends(get_db)):
    """Supprime un parcours par son identifiant unique."""
    parcours = db.query(Parcours).filter(Parcours.id_parcours == id_parcours).first()
    if not parcours:
        raise HTTPException(status_code=404, detail="Parcours non trouvé")
    
    db.delete(parcours)
    db.commit()
    return {"detail": "Parcours supprimé avec succès"}