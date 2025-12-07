from typing import Optional, List
from pydantic import Field, BaseModel
from .base import BaseSchema, base_config
from .metadonnees import TypeComposanteSchema

# --- INSTITUTIONS ---
class InstitutionCreate(BaseSchema):
    id_institution: str = Field(..., alias="Institution_id")
    code: str = Field(..., alias="Institution_code")
    nom: str = Field(..., alias="Institution_nom")
    type_institution: str = Field(..., alias="Institution_type")
    description: Optional[str] = Field(None, alias="Institution_description")
    abbreviation: Optional[str] = Field(None, alias="Institution_abbreviation")
    annees_universitaires: Optional[List[str]] = Field(None)

class InstitutionUpdate(InstitutionCreate):
    logo_path: Optional[str] = Field(None, alias="Institution_logo_path")

class InstitutionSchema(InstitutionCreate):
    logo_path: Optional[str] = Field(None, alias="Institution_logo_path")

# --- COMPOSANTES ---
class ComposanteBase(BaseSchema):
    code: str = Field(..., alias="Composante_code", max_length=50)
    label: str = Field(..., alias="Composante_label", max_length=100)
    description: Optional[str] = Field(None, alias="Composante_description")
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation", max_length=20)
    logo_path: Optional[str] = Field(None, alias="Composante_logo_path", max_length=255)
    id_institution: str = Field(..., alias="Institution_id_fk", max_length=10)
    id_type_composante: Optional[str] = Field(None, alias="Composante_type")

class ComposanteCreate(ComposanteBase):
    pass

class ComposanteUpdate(BaseModel):
    code: Optional[str] = Field(None, alias="Composante_code")
    label: Optional[str] = Field(None, alias="Composante_label")
    description: Optional[str] = Field(None, alias="Composante_description")
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Composante_logo_path")
    id_institution: Optional[str] = Field(None, alias="Institution_id_fk")
    id_type_composante: Optional[str] = Field(None, alias="Composante_type")
    model_config = base_config

class ComposanteNestedSchema(ComposanteBase):
    id_composante: str = Field(..., alias="Composante_id", max_length=12)

class ComposanteSchema(ComposanteBase):
    id_composante: str = Field(..., alias="Composante_id", max_length=12)
    # Forward Ref vers Mention
    mentions: List["MentionSchema"] = [] 
    type_composante: Optional[TypeComposanteSchema] = None