# app/schemas/inscriptions_schemas.py
from typing import List, Optional
from pydantic import Field
from .base import BaseSchema
from .etudiants_schemas import EtudiantSchema

# Payload pour la création (POST)
class InscriptionCreatePayload(BaseSchema):
    etudiants_ids: List[str]
    annee_id: str
    mention_id: str
    # Nouveaux champs demandés par l'interface
    parcours_id: Optional[str] = None
    niveau_id: Optional[str] = None
    semestre_id: Optional[str] = None
    mode_inscription_id: Optional[str] = None

# Schema pour la lecture dans la liste de droite (GET)
class InscriptionRead(BaseSchema):
    DossierInscription_id: str
    DossierInscription_numero: str
    etudiant: Optional[EtudiantSchema] = Field(None, alias="etudiant")
    
    # Pour affichage simple
    date_creation: Optional[str] = Field(None, alias="DossierInscription_date_creation")

class InscriptionResponse(BaseSchema):
    success: bool
    message: str
    inscrits_count: int