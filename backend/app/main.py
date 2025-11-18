# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import administration
from app.database import engine
from app.models import Base

# Création des tables si elles n'existent pas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestion Académique")

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # ou settings.BACKEND_CORS_ORIGINS si tu l'ajoutes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes avec prefix /api
app.include_router(administration.router, prefix="/api")
