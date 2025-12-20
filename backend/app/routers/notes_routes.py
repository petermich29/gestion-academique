# app/routers/notes_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid

from app.database import get_db
from app import models
from app.schemas import notes_schemas

# Assurez-vous que ce prefix est bien utilisé dans main.py
# app.include_router(notes_routes.router, prefix="/api") 
router = APIRouter(prefix="/notes", tags=["Gestion des Notes"])

@router.get("/grille", response_model=notes_schemas.GrilleResponse)
def get_grille_notes(
    annee_id: str,
    parcours_id: str,
    semestre_id: str,
    session_id: str, 
    db: Session = Depends(get_db)
):
    # ---------------------------------------------------------
    # 1. RÉCUPÉRATION DE LA STRUCTURE (UEs > ECs)
    # ---------------------------------------------------------
    maquettes_ues = db.query(models.MaquetteUE).filter(
        models.MaquetteUE.Parcours_id_fk == parcours_id,
        models.MaquetteUE.Semestre_id_fk == semestre_id,
        models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
    ).options(
        joinedload(models.MaquetteUE.ue_catalog),
        joinedload(models.MaquetteUE.maquette_ecs).joinedload(models.MaquetteEC.ec_catalog)
    ).order_by(models.MaquetteUE.MaquetteUE_id).all()

    structure_ues = []
    for mue in maquettes_ues:
        ecs_list = []
        # Tri des ECs par code pour l'affichage
        sorted_ecs = sorted(mue.maquette_ecs, key=lambda x: x.ec_catalog.EC_code if x.ec_catalog else "")
        
        for mec in sorted_ecs:
            ecs_list.append(notes_schemas.ColonneEC(
                id=mec.MaquetteEC_id,
                code=mec.ec_catalog.EC_code,
                intitule=mec.ec_catalog.EC_intitule,
                coefficient=float(mec.MaquetteEC_coefficient)
            ))
            
        structure_ues.append(notes_schemas.ColonneUE(
            id=mue.MaquetteUE_id,
            code=mue.ue_catalog.UE_code,
            intitule=mue.ue_catalog.UE_intitule,
            credit=float(mue.MaquetteUE_credit),
            ecs=ecs_list
        ))

    # ---------------------------------------------------------
    # 2. RÉCUPÉRATION DES DONNÉES ÉTUDIANTS ET RÉSULTATS
    # ---------------------------------------------------------
    inscriptions = db.query(models.Inscription).join(models.InscriptionSemestre).filter(
        models.Inscription.AnneeUniversitaire_id_fk == annee_id,
        models.Inscription.Parcours_id_fk == parcours_id,
        models.InscriptionSemestre.Semestre_id_fk == semestre_id
    ).options(
        joinedload(models.Inscription.dossier_inscription).joinedload(models.DossierInscription.etudiant),
        # On charge tout, le filtrage session se fera en Python pour éviter des jointures complexes
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.notes),
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.resultats_ue),
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.resultats_semestre)
    ).all()

    lignes_etudiants = []
    
    for insc in inscriptions:
        etudiant = insc.dossier_inscription.etudiant
        
        # Trouver l'objet InscriptionSemestre correspondant au semestre demandé
        insc_sem = next((s for s in insc.semestres if s.Semestre_id_fk == semestre_id), None)
        
        if not insc_sem:
            continue

        # A. Mapping des Notes (Filtrage par Session)
        notes_map = {}
        for note in insc_sem.notes:
            if note.SessionExamen_id_fk == session_id:
                # Conversion Numeric -> float
                val = float(note.Note_valeur) if note.Note_valeur is not None else None
                notes_map[note.MaquetteEC_id_fk] = val

        # B. Mapping des Résultats UE (Filtrage par Session)
        res_ue_map = {}
        for res in insc_sem.resultats_ue:
             if res.SessionExamen_id_fk == session_id:
                 res_ue_map[res.MaquetteUE_id_fk] = notes_schemas.ResultatUEData(
                     moyenne=float(res.ResultatUE_moyenne) if res.ResultatUE_moyenne is not None else None,
                     valide=res.ResultatUE_is_acquise,
                     credits=float(res.ResultatUE_credit_obtenu) if res.ResultatUE_credit_obtenu else 0.0
                 )

        # C. Mapping du Résultat Semestre (La correction de l'erreur 500 est ici)
        # On cherche dans la liste 'resultats_semestre' celui qui correspond à la session
        res_sem_obj = next((r for r in insc_sem.resultats_semestre if r.SessionExamen_id_fk == session_id), None)
        
        moyenne_gen = None
        statut_gen = None
        credits_gen = None

        if res_sem_obj:
            if res_sem_obj.ResultatSemestre_moyenne_obtenue is not None:
                moyenne_gen = float(res_sem_obj.ResultatSemestre_moyenne_obtenue)
            statut_gen = res_sem_obj.ResultatSemestre_statut_validation
            if res_sem_obj.ResultatSemestre_credits_acquis is not None:
                credits_gen = float(res_sem_obj.ResultatSemestre_credits_acquis)

        lignes_etudiants.append(notes_schemas.EtudiantGrilleRow(
            etudiant_id=etudiant.Etudiant_id,
            nom=etudiant.Etudiant_nom,
            prenoms=etudiant.Etudiant_prenoms,
            photo_url=etudiant.Etudiant_photo_profil_path,
            notes=notes_map,
            resultats_ue=res_ue_map,
            moyenne_semestre=moyenne_gen,
            statut_semestre=statut_gen,
            credits_semestre=credits_gen
        ))

    # Tri alphabétique
    lignes_etudiants.sort(key=lambda x: x.nom)

    return notes_schemas.GrilleResponse(
        structure=notes_schemas.GrilleStructure(semestre_id=semestre_id, ues=structure_ues),
        donnees=lignes_etudiants
    )

