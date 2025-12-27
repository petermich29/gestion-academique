# backend/create_first_admin.py
from app.database import SessionLocal
from app.models import User
from app.core.auth_utils import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # On vérifie si l'admin existe déjà
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("L'utilisateur 'admin' existe déjà.")
            return

        # Création du super admin
        hashed_password = get_password_hash("admin123") # <--- VOTRE MOT DE PASSE
        admin_user = User(
            username="admin",
            hashed_password=hashed_password,
            role="SUPER_ADMIN",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        print("Utilisateur 'admin' créé avec succès ! Mot de passe : admin123")
    except Exception as e:
        print(f"Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()