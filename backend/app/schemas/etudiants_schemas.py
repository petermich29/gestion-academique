# backend/app/schemas/users.py
from typing import Optional, List, Dict
from datetime import date
from pydantic import BaseModel, ConfigDict

# ---------------------------
# Base common configuration
# ---------------------------
class BaseSchema(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True
    )

# Rétablissement de cette classe pour résoudre l'ImportError
class EtudiantBase(BaseSchema):
    pass


# ---------------------------
# Schemas Imbriqués pour le Cursus 
# (Correspondance avec models.py vérifiée)
# ---------------------------

# Niveau 5: Institution
class InstitutionMinSchema(BaseSchema):
    Institution_id: str
    Institution_nom: str

# Niveau 4: Composante
class ComposanteMinSchema(BaseSchema):
    Composante_id: str
    # CORRECTION MAINTENUE: models.py utilise Composante_label
    Composante_label: Optional[str] = None 
    institution: Optional[InstitutionMinSchema] = None

# Niveau 3: Mention
class MentionMinSchema(BaseSchema):
    Mention_id: str
    # CORRECTION MAINTENUE: models.py utilise Mention_label
    Mention_label: Optional[str] = None
    composante: Optional[ComposanteMinSchema] = None

# Niveau 2: Parcours
class ParcoursMinSchema(BaseSchema):
    Parcours_id: str
    Parcours_label: Optional[str] = None
    mention: Optional[MentionMinSchema] = None

# Schéma Semestre
class SemestreMinSchema(BaseSchema):
    Semestre_id: str
    Semestre_numero: str

# Schéma Année Universitaire
class AnneeUniversitaireMinSchema(BaseSchema):
    AnneeUniversitaire_id: str
    # CORRECTION MAINTENUE: models.py n'a que AnneeUniversitaire_annee
    AnneeUniversitaire_annee: str 

# Niveau 1: Inscription
class InscriptionSchema(BaseSchema):
    Inscription_id: str
    Inscription_date: date
    
    parcours: Optional[ParcoursMinSchema] = None
    semestre: Optional[SemestreMinSchema] = None
    annee_univ: Optional[AnneeUniversitaireMinSchema] = None


# ---------------------------
# Schema pour l'affichage calculé (Tableau React)
# ---------------------------
class CursusDisplaySchema(BaseSchema):
    mention_nom: str
    mention_abbr: Optional[str] = ""
    institution_nom: Optional[str] = ""
    composante_abbr: Optional[str] = ""
    annee_universitaire_list: List[str] = []


# ---------------------------
# Response schema for an Etudiant (read)
# ---------------------------
class EtudiantSchema(BaseSchema):
    Etudiant_id: str
    Etudiant_nom: str
    # Etudiant_numero_inscription SUPPRIMÉ

    Etudiant_prenoms: Optional[str] = None
    Etudiant_sexe: Optional[str] = None
    Etudiant_naissance_date: Optional[date] = None
    Etudiant_naissance_lieu: Optional[str] = None
    Etudiant_nationalite: Optional[str] = None

    # === CORRECTION POUR L'AFFICHAGE "VERS YYYY" ===
    Etudiant_naissance_annee: Optional[int] = None
    Etudiant_naissance_date_Exact: Optional[bool] = None
    # ===============================================

    Etudiant_bacc_annee: Optional[int] = None
    Etudiant_bacc_serie: Optional[str] = None # Ajouté pour la colonne BACC
    Etudiant_adresse: Optional[str] = None
    Etudiant_telephone: Optional[str] = None
    Etudiant_mail: Optional[str] = None

    Etudiant_photo_profil_path: Optional[str] = None

    # Les listes existantes
    inscriptions: Optional[List[InscriptionSchema]] = [] 
    
    # Le champ calculé pour votre tableau
    cursus_liste: Optional[List[CursusDisplaySchema]] = []

    class Config:
        from_attributes = True


# Paginated response
class PaginatedResponse(BaseSchema):
    total: int
    items: List[dict]

class EtudiantPaginatedResponse(PaginatedResponse):
    items: List[EtudiantSchema]