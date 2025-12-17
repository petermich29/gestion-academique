# app/routers/inscriptions_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc
from datetime import date
from typing import List, Optional

from app.database import get_db
from app.models import (
    DossierInscription, 
    Inscription, 
    InscriptionSemestre, 
    Etudiant,
    Semestre,
    Niveau,
    Parcours,
    Mention,
    AnneeUniversitaire,
    ModeInscription,
    Composante,     # <--- Ajouté
    Institution
)
from app.schemas.inscriptions_schemas import InscriptionCreatePayload, InscriptionResponse

router = APIRouter(prefix="/inscriptions", tags=["Dossiers d'Inscription"])

# ==============================================================================
# GET : Récupérer la liste des inscrits (Affichage Panneau Droite)
# ==============================================================================
@router.get("/")
def get_inscriptions_list(
    annee_id: str = Query(...),
    institution_id: Optional[str] = Query(None), # <--- Ajouté
    composante_id: Optional[str] = Query(None),  # <--- Ajouté
    mention_id: Optional[str] = Query(None),
    parcours_id: Optional[str] = Query(None),
    niveau_id: Optional[str] = Query(None),
    semestre_id: Optional[str] = Query(None),
    mode_inscription_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Inscription)

    # 1. Jointures de base
    query = query.join(Inscription.dossier_inscription)
    
    # 2. Jointures STRICTES pour la hiérarchie (si filtres demandés)
    # Inscription -> Dossier -> Mention -> Composante -> Institution
    if institution_id or composante_id or mention_id:
        query = query.join(DossierInscription.mention)
        
    if institution_id or composante_id:
        query = query.join(Mention.composante)
        
    if institution_id:
        query = query.join(Composante.institution)

    # 3. Chargement optimisé (Eager Loading)
    query = query.options(
        joinedload(Inscription.dossier_inscription).joinedload(DossierInscription.etudiant),
        joinedload(Inscription.niveau),
        joinedload(Inscription.parcours),
        joinedload(Inscription.mode_inscription),
        joinedload(Inscription.semestres).joinedload(InscriptionSemestre.semestre)
    )

    # 4. Application STRICTE des filtres
    query = query.filter(Inscription.AnneeUniversitaire_id_fk == annee_id)
    
    if institution_id:
        query = query.filter(Institution.Institution_id == institution_id)

    if composante_id:
        query = query.filter(Composante.Composante_id == composante_id)

    if mention_id:
        query = query.filter(DossierInscription.Mention_id_fk == mention_id)

    if parcours_id:
        query = query.filter(Inscription.Parcours_id_fk == parcours_id)
    
    if niveau_id:
        query = query.filter(Inscription.Niveau_id_fk == niveau_id)

    if mode_inscription_id:
        query = query.filter(Inscription.ModeInscription_id_fk == mode_inscription_id)

    if semestre_id:
        query = query.join(Inscription.semestres).filter(
            InscriptionSemestre.Semestre_id_fk == semestre_id
        )

    # 5. Tri et Résultat
    query = query.join(DossierInscription.etudiant).order_by(Etudiant.Etudiant_nom.asc())

    results = query.all()

    # ... (le reste de la fonction mapping response_data reste inchangé)
    response_data = []
    for insc in results:
        semestres_labels = [s.semestre.Semestre_numero for s in insc.semestres if s.semestre]
        semestre_str = ", ".join(semestres_labels) if semestres_labels else "—"

        dossier = insc.dossier_inscription
        etudiant = dossier.etudiant

        response_data.append({
            "id": insc.Inscription_id,
            "DossierInscription_id": dossier.DossierInscription_id,
            "matricule": dossier.DossierInscription_numero,
            "etudiant_nom": etudiant.Etudiant_nom,
            "etudiant_prenom": etudiant.Etudiant_prenoms,
            "niveau_label": insc.niveau.Niveau_label if insc.niveau else "",
            "parcours_label": insc.parcours.Parcours_label if insc.parcours else "",
            "mode_label": insc.mode_inscription.ModeInscription_label if insc.mode_inscription else "—",
            "semestre_label": semestre_str
        })

    return response_data


