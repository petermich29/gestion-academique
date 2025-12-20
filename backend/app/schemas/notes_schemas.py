# app/schemas/notes_schemas.py
from typing import List, Optional, Dict
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
    prenoms: Optional[str]
    photo_url: Optional[str] = None
    
    # Clé = MaquetteEC_id, Valeur = Note (float)
    notes: Dict[str, Optional[float]] = {} 
    
    # Clé = MaquetteUE_id
    resultats_ue: Dict[str, ResultatUEData] = {}
    
    # Données globales semestre (issues de ResultatSemestre)
    moyenne_semestre: Optional[float] = None
    statut_semestre: Optional[str] = None # VAL, AJ, etc.
    credits_semestre: Optional[float] = None

class GrilleResponse(BaseModel):
    structure: GrilleStructure
    donnees: List[EtudiantGrilleRow]

# --- SAISIE (Mise à jour) ---
class NoteInput(BaseModel):
    etudiant_id: str       
    maquette_ec_id: str    
    session_id: str        
    valeur: Optional[float] # None si on efface la note
    
    # Contexte indispensable pour retrouver InscriptionSemestre
    annee_id: str
    semestre_id: str
    parcours_id: str