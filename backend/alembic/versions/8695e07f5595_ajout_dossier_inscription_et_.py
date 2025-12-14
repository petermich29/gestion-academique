"""Ajout dossier inscription et inscription par niveau

Revision ID: 8695e07f5595
Revises: e1d8b5540d14
Create Date: 2025-12-14 06:51:50.006978

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8695e07f5595'
down_revision: Union[str, Sequence[str], None] = 'e1d8b5540d14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1️⃣ DOSSIER INSCRIPTION
    op.create_table(
        'dossiers_inscription',
        sa.Column('DossierInscription_id', sa.String(50), primary_key=True),
        sa.Column('DossierInscription_numero', sa.String(50), nullable=False),
        sa.Column('Etudiant_id_fk', sa.String(50), nullable=False),
        sa.Column('Mention_id_fk', sa.String(12), nullable=False),
        sa.Column('DossierInscription_date_creation', sa.Date(), nullable=False),

        sa.ForeignKeyConstraint(['Etudiant_id_fk'], ['etudiants.Etudiant_id']),
        sa.ForeignKeyConstraint(['Mention_id_fk'], ['mentions.Mention_id']),

        sa.UniqueConstraint(
            'Etudiant_id_fk',
            'Mention_id_fk',
            name='uq_etudiant_mention_dossier'
        ),
        sa.UniqueConstraint(
            'DossierInscription_numero',
            name='uq_dossier_numero'
        )
    )

    # 2️⃣ INSCRIPTION SEMESTRE
    op.create_table(
        'inscriptions_semestres',
        sa.Column('InscriptionSemestre_id', sa.String(50), primary_key=True),
        sa.Column('Inscription_id_fk', sa.String(50), nullable=False),
        sa.Column('Semestre_id_fk', sa.String(10), nullable=False),
        sa.Column('InscriptionSemestre_statut', sa.String(10), nullable=False),

        sa.ForeignKeyConstraint(['Inscription_id_fk'], ['inscriptions.Inscription_id']),
        sa.ForeignKeyConstraint(['Semestre_id_fk'], ['semestres.Semestre_id']),

        sa.UniqueConstraint(
            'Inscription_id_fk',
            'Semestre_id_fk',
            name='uq_inscription_semestre'
        )
    )

    # 3️⃣ MODIFICATION INSCRIPTION
    op.add_column(
        'inscriptions',
        sa.Column('DossierInscription_id_fk', sa.String(50), nullable=True)
    )
    op.add_column(
        'inscriptions',
        sa.Column('Niveau_id_fk', sa.String(10), nullable=True)
    )

    op.create_foreign_key(
        'fk_inscription_dossier',
        'inscriptions',
        'dossiers_inscription',
        ['DossierInscription_id_fk'],
        ['DossierInscription_id']
    )

    op.create_foreign_key(
        'fk_inscription_niveau',
        'inscriptions',
        'niveaux',
        ['Niveau_id_fk'],
        ['Niveau_id']
    )

    # 4️⃣ SUPPRESSION DES CHAMPS OBSOLÈTES
    op.drop_constraint('uq_etudiant_annee_parcours_semestre', 'inscriptions', type_='unique')
    op.drop_column('inscriptions', 'Semestre_id_fk')
    op.drop_column('inscriptions', 'Inscription_credit_acquis_semestre')
    op.drop_column('inscriptions', 'Inscription_is_semestre_valide')

    # 5️⃣ SUPPRESSION DU NUMÉRO DANS ETUDIANT
    op.drop_column('etudiants', 'Etudiant_numero_inscription')


def downgrade():
    op.add_column(
        'etudiants',
        sa.Column('Etudiant_numero_inscription', sa.String(100))
    )

    op.add_column(
        'inscriptions',
        sa.Column('Semestre_id_fk', sa.String(10))
    )
    op.add_column(
        'inscriptions',
        sa.Column('Inscription_credit_acquis_semestre', sa.Integer())
    )
    op.add_column(
        'inscriptions',
        sa.Column('Inscription_is_semestre_valide', sa.Boolean())
    )

    op.drop_constraint('fk_inscription_dossier', 'inscriptions', type_='foreignkey')
    op.drop_constraint('fk_inscription_niveau', 'inscriptions', type_='foreignkey')

    op.drop_column('inscriptions', 'DossierInscription_id_fk')
    op.drop_column('inscriptions', 'Niveau_id_fk')

    op.drop_table('inscriptions_semestres')
    op.drop_table('dossiers_inscription')
