"""refonte_responsabilites_jury

Revision ID: f2278e327772
Revises: 5110a62f65a1
Create Date: 2025-12-24 20:41:48.045511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'f2278e327772'
down_revision: Union[str, Sequence[str], None] = '5110a62f65a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # On récupère la connexion pour inspecter la base de données
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Suppression de l'ancienne table Jury (si elle existe)
    if 'jurys' in existing_tables:
        op.drop_table('jurys')

    # 2. Création des tables de responsabilités (SEULEMENT SI ELLES N'EXISTENT PAS)
    if 'responsables_institution' not in existing_tables:
        op.create_table(
            'responsables_institution',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('Institution_id_fk', sa.String(length=10), nullable=False),
            sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
            sa.Column('Date_debut', sa.Date(), nullable=False),
            sa.Column('Date_fin', sa.Date(), nullable=True),
            sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], ),
            sa.ForeignKeyConstraint(['Institution_id_fk'], ['institutions.Institution_id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('Institution_id_fk', 'Date_debut', name='uq_resp_inst_date')
        )

    if 'responsables_composante' not in existing_tables:
        op.create_table(
            'responsables_composante',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('Composante_id_fk', sa.String(length=12), nullable=False),
            sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
            sa.Column('Date_debut', sa.Date(), nullable=False),
            sa.Column('Date_fin', sa.Date(), nullable=True),
            sa.ForeignKeyConstraint(['Composante_id_fk'], ['composantes.Composante_id'], ),
            sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('Composante_id_fk', 'Date_debut', name='uq_resp_comp_date')
        )

    if 'responsables_mention' not in existing_tables:
        op.create_table(
            'responsables_mention',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('Mention_id_fk', sa.String(length=12), nullable=False),
            sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
            sa.Column('Date_debut', sa.Date(), nullable=False),
            sa.Column('Date_fin', sa.Date(), nullable=True),
            sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], ),
            sa.ForeignKeyConstraint(['Mention_id_fk'], ['mentions.Mention_id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('Mention_id_fk', 'Date_debut', name='uq_resp_mention_date')
        )

    if 'responsables_parcours' not in existing_tables:
        op.create_table(
            'responsables_parcours',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('Parcours_id_fk', sa.String(length=15), nullable=False),
            sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
            sa.Column('Date_debut', sa.Date(), nullable=False),
            sa.Column('Date_fin', sa.Date(), nullable=True),
            sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], ),
            sa.ForeignKeyConstraint(['Parcours_id_fk'], ['parcours.Parcours_id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('Parcours_id_fk', 'Date_debut', name='uq_resp_parc_date')
        )

    # 3. Création de la nouvelle table PresidentJury (si elle n'existe pas)
    if 'presidents_jury' not in existing_tables:
        op.create_table(
            'presidents_jury',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
            sa.Column('Parcours_id_fk', sa.String(length=15), nullable=False),
            sa.Column('Semestre_id_fk', sa.String(length=10), nullable=False),
            sa.Column('AnneeUniversitaire_id_fk', sa.String(length=9), nullable=False),
            sa.Column('Date_nomination', sa.Date(), nullable=True),
            sa.ForeignKeyConstraint(['AnneeUniversitaire_id_fk'], ['annees_universitaires.AnneeUniversitaire_id'], ),
            sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], ),
            sa.ForeignKeyConstraint(['Parcours_id_fk'], ['parcours.Parcours_id'], ),
            sa.ForeignKeyConstraint(['Semestre_id_fk'], ['semestres.Semestre_id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('Parcours_id_fk', 'Semestre_id_fk', 'AnneeUniversitaire_id_fk', name='uq_president_jury_unique')
        )

    # 4. Ajout de la colonne responsable sur MaquetteUE (Vérification de la colonne)
    # On vérifie si la colonne existe déjà pour éviter une erreur
    columns_maquette = [c['name'] for c in inspector.get_columns('maquettes_ue')]
    if 'Responsable_Enseignant_id_fk' not in columns_maquette:
        op.add_column('maquettes_ue', sa.Column('Responsable_Enseignant_id_fk', sa.String(length=50), nullable=True))
        op.create_foreign_key('fk_maquette_ue_responsable', 'maquettes_ue', 'enseignants', ['Responsable_Enseignant_id_fk'], ['Enseignant_id'])


def downgrade() -> None:
    # 1. Suppression de la colonne responsable UE
    op.drop_constraint('fk_maquette_ue_responsable', 'maquettes_ue', type_='foreignkey')
    op.drop_column('maquettes_ue', 'Responsable_Enseignant_id_fk')

    # 2. Suppression de la table PresidentJury
    op.drop_table('presidents_jury')

    # 3. Suppression des tables de responsabilités
    op.drop_table('responsables_parcours')
    op.drop_table('responsables_mention')
    op.drop_table('responsables_composante')
    op.drop_table('responsables_institution')

    # 4. Restauration de l'ancienne table Jury (Optionnel mais recommandé pour un downgrade propre)
    op.create_table(
        'jurys',
        sa.Column('Jury_id', sa.String(length=50), nullable=False),
        sa.Column('Enseignant_id_fk', sa.String(length=50), nullable=False),
        sa.Column('Semestre_id_fk', sa.String(length=10), nullable=False),
        sa.Column('AnneeUniversitaire_id_fk', sa.String(length=9), nullable=False),
        sa.Column('SessionExamen_id_fk', sa.String(length=8), nullable=False),
        sa.Column('Jury_date_nomination', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['AnneeUniversitaire_id_fk'], ['annees_universitaires.AnneeUniversitaire_id'], name='jurys_AnneeUniversitaire_id_fk_fkey'),
        sa.ForeignKeyConstraint(['Enseignant_id_fk'], ['enseignants.Enseignant_id'], name='jurys_Enseignant_id_fk_fkey'),
        sa.ForeignKeyConstraint(['Semestre_id_fk'], ['semestres.Semestre_id'], name='jurys_Semestre_id_fk_fkey'),
        sa.ForeignKeyConstraint(['SessionExamen_id_fk'], ['sessions_examen.SessionExamen_id'], name='jurys_SessionExamen_id_fk_fkey'),
        sa.PrimaryKeyConstraint('Jury_id'),
        sa.UniqueConstraint('Semestre_id_fk', 'AnneeUniversitaire_id_fk', 'SessionExamen_id_fk', name='uq_jury_unique')
    )