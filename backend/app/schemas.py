from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime # Ajout de date pour les champs Date

# =====================
# INSTITUTIONS
# =====================

## Schéma de base pour la CRÉATION
class InstitutionCreate(BaseModel):
    # L'ID est OBLIGATOIRE et est fourni par le frontend (ex: INST_0003)
    id_institution: str = Field(..., description="Identifiant unique de l'institution (INST_XXXX)")
    
    # Le code est OBLIGATOIRE selon le modèle SQLAlchemy, il doit être fourni.
    # Dans le contexte actuel, il est préférable de le rendre obligatoire dans le formulaire
    # ou de le déduire dans l'API s'il n'est pas fourni.
    code: str = Field(..., description="Code court unique de l'institution") 
    
    nom: str
    type_institution: str
    description: Optional[str] = None 
    abbreviation: Optional[str] = None 
    
    class Config:
        extra = "allow" 

## Schéma pour la MISE À JOUR (incluant le chemin existant pour le logo)
class InstitutionUpdate(InstitutionCreate):
    logo_path: Optional[str] = None
    pass

## Schéma de sortie (Réponse API) pour le mappage ORM/DB
class InstitutionSchema(BaseModel):
    # Utiliser les noms de champs du frontend/Pydantic
    # et mapper aux noms réels des colonnes SQL via 'alias'

    id_institution: str = Field(..., alias="Institution_id") # <-- Correction ici
    code: str = Field(..., alias="Institution_code")         # <-- Correction ici
    nom: str = Field(..., alias="Institution_nom")           # <-- Correction ici
    type_institution: str = Field(..., alias="Institution_type") # <-- Correction ici
    
    description: Optional[str] = Field(None, alias="Institution_description")
    abbreviation: Optional[str] = Field(None, alias="Institution_abbreviation")
    logo_path: Optional[str] = Field(None, alias="Institution_logo_path") # <-- Correction ici

    class Config:
        orm_mode = True # ⚡ Indispensable pour que Pydantic lise l'objet ORM
        # Permet à Pydantic d'utiliser les noms de champs Pydantic (id_institution, nom, etc.) lors de la lecture de l'objet ORM, 
        # en utilisant les valeurs des alias (Institution_id, Institution_nom, etc.)
        allow_population_by_field_name = True

# =====================
# COMPOSANTES
# =====================

# 1. Schéma de base
# Contient les champs de base, utilisé par Base et Create
class ComposanteBase(BaseModel):
    # Les champs sont nommés de manière snake_case standard en Python, 
    # mais reflètent les noms de colonnes de votre modèle SQLAlchemy
    Composante_code: str = Field(..., max_length=50, description="Code unique de la composante (ex: FS-UFI)")
    Composante_label: str = Field(..., max_length=100, description="Nom complet de la composante (ex: Faculté des Sciences)")
    
    Composante_description: Optional[str] = Field(None, description="Description détaillée de l'établissement")
    Composante_abbreviation: Optional[str] = Field(None, max_length=20, description="Abréviation (ex: FS)")
    Composante_logo_path: Optional[str] = Field(None, max_length=255, description="Chemin vers le logo de la composante")

    # Clé étrangère
    Institution_id_fk: str = Field(..., max_length=10, description="ID de l'institution parente")

# 2. Schéma de Création (pour la requête POST)
# Hérite de Base et ne contient pas les champs gérés par la base de données (ID)
class ComposanteCreate(ComposanteBase):
    """Schéma utilisé pour la création d'une nouvelle composante (requête POST)."""
    pass

# 3. Schéma de Mise à Jour (pour la requête PUT/PATCH)
# Tous les champs sont optionnels pour permettre des mises à jour partielles
class ComposanteUpdate(BaseModel):
    """Schéma utilisé pour la mise à jour d'une composante existante (requête PUT/PATCH)."""
    Composante_code: Optional[str] = Field(None, max_length=50)
    Composante_label: Optional[str] = Field(None, max_length=100)
    Composante_description: Optional[str] = None
    Composante_abbreviation: Optional[str] = Field(None, max_length=20)
    Composante_logo_path: Optional[str] = Field(None, max_length=255)
    Institution_id_fk: Optional[str] = Field(None, max_length=10)

# 4. Schéma de Réponse (pour la requête GET)
# Contient tous les champs, y compris l'identifiant généré par la base
class ComposanteSchema(ComposanteBase):
    """Schéma utilisé pour la sérialisation des données en réponse (requête GET)."""
    Composante_id: str = Field(..., max_length=12, description="Clé primaire de la composante")
    
    # Configuration Pydantic pour mapper les objets SQLAlchemy
    class Config:
        orm_mode = True 
        # Anciennement `orm_mode = True`, permet de lire les données
        # à partir d'un objet de modèle SQLAlchemy.

