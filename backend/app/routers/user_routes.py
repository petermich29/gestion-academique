# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional

# Vos imports existants (adaptez les chemins selon votre structure)
from ..database import get_db 
from ..models import User, UserPermission
from ..core.auth_utils import verify_password, get_password_hash, create_access_token

router = APIRouter(tags=["Authentication & Users"])

# --- SCHEMAS PYDANTIC (Pour la validation des données entrantes) ---
# Dans user_routes.py
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "GUEST"
    # Modification : on accepte une liste d'objets de permission
    permissions: Optional[List[dict]] = []

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    # Adaptez selon la structure de vos permissions
    class Config:
        orm_mode = True

# --- ROUTES ---

@router.post("/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Chercher l'utilisateur
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # 2. Vérifier le mot de passe
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Créer le token (On inclut les infos user pour le frontend)
    # Récupération des permissions pour le frontend
    perms = [{"entity_type": p.entity_type, "entity_id": p.entity_id} for p in user.permissions]
    
    user_data = {
        "username": user.username,
        "role": user.role,
        "permissions": perms
    }
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_data}

@router.get("/users")
def read_users(db: Session = Depends(get_db)):
    # Ajoutez ici une vérification de token si vous voulez sécuriser cette liste
    users = db.query(User).all()
    # Sérialisation manuelle simple pour inclure les permissions
    result = []
    for u in users:
        perms = [{"id": p.id, "entity_type": p.entity_type, "entity_id": p.entity_id} for p in u.permissions]
        result.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "permissions": perms
        })
    return result

@router.post("/users")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Vérification existence (Indispensable pour éviter le crash SQL)
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")
    
    try:
        # 2. Création de l'utilisateur
        hashed_pwd = get_password_hash(user_in.password)
        new_user = User(username=user_in.username, hashed_password=hashed_pwd, role=user_in.role)
        db.add(new_user)
        db.flush() # Flush permet d'obtenir l'ID de new_user sans valider la transaction
        
        # 3. Ajout des permissions multiples
        if user_in.permissions:
            for p in user_in.permissions:
                # Vérifiez bien que le frontend envoie 'type' et 'id'
                new_perm = UserPermission(
                    user_id=new_user.id,
                    entity_type=p.get('type'), 
                    entity_id=p.get('id'),     
                    access_level="WRITE"
                )
                db.add(new_perm)
        
        db.commit() # On valide tout d'un coup (User + Permissions)
        db.refresh(new_user)
        return new_user

    except Exception as e:
        db.rollback() # En cas d'erreur, on annule tout (évite les users sans permissions)
        raise HTTPException(status_code=500, detail=f"Erreur interne : {str(e)}")
    
@router.put("/users/{user_id}")
def update_user(user_id: int, user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Mise à jour des infos de base
    db_user.role = user_in.role
    if user_in.password: # On ne change le mot de passe que s'il est fourni
        db_user.hashed_password = get_password_hash(user_in.password)

    # Mise à jour des permissions (On remplace les anciennes par les nouvelles)
    db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()
    
    for p in user_in.permissions:
        new_perm = UserPermission(
            user_id=db_user.id,
            entity_type=p['type'],
            entity_id=p['id'],
            access_level="WRITE"
        )
        db.add(new_perm)
    
    db.commit()
    return {"message": "Utilisateur mis à jour"}