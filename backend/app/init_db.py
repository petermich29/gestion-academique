#gestion-academique\backend\app\init_db.py
from app.database import Base, engine
from app.models import *  # Importer tous les modèles

if __name__ == "__main__":
    print("Création de la base de données...")
    Base.metadata.create_all(bind=engine)
    print("Tables créées avec succès !")
