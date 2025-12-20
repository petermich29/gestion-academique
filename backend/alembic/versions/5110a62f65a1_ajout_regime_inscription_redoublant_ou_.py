"""ajout regime inscription: redoublant ou troplant

Revision ID: 5110a62f65a1
Revises: 3f9e0e41d99b
Create Date: 2025-12-20 19:26:34.261490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5110a62f65a1'
down_revision: Union[str, Sequence[str], None] = '3f9e0e41d99b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Ajouter la colonne avec une valeur par défaut
    op.add_column('inscriptions', sa.Column('Inscription_regime', sa.String(length=20), nullable=False, server_default='PASSANT'))
    
    # 2. Ajouter la contrainte Check
    op.create_check_constraint(
        'ck_inscription_regime',
        'inscriptions',
        "\"Inscription_regime\" IN ('PASSANT', 'REDOUBLANT', 'TRIPLAN', 'AUTRE')"
    )

def downgrade():
    op.drop_constraint('ck_inscription_regime', 'inscriptions', type_='check')
    op.drop_column('inscriptions', 'Inscription_regime')
