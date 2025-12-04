from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date

# ==========================================
# CONFIGURATION GLOBALE
# ==========================================
# Cette configuration permet de :
# 1. Lire les objets SQLAlchemy (from_attributes=True)
# 2. Accepter les noms de champs API (ex: 'code') OU les noms DB (ex: 'Institution_code')
base_config = ConfigDict(from_attributes=True, populate_by_name=True)

# =======================================================================
# 1. SCHÉMAS ADMINISTRATIFS DE BASE
# =======================================================================

# --- TYPES COMPOSANTE (AJOUTS CORRECTIFS) ---
class ComposanteAbbrSchema(BaseModel):
    # On utilise l'alias pour mapper sur la colonne DB si nécessaire
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation")
    model_config = base_config

class TypeComposanteBase(BaseModel):
    label: str = Field(..., alias="TypeComposante_label")
    description: Optional[str] = Field(None, alias="TypeComposante_description")
    model_config = base_config

class TypeComposanteCreate(TypeComposanteBase):
    # L'ID est requis à la création (géré manuellement par le front)
    id_type_composante: str = Field(..., alias="TypeComposante_id")
    model_config = base_config

class TypeComposanteUpdate(BaseModel):
    label: Optional[str] = Field(None, alias="TypeComposante_label")
    description: Optional[str] = Field(None, alias="TypeComposante_description")
    model_config = base_config

class TypeComposanteSchema(TypeComposanteBase):
    id_type_composante: str = Field(..., alias="TypeComposante_id")
    composantes: List[ComposanteAbbrSchema] = []
    model_config = base_config

# --- INSTITUTIONS ---
class InstitutionCreate(BaseModel):
    id_institution: str = Field(..., alias="Institution_id")
    code: str = Field(..., alias="Institution_code")
    nom: str = Field(..., alias="Institution_nom")
    type_institution: str = Field(..., alias="Institution_type")
    description: Optional[str] = Field(None, alias="Institution_description")
    abbreviation: Optional[str] = Field(None, alias="Institution_abbreviation")
    annees_universitaires: Optional[List[str]] = Field(None)
    model_config = base_config # Important pour accepter les champs extra si besoin

class InstitutionUpdate(InstitutionCreate):
    logo_path: Optional[str] = Field(None, alias="Institution_logo_path")

class InstitutionSchema(InstitutionCreate):
    logo_path: Optional[str] = Field(None, alias="Institution_logo_path")
    model_config = base_config

# --- COMPOSANTES ---
class ComposanteBase(BaseModel):
    code: str = Field(..., alias="Composante_code", max_length=50)
    label: str = Field(..., alias="Composante_label", max_length=100)
    description: Optional[str] = Field(None, alias="Composante_description")
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation", max_length=20)
    logo_path: Optional[str] = Field(None, alias="Composante_logo_path", max_length=255)
    
    id_institution: str = Field(..., alias="Institution_id_fk", max_length=10)
    
    # CORRECTION : Ajout explicite de la FK pour le Type
    id_type_composante: Optional[str] = Field(None, alias="Composante_type")

    model_config = base_config

class ComposanteCreate(ComposanteBase):
    pass

class ComposanteUpdate(BaseModel):
    code: Optional[str] = Field(None, alias="Composante_code")
    label: Optional[str] = Field(None, alias="Composante_label")
    description: Optional[str] = Field(None, alias="Composante_description")
    abbreviation: Optional[str] = Field(None, alias="Composante_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Composante_logo_path")
    id_institution: Optional[str] = Field(None, alias="Institution_id_fk")
    id_type_composante: Optional[str] = Field(None, alias="Composante_type")
    
    model_config = base_config

class ComposanteNestedSchema(ComposanteBase):
    id_composante: str = Field(..., alias="Composante_id", max_length=12)
    model_config = base_config

class ComposanteSchema(ComposanteBase):
    id_composante: str = Field(..., alias="Composante_id", max_length=12)
    mentions: List["MentionSchema"] = [] 
    type_composante: Optional[TypeComposanteSchema] = None
    
    model_config = base_config

## DOMAINES
class DomaineBase(BaseModel):
    code: Optional[str] = Field(None, alias="Domaine_code")
    label: Optional[str] = Field(None, alias="Domaine_label")
    description: Optional[str] = Field(None, alias="Domaine_description")
    
    model_config = base_config

class DomaineCreate(BaseModel):
    code: str = Field(..., alias="Domaine_code")
    label: str = Field(..., alias="Domaine_label")
    description: Optional[str] = Field(None, alias="Domaine_description")
    
    model_config = base_config

