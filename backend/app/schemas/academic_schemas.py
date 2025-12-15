from typing import Optional, List
from datetime import date
from pydantic import Field, BaseModel
from .base import BaseSchema, base_config
from .metadonnees_schemas import DomaineBase
from .institutions_schemas import ComposanteNestedSchema
from .maquette_schemas import UniteEnseignementSchema

# --- PARCOURS ---
class ParcoursBase(BaseSchema):
    code: str = Field(..., alias="Parcours_code")
    label: Optional[str] = Field(None, alias="Parcours_label") 
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Parcours_logo_path")
    date_creation: Optional[date] = Field(None, alias="Parcours_date_creation")
    date_fin: Optional[date] = Field(None, alias="Parcours_date_fin")
    id_mention: str = Field(..., alias="Mention_id_fk")
    id_type_formation_defaut: str = Field(..., alias="Parcours_type_formation_defaut_id_fk")

class ParcoursSchema(ParcoursBase):
    id_parcours: str = Field(..., alias="Parcours_id")
    nom_parcours: Optional[str] = Field(None, alias="Parcours_label")

class ParcoursCreate(BaseSchema):
    id_parcours: str = Field(..., alias="Parcours_id")
    code: str = Field(..., alias="Parcours_code")
    label: str = Field(..., alias="Parcours_label")
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    date_creation: Optional[date] = Field(None, alias="Parcours_date_creation")
    id_mention: str = Field(..., alias="Mention_id_fk")
    id_type_formation_defaut: str = Field(..., alias="Parcours_type_formation_defaut_id_fk")

class ParcoursUpdate(BaseModel):
    code: Optional[str] = Field(None, alias="Parcours_code")
    label: Optional[str] = Field(None, alias="Parcours_label")
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    id_type_formation_defaut: Optional[str] = Field(None, alias="Parcours_type_formation_defaut_id_fk")
    logo_path: Optional[str] = Field(None, alias="Parcours_logo_path")
    model_config = base_config

# --- MENTIONS ---
class MentionBase(BaseSchema):
    code: str = Field(..., alias="Mention_code")
    label: Optional[str] = Field(None, alias="Mention_label")
    description: Optional[str] = Field(None, alias="Mention_description")
    abbreviation: Optional[str] = Field(None, alias="Mention_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Mention_logo_path")
    id_composante: str = Field(..., alias="Composante_id_fk")
    id_domaine: str = Field(..., alias="Domaine_id_fk")

class MentionSchema(MentionBase):
    id_mention: str = Field(..., alias="Mention_id")
    composante: Optional[ComposanteNestedSchema] = None 
    domaine: Optional[DomaineBase] = None 
    parcours: List[ParcoursSchema] = []

# --- CYCLES & NIVEAUX ---
class NiveauBase(BaseSchema):
    code: Optional[str] = Field(None, alias="Niveau_code")
    label: Optional[str] = Field(None, alias="Niveau_label")
    id_cycle: str = Field(..., alias="Cycle_id_fk")

class SemestreBase(BaseSchema):
    code: Optional[str] = Field(None, alias="Semestre_code")
    numero: str = Field(..., alias="Semestre_numero")
    id_niveau: str = Field(..., alias="Niveau_id_fk")

class SemestreSchema(SemestreBase):
    id_semestre: str = Field(..., alias="Semestre_id")
    niveau: Optional[NiveauBase] = None
    unites_enseignement: List[UniteEnseignementSchema] = [] # Forward ref

class NiveauSchema(NiveauBase):
    id_niveau: str = Field(..., alias="Niveau_id")
    cycle: Optional["CycleBase"] = None
    semestres: List[SemestreSchema] = []

class CycleBase(BaseSchema):
    code: Optional[str] = Field(None, alias="Cycle_code")
    label: str = Field(..., alias="Cycle_label")

class CycleSchema(CycleBase):
    id_cycle: str = Field(..., alias="Cycle_id")
    niveaux: List[NiveauSchema] = []
    
# --- ASSO PARCOURS NIVEAU ---
class ParcoursNiveauBase(BaseSchema):
    id_parcours: str = Field(..., alias="Parcours_id_fk")
    id_niveau: str = Field(..., alias="Niveau_id_fk")
    ordre: Optional[int] = Field(None, alias="ParcoursNiveau_ordre")

class ParcoursNiveauSchema(ParcoursNiveauBase):
    id_parcours_niveau: str = Field(..., alias="ParcoursNiveau_id")