# =====================
# DOMAINES
# =====================

# =====================
# DOMAINES
# =====================

class DomaineBase(BaseModel):
    # En lecture/update, ces champs peuvent être optionnels ou déjà remplis
    code: Optional[str] = Field(None, alias="Domaine_code")
    label: Optional[str] = Field(None, alias="Domaine_label")
    description: Optional[str] = Field(None, alias="Domaine_description")

    class Config:
        allow_population_by_field_name = True

# Schéma spécifique pour la CREATION (POST)
class DomaineCreate(BaseModel):
    # Ici, on force la présence des données
    code: str = Field(..., description="Code unique (ex: SCI)")
    label: str = Field(..., description="Libellé du domaine (ex: Sciences et Technologies)")
    description: Optional[str] = None

class DomaineSchema(DomaineBase):
    # L'ID est généré par le backend, on le renvoie en lecture
    id_domaine: str = Field(..., alias="Domaine_id")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# =====================
# MENTIONS
# =====================

class MentionBase(BaseModel):
    code: str # Mention_code
    label: Optional[str] = None # Mention_label
    description: Optional[str] = None # Mention_description
    abbreviation: Optional[str] = None # Mention_abbreviation
    logo_path: Optional[str] = None # Mention_logo_path
    id_composante: str # Composante_id_fk
    id_domaine: str # Domaine_id_fk

class MentionSchema(MentionBase):
    id_mention: str # Mention_id

    class Config:
        orm_mode = True

# =====================
# PARCOURS
# =====================

class ParcoursBase(BaseModel):
    code: str # Parcours_code
    label: Optional[str] = None # Parcours_label
    description: Optional[str] = None # Parcours_description
    abbreviation: Optional[str] = None # Parcours_abbreviation
    logo_path: Optional[str] = None # Parcours_logo_path
    date_creation: Optional[date] = None # Parcours_date_creation
    date_fin: Optional[date] = None # Parcours_date_fin
    id_mention: str # Mention_id_fk
    # Renommé pour correspondre à la FK
    id_type_formation_defaut: str # Parcours_type_formation_defaut_id_fk

class ParcoursSchema(ParcoursBase):
    id_parcours: str # Parcours_id

    class Config:
        orm_mode = True

# =====================
# CYCLES (LMD)
# =====================

class CycleBase(BaseModel):
    code: Optional[str] = None # Cycle_code
    label: str # Cycle_label

class CycleSchema(CycleBase):
    id_cycle: str # Cycle_id

    class Config:
        orm_mode = True

# =====================
# NIVEAUX (L1, M2, D3, ...)
# =====================

class NiveauBase(BaseModel):
    code: Optional[str] = None # Niveau_code
    label: Optional[str] = None # Niveau_label
    id_cycle: str # Cycle_id_fk

class NiveauSchema(NiveauBase):
    id_niveau: str # Niveau_id

    class Config:
        orm_mode = True

# =====================
# SEMESTRES
# =====================

class SemestreBase(BaseModel):
    code: Optional[str] = None # Semestre_code
    numero: str # Semestre_numero
    id_niveau: str # Niveau_id_fk

class SemestreSchema(SemestreBase):
    id_semestre: str # Semestre_id

    class Config:
        orm_mode = True

# =====================
# UNITES D'ENSEIGNEMENT (UE)
# =====================

class UniteEnseignementBase(BaseModel):
    code: str # UE_code
    intitule: str # UE_intitule
    credit: int # UE_credit
    id_semestre: str # Semestre_id_fk

class UniteEnseignementSchema(UniteEnseignementBase):
    id_ue: str # UE_id

    class Config:
        orm_mode = True

# =====================
# ELEMENTS CONSTITUTIFS (EC)
# =====================

class ElementConstitutifBase(BaseModel):
    code: str # EC_code
    intitule: str # EC_intitule
    coefficient: int = 1 # EC_coefficient
    id_ue: str # UE_id_fk

class ElementConstitutifSchema(ElementConstitutifBase):
    id_ec: str # EC_id

    class Config:
        orm_mode = True

# =====================
# PARCOURS NIVEAU (Association)
# =====================

class ParcoursNiveauBase(BaseModel):
    id_parcours: str # Parcours_id_fk
    id_niveau: str # Niveau_id_fk
    ordre: Optional[int] = None # ParcoursNiveau_ordre

class ParcoursNiveauSchema(ParcoursNiveauBase):
    id_parcours_niveau: str # ParcoursNiveau_id

    class Config:
        orm_mode = True

# =====================
# SESSIONS D'EXAMEN
# =====================

class SessionExamenBase(BaseModel):
    code: Optional[str] = None # SessionExamen_code
    label: str # SessionExamen_label

