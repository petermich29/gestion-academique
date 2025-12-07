from pydantic import ConfigDict, BaseModel

# Configuration globale pour :
# 1. Lire les objets SQLAlchemy (from_attributes=True)
# 2. Accepter les noms de champs API ou DB (populate_by_name=True)
base_config = ConfigDict(from_attributes=True, populate_by_name=True)

class BaseSchema(BaseModel):
    model_config = base_config