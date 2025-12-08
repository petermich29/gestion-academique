"""change coefficient type

Revision ID: e1d8b5540d14
Revises: 
Create Date: 2025-12-08 11:19:46.676126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1d8b5540d14'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column(
        'maquettes_ec',
        'MaquetteEC_coefficient',
        existing_type=sa.Integer(),
        type_=sa.Numeric(4, 2),
        existing_nullable=False,
        server_default='1.00'
    )


def downgrade():
    op.alter_column(
        'maquettes_ec',
        'MaquetteEC_coefficient',
        existing_type=sa.Numeric(4, 2),
        type_=sa.Integer(),
        existing_nullable=False,
        server_default='1'
    )