class SessionExamenSchema(SessionExamenBase):
    id_session_examen: str # SessionExamen_id

    class Config:
        orm_mode = True

# =====================
# MODES D'INSCRIPTION
# =====================

class ModeInscriptionBase(BaseModel):
    # On autorise le backend à recevoir "code" ou "ModeInscription_code"
    code: Optional[str] = Field(None, alias="ModeInscription_code")
    label: Optional[str] = Field(None, alias="ModeInscription_label")
    description: Optional[str] = Field(None, alias="ModeInscription_description")
    
    class Config:
        allow_population_by_field_name = True

class ModeInscriptionSchema(ModeInscriptionBase):
    # Mapping exact vers la colonne SQL : ModeInscription_id
    id_mode_inscription: str = Field(..., alias="ModeInscription_id")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# =====================
# TYPES DE FORMATION
# =====================

class TypeFormationBase(BaseModel):
    code: str = Field(..., alias="TypeFormation_code")
    label: str = Field(..., alias="TypeFormation_label")
    description: Optional[str] = Field(None, alias="TypeFormation_description")
    
    class Config:
        allow_population_by_field_name = True

class TypeFormationSchema(TypeFormationBase):
    id_type_formation: str = Field(..., alias="TypeFormation_id")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# =====================
# ANNÉE UNIVERSITAIRE
# =====================

class AnneeUniversitaireBase(BaseModel):
    annee: Optional[str] = Field(None, alias="AnneeUniversitaire_annee")
    description: Optional[str] = Field(None, alias="AnneeUniversitaire_description")
    ordre: int = Field(..., alias="AnneeUniversitaire_ordre")
    
    class Config:
        allow_population_by_field_name = True

class AnneeUniversitaireSchema(AnneeUniversitaireBase):
    id_annee_universitaire: str = Field(..., alias="AnneeUniversitaire_id")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# =====================
# ÉTUDIANT
# =====================

class EtudiantBase(BaseModel):
    numero_inscription: Optional[str] = None # Etudiant_numero_inscription
    nom: str # Etudiant_nom
    prenoms: Optional[str] = None # Etudiant_prenoms
    sexe: Optional[str] = None # Etudiant_sexe
    date_naissance: Optional[date] = None # Etudiant_naissance_date
    lieu_naissance: Optional[str] = None # Etudiant_naissance_lieu
    nationalite: Optional[str] = None # Etudiant_nationalite
    bacc_annee: Optional[int] = None # Etudiant_bacc_annee
    bacc_serie: Optional[str] = None # Etudiant_bacc_serie
    bacc_numero: Optional[str] = None # Etudiant_bacc_numero
    bacc_centre: Optional[str] = None # Etudiant_bacc_centre
    bacc_mention: Optional[str] = None # Etudiant_bacc_mention
    adresse: Optional[str] = None # Etudiant_adresse
    telephone: Optional[str] = None # Etudiant_telephone
    mail: Optional[str] = None # Etudiant_mail
    cin: Optional[str] = None # Etudiant_cin
    cin_date: Optional[date] = None # Etudiant_cin_date
    cin_lieu: Optional[str] = None # Etudiant_cin_lieu
    photo_profil_path: Optional[str] = None # Etudiant_photo_profil_path
    scan_cin_path: Optional[str] = None # Etudiant_scan_cin_path
    scan_releves_notes_bacc_path: Optional[str] = None # Etudiant_scan_releves_notes_bacc_path

class EtudiantSchema(EtudiantBase):
    id_etudiant: str # Etudiant_id

    class Config:
        orm_mode = True

# =====================
# INSCRIPTION
# =====================

class InscriptionBase(BaseModel):
    id_etudiant: str # Etudiant_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    id_parcours: str # Parcours_id_fk
    id_semestre: str # Semestre_id_fk
    id_mode_inscription: Optional[str] = None # ModeInscription_id_fk
    date_inscription: date # Inscription_date
    credit_acquis_semestre: int = 0 # Inscription_credit_acquis_semestre
    is_semestre_valide: bool = False # Inscription_is_semestre_valide

class InscriptionSchema(InscriptionBase):
    # La clé primaire est Inscription_id (qui est l'ancienne Inscription_code)
    id_inscription: str # Inscription_id

    class Config:
        orm_mode = True

# =====================
# RÉSULTAT SEMESTRE
# =====================

class ResultatSemestreBase(BaseModel):
    id_etudiant: str # Etudiant_id_fk
    id_semestre: str # Semestre_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    id_session_examen: str # SessionExamen_id_fk
    statut_validation: str # ResultatSemestre_statut_validation (V, NV, AJ)
    credits_acquis: Optional[float] = None # ResultatSemestre_credits_acquis
    moyenne_obtenue: Optional[float] = None # ResultatSemestre_moyenne_obtenue

