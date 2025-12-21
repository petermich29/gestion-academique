# app/schemas/notes_schemas.py
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- STRUCTURE DE LA GRILLE (COLONNES) ---
class ColonneEC(BaseModel):
    id_ec: str = Field(..., alias="id")
    code: str
    intitule: str
    coefficient: float

class ColonneUE(BaseModel):
    id_ue: str = Field(..., alias="id")
    code: str
    intitule: str
    credit: float
    ecs: List[ColonneEC] = []

class GrilleStructure(BaseModel):
    semestre_id: str
    ues: List[ColonneUE]

# --- DONNÉES ÉTUDIANTS (LIGNES) ---

class ResultatUEData(BaseModel):
    moyenne: Optional[float] = None
    valide: bool = False
    credits: float = 0.0

class EtudiantGrilleRow(BaseModel):
    etudiant_id: str
    nom: str
    prenoms: Optional[str] = None
    matricule: Optional[str] = "N/A"
    photo_url: Optional[str] = None
    
    # Structure : { "EC_ID": { "SESS_1": 12.5, "SESS_2": 14.0 } }
    notes: Dict[str, Dict[str, Optional[float]]] = {} 
    
    # Structure : { "UE_ID": { "SESS_1": {data} } }
    resultats_ue: Dict[str, Dict[str, ResultatUEData]] = {}
    
    # Structure : { "SESS_1": 11.5, "SESS_2": 13.0 }
    moyennes_semestre: Dict[str, Optional[float]] = {}
    resultats_semestre: Dict[str, Optional[str]] = {} 
    credits_semestre: Dict[str, Optional[float]] = {}

    class Config:
        populate_by_name = True
        from_attributes = True

class GrilleResponse(BaseModel):
    structure: GrilleStructure
    donnees: List[EtudiantGrilleRow]

# --- INPUT POUR LA SAISIE ---
# CORRIGÉ POUR CORRESPONDRE AU FRONTEND ET À LA ROUTE
class NoteInput(BaseModel):
    etudiant_id: str
    maquette_ec_id: str          # Renommé de 'ec_id' vers 'maquette_ec_id' pour matcher le frontend
    valeur: Optional[float] = None # Renommé de 'note' vers 'valeur' pour matcher le frontend
    session_id: str
    semestre_id: str
    annee_id: str                # Ajouté car utilisé dans notes_routes.py
    parcours_id: str             # Ajouté car utilisé dans notes_routes.py