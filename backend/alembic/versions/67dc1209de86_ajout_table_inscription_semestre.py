"""Ajout table inscription semestre

Revision ID: 67dc1209de86
Revises: 8695e07f5595
Create Date: 2025-12-14 07:01:31.134192

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67dc1209de86'
down_revision: Union[str, Sequence[str], None] = '8695e07f5595'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        'inscriptions_semestres',
        sa.Column('InscriptionSemestre_id', sa.String(50), primary_key=True),
        sa.Column('Inscription_id_fk', sa.String(50), nullable=False),
        sa.Column('Semestre_id_fk', sa.String(10), nullable=False),
        sa.Column('InscriptionSemestre_statut', sa.String(10), nullable=False),

        sa.ForeignKeyConstraint(
            ['Inscription_id_fk'],
            ['inscriptions.Inscription_id'],
            name='fk_insc_sem_inscription'
        ),
        sa.ForeignKeyConstraint(
            ['Semestre_id_fk'],
            ['semestres.Semestre_id'],
            name='fk_insc_sem_semestre'
        ),

        sa.UniqueConstraint(
            'Inscription_id_fk',
            'Semestre_id_fk',
            name='uq_inscription_semestre'
        )
    )




def downgrade():
    op.drop_table('inscriptions_semestres')
