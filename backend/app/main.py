# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # <-- à ajouter
from app.core.config import settings
from app.routers import composantes_routes, institutions_routes
from app.database import engine
from app.models import Base

# Création des tables si elles n'existent pas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestion Académique")

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes avec prefix /api
app.include_router(institutions_routes.router, prefix="/api") 
app.include_router(composantes_routes.router, prefix="/api")

# ----------------------------
# Servir les fichiers statiques
# ----------------------------
# Assure-toi que le dossier app/static/logos existe
app.mount("/static", StaticFiles(directory="app/static"), name="static")
