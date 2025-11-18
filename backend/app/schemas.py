# app/schemas.py

from pydantic import BaseModel
from typing import Optional


# =====================
# INSTITUTIONS
# =====================

class InstitutionBase(BaseModel):
    id_institution: str
    nom: str
    type_institution: str
    description: Optional[str] = None
    logo_path: str | None = None   # correspond au champ dans models.Institution
    abbreviation: Optional[str] = None 


class InstitutionSchema(InstitutionBase):
    """Schéma retourné en lecture (response_model)."""

    class Config:
        # 👉 Si tu es en Pydantic v1 :
        orm_mode = True
        # 👉 Si tu es en Pydantic v2, tu peux utiliser à la place :
        # from_attributes = True


# Tu pourras plus tard ajouter InstitutionCreate / InstitutionUpdate si tu fais du POST/PUT :
class InstitutionCreate(BaseModel):
    id_institution: str
    nom: str
    type_institution: str
    description: Optional[str] = None
    logo_path: Optional[str] = None
    abbreviation: Optional[str] = None   # ✅

class InstitutionUpdate(BaseModel):
    nom: Optional[str] = None
    type_institution: Optional[str] = None
    description: Optional[str] = None
    logo_path: Optional[str] = None
    abbreviation: Optional[str] = None   # ✅



# =====================
# COMPOSANTES
# =====================

class ComposanteBase(BaseModel):
    code: str
    label: Optional[str] = None
    description: Optional[str] = None
    logo_path: str | None = None   # correspond à models.Composante.logo_path
    id_institution: str
    abbreviation: Optional[str] = None


class ComposanteSchema(ComposanteBase):
    """Schéma retourné en lecture (response_model)."""

    class Config:
        orm_mode = True
        # ou from_attributes = True en Pydantic v2


class ComposanteCreate(BaseModel):
    code: str
    label: Optional[str] = None
    description: Optional[str] = None
    logo_path: Optional[str] = None
    id_institution: str
    abbreviation: Optional[str] = None   # ✅

class ComposanteUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    logo_path: Optional[str] = None
    id_institution: Optional[str] = None
    abbreviation: Optional[str] = None   # ✅

