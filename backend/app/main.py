# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings

# Imports des routeurs
from app.routers import composantes_routes, institutions_routes, mentions_routes, domaines_routes, metadonnees_routes # <--- AJOUT
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
app.include_router(domaines_routes.router, prefix="/api")
app.include_router(metadonnees_routes.router, prefix="/api") # <--- AJOUT

app.mount("/static", StaticFiles(directory="app/static"), name="static")