class DomaineSchema(DomaineBase):
    Domaine_id: str = Field(..., alias="Domaine_id") 
    mentions: List["MentionSchema"] = [] 

    model_config = base_config


# =======================================================================
# 2. SCHÉMAS ACADÉMIQUES (Mention, Parcours, Cycle, Niveau, Semestre)
# =======================================================================

## PARCOURS (Défini avant Mention pour référence)
class ParcoursBase(BaseModel):
    code: str = Field(..., alias="Parcours_code")
    label: Optional[str] = Field(None, alias="Parcours_label") 
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Parcours_logo_path")
    date_creation: Optional[date] = Field(None, alias="Parcours_date_creation")
    date_fin: Optional[date] = Field(None, alias="Parcours_date_fin")
    
    id_mention: str = Field(..., alias="Mention_id_fk")
    id_type_formation_defaut: str = Field(..., alias="Parcours_type_formation_defaut_id_fk")
    
    model_config = base_config

class ParcoursSchema(ParcoursBase):
    id_parcours: str = Field(..., alias="Parcours_id")
    nom_parcours: Optional[str] = Field(None, alias="Parcours_label") # Duplicata pour compatibilité DB/API

    model_config = base_config

class ParcoursCreate(BaseModel):
    # Ajout du `model_config`
    model_config = base_config
    
    id_parcours: str = Field(..., alias="Parcours_id")
    code: str = Field(..., alias="Parcours_code")
    label: str = Field(..., alias="Parcours_label")
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    date_creation: Optional[date] = Field(None, alias="Parcours_date_creation")
    
    # Clés étrangères
    id_mention: str = Field(..., alias="Mention_id_fk")
    id_type_formation_defaut: str = Field(..., alias="Parcours_type_formation_defaut_id_fk")

class ParcoursUpdate(BaseModel):
    # Ajout du `model_config`
    model_config = base_config
    
    code: Optional[str] = Field(None, alias="Parcours_code")
    label: Optional[str] = Field(None, alias="Parcours_label")
    description: Optional[str] = Field(None, alias="Parcours_description")
    abbreviation: Optional[str] = Field(None, alias="Parcours_abbreviation")
    id_type_formation_defaut: Optional[str] = Field(None, alias="Parcours_type_formation_defaut_id_fk")
    logo_path: Optional[str] = Field(None, alias="Parcours_logo_path")


## MENTIONS
class MentionBase(BaseModel):
    code: str = Field(..., alias="Mention_code")
    label: Optional[str] = Field(None, alias="Mention_label")
    description: Optional[str] = Field(None, alias="Mention_description")
    abbreviation: Optional[str] = Field(None, alias="Mention_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Mention_logo_path")
    
    id_composante: str = Field(..., alias="Composante_id_fk")
    id_domaine: str = Field(..., alias="Domaine_id_fk")

    model_config = base_config

class MentionSchema(MentionBase):
    id_mention: str = Field(..., alias="Mention_id")
    
    # 🌟 LE FIX : Utilise le schéma allégé de Composante pour briser la récursion.
    composante: Optional["ComposanteNestedSchema"] = None 
    # Optionnel: Domaine pour sérialisation complète (non bloquant pour la récursion)
    domaine: Optional["DomaineBase"] = None 
    parcours: List["ParcoursSchema"] = []

    model_config = base_config


## CYCLES (LMD)
class CycleBase(BaseModel):
    code: Optional[str] = Field(None, alias="Cycle_code")
    label: str = Field(..., alias="Cycle_label")
    
    model_config = base_config

class CycleSchema(CycleBase):
    id_cycle: str = Field(..., alias="Cycle_id")
    # Ajout de la relation pour les vues détaillées
    niveaux: List["NiveauSchema"] = [] 
    
    model_config = base_config

## NIVEAUX (L1, M2, D3, ...)
class NiveauBase(BaseModel):
    code: Optional[str] = Field(None, alias="Niveau_code")
    label: Optional[str] = Field(None, alias="Niveau_label")
    id_cycle: str = Field(..., alias="Cycle_id_fk")
    
    model_config = base_config

class NiveauSchema(NiveauBase):
    id_niveau: str = Field(..., alias="Niveau_id")
    # Ajout des relations
    cycle: Optional["CycleBase"] = None
    semestres: List["SemestreSchema"] = []
    
    model_config = base_config

## SEMESTRES
class SemestreBase(BaseModel):
    code: Optional[str] = Field(None, alias="Semestre_code")
    numero: str = Field(..., alias="Semestre_numero")
    id_niveau: str = Field(..., alias="Niveau_id_fk")
    
    model_config = base_config

