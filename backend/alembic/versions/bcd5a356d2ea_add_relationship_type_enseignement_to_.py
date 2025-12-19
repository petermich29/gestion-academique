"""add relationship type_enseignement to volumehoraire

Revision ID: bcd5a356d2ea
Revises: a4aae72abf37
Create Date: 2025-12-18 22:05:22.961115

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcd5a356d2ea'
down_revision: Union[str, Sequence[str], None] = 'a4aae72abf37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # On ajoute la colonne si elle n'existe pas
    # op.add_column('volumes_horaires', sa.Column('TypeEnseignement_id_fk', sa.String(length=10), nullable=False))
    
    # On crée la contrainte de clé étrangère
    op.create_foreign_key(
        'fk_volume_type_enseignement', # Nom de la contrainte
        'volumes_horaires',            # Table source
        'types_enseignement',          # Table cible
        ['TypeEnseignement_id_fk'],    # Colonne source
        ['TypeEnseignement_id']        # Colonne cible
    )

def downgrade() -> None:
    # Suppression de la contrainte en cas de retour en arrière
    op.drop_constraint('fk_volume_type_enseignement', 'volumes_horaires', type_='foreignkey')
    # op.drop_column('volumes_horaires', 'TypeEnseignement_id_fk')
