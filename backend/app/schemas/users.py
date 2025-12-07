from typing import Optional, List
from datetime import date
from pydantic import Field
from .base import BaseSchema

# --- ETUDIANT ---
class EtudiantBase(BaseSchema):
    numero_inscription: Optional[str] = Field(None, alias="Etudiant_numero_inscription")
    nom: str = Field(..., alias="Etudiant_nom")
    prenoms: Optional[str] = Field(None, alias="Etudiant_prenoms")
    sexe: Optional[str] = Field(None, alias="Etudiant_sexe")
    date_naissance: Optional[date] = Field(None, alias="Etudiant_naissance_date")
    lieu_naissance: Optional[str] = Field(None, alias="Etudiant_naissance_lieu")
    nationalite: Optional[str] = Field(None, alias="Etudiant_nationalite")
    
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
    
    # Chemins Fichiers
    photo_profil_path: Optional[str] = Field(None, alias="Etudiant_photo_profil_path")
    scan_cin_path: Optional[str] = Field(None, alias="Etudiant_scan_cin_path")
    scan_releves_notes_bacc_path: Optional[str] = Field(None, alias="Etudiant_scan_releves_notes_bacc_path")

class EtudiantSchema(EtudiantBase):
    id_etudiant: str = Field(..., alias="Etudiant_id")
    inscriptions: List["InscriptionSchema"] = []

# --- ENSEIGNANT ---
class EnseignantBase(BaseSchema):
    matricule: Optional[str] = Field(None, alias="Enseignant_matricule")
    nom: str = Field(..., alias="Enseignant_nom")
    prenoms: Optional[str] = Field(None, alias="Enseignant_prenoms")
    sexe: Optional[str] = Field(None, alias="Enseignant_sexe")
    date_naissance: Optional[date] = Field(None, alias="Enseignant_date_naissance")
    grade: Optional[str] = Field(None, alias="Enseignant_grade")
    statut: str = Field(..., alias="Enseignant_statut") # PERM, VAC
    
    id_composante_affectation: Optional[str] = Field(None, alias="Composante_id_affectation_fk")
    
    cin: Optional[str] = Field(None, alias="Enseignant_cin")
    cin_date: Optional[date] = Field(None, alias="Enseignant_cin_date")
    cin_lieu: Optional[str] = Field(None, alias="Enseignant_cin_lieu")
    telephone: Optional[str] = Field(None, alias="Enseignant_telephone")
    mail: Optional[str] = Field(None, alias="Enseignant_mail")
    rib: Optional[str] = Field(None, alias="Enseignant_rib")
    
    photo_profil_path: Optional[str] = Field(None, alias="Enseignant_photo_profil_path")
    scan_cin_path: Optional[str] = Field(None, alias="Enseignant_scan_cin_path")

class EnseignantSchema(EnseignantBase):
    id_enseignant: str = Field(..., alias="Enseignant_id")