class SemestreSchema(SemestreBase):
    id_semestre: str = Field(..., alias="Semestre_id")
    # Ajout des relations
    niveau: Optional["NiveauBase"] = None
    unites_enseignement: List["UniteEnseignementSchema"] = []
    
    model_config = base_config


# =======================================================================
# 3. SCHÉMAS UE/EC ET AUTRES RÉFÉRENCES
# =======================================================================

## TYPES FORMATION
class TypeFormationBase(BaseModel):
    code: str = Field(..., alias="TypeFormation_code")
    label: str = Field(..., alias="TypeFormation_label")
    description: Optional[str] = Field(None, alias="TypeFormation_description")
    
    model_config = base_config

class TypeFormationSchema(TypeFormationBase):
    id_type_formation: str = Field(..., alias="TypeFormation_id")
    
    model_config = base_config


## UNITÉS D'ENSEIGNEMENT (UE)
## UNITÉS D'ENSEIGNEMENT (UE)
## UNITÉS D'ENSEIGNEMENT (UE)
class UniteEnseignementBase(BaseModel):
    code: str = Field(..., alias="UE_code")
    intitule: str = Field(..., alias="UE_intitule")
    credit: int = Field(..., alias="UE_credit")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    # 🟢 AJOUT : On ajoute le champ id_parcours ici
    id_parcours: str = Field(..., alias="Parcours_id_fk")
    
    model_config = base_config

class UniteEnseignementSchema(UniteEnseignementBase):
    id_ue: str = Field(..., alias="UE_id")
    # Ajout des relations
    semestre: Optional["SemestreBase"] = None
    elements_constitutifs: List["ElementConstitutifSchema"] = []
    
    model_config = base_config

## ÉLÉMENTS CONSTITUTIFS (EC)
class ElementConstitutifBase(BaseModel):
    code: str = Field(..., alias="EC_code")
    intitule: str = Field(..., alias="EC_intitule")
    coefficient: int = Field(1, alias="EC_coefficient")
    id_ue: str = Field(..., alias="UE_id_fk")
    
    model_config = base_config

class ElementConstitutifSchema(ElementConstitutifBase):
    id_ec: str = Field(..., alias="EC_id")
    # Ajout des relations
    ue: Optional["UniteEnseignementBase"] = None
    
    model_config = base_config

## PARCOURS NIVEAU (Association)
class ParcoursNiveauBase(BaseModel):
    id_parcours: str = Field(..., alias="Parcours_id_fk")
    id_niveau: str = Field(..., alias="Niveau_id_fk")
    ordre: Optional[int] = Field(None, alias="ParcoursNiveau_ordre")
    
    model_config = base_config

class ParcoursNiveauSchema(ParcoursNiveauBase):
    id_parcours_niveau: str = Field(..., alias="ParcoursNiveau_id")
    
    model_config = base_config


## SESSIONS D'EXAMEN
class SessionExamenBase(BaseModel):
    code: Optional[str] = Field(None, alias="SessionExamen_code")
    label: str = Field(..., alias="SessionExamen_label")
    
    model_config = base_config

class SessionExamenSchema(SessionExamenBase):
    id_session_examen: str = Field(..., alias="SessionExamen_id")
    
    model_config = base_config


## MODES D'INSCRIPTION
class ModeInscriptionBase(BaseModel):
    code: Optional[str] = Field(None, alias="ModeInscription_code")
    label: Optional[str] = Field(None, alias="ModeInscription_label")
    description: Optional[str] = Field(None, alias="ModeInscription_description")
    
    model_config = base_config

class ModeInscriptionSchema(ModeInscriptionBase):
    id_mode_inscription: str = Field(..., alias="ModeInscription_id")
    
    model_config = base_config


## ANNÉE UNIVERSITAIRE
class AnneeUniversitaireBase(BaseModel):
    annee: str = Field(..., alias="AnneeUniversitaire_annee")
    description: Optional[str] = Field(None, alias="AnneeUniversitaire_description")
    ordre: int = Field(..., alias="AnneeUniversitaire_ordre")
    is_active: bool = Field(False, alias="AnneeUniversitaire_is_active") # Champ ajouté
    
    model_config = base_config

class AnneeUniversitaireCreate(AnneeUniversitaireBase):
    # Pas d'ID requis à la création
    pass

