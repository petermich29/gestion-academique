# models.py
from sqlalchemy import (
    Column, Integer, String, Date, Numeric, ForeignKey,
    UniqueConstraint, Text, Boolean, CheckConstraint
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# ===================================================================
# --- 1. STRUCTURE ADMINISTRATIVE ET ACADÉMIQUE ---
# ===================================================================

class Institution(Base):
    __tablename__ = 'institutions'
    __table_args__ = (
        UniqueConstraint('Institution_code', name='uq_institution_code'),
        {'extend_existing': True}
    )

    Institution_id = Column(String(10), primary_key=True, nullable=False)
    Institution_code = Column(String(32), unique=True, nullable=False)
    Institution_nom = Column(String(255), nullable=False)
    Institution_type = Column(String(10), nullable=False)
    Institution_description = Column(Text, nullable=True)
    Institution_abbreviation = Column(String(20), nullable=True)
    Institution_logo_path = Column(String(255), nullable=True)

    composantes = relationship("Composante", back_populates="institution")
    institution_historiques = relationship("InstitutionHistorique", back_populates="institution")


class Composante(Base):
    __tablename__ = 'composantes'
    __table_args__ = (
        UniqueConstraint('Composante_code', name='uq_composante_code'),
        {'extend_existing': True}
    )

    Composante_id = Column(String(12), primary_key=True)
    Composante_code = Column(String(50), unique=True)
    Composante_label = Column(String(100))
    Composante_description = Column(Text, nullable=True)
    Composante_abbreviation = Column(String(20), nullable=True)
    Composante_logo_path = Column(String(255), nullable=True)
    Composante_type = Column(String(7), ForeignKey('types_composante.TypeComposante_id'), nullable=True)
    
    Institution_id_fk = Column(String(10), ForeignKey('institutions.Institution_id'), nullable=False)

    type_composante = relationship("TypeComposante", back_populates="composantes")
    institution = relationship("Institution", back_populates="composantes")
    mentions = relationship("Mention", backref="composante")
    enseignants_permanents = relationship("Enseignant", back_populates="composante_attachement")
    composante_historiques = relationship("ComposanteHistorique", back_populates="composante")


class Domaine(Base):
    __tablename__ = 'domaines'
    __table_args__ = {'extend_existing': True}

    Domaine_id = Column(String(20), primary_key=True)
    Domaine_code = Column(String(20), unique=True)
    Domaine_label = Column(String(100))
    Domaine_description = Column(Text, nullable=True)

    mentions = relationship("Mention", backref="domaine")


class Mention(Base):
    __tablename__ = 'mentions'
    __table_args__ = (
        UniqueConstraint('Mention_code', 'Composante_id_fk', name='unique_mention_code_composante'),
        {'extend_existing': True}
    )

    Mention_id = Column(String(12), primary_key=True)
    Mention_code = Column(String(30), nullable=False)
    Mention_label = Column(String(100))
    Mention_description = Column(Text, nullable=True)
    Mention_abbreviation = Column(String(20), nullable=True)
    Mention_logo_path = Column(String(255), nullable=True)

    Composante_id_fk = Column(String(12), ForeignKey('composantes.Composante_id'), nullable=False)
    Domaine_id_fk = Column(String(20), ForeignKey('domaines.Domaine_id'), nullable=False)

    parcours = relationship("Parcours", backref="mention")
    mention_historiques = relationship("MentionHistorique", back_populates="mention")
    dossiers_inscription = relationship("DossierInscription", back_populates="mention") #


class Parcours(Base):
    __tablename__ = 'parcours'
    __table_args__ = (
        UniqueConstraint('Parcours_code', 'Mention_id_fk', name='unique_parcours_code_mention'),
        {'extend_existing': True}
    )

    Parcours_id = Column(String(15), primary_key=True)
    Parcours_code = Column(String(50), nullable=False)
    Parcours_label = Column(String(100))
    Parcours_description = Column(Text, nullable=True)
    Parcours_abbreviation = Column(String(20), nullable=True)
    Parcours_logo_path = Column(String(255), nullable=True)
    Parcours_date_creation = Column(Date, nullable=True)
    Parcours_date_fin = Column(Date, nullable=True)

    Mention_id_fk = Column(String(12), ForeignKey('mentions.Mention_id'), nullable=False)

    Parcours_type_formation_defaut_id_fk = Column(
        String(7),
        ForeignKey('types_formation.TypeFormation_id'),
        nullable=False,
        default='TYPE_01'
    )

    type_formation_defaut = relationship("TypeFormation", back_populates="parcours")
    niveaux_couverts = relationship(
        "ParcoursNiveau",
        back_populates="parcours",
        cascade="all, delete-orphan"
    )
    parcours_historiques = relationship("ParcoursHistorique", back_populates="parcours")


# =========================================================
# --- HISTORISATION (Surcharges par Année) ---
# =========================================================

class InstitutionHistorique(Base):
    __tablename__ = 'institutions_historique'
    __table_args__ = {'extend_existing': True}
    Institution_id_fk = Column(String(10), ForeignKey('institutions.Institution_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Institution_nom_historique = Column(String(255))
    Institution_code_historique = Column(String(32))
    Institution_description_historique = Column(Text)
    Institution_abbreviation_historique = Column(String(20))
    institution = relationship("Institution", back_populates="institution_historiques")
    annee_univ = relationship("AnneeUniversitaire")

class ComposanteHistorique(Base):
    __tablename__ = 'composantes_historique'
    __table_args__ = {'extend_existing': True}
    Composante_id_fk = Column(String(12), ForeignKey('composantes.Composante_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Composante_label_historique = Column(String(100))
    Composante_code_historique = Column(String(50))
    Composante_description_historique = Column(Text)
    Composante_abbreviation_historique = Column(String(20))
    composante = relationship("Composante", back_populates="composante_historiques")
    annee_univ = relationship("AnneeUniversitaire")

class MentionHistorique(Base):
    __tablename__ = 'mentions_historique'
    __table_args__ = {'extend_existing': True}
    Mention_id_fk = Column(String(12), ForeignKey('mentions.Mention_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Mention_label_historique = Column(String(100))
    Mention_code_historique = Column(String(30))
    Mention_description_historique = Column(Text)
    Mention_abbreviation_historique = Column(String(20))
    mention = relationship("Mention", back_populates="mention_historiques")
    annee_univ = relationship("AnneeUniversitaire")

class ParcoursHistorique(Base):
    __tablename__ = 'parcours_historique'
    __table_args__ = {'extend_existing': True}
    Parcours_id_fk = Column(String(15), ForeignKey('parcours.Parcours_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Parcours_label_historique = Column(String(100))
    Parcours_code_historique = Column(String(50))
    Parcours_description_historique = Column(Text)
    Parcours_abbreviation_historique = Column(String(20))
    parcours = relationship("Parcours", back_populates="parcours_historiques")
    annee_univ = relationship("AnneeUniversitaire")

class CycleHistorique(Base):
    __tablename__ = 'cycles_historique'
    __table_args__ = {'extend_existing': True}
    Cycle_id_fk = Column(String(10), ForeignKey('cycles.Cycle_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Cycle_label_historique = Column(String(50))
    cycle = relationship("Cycle")
    annee_univ = relationship("AnneeUniversitaire")

class NiveauHistorique(Base):
    __tablename__ = 'niveaux_historique'
    __table_args__ = {'extend_existing': True}
    Niveau_id_fk = Column(String(10), ForeignKey('niveaux.Niveau_id'), primary_key=True)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), primary_key=True)
    Niveau_label_historique = Column(String(50))
    niveau = relationship("Niveau")
    annee_univ = relationship("AnneeUniversitaire")


# =========================================================
# --- NIVEAUX, CYCLES ET SEMESTRES ---
# =========================================================

class ParcoursNiveau(Base):
    __tablename__ = "parcours_niveaux"

    Parcours_id_fk = Column(
        String(50),
        ForeignKey("parcours.Parcours_id"),
        primary_key=True
    )

    Niveau_id_fk = Column(
        String(20),
        ForeignKey("niveaux.Niveau_id"),
        primary_key=True
    )

    AnneeUniversitaire_id_fk = Column(
        String(20),
        ForeignKey("annees_universitaires.AnneeUniversitaire_id"),
        primary_key=True   # 🔥 IMPORTANT
    )

    ParcoursNiveau_ordre = Column(Integer, nullable=True)

    parcours = relationship("Parcours", back_populates="niveaux_couverts")
    niveau = relationship("Niveau", back_populates="parcours_associes")





class Cycle(Base):
    __tablename__ = 'cycles'
    __table_args__ = {'extend_existing': True}
    Cycle_id = Column(String(10), primary_key=True)
    Cycle_code = Column(String(10), unique=True)
    Cycle_label = Column(String(50), unique=True, nullable=False)
    niveaux = relationship("Niveau", back_populates="cycle")
    suivi_credits = relationship("SuiviCreditCycle", back_populates="cycle")


class Niveau(Base):
    __tablename__ = 'niveaux'
    __table_args__ = {'extend_existing': True}
    Niveau_id = Column(String(10), primary_key=True)
    Niveau_code = Column(String(10), unique=True)
    Niveau_label = Column(String(50))
    Cycle_id_fk = Column(String(10), ForeignKey('cycles.Cycle_id'), nullable=False)
    cycle = relationship("Cycle", back_populates="niveaux")
    semestres = relationship("Semestre", back_populates="niveau")
    parcours_associes = relationship(
        "ParcoursNiveau",
        back_populates="niveau",
        cascade="all, delete-orphan"
    )


class Semestre(Base):
    __tablename__ = 'semestres'
    __table_args__ = (
        UniqueConstraint('Niveau_id_fk', 'Semestre_numero', name='uq_niveau_numero_semestre'),
        {'extend_existing': True}
    )
    Semestre_id = Column(String(10), primary_key=True)
    Semestre_code = Column(String(10), unique=True)
    Semestre_numero = Column(String(10), nullable=False)
    Niveau_id_fk = Column(String(10), ForeignKey('niveaux.Niveau_id'), nullable=False)
    niveau = relationship("Niveau", back_populates="semestres")
    inscriptions = relationship(
        "InscriptionSemestre", 
        back_populates="semestre",
        primaryjoin="Semestre.Semestre_id == InscriptionSemestre.Semestre_id_fk"
    )


# ===================================================================
# --- CATALOGUES ET MAQUETTES (UE/EC) ---
# ===================================================================

class UniteEnseignement(Base):
    """CATALOGUE DES UEs (La bibliothèque de cours)"""
    __tablename__ = 'unites_enseignement_catalog'
    
    UE_id = Column(String(50), primary_key=True)
    UE_code = Column(String(20), unique=True, nullable=False)
    UE_intitule = Column(String(255), nullable=False)
    UE_description = Column(Text, nullable=True)

    maquettes = relationship("MaquetteUE", back_populates="ue_catalog")


class ElementConstitutif(Base):
    """CATALOGUE DES ECs (Les briques de matière)"""
    __tablename__ = 'elements_constitutifs_catalog'

    EC_id = Column(String(50), primary_key=True)
    EC_code = Column(String(20), unique=True, nullable=False)
    EC_intitule = Column(String(255), nullable=False)
    
    maquettes_ec = relationship("MaquetteEC", back_populates="ec_catalog")
    notes = relationship("Note", back_populates="element_constitutif")


class MaquetteUE(Base):
    __tablename__ = 'maquettes_ue'
    __table_args__ = (
        UniqueConstraint('Parcours_id_fk', 'AnneeUniversitaire_id_fk', 'UE_id_fk', name='uq_maquette_ue'),
    )

    MaquetteUE_id = Column(String(50), primary_key=True)

    Parcours_id_fk = Column(String(15), ForeignKey('parcours.Parcours_id'), nullable=False)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), nullable=False)
    UE_id_fk = Column(String(50), ForeignKey('unites_enseignement_catalog.UE_id'), nullable=False)
    Semestre_id_fk = Column(String(10), ForeignKey('semestres.Semestre_id'), nullable=False)
    
    MaquetteUE_credit = Column(Integer, nullable=False)

    ue_catalog = relationship("UniteEnseignement", back_populates="maquettes")
    parcours = relationship("Parcours")
    annee = relationship("AnneeUniversitaire")
    semestre = relationship("Semestre")
    maquette_ecs = relationship("MaquetteEC", back_populates="maquette_ue", cascade="all, delete-orphan")
    
    # AJOUT DE LA RELATION VERS LES RÉSULTATS
    resultats = relationship("ResultatUE", back_populates="maquette_ue")


class MaquetteEC(Base):
    """Configuration d'un EC au sein d'une MaquetteUE"""
    __tablename__ = 'maquettes_ec'

    MaquetteEC_id = Column(String(50), primary_key=True)
    MaquetteUE_id_fk = Column(String(50), ForeignKey('maquettes_ue.MaquetteUE_id'), nullable=False)
    EC_id_fk = Column(String(50), ForeignKey('elements_constitutifs_catalog.EC_id'), nullable=False)
    MaquetteEC_coefficient = Column(Numeric(4, 2), default=1.00, nullable=False)

    maquette_ue = relationship("MaquetteUE", back_populates="maquette_ecs")
    ec_catalog = relationship("ElementConstitutif", back_populates="maquettes_ec")
    
    volumes_horaires = relationship("VolumeHoraire", back_populates="maquette_ec", cascade="all, delete-orphan")
    attributions = relationship("AttributionEnseignant", back_populates="maquette_ec", cascade="all, delete-orphan")


# ===================================================================
# --- PARAMÈTRES ET TYPES ---
# ===================================================================

class SessionExamen(Base):
    __tablename__ = 'sessions_examen'
    __table_args__ = {'extend_existing': True}

    SessionExamen_id = Column(String(8), primary_key=True)
    SessionExamen_code = Column(String(5), unique=True)
    SessionExamen_label = Column(String(50), nullable=False, unique=True)

    notes_session = relationship("Note", back_populates="session")
    resultats_ue_session = relationship("ResultatUE", back_populates="session")
    resultats_semestre_collection = relationship("ResultatSemestre", back_populates="session_examen")


class ModeInscription(Base):
    __tablename__ = 'modes_inscription'
    __table_args__ = {'extend_existing': True}

    ModeInscription_id = Column(String(10), primary_key=True)
    ModeInscription_code = Column(String(10), unique=True)
    ModeInscription_label = Column(String(50), nullable=False, unique=True)
    ModeInscription_description = Column(Text, nullable=True)

    inscriptions = relationship("Inscription", back_populates="mode_inscription")


class TypeFormation(Base):
    __tablename__ = 'types_formation'
    __table_args__ = {'extend_existing': True}

    TypeFormation_id = Column(String(10), primary_key=True)
    TypeFormation_code = Column(String(10), unique=True, nullable=False)
    TypeFormation_label = Column(String(50), nullable=False, unique=True)
    TypeFormation_description = Column(Text, nullable=True)

    parcours = relationship("Parcours", back_populates="type_formation_defaut")


class TypeEnseignement(Base):
    __tablename__ = 'types_enseignement'
    __table_args__ = {'extend_existing': True}

    TypeEnseignement_id = Column(String(10), primary_key=True)
    TypeEnseignement_code = Column(String(10), unique=True)
    TypeEnseignement_label = Column(String(50), unique=True, nullable=False)

    attributions = relationship("AttributionEnseignant", back_populates="type_enseignement")


class TypeComposante(Base):
    __tablename__ = 'types_composante'
    __table_args__ = {'extend_existing': True}

    TypeComposante_id = Column(String(7), primary_key=True)
    TypeComposante_label = Column(String(50), nullable=False, unique=True)
    TypeComposante_description = Column(Text, nullable=True)

    composantes = relationship("Composante", back_populates="type_composante")


# ===================================================================
# --- DONNÉES ETUDIANT, INSCRIPTIONS, RESULTATS ---
# ===================================================================

class AnneeUniversitaire(Base):
    __tablename__ = 'annees_universitaires'
    __table_args__ = (
        UniqueConstraint("AnneeUniversitaire_ordre", name="uq_annee_ordre_unique"),
        {'extend_existing': True}
    )

    AnneeUniversitaire_id = Column(String(9), primary_key=True)
    AnneeUniversitaire_annee = Column(String(9), unique=True, nullable=False)
    AnneeUniversitaire_description = Column(Text, nullable=True)
    AnneeUniversitaire_ordre = Column(Integer, unique=True, nullable=False)
    AnneeUniversitaire_is_active = Column(Boolean, default=False, nullable=False)

    inscriptions = relationship("Inscription", back_populates="annee_univ")
    notes_obtenues = relationship("Note", back_populates="annee_univ")

    def __repr__(self):
        etat = "ACTIVE" if self.AnneeUniversitaire_is_active else "INACTIVE"
        return f"<AnnéeUniversitaire {self.AnneeUniversitaire_annee} ({etat})>"


class Etudiant(Base):
    __tablename__ = 'etudiants'
    __table_args__ = ({'extend_existing': True})

    Etudiant_id = Column(String(50), primary_key=True)
    Etudiant_nom = Column(String(100), nullable=False)
    Etudiant_prenoms = Column(String(150))
    Etudiant_sexe = Column(String(20))

    Etudiant_naissance_date = Column(Date, nullable=True) # La colonne principale
    Etudiant_naissance_date_Exact = Column(Boolean, nullable=True) # Nouvelle colonne
    Etudiant_naissance_annee = Column(Integer, nullable=True) # Nouvelle colonne
    Etudiant_naissance_mois = Column(Integer, nullable=True) # Nouvelle colonne
    Etudiant_naissance_jour = Column(Integer, nullable=True) # Nouvelle colonne

    Etudiant_naissance_lieu = Column(String(100))
    Etudiant_nationalite = Column(String(50))
    Etudiant_bacc_annee = Column(Integer, nullable=True)
    Etudiant_bacc_serie = Column(String(50))
    Etudiant_bacc_numero = Column(String(10))
    Etudiant_bacc_centre = Column(String(100))
    Etudiant_bacc_mention = Column(String(20))
    Etudiant_adresse = Column(String(255))
    Etudiant_telephone = Column(String(50))
    Etudiant_mail = Column(String(100))
    Etudiant_cin = Column(String(15))
    Etudiant_cin_date = Column(Date, nullable=True)
    Etudiant_cin_lieu = Column(String(100))
    Etudiant_photo_profil_path = Column(String(255), nullable=True)
    Etudiant_scan_cin_path = Column(String(255), nullable=True)
    Etudiant_scan_releves_notes_bacc_path = Column(String(255), nullable=True)

    notes_obtenues = relationship("Note", back_populates="etudiant")
    credits_cycles = relationship("SuiviCreditCycle", back_populates="etudiant")
    resultats_ue = relationship("ResultatUE", back_populates="etudiant")
    resultats_semestre = relationship("ResultatSemestre", back_populates="etudiant_resultat")

    dossiers_inscription = relationship("DossierInscription", back_populates="etudiant")

    # --- AJOUT CRUCIAL POUR RÉPARER L'ERREUR ---
    @property
    def inscriptions(self):
        """
        Récupère toutes les inscriptions à travers les dossiers d'inscription.
        Permet de garder la compatibilité avec le reste du code (schemas, etc.)
        """
        all_inscriptions = []
        if self.dossiers_inscription:
            for dossier in self.dossiers_inscription:
                if dossier.inscriptions:
                    all_inscriptions.extend(dossier.inscriptions)
        return all_inscriptions

    @property
    def parcours(self):
        """
        Récupère le parcours de la dernière inscription (la plus récente).
        Nécessaire pour que le schéma Pydantic 'EtudiantSchema' trouve le champ 'parcours'.
        """
        if not self.inscriptions:
            return None
        # On trie les inscriptions par date (descendant) et on prend la première
        sorted_inscriptions = sorted(self.inscriptions, key=lambda i: i.Inscription_date, reverse=True)
        return sorted_inscriptions[0].parcours
    
    # --- AJOUTEZ CETTE PROPRIÉTÉ ---
    @property
    def cursus_liste(self):
        """
        Version améliorée du cursus pour l'affichage :
        - Mention en ligne 1
        - Ligne 2 : Institution_nom | Composante_abbr | années
        """

        if not self.inscriptions:
            return []

        mentions_grouped = {}

        inscriptions_triees = sorted(
            self.inscriptions,
            key=lambda i: i.annee_univ.AnneeUniversitaire_ordre if i.annee_univ else 0,
            reverse=True
        )

        for insc in inscriptions_triees:
            parcours = insc.parcours
            if not parcours:
                continue

            mention = parcours.mention
            composante = mention.composante if mention else None
            institution = composante.institution if composante else None

            mention_id = mention.Mention_id
            annee = insc.annee_univ.AnneeUniversitaire_annee if insc.annee_univ else "?"

            if mention_id not in mentions_grouped:
                mentions_grouped[mention_id] = {
                    "mention_nom": mention.Mention_label,
                    "mention_abbr": mention.Mention_abbreviation or mention.Mention_code,

                    # ✔️ NOM COMPLET
                    "institution_nom": institution.Institution_nom if institution else "",

                    # ✔️ Abréviation composante (ex: ESP)
                    "composante_abbr": composante.Composante_abbreviation or composante.Composante_code if composante else "",

                    # ✔️ Liste des années regroupées
                    "annee_universitaire_list": [annee],
                }
            else:
                if annee not in mentions_grouped[mention_id]["annee_universitaire_list"]:
                    mentions_grouped[mention_id]["annee_universitaire_list"].append(annee)

        return list(mentions_grouped.values())
    

class DossierInscription(Base):
    __tablename__ = 'dossiers_inscription'
    __table_args__ = (
        UniqueConstraint(
            'Etudiant_id_fk',
            'Mention_id_fk',
            name='uq_etudiant_mention_dossier'
        ),
    )

    DossierInscription_id = Column(String(120), primary_key=True)
    DossierInscription_numero = Column(String(50), nullable=True)

    Etudiant_id_fk = Column(
        String(50), 
        ForeignKey('etudiants.Etudiant_id'), 
        nullable=False
    )

    Mention_id_fk = Column(
        String(12),
        ForeignKey('mentions.Mention_id'),
        nullable=False
    )

    DossierInscription_date_creation = Column(Date, nullable=False)

    etudiant = relationship("Etudiant", back_populates="dossiers_inscription")
    mention = relationship("Mention", back_populates="dossiers_inscription")
    inscriptions = relationship("Inscription", back_populates="dossier_inscription")



class Inscription(Base):
    __tablename__ = 'inscriptions'
    __table_args__ = (
        UniqueConstraint(
            'DossierInscription_id_fk',
            'AnneeUniversitaire_id_fk',
            'Parcours_id_fk',
            'Niveau_id_fk',
            name='uq_dossier_annee_parcours_niveau'
        ),
    )

    Inscription_id = Column(String(120), primary_key=True)

    DossierInscription_id_fk = Column(
        String(120),
        ForeignKey('dossiers_inscription.DossierInscription_id'),
        nullable=False
    )

    AnneeUniversitaire_id_fk = Column(
        String(9),
        ForeignKey('annees_universitaires.AnneeUniversitaire_id'),
        nullable=False
    )

    Parcours_id_fk = Column(
        String(15),
        ForeignKey('parcours.Parcours_id'),
        nullable=False
    )

    Niveau_id_fk = Column(
        String(10),
        ForeignKey('niveaux.Niveau_id'),
        nullable=False
    )

    ModeInscription_id_fk = Column(
        String(10),
        ForeignKey('modes_inscription.ModeInscription_id'),
        nullable=True
    )

    Inscription_date = Column(Date, nullable=False)

    dossier_inscription = relationship("DossierInscription", back_populates="inscriptions")
    annee_univ = relationship("AnneeUniversitaire")
    parcours = relationship("Parcours")
    niveau = relationship("Niveau")
    mode_inscription = relationship("ModeInscription")
    semestres = relationship(
        "InscriptionSemestre",
        back_populates="inscription",
        cascade="all, delete-orphan"
    )


class InscriptionSemestre(Base):
    __tablename__ = 'inscriptions_semestres'
    __table_args__ = (
        UniqueConstraint(
            'Inscription_id_fk',
            'Semestre_id_fk',
            name='uq_inscription_semestre'
        ),
    )

    InscriptionSemestre_id = Column(String(120), primary_key=True)

    Inscription_id_fk = Column(
        String(120),
        ForeignKey('inscriptions.Inscription_id'),
        nullable=False
    )

    Semestre_id_fk = Column(
        String(10),
        ForeignKey('semestres.Semestre_id'),
        nullable=False
    )

    InscriptionSemestre_statut = Column(
        String(10),
        # FIX : Les guillemets doubles sont CRUCIAUX pour PostgreSQL
        CheckConstraint(
            "\"InscriptionSemestre_statut\" IN ('INSCRIT', 'VALIDE', 'AJ')",
            name='ck_statut_inscription_semestre'
        ),
        default='INSCRIT', 
        server_default='INSCRIT',
        nullable=False
    )
    inscription = relationship("Inscription", back_populates="semestres")
    semestre = relationship("Semestre")


class ResultatSemestre(Base):
    __tablename__ = 'resultats_semestre'
    __table_args__ = (
        UniqueConstraint('Etudiant_id_fk', 'Semestre_id_fk', 'AnneeUniversitaire_id_fk', 'SessionExamen_id_fk', name='uq_resultat_semestre_session'),
    )

    ResultatSemestre_id = Column(String(50), primary_key=True)
    Etudiant_id_fk = Column(String(50), ForeignKey('etudiants.Etudiant_id'), nullable=False)
    Semestre_id_fk = Column(String(10), ForeignKey('semestres.Semestre_id'), nullable=False)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), nullable=False)
    SessionExamen_id_fk = Column(String(8), ForeignKey('sessions_examen.SessionExamen_id'), nullable=False)

    ResultatSemestre_statut_validation = Column(String(5), nullable=False) # 'V', 'NV', 'AJ'
    ResultatSemestre_credits_acquis = Column(Numeric(4, 1))
    ResultatSemestre_moyenne_obtenue = Column(Numeric(4, 2))

    etudiant_resultat = relationship("Etudiant", back_populates="resultats_semestre")
    semestre = relationship("Semestre")
    session_examen = relationship("SessionExamen", back_populates="resultats_semestre_collection")
    annee_univ = relationship("AnneeUniversitaire")


class ResultatUE(Base):
    __tablename__ = 'resultats_ue'
    __table_args__ = (
        # Unicité : Un étudiant a un seul résultat pour une Maquette donnée lors d'une session donnée
        UniqueConstraint('Etudiant_id_fk', 'MaquetteUE_id_fk', 'SessionExamen_id_fk', name='uq_resultat_maquette_session'),
    )

    ResultatUE_id = Column(String(50), primary_key=True)

    Etudiant_id_fk = Column(String(50), ForeignKey('etudiants.Etudiant_id'), nullable=False)
    
    # CHANGEMENT ICI : On pointe vers MaquetteUE au lieu de UE + Annee
    # Cela inclut implicitement l'Année, le Parcours et les Crédits de référence
    MaquetteUE_id_fk = Column(String(50), ForeignKey('maquettes_ue.MaquetteUE_id'), nullable=False)
    
    SessionExamen_id_fk = Column(String(8), ForeignKey('sessions_examen.SessionExamen_id'), nullable=False)

    ResultatUE_moyenne = Column(Numeric(4, 2), nullable=False)
    ResultatUE_is_acquise = Column(Boolean, default=False, nullable=False)
    
    # On garde le crédit obtenu ici (stockage du résultat acquis), 
    # même si la valeur de référence (crédit total possible) est dans maquette_ue.MaquetteUE_credit
    ResultatUE_credit_obtenu = Column(Integer, default=0, nullable=False)

    etudiant = relationship("Etudiant", back_populates="resultats_ue")
    session = relationship("SessionExamen", back_populates="resultats_ue_session")
    
    # NOUVELLE RELATION
    maquette_ue = relationship("MaquetteUE", back_populates="resultats")

    # Note : On supprime les relations directes vers 'unite_enseignement' et 'annee_univ'
    # car elles sont accessibles via self.maquette_ue.ue_catalog et self.maquette_ue.annee


class Note(Base):
    __tablename__ = 'notes'
    __table_args__ = (
        UniqueConstraint(
            'Etudiant_id_fk', 'EC_id_fk', 'AnneeUniversitaire_id_fk', 'SessionExamen_id_fk',
            name='uq_etudiant_ec_annee_session'
        ),
        {'extend_existing': True}
    )

    Note_id = Column(String(50), primary_key=True)
    Etudiant_id_fk = Column(String(50), ForeignKey('etudiants.Etudiant_id'), nullable=False)
    EC_id_fk = Column(String(50), ForeignKey('elements_constitutifs_catalog.EC_id'), nullable=False)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), nullable=False)
    SessionExamen_id_fk = Column(String(8), ForeignKey('sessions_examen.SessionExamen_id'), nullable=False)

    Note_valeur = Column(Numeric(5, 2), nullable=False)

    etudiant = relationship("Etudiant", back_populates="notes_obtenues")
    element_constitutif = relationship("ElementConstitutif", back_populates="notes")
    annee_univ = relationship("AnneeUniversitaire", back_populates="notes_obtenues")
    session = relationship("SessionExamen", back_populates="notes_session")


class SuiviCreditCycle(Base):
    __tablename__ = 'suivi_credits_cycles'
    __table_args__ = (
        UniqueConstraint('Etudiant_id_fk', 'Cycle_id_fk', name='uq_etudiant_cycle_credit'),
        {'extend_existing': True}
    )

    SuiviCreditCycle_id = Column(String(50), primary_key=True)
    Etudiant_id_fk = Column(String(50), ForeignKey('etudiants.Etudiant_id'), nullable=False)
    Cycle_id_fk = Column(String(10), ForeignKey('cycles.Cycle_id'), nullable=False)

    SuiviCreditCycle_credit_total_acquis = Column(Integer, default=0, nullable=False)
    SuiviCreditCycle_is_cycle_valide = Column(Boolean, default=False)

    etudiant = relationship("Etudiant", back_populates="credits_cycles")
    cycle = relationship("Cycle", back_populates="suivi_credits")


# ===================================================================
# --- GESTION DES ENSEIGNANTS, VOLUMES ET ATTRIBUTIONS ---
# ===================================================================

class Enseignant(Base):
    __tablename__ = 'enseignants'
    __table_args__ = (
        UniqueConstraint('Enseignant_cin', name='uq_enseignant_cin', deferrable=True),
        {'extend_existing': True}
    )

    Enseignant_id = Column(String(50), primary_key=True)
    Enseignant_matricule = Column(String(50), unique=True, nullable=True)
    Enseignant_nom = Column(String(100), nullable=False)
    Enseignant_prenoms = Column(String(150))
    Enseignant_sexe = Column(String(20))
    Enseignant_date_naissance = Column(Date, nullable=True)
    Enseignant_grade = Column(String(50))
    Enseignant_statut = Column(
        String(10),
        CheckConstraint(""" "Enseignant_statut" IN ('PERM', 'VAC') """, name='check_statut_enseignant'),
        nullable=False
    )
    Composante_id_affectation_fk = Column(String(12), ForeignKey('composantes.Composante_id'), nullable=True)

    Enseignant_cin = Column(String(100))
    Enseignant_cin_date = Column(Date, nullable=True)
    Enseignant_cin_lieu = Column(String(100))
    Enseignant_telephone = Column(String(50))
    Enseignant_mail = Column(String(100))
    Enseignant_rib = Column(String(100))
    Enseignant_photo_profil_path = Column(String(255), nullable=True)
    Enseignant_scan_cin_path = Column(String(255), nullable=True)

    composante_attachement = relationship("Composante", back_populates="enseignants_permanents")
    # REMPLACÉ: charges_enseignement -> attributions
    attributions = relationship("AttributionEnseignant", back_populates="enseignant")
    presidences_jury = relationship("Jury", back_populates="enseignant_president")


class VolumeHoraire(Base):
    """Volume horaire THÉORIQUE défini pour un EC dans une Maquette"""
    __tablename__ = 'volumes_horaires'
    
    Volume_id = Column(String(50), primary_key=True)
    MaquetteEC_id_fk = Column(String(50), ForeignKey('maquettes_ec.MaquetteEC_id'), nullable=False)
    TypeEnseignement_id_fk = Column(String(10), ForeignKey('types_enseignement.TypeEnseignement_id'), nullable=False)
    Volume_heures = Column(Numeric(5, 2), nullable=False)

    maquette_ec = relationship("MaquetteEC", back_populates="volumes_horaires")


class AttributionEnseignant(Base):
    """REMPLACE Affectation et AffectationEC. 
    Lie un enseignant à un EC spécifique d'une maquette (donc une année/parcours) pour un type de cours (CM/TD).
    """
    __tablename__ = 'attributions_enseignant'

    Attribution_id = Column(String(50), primary_key=True)
    
    MaquetteEC_id_fk = Column(String(50), ForeignKey('maquettes_ec.MaquetteEC_id'), nullable=False)
    Enseignant_id_fk = Column(String(50), ForeignKey('enseignants.Enseignant_id'), nullable=False)
    TypeEnseignement_id_fk = Column(String(10), ForeignKey('types_enseignement.TypeEnseignement_id'), nullable=False)

    # Optionnel: Nombre d'heures attribuées à cet enseignant (si partage de cours)
    Attribution_heures = Column(Numeric(5, 2), nullable=True)

    maquette_ec = relationship("MaquetteEC", back_populates="attributions")
    enseignant = relationship("Enseignant", back_populates="attributions")
    type_enseignement = relationship("TypeEnseignement", back_populates="attributions")


class Jury(Base):
    """JURY D'EXAMEN"""
    __tablename__ = 'jurys'
    __table_args__ = (
        # Un jury est unique pour un Semestre, une Année ET une Session (ex: Session Normale S1 2024)
        UniqueConstraint('Semestre_id_fk', 'AnneeUniversitaire_id_fk', 'SessionExamen_id_fk', name='uq_jury_unique'),
        {'extend_existing': True}
    )

    Jury_id = Column(String(50), primary_key=True)
    Enseignant_id_fk = Column(String(50), ForeignKey('enseignants.Enseignant_id'), nullable=False)
    Semestre_id_fk = Column(String(10), ForeignKey('semestres.Semestre_id'), nullable=False)
    AnneeUniversitaire_id_fk = Column(String(9), ForeignKey('annees_universitaires.AnneeUniversitaire_id'), nullable=False)
    SessionExamen_id_fk = Column(String(8), ForeignKey('sessions_examen.SessionExamen_id'), nullable=False) # Ajouté

    Jury_date_nomination = Column(Date, nullable=True)

    enseignant_president = relationship("Enseignant", back_populates="presidences_jury")
    semestre_jury = relationship("Semestre")
    annee_univ_jury = relationship("AnneeUniversitaire")
    session_jury = relationship("SessionExamen")

    def __repr__(self):
        return (f"<Jury Semestre {self.Semestre_id_fk} (Annee: {self.AnneeUniversitaire_id_fk}, Session: {self.SessionExamen_id_fk}) "
                f"Président: {self.Enseignant_id_fk}>")