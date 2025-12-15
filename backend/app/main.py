# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings

# Imports des routeurs
from app.routers import composantes_routes, institutions_routes, mentions_routes, metadonnees_routes, ue_routes, parcours_routes, ec_routes, etudiants_routes 
from app.routers import enseignants_routes, inscriptions_routes# <--- AJOUT
from app.database import engine
from app.models import Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestion Académique")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(institutions_routes.router, prefix="/api") 
app.include_router(composantes_routes.router, prefix="/api")
app.include_router(mentions_routes.router, prefix="/api")
app.include_router(parcours_routes.router, prefix="/api") # <--- AJOUT
app.include_router(metadonnees_routes.router, prefix="/api")
app.include_router(ue_routes.router, prefix="/api") 
app.include_router(ec_routes.router, prefix="/api")# <--- AJOUT

app.include_router(etudiants_routes.router, prefix="/api") # <--- AJOUT
app.include_router(enseignants_routes.router, prefix="/api") # <--- AJOUT

app.include_router(inscriptions_routes.router, prefix="/api") # <--- AJOUT

app.mount("/static", StaticFiles(directory="app/static"), name="static")
