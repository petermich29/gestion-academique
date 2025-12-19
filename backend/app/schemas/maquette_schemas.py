from typing import Optional, List
from pydantic import Field
from .base import BaseSchema

# --- NOUVEAU : SCHÉMA VOLUME HORAIRE (Pour la Maquette) ---
class VolumeHoraireSchema(BaseSchema):
    # Les noms des champs correspondent aux alias définis par la fonction de lecture/mapping (ou par l'ORM)
    id: str = Field(..., alias="Volume_id")
    heures: float = Field(..., alias="Volume_heures")
    type_enseignement_id: str = Field(..., alias="TypeEnseignement_id_fk")
    maquette_ec_id: str = Field(..., alias="MaquetteEC_id_fk")
    
    # Ces champs seront mappés manuellement ou via les relations chargées
    type_enseignement_label: Optional[str] = None
    type_enseignement_code: Optional[str] = None

    class Config:
        orm_mode = True


# --- ELEMENTS CONSTITUTIFS (EC) ---
class ElementConstitutifBase(BaseSchema):
    code: str = Field(..., alias="EC_code")
    intitule: str = Field(..., alias="EC_intitule")
    coefficient: float = Field(1.0, alias="EC_coefficient") 
    # Note: id_ue est souvent contextuel dans les formulaires, mais pas dans le catalogue pur
    # id_ue: str = Field(..., alias="UE_id_fk") 

class ElementConstitutifSchema(ElementConstitutifBase):
    id_ec: str = Field(..., alias="EC_id")

class MaquetteElementConstitutifSchema(BaseSchema):
    """Représente l'association EC/UE (MaquetteEC)"""
    id_maquette_ec: str = Field(..., alias="MaquetteEC_id")
    coefficient: float = Field(1.0, alias="MaquetteEC_coefficient")
    
    id_ue: str = Field(..., alias="MaquetteUE_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    
    ec_catalogue: Optional["ElementConstitutifSchema"] = None 
    
    # AJOUT : Liste des volumes horaires
    volumes_horaires: List[VolumeHoraireSchema] = Field([], alias="volumes_horaires") # Utilise le nom de la relation ORM

    class Config:
        orm_mode = True


# --- UNITÉS D'ENSEIGNEMENT (UE) ---
class UniteEnseignementBase(BaseSchema):
    code: str = Field(..., alias="UE_code")
    intitule: str = Field(..., alias="UE_intitule")
    credit: int = Field(..., alias="UE_credit")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_parcours: str = Field(..., alias="Parcours_id_fk")

class UniteEnseignementSchema(UniteEnseignementBase):
    id_ue: str = Field(..., alias="UE_id")
    semestre: Optional["SemestreBase"] = None 
    elements_constitutifs: List[ElementConstitutifSchema] = [] # Attention, ici c'est souvent MaquetteElementConstitutifSchema qu'on veut lister

# --- STRUCTURE D'AFFICHAGE (Utilisé par StructureView.jsx) ---
class StructureEC(BaseSchema):
    id: str                 # ID MaquetteEC
    id_catalog: str         # ID EC Catalogue
    code: str
    intitule: str
    coefficient: float
    
    # AJOUT : Pour l'affichage dans le modal et les badges dans la StructureView
    volumes: List[VolumeHoraireSchema] = [] # Nommage pour le frontend

class StructureUE(BaseSchema):
    id: str                 # ID MaquetteUE
    id_maquette: str        # Alias pour ID MaquetteUE si besoin
    id_catalog: str         # ID UE Catalogue
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

# 1. Schéma pour recevoir un Volume (création/édition)
class VolumeHoraireInput(BaseSchema):
    # Optionnel car vide si nouveau volume
    id: Optional[str] = None 
    type_enseignement_id: str
    heures: float

# 2. Schéma pour recevoir un EC dans le contexte d'une mise à jour de masse
class MaquetteEcInput(BaseSchema):
    # Optionnel car vide si nouvel EC ajouté dans le modal
    id_maquette_ec: Optional[str] = None 
    
    # Données de l'EC
    code: str
    intitule: str
    coefficient: float
    
    # Liste des volumes associés (imbriqués)
    volumes: List[VolumeHoraireInput] = []

# 3. Schéma global pour le Submit
class BulkUpdateUeSchema(BaseSchema):
    ue_id: str
    ecs: List[MaquetteEcInput]