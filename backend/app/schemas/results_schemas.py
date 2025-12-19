from typing import Optional
from datetime import date
from pydantic import Field
from .base import BaseSchema
from .etudiants_schemas import EtudiantBase
from .academic_schemas import ParcoursBase, SemestreBase
from .metadonnees_schemas import AnneeUniversitaireBase, ModeInscriptionBase, AnneeUniversitaireSchema
from .maquette_schemas import UniteEnseignementBase

# --- INSCRIPTION ---
class InscriptionBase(BaseSchema):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_parcours: str = Field(..., alias="Parcours_id_fk")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_mode_inscription: Optional[str] = Field(None, alias="ModeInscription_id_fk")
    
    date_inscription: date = Field(..., alias="Inscription_date")
    credit_acquis_semestre: int = Field(0, alias="Inscription_credit_acquis_semestre")
    is_semestre_valide: bool = Field(False, alias="Inscription_is_semestre_valide")

class InscriptionSchema(InscriptionBase):
    id_inscription: str = Field(..., alias="Inscription_id")
    etudiant: Optional[EtudiantBase] = None
    parcours: Optional[ParcoursBase] = None
    semestre: Optional[SemestreBase] = None
    annee_universitaire: Optional[AnneeUniversitaireBase] = None
    mode_inscription: Optional[ModeInscriptionBase] = None

# --- RÉSULTATS & NOTES ---

class ResultatSemestreBase(BaseSchema):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    
    statut_validation: str = Field(..., alias="ResultatSemestre_statut_validation")
    credits_acquis: Optional[float] = Field(None, alias="ResultatSemestre_credits_acquis")
    moyenne_obtenue: Optional[float] = Field(None, alias="ResultatSemestre_moyenne_obtenue")

class ResultatSemestreSchema(ResultatSemestreBase):
    id_resultat_semestre: str = Field(..., alias="ResultatSemestre_id")

class ResultatUEBase(BaseSchema):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_ue: str = Field(..., alias="UE_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    
    moyenne: float = Field(..., alias="ResultatUE_moyenne")
    is_acquise: bool = Field(False, alias="ResultatUE_is_acquise")
    credit_obtenu: int = Field(0, alias="ResultatUE_credit_obtenu")

class ResultatUESchema(ResultatUEBase):
    id_resultat_ue: str = Field(..., alias="ResultatUE_id")

class NoteBase(BaseSchema):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    valeur: float = Field(..., alias="Note_valeur")

class NoteSchema(NoteBase):
    id_note: str = Field(..., alias="Note_id")

# --- SUIVI CREDIT ---
class SuiviCreditCycleBase(BaseSchema):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_cycle: str = Field(..., alias="Cycle_id_fk")
    credit_total_acquis: int = Field(0, alias="SuiviCreditCycle_credit_total_acquis")
    is_cycle_valide: bool = Field(False, alias="SuiviCreditCycle_is_cycle_valide")

class SuiviCreditCycleSchema(SuiviCreditCycleBase):
    id_suivi_credit_cycle: str = Field(..., alias="SuiviCreditCycle_id")

# --- VOLUMES & JURYS ---
class VolumeHoraireECBase(BaseSchema):
    id_ec: str = Field(..., alias="EC_id_fk")
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    volume_heure: float = Field(..., alias="VolumeHoraireEC_volume_heure")

class VolumeHoraireECSchema(VolumeHoraireECBase):
    id_volume_horaire_ec: str = Field(..., alias="VolumeHoraireEC_id")

class JuryBase(BaseSchema):
    id_enseignant: str = Field(..., alias="Enseignant_id_fk") # Président
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    date_nomination: Optional[date] = Field(None, alias="Jury_date_nomination")

class JurySchema(JuryBase):
    id_jury: str = Field(..., alias="Jury_id")