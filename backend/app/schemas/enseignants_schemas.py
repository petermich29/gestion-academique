# backend/app/schemas/enseignants_schemas.py
from typing import Optional, List
from datetime import date
from pydantic import BaseModel, ConfigDict

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class EnseignantBase(BaseSchema):
    Enseignant_nom: str
    Enseignant_prenoms: Optional[str] = None
    Enseignant_sexe: Optional[str] = None
    Enseignant_date_naissance: Optional[date] = None
    Enseignant_grade: Optional[str] = None
    Enseignant_statut: str  # 'PERM' or 'VAC'
    Enseignant_cin: Optional[str] = None
    Enseignant_cin_date: Optional[date] = None
    Enseignant_cin_lieu: Optional[str] = None
    Enseignant_telephone: Optional[str] = None
    Enseignant_mail: Optional[str] = None
    Enseignant_rib: Optional[str] = None
    Composante_id_affectation_fk: Optional[str] = None

class EnseignantSchema(EnseignantBase):
    Enseignant_id: str
    Enseignant_matricule: Optional[str] = None
    Enseignant_photo_profil_path: Optional[str] = None

class EnseignantCreate(EnseignantBase):
    pass

class EnseignantPaginatedResponse(BaseSchema):
    total: int
    items: List[EnseignantSchema]