class ResultatSemestreSchema(ResultatSemestreBase):
    id_resultat_semestre: str # ResultatSemestre_id

    class Config:
        orm_mode = True

# =====================
# RÉSULTAT UE
# =====================

class ResultatUEBase(BaseModel):
    id_etudiant: str # Etudiant_id_fk
    id_ue: str # UE_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    id_session_examen: str # SessionExamen_id_fk
    moyenne: float # ResultatUE_moyenne
    is_acquise: bool = False # ResultatUE_is_acquise
    credit_obtenu: int = 0 # ResultatUE_credit_obtenu

class ResultatUESchema(ResultatUEBase):
    id_resultat_ue: str # ResultatUE_id

    class Config:
        orm_mode = True

# =====================
# NOTE (Par EC et Session)
# =====================

class NoteBase(BaseModel):
    id_etudiant: str # Etudiant_id_fk
    id_ec: str # EC_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    id_session_examen: str # SessionExamen_id_fk
    valeur: float # Note_valeur

class NoteSchema(NoteBase):
    id_note: str # Note_id

    class Config:
        orm_mode = True

# =====================
# SUIVI CRÉDIT CYCLE
# =====================

class SuiviCreditCycleBase(BaseModel):
    id_etudiant: str # Etudiant_id_fk
    id_cycle: str # Cycle_id_fk
    credit_total_acquis: int = 0 # SuiviCreditCycle_credit_total_acquis
    is_cycle_valide: bool = False # SuiviCreditCycle_is_cycle_valide

class SuiviCreditCycleSchema(SuiviCreditCycleBase):
    id_suivi_credit_cycle: str # SuiviCreditCycle_id

    class Config:
        orm_mode = True

# =====================
# ENSEIGNANT
# =====================

class EnseignantBase(BaseModel):
    matricule: Optional[str] = None # Enseignant_matricule
    nom: str # Enseignant_nom
    prenoms: Optional[str] = None # Enseignant_prenoms
    sexe: Optional[str] = None # Enseignant_sexe
    date_naissance: Optional[date] = None # Enseignant_date_naissance
    grade: Optional[str] = None # Enseignant_grade
    statut: str # Enseignant_statut (PERM, VAC)
    id_composante_affectation: Optional[str] = None # Composante_id_affectation_fk
    cin: Optional[str] = None # Enseignant_cin
    cin_date: Optional[date] = None # Enseignant_cin_date
    cin_lieu: Optional[str] = None # Enseignant_cin_lieu
    telephone: Optional[str] = None # Enseignant_telephone
    mail: Optional[str] = None # Enseignant_mail
    rib: Optional[str] = None # Enseignant_rib
    photo_profil_path: Optional[str] = None # Enseignant_photo_profil_path
    scan_cin_path: Optional[str] = None # Enseignant_scan_cin_path

class EnseignantSchema(EnseignantBase):
    id_enseignant: str # Enseignant_id

    class Config:
        orm_mode = True

# =====================
# TYPE ENSEIGNEMENT
# =====================

class TypeEnseignementBase(BaseModel):
    code: Optional[str] = Field(None, alias="TypeEnseignement_code")
    label: str = Field(..., alias="TypeEnseignement_label")
    
    class Config:
        allow_population_by_field_name = True

class TypeEnseignementSchema(TypeEnseignementBase):
    id_type_enseignement: str = Field(..., alias="TypeEnseignement_id")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# =====================
# VOLUME HORAIRE EC
# =====================

class VolumeHoraireECBase(BaseModel):
    id_ec: str # EC_id_fk
    id_type_enseignement: str # TypeEnseignement_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    volume_heure: float # VolumeHoraireEC_volume_heure

class VolumeHoraireECSchema(VolumeHoraireECBase):
    id_volume_horaire_ec: str # VolumeHoraireEC_id

    class Config:
        orm_mode = True

# =====================
# AFFECTATION EC
# =====================

class AffectationECBase(BaseModel):
    id_enseignant: str # Enseignant_id_fk
    id_ec: str # EC_id_fk
    id_type_enseignement: str # TypeEnseignement_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    volume_heure_effectif: Optional[float] = None # AffectationEC_volume_heure_effectif

class AffectationECSchema(AffectationECBase):
    id_affectation_ec: str # AffectationEC_id

    class Config:
        orm_mode = True

# =====================
# JURY
# =====================

class JuryBase(BaseModel):
    id_enseignant: str # Enseignant_id_fk (Président)
    id_semestre: str # Semestre_id_fk
    id_annee_universitaire: str # AnneeUniversitaire_id_fk
    date_nomination: Optional[date] = None # Jury_date_nomination

class JurySchema(JuryBase):
    id_jury: str # Jury_id

    class Config:
        orm_mode = True