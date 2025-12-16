# Import et exposition des schémas pour simplifier les imports ailleurs
from .base import base_config
from .shared import HistoriqueDetailSchema, HistoriqueUpdateSchema
from .metadonnees_schemas import (
    DomaineBase, DomaineCreate, DomaineSchema,
    TypeComposanteBase, TypeComposanteCreate, TypeComposanteUpdate, TypeComposanteSchema, ComposanteAbbrSchema,
    TypeFormationBase, TypeFormationSchema,
    ModeInscriptionBase, ModeInscriptionSchema,
    AnneeUniversitaireBase, AnneeUniversitaireCreate, AnneeUniversitaireUpdate, AnneeUniversitaireSchema,
    SessionExamenBase, SessionExamenSchema,
    TypeEnseignementBase, TypeEnseignementSchema, NiveauSimpleSchema
)
from .institutions_schemas import (
    InstitutionCreate, InstitutionUpdate, InstitutionSchema,
    ComposanteBase, ComposanteCreate, ComposanteUpdate, ComposanteNestedSchema, ComposanteSchema
)
from .academic_schemas import (
    ParcoursBase, ParcoursSchema, ParcoursCreate, ParcoursUpdate,
    MentionBase, MentionSchema,
    CycleBase, CycleSchema,
    NiveauBase, NiveauSchema,
    SemestreBase, SemestreSchema,
    ParcoursNiveauBase, ParcoursNiveauSchema
)
from .maquette_schemas import (
    UniteEnseignementBase, UniteEnseignementSchema,
    ElementConstitutifBase, ElementConstitutifSchema,
    MaquetteElementConstitutifSchema,  # <-- NOUVEL EXPORT
    StructureUE, StructureEC, StructureSemestre, StructureNiveau
)
from .etudiants_schemas import (
    # === CORRECTION MAJEURE: Garder seulement les schémas Etudiant ===
    EtudiantBase, EtudiantSchema,
    # Les schémas Enseignant ont été retirés
)

from .enseignants_schemas import (
    EnseignantBase, EnseignantCreate, EnseignantSchema, EnseignantPaginatedResponse
)

from .results_schemas import (
    InscriptionBase, InscriptionSchema,
    ResultatSemestreBase, ResultatSemestreSchema,
    ResultatUEBase, ResultatUESchema,
    NoteBase, NoteSchema,
    SuiviCreditCycleBase, SuiviCreditCycleBase, SuiviCreditCycleSchema,
    VolumeHoraireECBase, VolumeHoraireECSchema,
    AffectationECBase, AffectationECSchema,
    JuryBase, JurySchema
)

from .inscriptions_schemas import InscriptionCreatePayload, InscriptionResponse

# ==========================================
# RÉSOLUTION DES DÉPENDANCES CIRCULAIRES
# ==========================================
# Pydantic v2 utilise model_rebuild() pour injecter les définitions manquantes (Forward Refs)
# C'est ici qu'on "coud" les fichiers ensemble.

try:
    # Relations Metadonnées <-> Academic
    DomaineSchema.model_rebuild()

    # Relations Institution <-> Academic
    TypeComposanteSchema.model_rebuild()
    ComposanteSchema.model_rebuild()
    
    # Relations Academic
    MentionSchema.model_rebuild()
    ParcoursSchema.model_rebuild()
    CycleSchema.model_rebuild()
    NiveauSchema.model_rebuild()
    SemestreSchema.model_rebuild()
    
    # Relations Maquette
    UniteEnseignementSchema.model_rebuild()
    ElementConstitutifSchema.model_rebuild()
    
    # Relations Users/Results
    EtudiantSchema.model_rebuild()
    InscriptionSchema.model_rebuild()
    # PAS BESOIN DE REBUILD POUR ENSEIGNANT

except AttributeError:
    # Fallback Pydantic v1 (si jamais vous ne mettez pas à jour tout de suite)
    DomaineSchema.update_forward_refs()
    ComposanteSchema.update_forward_refs()
    MentionSchema.update_forward_refs()
    ParcoursSchema.update_forward_refs()
    CycleSchema.update_forward_refs()
    NiveauSchema.update_forward_refs()
    SemestreSchema.update_forward_refs()
    # Maquette
    UniteEnseignementSchema.update_forward_refs()
    ElementConstitutifSchema.update_forward_refs()
    # Users/Results
    EtudiantSchema.update_forward_refs()
    InscriptionSchema.update_forward_refs()