class AnneeUniversitaireUpdate(BaseModel):
    annee: Optional[str] = Field(None, alias="AnneeUniversitaire_annee")
    description: Optional[str] = Field(None, alias="AnneeUniversitaire_description")
    ordre: Optional[int] = Field(None, alias="AnneeUniversitaire_ordre")
    is_active: Optional[bool] = Field(None, alias="AnneeUniversitaire_is_active")
    
    model_config = base_config

class AnneeUniversitaireSchema(AnneeUniversitaireBase):
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id")
    
    model_config = base_config


# =======================================================================
# 4. SCHÉMAS UTILISATEURS ET NOTATION
# =======================================================================

## ÉTUDIANT
class EtudiantBase(BaseModel):
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

    model_config = base_config

class EtudiantSchema(EtudiantBase):
    id_etudiant: str = Field(..., alias="Etudiant_id")
    # Ajout des relations potentielles
    inscriptions: List["InscriptionSchema"] = []
    
    model_config = base_config

## ENSEIGNANT
class EnseignantBase(BaseModel):
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

    model_config = base_config

class EnseignantSchema(EnseignantBase):
    id_enseignant: str = Field(..., alias="Enseignant_id")
    
    model_config = base_config


## INSCRIPTION
class InscriptionBase(BaseModel):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_parcours: str = Field(..., alias="Parcours_id_fk")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_mode_inscription: Optional[str] = Field(None, alias="ModeInscription_id_fk")
    
    date_inscription: date = Field(..., alias="Inscription_date")
    credit_acquis_semestre: int = Field(0, alias="Inscription_credit_acquis_semestre")
    is_semestre_valide: bool = Field(False, alias="Inscription_is_semestre_valide")
    
    model_config = base_config

class InscriptionSchema(InscriptionBase):
    id_inscription: str = Field(..., alias="Inscription_id")
    # Ajout des relations (en NestedSchema pour éviter de surcharger)
    etudiant: Optional["EtudiantBase"] = None
    parcours: Optional["ParcoursBase"] = None
    semestre: Optional["SemestreBase"] = None
    annee_universitaire: Optional["AnneeUniversitaireBase"] = None
    mode_inscription: Optional["ModeInscriptionBase"] = None
    
    model_config = base_config


## RÉSULTAT SEMESTRE
class ResultatSemestreBase(BaseModel):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    
    statut_validation: str = Field(..., alias="ResultatSemestre_statut_validation")
    credits_acquis: Optional[float] = Field(None, alias="ResultatSemestre_credits_acquis")
    moyenne_obtenue: Optional[float] = Field(None, alias="ResultatSemestre_moyenne_obtenue")
    
    model_config = base_config

class ResultatSemestreSchema(ResultatSemestreBase):
    id_resultat_semestre: str = Field(..., alias="ResultatSemestre_id")
    
    model_config = base_config

