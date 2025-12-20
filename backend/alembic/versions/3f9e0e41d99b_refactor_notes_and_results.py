"""refactor_notes_and_results

Revision ID: 3f9e0e41d99b
Revises: bcd5a356d2ea
Create Date: 2025-12-20 19:14:36.858792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f9e0e41d99b'
down_revision: Union[str, Sequence[str], None] = 'bcd5a356d2ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # =========================================================
    # 1. TABLE NOTES
    # =========================================================
    # On retire les contraintes et clés étrangères obsolètes
    try:
        op.drop_constraint('uq_etudiant_ec_annee_session', 'notes', type_='unique')
    except:
        pass # Au cas où la contrainte n'existe pas ou porte un autre nom

    op.drop_constraint('notes_Etudiant_id_fk_fkey', 'notes', type_='foreignkey')
    op.drop_constraint('notes_EC_id_fk_fkey', 'notes', type_='foreignkey')
    op.drop_constraint('notes_AnneeUniversitaire_id_fk_fkey', 'notes', type_='foreignkey')

    # On supprime les colonnes qui ne sont plus nécessaires car portées par InscriptionSemestre ou MaquetteEC
    op.drop_column('notes', 'Etudiant_id_fk')
    op.drop_column('notes', 'EC_id_fk')
    op.drop_column('notes', 'AnneeUniversitaire_id_fk')

    # On ajoute les nouvelles colonnes structurelles
    op.add_column('notes', sa.Column('InscriptionSemestre_id_fk', sa.String(length=120), nullable=False))
    op.add_column('notes', sa.Column('MaquetteEC_id_fk', sa.String(length=50), nullable=False))

    # On crée les nouvelles clés étrangères
    op.create_foreign_key(None, 'notes', 'inscriptions_semestres', ['InscriptionSemestre_id_fk'], ['InscriptionSemestre_id'])
    op.create_foreign_key(None, 'notes', 'maquettes_ec', ['MaquetteEC_id_fk'], ['MaquetteEC_id'])

    # Nouvelle contrainte d'unicité (Une note par inscription, par EC de maquette et par session)
    op.create_unique_constraint(
        'uq_note_inscription_maquette_session', 
        'notes', 
        ['InscriptionSemestre_id_fk', 'MaquetteEC_id_fk', 'SessionExamen_id_fk']
    )

    # =========================================================
    # 2. TABLE RESULTATS_UE
    # =========================================================
    try:
        op.drop_constraint('uq_resultat_maquette_session', 'resultats_ue', type_='unique')
    except:
        pass

    op.drop_constraint('resultats_ue_Etudiant_id_fk_fkey', 'resultats_ue', type_='foreignkey')
    op.drop_column('resultats_ue', 'Etudiant_id_fk')

    # Ajout du lien vers InscriptionSemestre
    op.add_column('resultats_ue', sa.Column('InscriptionSemestre_id_fk', sa.String(length=120), nullable=False))
    op.create_foreign_key(None, 'resultats_ue', 'inscriptions_semestres', ['InscriptionSemestre_id_fk'], ['InscriptionSemestre_id'])

    # Nouvelle contrainte d'unicité
    op.create_unique_constraint(
        'uq_resultat_ue_inscription_session',
        'resultats_ue',
        ['InscriptionSemestre_id_fk', 'MaquetteUE_id_fk', 'SessionExamen_id_fk']
    )

    # =========================================================
    # 3. TABLE RESULTATS_SEMESTRE
    # =========================================================
    try:
        op.drop_constraint('uq_resultat_semestre_session', 'resultats_semestre', type_='unique')
    except:
        pass

    # Nettoyage des FKs redondantes (Semestre, Annee, Etudiant sont tous dans InscriptionSemestre)
    op.drop_constraint('resultats_semestre_Etudiant_id_fk_fkey', 'resultats_semestre', type_='foreignkey')
    op.drop_constraint('resultats_semestre_Semestre_id_fk_fkey', 'resultats_semestre', type_='foreignkey')
    op.drop_constraint('resultats_semestre_AnneeUniversitaire_id_fk_fkey', 'resultats_semestre', type_='foreignkey')

    op.drop_column('resultats_semestre', 'Etudiant_id_fk')
    op.drop_column('resultats_semestre', 'Semestre_id_fk')
    op.drop_column('resultats_semestre', 'AnneeUniversitaire_id_fk')

    # Ajout FK InscriptionSemestre
    op.add_column('resultats_semestre', sa.Column('InscriptionSemestre_id_fk', sa.String(length=120), nullable=False))
    op.create_foreign_key(None, 'resultats_semestre', 'inscriptions_semestres', ['InscriptionSemestre_id_fk'], ['InscriptionSemestre_id'])

    # Nouvelle contrainte d'unicité
    op.create_unique_constraint(
        'uq_resultat_semestre_inscription_session',
        'resultats_semestre',
        ['InscriptionSemestre_id_fk', 'SessionExamen_id_fk']
    )


def downgrade():
    # =========================================================
    # ROLLBACK (Inverse des opérations)
    # =========================================================
    
    # --- Reverse Resultats Semestre ---
    op.drop_constraint('uq_resultat_semestre_inscription_session', 'resultats_semestre', type_='unique')
    op.drop_constraint(None, 'resultats_semestre', type_='foreignkey')
    op.drop_column('resultats_semestre', 'InscriptionSemestre_id_fk')

    op.add_column('resultats_semestre', sa.Column('AnneeUniversitaire_id_fk', sa.VARCHAR(9), nullable=False))
    op.add_column('resultats_semestre', sa.Column('Semestre_id_fk', sa.VARCHAR(10), nullable=False))
    op.add_column('resultats_semestre', sa.Column('Etudiant_id_fk', sa.VARCHAR(50), nullable=False))
    
    op.create_foreign_key('resultats_semestre_AnneeUniversitaire_id_fk_fkey', 'resultats_semestre', 'annees_universitaires', ['AnneeUniversitaire_id_fk'], ['AnneeUniversitaire_id'])
    op.create_foreign_key('resultats_semestre_Semestre_id_fk_fkey', 'resultats_semestre', 'semestres', ['Semestre_id_fk'], ['Semestre_id'])
    op.create_foreign_key('resultats_semestre_Etudiant_id_fk_fkey', 'resultats_semestre', 'etudiants', ['Etudiant_id_fk'], ['Etudiant_id'])

    # --- Reverse Resultats UE ---
    op.drop_constraint('uq_resultat_ue_inscription_session', 'resultats_ue', type_='unique')
    op.drop_constraint(None, 'resultats_ue', type_='foreignkey')
    op.drop_column('resultats_ue', 'InscriptionSemestre_id_fk')
    
    op.add_column('resultats_ue', sa.Column('Etudiant_id_fk', sa.VARCHAR(50), nullable=False))
    op.create_foreign_key('resultats_ue_Etudiant_id_fk_fkey', 'resultats_ue', 'etudiants', ['Etudiant_id_fk'], ['Etudiant_id'])

    # --- Reverse Notes ---
    op.drop_constraint('uq_note_inscription_maquette_session', 'notes', type_='unique')
    op.drop_constraint(None, 'notes', type_='foreignkey')
    op.drop_constraint(None, 'notes', type_='foreignkey')
    op.drop_column('notes', 'MaquetteEC_id_fk')
    op.drop_column('notes', 'InscriptionSemestre_id_fk')

    op.add_column('notes', sa.Column('AnneeUniversitaire_id_fk', sa.VARCHAR(9), nullable=False))
    op.add_column('notes', sa.Column('EC_id_fk', sa.VARCHAR(50), nullable=False))
    op.add_column('notes', sa.Column('Etudiant_id_fk', sa.VARCHAR(50), nullable=False))

    op.create_foreign_key('notes_AnneeUniversitaire_id_fk_fkey', 'notes', 'annees_universitaires', ['AnneeUniversitaire_id_fk'], ['AnneeUniversitaire_id'])
    op.create_foreign_key('notes_EC_id_fk_fkey', 'notes', 'elements_constitutifs_catalog', ['EC_id_fk'], ['EC_id'])
    op.create_foreign_key('notes_Etudiant_id_fk_fkey', 'notes', 'etudiants', ['Etudiant_id_fk'], ['Etudiant_id'])
