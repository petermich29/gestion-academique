# schemas/users.py
from typing import Optional, List, Dict
from datetime import date
from pydantic import BaseModel, Field, ConfigDict


from ..schemas.academic import ParcoursSchema

# --- BASE COMMUNE ---
class BaseSchema(BaseModel):
    # Configuration pour accepter les alias (ex: Etudiant_nom) lors du parsing
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

# ==========================
# --- SCHÉMAS ÉTUDIANTS ---
# ==========================

class EtudiantBase(BaseSchema):
    numero_inscription: Optional[str] = Field(None, alias="Etudiant_numero_inscription")
    nom: str = Field(..., alias="Etudiant_nom")
    prenoms: Optional[str] = Field(None, alias="Etudiant_prenoms")
    sexe: Optional[str] = Field(None, alias="Etudiant_sexe")
    date_naissance: Optional[date] = Field(None, alias="Etudiant_naissance_date")
    lieu_naissance: Optional[str] = Field(None, alias="Etudiant_naissance_lieu")
    nationalite: Optional[str] = Field("Malgache", alias="Etudiant_nationalite")
    
    # Infos Bacc
    bacc_annee: Optional[int] = Field(None, alias="Etudiant_bacc_annee")
    bacc_serie: Optional[str] = Field(None, alias="Etudiant_bacc_serie")
    bacc_numero: Optional[str] = Field(None, alias="Etudiant_bacc_numero")
    bacc_centre: Optional[str] = Field(None, alias="Etudiant_bacc_centre")
    bacc_mention: Optional[str] = Field(None, alias="Etudiant_bacc_mention")
    
    # Contact
    adresse: Optional[str] = Field(None, alias="Etudiant_adresse")
    telephone: Optional[str] = Field(None, alias="Etudiant_telephone")
    mail: Optional[str] = Field(None, alias="Etudiant_mail")
    
    # Identité
    cin: Optional[str] = Field(None, alias="Etudiant_cin")
    cin_date: Optional[date] = Field(None, alias="Etudiant_cin_date")
    cin_lieu: Optional[str] = Field(None, alias="Etudiant_cin_lieu")

# Pour la création (pas d'ID requis)
class EtudiantCreate(EtudiantBase):
    pass

# 1. Création d'un petit schéma pour l'affichage des cursus
class CursusInfo(BaseModel):
    parcours_nom: str
    mention_nom: str
    composante_abbr: Optional[str] = None
    institution_abbr: Optional[str] = None
    annee_universitaire: str 
    
class CursusMention(BaseModel):
    # Informations de la Mention (unique)
    mention_nom: str
    institution_abbr: Optional[str] = None
    composante_abbr: Optional[str] = None
    
    # Liste agrégée des années universitaires passées dans cette mention
    annee_universitaire_list: List[str] = Field(default_factory=list)
    
    # Liste des parcours/inscriptions sous cette mention (pour la traçabilité)
    # Ex: [{"parcours_nom": "L3 Rétrofit", "annee_universitaire": "2024-2025"}]
    parcours_details: List[Dict[str, str]] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)# Pour savoir quand il s'est inscrit

# Pour la lecture (ID inclus)
class EtudiantSchema(EtudiantBase):
    id_etudiant: str = Field(..., alias="Etudiant_id")
    # Utilisation du nouveau schéma de liste groupée par Mention
    cursus_liste: List[CursusMention] = Field(default_factory=list)

# ==========================
# --- SCHÉMAS ENSEIGNANTS ---
# ==========================

class EnseignantBase(BaseSchema):
    matricule: Optional[str] = Field(None, alias="Enseignant_matricule")
    nom: str = Field(..., alias="Enseignant_nom")
    prenoms: Optional[str] = Field(None, alias="Enseignant_prenoms")
    sexe: Optional[str] = Field(None, alias="Enseignant_sexe")
    date_naissance: Optional[date] = Field(None, alias="Enseignant_date_naissance")
    grade: Optional[str] = Field(None, alias="Enseignant_grade")
    statut: str = Field(..., alias="Enseignant_statut") # PERM, VAC
    
    # Liaison FK
    id_composante_affectation: Optional[str] = Field(None, alias="Composante_id_affectation_fk")
    
    # Contact & Identité
    cin: Optional[str] = Field(None, alias="Enseignant_cin")
    cin_date: Optional[date] = Field(None, alias="Enseignant_cin_date")
    cin_lieu: Optional[str] = Field(None, alias="Enseignant_cin_lieu")
    telephone: Optional[str] = Field(None, alias="Enseignant_telephone")
    mail: Optional[str] = Field(None, alias="Enseignant_mail")
    rib: Optional[str] = Field(None, alias="Enseignant_rib")

# Pour la création
class EnseignantCreate(EnseignantBase):
    pass

# Pour la lecture
class EnseignantSchema(EnseignantBase):
    id_enseignant: str = Field(..., alias="Enseignant_id")

    # Schéma de réponse paginée pour les listes
class PaginatedResponse(BaseModel):
    total: int = Field(..., description="Nombre total d'enregistrements (sans filtre de pagination)")
    items: List[BaseModel] = Field(..., description="Liste des enregistrements retournés (selon skip/limit)")

# Schéma de réponse spécifique pour les étudiants
class EtudiantPaginatedResponse(PaginatedResponse):
    items: List[EtudiantSchema]