from typing import Optional, List
from pydantic import Field, BaseModel
from .base import base_config, BaseSchema

# --- DOMAINES ---
class DomaineBase(BaseSchema):
    code: Optional[str] = Field(None, alias="Domaine_code")
    label: Optional[str] = Field(None, alias="Domaine_label")
    description: Optional[str] = Field(None, alias="Domaine_description")

class DomaineCreate(BaseSchema):
    code: str = Field(..., alias="Domaine_code")
    label: str = Field(..., alias="Domaine_label")
    description: Optional[str] = Field(None, alias="Domaine_description")

class DomaineSchema(DomaineBase):
    Domaine_id: str = Field(..., alias="Domaine_id") 
    # Mentions sera injecté via chaine de caractère pour éviter import circulaire
    mentions: List["MentionSchema"] = [] 

# --- TYPES COMPOSANTE ---
class ComposanteAbbrSchema(BaseSchema):
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation")

class TypeComposanteBase(BaseSchema):
    label: str = Field(..., alias="TypeComposante_label")
    description: Optional[str] = Field(None, alias="TypeComposante_description")

class TypeComposanteCreate(TypeComposanteBase):
    id_type_composante: str = Field(..., alias="TypeComposante_id")

class TypeComposanteUpdate(BaseModel):
    label: Optional[str] = Field(None, alias="TypeComposante_label")
    description: Optional[str] = Field(None, alias="TypeComposante_description")
    model_config = base_config

class TypeComposanteSchema(TypeComposanteBase):
    id_type_composante: str = Field(..., alias="TypeComposante_id")
    composantes: List[ComposanteAbbrSchema] = []

# --- TYPES FORMATION ---
class TypeFormationBase(BaseSchema):
    code: str = Field(..., alias="TypeFormation_code")
    label: str = Field(..., alias="TypeFormation_label")
    description: Optional[str] = Field(None, alias="TypeFormation_description")

class TypeFormationSchema(TypeFormationBase):
    id_type_formation: str = Field(..., alias="TypeFormation_id")

# --- MODES D'INSCRIPTION ---
class ModeInscriptionBase(BaseSchema):
    code: Optional[str] = Field(None, alias="ModeInscription_code")
    label: Optional[str] = Field(None, alias="ModeInscription_label")
    description: Optional[str] = Field(None, alias="ModeInscription_description")

class ModeInscriptionSchema(ModeInscriptionBase):
    id_mode_inscription: str = Field(..., alias="ModeInscription_id")

# --- ANNÉE UNIVERSITAIRE ---
class AnneeUniversitaireBase(BaseSchema):
    annee: str = Field(..., alias="AnneeUniversitaire_annee")
    description: Optional[str] = Field(None, alias="AnneeUniversitaire_description")
    ordre: int = Field(..., alias="AnneeUniversitaire_ordre")
    is_active: bool = Field(False, alias="AnneeUniversitaire_is_active")

class AnneeUniversitaireCreate(AnneeUniversitaireBase):
    pass

class AnneeUniversitaireUpdate(BaseModel):
    annee: Optional[str] = Field(None, alias="AnneeUniversitaire_annee")
    description: Optional[str] = Field(None, alias="AnneeUniversitaire_description")
    ordre: Optional[int] = Field(None, alias="AnneeUniversitaire_ordre")
    is_active: Optional[bool] = Field(None, alias="AnneeUniversitaire_is_active")
    model_config = base_config

class AnneeUniversitaireSchema(AnneeUniversitaireBase):
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id")

# --- SESSIONS ---
class SessionExamenBase(BaseSchema):
    code: Optional[str] = Field(None, alias="SessionExamen_code")
    label: str = Field(..., alias="SessionExamen_label")

class SessionExamenSchema(SessionExamenBase):
    id_session_examen: str = Field(..., alias="SessionExamen_id")
    
# --- TYPES ENSEIGNEMENT ---
class TypeEnseignementBase(BaseSchema):
    code: Optional[str] = Field(None, alias="TypeEnseignement_code")
    label: str = Field(..., alias="TypeEnseignement_label")

class TypeEnseignementSchema(TypeEnseignementBase):
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id")