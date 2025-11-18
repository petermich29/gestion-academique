# create_tables.py
from models import Base
from database import engine

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Toutes les tables ont été créées avec succès !")

if __name__ == "__main__":
    create_tables()