## RÉSULTAT UE
class ResultatUEBase(BaseModel):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_ue: str = Field(..., alias="UE_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    
    moyenne: float = Field(..., alias="ResultatUE_moyenne")
    is_acquise: bool = Field(False, alias="ResultatUE_is_acquise")
    credit_obtenu: int = Field(0, alias="ResultatUE_credit_obtenu")
    
    model_config = base_config

class ResultatUESchema(ResultatUEBase):
    id_resultat_ue: str = Field(..., alias="ResultatUE_id")
    
    model_config = base_config

## NOTE (Par EC et Session)
class NoteBase(BaseModel):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    id_session_examen: str = Field(..., alias="SessionExamen_id_fk")
    
    valeur: float = Field(..., alias="Note_valeur")
    
    model_config = base_config

class NoteSchema(NoteBase):
    id_note: str = Field(..., alias="Note_id")
    
    model_config = base_config

## SUIVI CRÉDIT CYCLE
class SuiviCreditCycleBase(BaseModel):
    id_etudiant: str = Field(..., alias="Etudiant_id_fk")
    id_cycle: str = Field(..., alias="Cycle_id_fk")
    credit_total_acquis: int = Field(0, alias="SuiviCreditCycle_credit_total_acquis")
    is_cycle_valide: bool = Field(False, alias="SuiviCreditCycle_is_cycle_valide")
    
    model_config = base_config

class SuiviCreditCycleSchema(SuiviCreditCycleBase):
    id_suivi_credit_cycle: str = Field(..., alias="SuiviCreditCycle_id")
    
    model_config = base_config


## VOLUME HORAIRE EC
class VolumeHoraireECBase(BaseModel):
    id_ec: str = Field(..., alias="EC_id_fk")
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    volume_heure: float = Field(..., alias="VolumeHoraireEC_volume_heure")
    
    model_config = base_config

class VolumeHoraireECSchema(VolumeHoraireECBase):
    id_volume_horaire_ec: str = Field(..., alias="VolumeHoraireEC_id")
    
    model_config = base_config

## TYPE ENSEIGNEMENT
class TypeEnseignementBase(BaseModel):
    code: Optional[str] = Field(None, alias="TypeEnseignement_code")
    label: str = Field(..., alias="TypeEnseignement_label")
    
    model_config = base_config

class TypeEnseignementSchema(TypeEnseignementBase):
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id")
    
    model_config = base_config

## AFFECTATION EC
class AffectationECBase(BaseModel):
    id_enseignant: str = Field(..., alias="Enseignant_id_fk")
    id_ec: str = Field(..., alias="EC_id_fk")
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    volume_heure_effectif: Optional[float] = Field(None, alias="AffectationEC_volume_heure_effectif")
    
    model_config = base_config

class AffectationECSchema(AffectationECBase):
    id_affectation_ec: str = Field(..., alias="AffectationEC_id")
    
    model_config = base_config

## JURY
class JuryBase(BaseModel):
    id_enseignant: str = Field(..., alias="Enseignant_id_fk") # Président
    id_semestre: str = Field(..., alias="Semestre_id_fk")
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id_fk")
    date_nomination: Optional[date] = Field(None, alias="Jury_date_nomination")
    
    model_config = base_config

class JurySchema(JuryBase):
    id_jury: str = Field(..., alias="Jury_id")
    
    model_config = base_config


# ==========================================
# 5. RÉSOLUTION DES DÉPENDANCES CIRCULAIRES
# ==========================================
# C'est l'étape CRUCIALE pour corriger l'erreur de récursion,
# car elle résout les références de types par des chaînes.

try:
    # Relations principales: Composante <-> Mention <-> Parcours
    ComposanteSchema.model_rebuild()
    MentionSchema.model_rebuild()
    DomaineSchema.model_rebuild()
    ParcoursSchema.model_rebuild()
    
    # Relations Académiques: Cycle <-> Niveau <-> Semestre <-> UE <-> EC
    CycleSchema.model_rebuild()
    NiveauSchema.model_rebuild()
    SemestreSchema.model_rebuild()
    UniteEnseignementSchema.model_rebuild()
    ElementConstitutifSchema.model_rebuild()
    
    # Autres relations
    EtudiantSchema.model_rebuild()
    InscriptionSchema.model_rebuild()
    
except AttributeError:
    # Fallback pour Pydantic v1, à supprimer si vous utilisez uniquement la v2.
    ComposanteSchema.update_forward_refs()
    MentionSchema.update_forward_refs()
    DomaineSchema.update_forward_refs()
    ParcoursSchema.update_forward_refs()
    CycleSchema.update_forward_refs()
    NiveauSchema.update_forward_refs()
    SemestreSchema.update_forward_refs()
    UniteEnseignementSchema.update_forward_refs()
    ElementConstitutifSchema.update_forward_refs()
    EtudiantSchema.update_forward_refs()
    InscriptionSchema.update_forward_refs()


# =======================================================================
# 6. SCHÉMAS POUR LA STRUCTURE ACADÉMIQUE (VUE PARCOURS)
# =======================================================================

class StructureUE(BaseModel):
    """Vue allégée d'une UE pour l'affichage en liste"""
    # 🚨 CORRECTION : On RETIRE l'alias car le mapping est déjà fait dans parcours_routes.py
    id: str 
    code: str
    intitule: str
    credit: int
    ec_count: int = 0
    
    model_config = base_config

class StructureSemestre(BaseModel):
    """Vue d'un semestre contenant ses UEs"""
    # 🚨 CORRECTION : On RETIRE l'alias
    id: str 
    numero: str 
    code: Optional[str] = None
    ues: List[StructureUE] = []
    
    model_config = base_config

class StructureNiveau(BaseModel):
    """Vue d'un niveau contenant ses Semestres"""
    niveau_id: str
    niveau_label: str
    semestres: List[StructureSemestre] = []
    
    model_config = base_config

class HistoriqueDetailSchema(BaseModel):
    annee_id: str
    annee_label: str
    nom_historique: Optional[str] = None
    code_historique: Optional[str] = None
    description_historique: Optional[str] = None
    # 🆕 AJOUT
    abbreviation_historique: Optional[str] = None

class HistoriqueUpdateSchema(BaseModel):
    nom: str
    code: str
    description: Optional[str] = None
    # 🆕 AJOUT
    abbreviation: Optional[str] = None