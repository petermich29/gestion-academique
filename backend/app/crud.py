# app/crud.py (Nouvelle ou mise à jour)
from sqlalchemy.orm import Session
from app.models import Institution, Composante # Assurez-vous d'importer les modèles

# Récupérer une institution par son ID (clé primaire)
def get_institution_by_id(db: Session, institution_id: str):
    return db.query(Institution).filter(
        # Utilisation de l'attribut réel du modèle
        Institution.Institution_id == institution_id 
    ).first()

# Récupérer toutes les composantes d'une institution
def get_composantes_by_institution_id(db: Session, institution_id: str):
    return db.query(Composante).filter(
        # Utilisation de la clé étrangère définie dans Composante
        Composante.Institution_id_fk == institution_id 
    ).all()