@router.post("/saisie")
def save_note(payload: notes_schemas.NoteInput, db: Session = Depends(get_db)):
    """Enregistre ou met à jour une note."""
    
    # 1. Retrouver l'InscriptionSemestre
    # On passe par Inscription -> Dossier -> Etudiant
    inscription = db.query(models.Inscription).join(models.DossierInscription).filter(
        models.DossierInscription.Etudiant_id_fk == payload.etudiant_id,
        models.Inscription.AnneeUniversitaire_id_fk == payload.annee_id,
        models.Inscription.Parcours_id_fk == payload.parcours_id
    ).first()

    if not inscription:
        raise HTTPException(404, "Inscription introuvable")

    insc_semestre = db.query(models.InscriptionSemestre).filter(
        models.InscriptionSemestre.Inscription_id_fk == inscription.Inscription_id,
        models.InscriptionSemestre.Semestre_id_fk == payload.semestre_id
    ).first()

    if not insc_semestre:
        # Création auto si manque (optionnel, selon règles métier)
        raise HTTPException(404, "L'étudiant n'est pas inscrit administrativement à ce semestre.")

    # 2. Chercher la note existante
    existing_note = db.query(models.Note).filter(
        models.Note.InscriptionSemestre_id_fk == insc_semestre.InscriptionSemestre_id,
        models.Note.MaquetteEC_id_fk == payload.maquette_ec_id,
        models.Note.SessionExamen_id_fk == payload.session_id
    ).first()

    if payload.valeur is None:
        # Suppression
        if existing_note:
            db.delete(existing_note)
    else:
        # Upsert
        if existing_note:
            existing_note.Note_valeur = payload.valeur
        else:
            new_id = f"NOTE_{uuid.uuid4().hex[:8].upper()}"
            new_note = models.Note(
                Note_id=new_id,
                InscriptionSemestre_id_fk=insc_semestre.InscriptionSemestre_id,
                MaquetteEC_id_fk=payload.maquette_ec_id,
                SessionExamen_id_fk=payload.session_id,
                Note_valeur=payload.valeur
            )
            db.add(new_note)

    try:
        db.commit()
        return {"message": "Sauvegardé"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Erreur BDD: {str(e)}")