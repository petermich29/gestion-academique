from typing import Optional, List
from pydantic import Field
from .base import BaseSchema

# --- ELEMENTS CONSTITUTIFS (EC) ---
class ElementConstitutifBase(BaseSchema):
    code: str = Field(..., alias="EC_code")
    intitule: str = Field(..., alias="EC_intitule")
    # CHANGEMENT : int -> float
    coefficient: float = Field(1.0, alias="EC_coefficient") 
    id_ue: str = Field(..., alias="UE_id_fk")

class ElementConstitutifSchema(ElementConstitutifBase):
    id_ec: str = Field(..., alias="EC_id")

class MaquetteElementConstitutifSchema(BaseSchema):
    """Représente l'association EC/UE (MaquetteEC)"""
    id_maquette_ec: str = Field(..., alias="MaquetteEC_id")
    # CHANGEMENT : int -> float
    coefficient: float = Field(1.0, alias="MaquetteEC_coefficient")
    
    id_ue: str = Field(..., alias="MaquetteUE_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    
    ec_catalogue: Optional[ElementConstitutifSchema] = None 

# --- UNITÉS D'ENSEIGNEMENT (UE) ---
class UniteEnseignementBase(BaseSchema):
    code: str = Field(..., alias="UE_code")
    intitule: str = Field(..., alias="UE_intitule")
    credit: int = Field(..., alias="UE_credit") # Les crédits restent souvent entiers (ECTS), mais peuvent être float si besoin
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_parcours: str = Field(..., alias="Parcours_id_fk")

class UniteEnseignementSchema(UniteEnseignementBase):
    id_ue: str = Field(..., alias="UE_id")
    semestre: Optional["SemestreBase"] = None 
    elements_constitutifs: List[ElementConstitutifSchema] = []

# --- STRUCTURE D'AFFICHAGE ---
class StructureEC(BaseSchema):
    id: str                 
    id_catalog: str         
    code: str
    intitule: str
    # CHANGEMENT : int -> float
    coefficient: float 

class StructureUE(BaseSchema):
    id: str                 
    id_maquette: str        
    id_catalog: str         
    code: str
    intitule: str
    credit: int
    ec_count: int = 0
    ecs: List[StructureEC] = []

class StructureSemestre(BaseSchema):
    id: str 
    numero: str 
    code: Optional[str] = None
    ues: List[StructureUE] = []

class StructureNiveau(BaseSchema):
    niveau_id: str
    niveau_label: str
    semestres: List[StructureSemestre] = []