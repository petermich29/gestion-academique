"""Creation des tables de doublons

Revision ID: 095c9863223c
Revises: ef3d6cf517ac
Create Date: 2025-12-25 14:18:58.692843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '095c9863223c'
down_revision: Union[str, Sequence[str], None] = 'ef3d6cf517ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Création de la table des groupes
    op.create_table(
        'groupes_doublons',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('signature', sa.String(length=500), nullable=False),
        sa.Column('statut', sa.String(length=20), nullable=False, server_default='DETECTE'), # DETECTE, SURVEILLANCE, IGNORE, TRAITE
        sa.Column('date_detection', sa.Date(), nullable=False),
        sa.Column('score_moyen', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_groupes_doublons_signature'), 'groupes_doublons', ['signature'], unique=True)
    op.create_index(op.f('ix_groupes_doublons_statut'), 'groupes_doublons', ['statut'], unique=False)

    # 2. Création de la table des membres (liaison étudiants)
    op.create_table(
        'membres_doublons',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('groupe_id', sa.Integer(), nullable=False),
        sa.Column('etudiant_id', sa.String(length=50), nullable=False),
        sa.Column('raison', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['etudiant_id'], ['etudiants.Etudiant_id'], ),
        sa.ForeignKeyConstraint(['groupe_id'], ['groupes_doublons.id'], ondelete='CASCADE'), # Si on supprime le groupe, on vire les membres
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('groupe_id', 'etudiant_id', name='uq_groupe_etudiant')
    )

    # 3. Suppression de l'ancienne table si elle existe (Nettoyage)
    # Utilisez try/except ou checkez l'existence si vous n'êtes pas sûr
    try:
        op.drop_table('doublons_non_averes')
    except:
        pass

def downgrade():
    op.drop_table('membres_doublons')
    op.drop_index(op.f('ix_groupes_doublons_statut'), table_name='groupes_doublons')
    op.drop_index(op.f('ix_groupes_doublons_signature'), table_name='groupes_doublons')
    op.drop_table('groupes_doublons')
    
    # Recréation théorique de l'ancienne table (simplifié)
    op.create_table(
        'doublons_non_averes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('signature_groupe', sa.String(500), unique=True)
    )