# ==============================================================================
# POST : Inscription en masse
# ==============================================================================
@router.post("/bulk", response_model=InscriptionResponse)
def create_bulk_dossiers(payload: InscriptionCreatePayload, db: Session = Depends(get_db)):
    
    # 1. Vérifications des dépendances clés
    mention = db.query(Mention).filter(Mention.Mention_id == payload.mention_id).first()
    annee = db.query(AnneeUniversitaire).filter(AnneeUniversitaire.AnneeUniversitaire_id == payload.annee_id).first()
    semestre = db.query(Semestre).filter(Semestre.Semestre_id == payload.semestre_id).first()

    if not mention or not annee:
        raise HTTPException(status_code=404, detail="Mention ou Année introuvable.")
    
    if not semestre:
        raise HTTPException(status_code=404, detail=f"Semestre introuvable (ID reçu: {payload.semestre_id})")
    
    # ✅ CORRECTION MODE INSCRIPTION (SÉCURITÉ)
    # ------------------------------------------------------------------------------------------------
    # Utiliser 'MODE_001' par défaut si le payload.mode_inscription_id est None ou vide.
    mode_inscription_id_final = payload.mode_inscription_id or 'MODE_001'
    
    # Vérification que le Mode d'Inscription existe bien en BDD
    mode = db.query(ModeInscription).filter(
        ModeInscription.ModeInscription_id == mode_inscription_id_final
    ).first()
    
    if not mode:
        # Erreur 404 si le mode requis (même le défaut) n'existe pas.
        raise HTTPException(
            status_code=404, 
            detail=f"Le mode d'inscription '{mode_inscription_id_final}' est introuvable. Veuillez vérifier la table 'modes_inscription'."
        )
    # ------------------------------------------------------------------------------------------------
    
    # 2. Génération ID Dossier (Séquence)
    annee_label = annee.AnneeUniversitaire_annee
    # Extrait les deux derniers chiffres de l'année de fin (ex: 2024-2025 -> 25)
    yy = annee_label.split("-")[-1][-2:] if annee_label and "-" in annee_label else annee_label[-2:]
    abbr = mention.Mention_abbreviation or mention.Mention_code or "UNK"
    prefix_numero = f"{yy}{abbr}_"

    last_dossier = db.query(DossierInscription).filter(
        DossierInscription.DossierInscription_numero.like(f"{prefix_numero}%")
    ).order_by(desc(DossierInscription.DossierInscription_numero)).first()

    current_sequence = 0
    if last_dossier and last_dossier.DossierInscription_numero:
        try:
            # Récupère la partie numérique de la séquence
            num_part = last_dossier.DossierInscription_numero.split("_")[-1]
            current_sequence = int(num_part)
        except ValueError:
            current_sequence = 0

    students_newly_registered = 0
    students_already_registered = 0

    try:
        for etu_id in payload.etudiants_ids:
            
            # --- A. GESTION DU DOSSIER (Administratif) ---
            # Un dossier est unique par Etudiant + Mention + Année
            dossier_id = f"{etu_id}_{payload.mention_id}_{payload.annee_id}"
            
            dossier = db.query(DossierInscription).filter(
                DossierInscription.DossierInscription_id == dossier_id
            ).first()

            if not dossier:
                # Création du dossier si inexistant
                current_sequence += 1
                numero_final = f"{prefix_numero}{str(current_sequence).zfill(5)}"
                
                dossier = DossierInscription(
                    DossierInscription_id=dossier_id,
                    Etudiant_id_fk=etu_id,
                    Mention_id_fk=payload.mention_id,
                    DossierInscription_numero=numero_final,
                    DossierInscription_date_creation=date.today()
                )
                db.add(dossier)
                db.flush() # Pour avoir l'ID disponible tout de suite

            # --- B. GESTION DE L'INSCRIPTION (Pédagogique) ---
            # Une inscription est unique par Dossier + Année + Parcours + Niveau
            inscription_id = f"{dossier_id}_{payload.parcours_id}_{payload.niveau_id}"
            
            inscription = db.query(Inscription).filter(
                Inscription.Inscription_id == inscription_id
            ).first()

            if not inscription:
                inscription = Inscription(
                    Inscription_id=inscription_id,
                    DossierInscription_id_fk=dossier.DossierInscription_id,
                    AnneeUniversitaire_id_fk=payload.annee_id,
                    Parcours_id_fk=payload.parcours_id,
                    Niveau_id_fk=payload.niveau_id,
                    # ✅ Utilisation de l'ID mode d'inscription sécurisé
                    ModeInscription_id_fk=mode_inscription_id_final,
                    Inscription_date=date.today()
                )
                db.add(inscription)
                db.flush()
                students_newly_registered += 1
            else:
                students_already_registered += 1

            # --- C. GESTION DES SEMESTRES (Détail) ---
            # On ajoute le semestre s'il n'est pas déjà lié à cette inscription
            sem_link_id = f"{inscription.Inscription_id}_{payload.semestre_id}"
            existing_sem = db.query(InscriptionSemestre).filter(
                InscriptionSemestre.InscriptionSemestre_id == sem_link_id
            ).first()

            if not existing_sem:
                new_sem_link = InscriptionSemestre(
                    InscriptionSemestre_id=sem_link_id,
                    Inscription_id_fk=inscription.Inscription_id,
                    Semestre_id_fk=payload.semestre_id,
                    InscriptionSemestre_statut='INSCRIT'
                )
                db.add(new_sem_link)

        db.commit()
        
        return {
            "success": True, 
            "message": "Inscriptions traitées", 
            "inscrits_count": students_newly_registered,
            "deja_inscrits_count": students_already_registered
        }

    except Exception as e:
        db.rollback()
        print(f"Erreur SQL: {str(e)}") # Log serveur pour debug
        # Renvoyer l'erreur exacte pour faciliter le debug en frontend
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/structure/semestres/{niveau_id}")
def get_semestres_by_niveau(niveau_id: str, db: Session = Depends(get_db)):
    """
    Renvoie la liste des semestres liés à un Niveau donné.
    Utilise la table Semestre et filtre par Niveau_id_fk.
    """
    # 1. Requête pour trouver tous les semestres associés au Niveau
    semestres = db.query(Semestre).filter(
        Semestre.Niveau_id_fk == niveau_id
    ).order_by(Semestre.Semestre_numero.asc()).all()

    # 2. Formatage des données pour le Frontend (respecte le format attendu: id, label)
    return [
        {"id": s.Semestre_id, "label": f"Semestre {s.Semestre_numero}"} 
        for s in semestres
    ]