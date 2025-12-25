"""Add table for ignored duplicates

Revision ID: ef3d6cf517ac
Revises: f2278e327772
Create Date: 2025-12-25 07:09:37.730144

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef3d6cf517ac'
down_revision: Union[str, Sequence[str], None] = 'f2278e327772'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Création de la table doublons_non_averes
    op.create_table(
        'doublons_non_averes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('signature', sa.String(length=500), nullable=False),
        sa.Column('date_ignore', sa.Date(), nullable=True),
        sa.Column('utilisateur', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    # Création de l'index unique sur la signature pour éviter les doublons d'ignoration
    op.create_index(op.f('ix_doublons_non_averes_signature'), 'doublons_non_averes', ['signature'], unique=True)

def downgrade():
    op.drop_index(op.f('ix_doublons_non_averes_signature'), table_name='doublons_non_averes')
    op.drop_table('doublons_non_averes')
    # ### end Alembic commands ###
