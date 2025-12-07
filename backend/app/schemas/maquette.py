from typing import Optional, List
from pydantic import Field
from .base import BaseSchema

# --- ELEMENTS CONSTITUTIFS (EC) ---
class ElementConstitutifBase(BaseSchema):
    code: str = Field(..., alias="EC_code")
    intitule: str = Field(..., alias="EC_intitule")
    coefficient: int = Field(1, alias="EC_coefficient")
    id_ue: str = Field(..., alias="UE_id_fk")

class ElementConstitutifSchema(ElementConstitutifBase):
    id_ec: str = Field(..., alias="EC_id")
    # ue: Optional["UniteEnseignementBase"] = None # Eviter recursion ici si possible

class MaquetteElementConstitutifSchema(BaseSchema):
    """Représente l'association EC/UE (MaquetteEC)"""
    # Les champs de l'association (MaquetteEC)
    id_maquette_ec: str = Field(..., alias="MaquetteEC_id")
    coefficient: int = Field(1, alias="MaquetteEC_coefficient")
    
    # Clés étrangères
    id_ue: str = Field(..., alias="MaquetteUE_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    
    # Le détail du catalogue EC (ElementConstitutif) qui est lié
    ec_catalogue: Optional[ElementConstitutifSchema] = None 
    # Note: Assurez-vous que votre modèle SQLAlchemy (models.MaquetteEC)
    # a bien une relation nommée 'ec_catalogue'.

# --- UNITÉS D'ENSEIGNEMENT (UE) ---
class UniteEnseignementBase(BaseSchema):
    code: str = Field(..., alias="UE_code")
    intitule: str = Field(..., alias="UE_intitule")
    credit: int = Field(..., alias="UE_credit")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_parcours: str = Field(..., alias="Parcours_id_fk")

class UniteEnseignementSchema(UniteEnseignementBase):
    id_ue: str = Field(..., alias="UE_id")
    # Utilisation string pour SemestreBase pour eviter import circulaire direct
    semestre: Optional["SemestreBase"] = None 
    elements_constitutifs: List[ElementConstitutifSchema] = []

# --- STRUCTURE D'AFFICHAGE ---
class StructureUE(BaseSchema):
    """Vue allégée d'une UE pour l'affichage en liste"""
    # Ces champs sont maintenant OBLIGATOIRES pour Pydantic
    id: str                 # <-- OBLIGATOIRE (clé React)
    id_maquette: str        # <-- OBLIGATOIRE
    id_catalog: str         # <-- OBLIGATOIRE
    
    code: str
    intitule: str
    credit: int
    ec_count: int = 0

class StructureSemestre(BaseSchema):
    """Vue d'un semestre contenant ses UEs"""
    id: str 
    numero: str 
    code: Optional[str] = None
    ues: List[StructureUE] = []

class StructureNiveau(BaseSchema):
    """Vue d'un niveau contenant ses Semestres"""
    niveau_id: str
    niveau_label: str
    semestres: List[StructureSemestre] = []