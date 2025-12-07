from typing import Optional
from pydantic import BaseModel
from .base import base_config

# --- HISTORIQUES ---
class HistoriqueDetailSchema(BaseModel):
    annee_id: str
    annee_label: str
    nom_historique: Optional[str] = None
    code_historique: Optional[str] = None
    description_historique: Optional[str] = None
    abbreviation_historique: Optional[str] = None
    model_config = base_config

class HistoriqueUpdateSchema(BaseModel):
    nom: str
    code: str
    description: Optional[str] = None
    abbreviation: Optional[str] = None
    model_config = base_config