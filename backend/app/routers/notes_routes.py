# app/routers/notes_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from typing import List, Optional
import uuid

from app.database import get_db
from app import models
from app.schemas import notes_schemas
from app.services.notes_service import NotesService
from collections import defaultdict

# Assurez-vous que ce prefix est bien utilisé dans main.py
# app.include_router(notes_routes.router, prefix="/api") 
router = APIRouter(prefix="/notes", tags=["Gestion des Notes"])

@router.get("/grille", response_model=notes_schemas.GrilleResponse)
def get_grille_notes(
    annee_id: str,
    parcours_id: str,
    semestre_id: str,
    db: Session = Depends(get_db)
):
    # 1. RÉCUPÉRATION DE LA STRUCTURE (Code existant...)
    maquettes_ues = db.query(models.MaquetteUE).filter(
        models.MaquetteUE.Parcours_id_fk == parcours_id,
        models.MaquetteUE.Semestre_id_fk == semestre_id,
        models.MaquetteUE.AnneeUniversitaire_id_fk == annee_id
    ).options(
        joinedload(models.MaquetteUE.ue_catalog),
        joinedload(models.MaquetteUE.maquette_ecs).joinedload(models.MaquetteEC.ec_catalog)
    ).order_by(models.MaquetteUE.MaquetteUE_id).all()

    # --- AJOUT : Création d'un dictionnaire de mapping EC_ID -> UE_ID ---
    # Cela permet de savoir rapidement à quelle UE appartient une note pour l'Action 2
    ec_to_ue_map = {}
    structure_ues = []
    for mue in maquettes_ues:
        ecs_list = []
        sorted_ecs = sorted(mue.maquette_ecs, key=lambda x: x.ec_catalog.EC_code if x.ec_catalog else "")
        for mec in sorted_ecs:
            # On stocke le lien EC -> UE
            ec_to_ue_map[mec.MaquetteEC_id] = mue.MaquetteUE_id
            
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

    # 2. RÉCUPÉRATION DES DONNÉES ÉTUDIANTS (Code existant inchangé...)
    inscriptions = db.query(models.Inscription).join(models.InscriptionSemestre).filter(
        models.Inscription.AnneeUniversitaire_id_fk == annee_id,
        models.Inscription.Parcours_id_fk == parcours_id,
        models.InscriptionSemestre.Semestre_id_fk == semestre_id
    ).options(
        joinedload(models.Inscription.dossier_inscription).joinedload(models.DossierInscription.etudiant),
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.notes),
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.resultats_ue),
        joinedload(models.Inscription.semestres).joinedload(models.InscriptionSemestre.resultats_semestre)
    ).all()

    # --- DEBUT : NETTOYAGE AUTOMATIQUE DES RÉSULTATS RATTRA (MISE À JOUR) ---
    items_to_delete = []
    
    for insc in inscriptions:
        insc_sem = next((s for s in insc.semestres if s.Semestre_id_fk == semestre_id), None)
        if not insc_sem: continue

        # Vérification Validation Semestre S1 (Pour Condition C2)
        res_sem_s1 = next((r for r in insc_sem.resultats_semestre if r.SessionExamen_id_fk == "SESS_1"), None)
        semestre_valide_s1 = (res_sem_s1 and res_sem_s1.ResultatSemestre_statut_validation == "VAL")

        # Identification des UEs acquises en S1 (Pour Condition C1)
        # Si le semestre est validé globalement, on considère implicitement que tout doit être nettoyé en S2
        ues_acquises_s1_ids = set()
        if not semestre_valide_s1:
            ues_acquises_s1_ids = {
                r.MaquetteUE_id_fk for r in insc_sem.resultats_ue 
                if r.SessionExamen_id_fk == "SESS_1" and r.ResultatUE_is_acquise
            }

        # 1. Nettoyage RESULTATS UE (Act1 pour C1 & Act3 implicite pour C2)
        for res in list(insc_sem.resultats_ue):
            if res.SessionExamen_id_fk == "SESS_2":
                # Suppression si : Le semestre est validé OU l'UE spécifique est acquise
                if semestre_valide_s1 or (res.MaquetteUE_id_fk in ues_acquises_s1_ids):
                    items_to_delete.append(res)
                    try:
                        insc_sem.resultats_ue.remove(res)
                    except ValueError:
                        pass # Déjà supprimé

        # 2. Nettoyage NOTES EC (Act2 pour C1 & Act2 pour C2)
        for note in list(insc_sem.notes):
            if note.SessionExamen_id_fk == "SESS_2":
                # On retrouve l'UE parente grâce au mapping créé plus haut
                parent_ue_id = ec_to_ue_map.get(note.MaquetteEC_id_fk)
                
                # Suppression si : Le semestre est validé OU l'UE parente est acquise
                if semestre_valide_s1 or (parent_ue_id and parent_ue_id in ues_acquises_s1_ids):
                    items_to_delete.append(note)
                    try:
                        insc_sem.notes.remove(note)
                    except ValueError:
                        pass

        # 3. Nettoyage RESULTAT SEMESTRE (Act3 pour C2)
        if semestre_valide_s1:
            for res in list(insc_sem.resultats_semestre):
                if res.SessionExamen_id_fk == "SESS_2":
                    items_to_delete.append(res)
                    try:
                        insc_sem.resultats_semestre.remove(res)
                    except ValueError:
                        pass

    # Application des suppressions en base de données
    if items_to_delete:
        for item in items_to_delete:
            db.delete(item)
        try:
            db.commit()
        except Exception as e:
            print(f"Erreur lors du nettoyage auto: {e}")
            db.rollback()
    # --- FIN : NETTOYAGE AUTOMATIQUE ---

    lignes_etudiants = []
    for insc in inscriptions:
        etudiant = insc.dossier_inscription.etudiant
        # RÉCUPÉRATION DU MATRICULE ICI
        num_inscription = insc.dossier_inscription.DossierInscription_numero
        
        insc_sem = next((s for s in insc.semestres if s.Semestre_id_fk == semestre_id), None)
        if not insc_sem: continue

        # A. Mapping des Notes (Filtrage strict par session_id pour le schéma actuel)
        # A. Mapping des Notes : Structure { ec_id: { session_id: valeur } }
        notes_map = defaultdict(dict)
        for note in insc_sem.notes:
            if note.Note_valeur is not None:
                # On utilise l'ID de session réel venant de la BDD (ex: "SESS_01", "SESS_02")
                notes_map[note.MaquetteEC_id_fk][note.SessionExamen_id_fk] = float(note.Note_valeur)

        # B. Mapping des Résultats UE : Structure { ue_id: { session_id: {data} } }
        res_ue_map = defaultdict(dict)
        for res in insc_sem.resultats_ue:
             res_ue_map[res.MaquetteUE_id_fk][res.SessionExamen_id_fk] = {
                 "moyenne": float(res.ResultatUE_moyenne) if res.ResultatUE_moyenne is not None else None,
                 "valide": res.ResultatUE_is_acquise,
                 "credits": float(res.ResultatUE_credit_obtenu) if res.ResultatUE_credit_obtenu else 0.0
             }

        # C. Mapping du Résultat Semestre : Structure { session_id: valeur }
        # On doit stocker par session pour l'affichage S1 / RAT
        moyennes_sem = {}
        statuts_sem = {}
        credits_sem = {}

        for res_sem_obj in insc_sem.resultats_semestre:
            s_id = res_sem_obj.SessionExamen_id_fk
            if res_sem_obj.ResultatSemestre_moyenne_obtenue is not None:
                moyennes_sem[s_id] = float(res_sem_obj.ResultatSemestre_moyenne_obtenue)
            
            statuts_sem[s_id] = res_sem_obj.ResultatSemestre_statut_validation
            
            if res_sem_obj.ResultatSemestre_credits_acquis is not None:
                credits_sem[s_id] = float(res_sem_obj.ResultatSemestre_credits_acquis)

        # Assurez-vous que votre Pydantic "EtudiantGrilleRow" accepte des Dict pour ces champs
        lignes_etudiants.append(notes_schemas.EtudiantGrilleRow(
            etudiant_id=etudiant.Etudiant_id,
            nom=etudiant.Etudiant_nom,
            prenoms=etudiant.Etudiant_prenoms,
            matricule=num_inscription,
            photo_url=etudiant.Etudiant_photo_profil_path,
            notes=notes_map,               # Dict[str, Dict[str, float]]
            resultats_ue=res_ue_map,       # Dict[str, Dict[str, Any]]
            moyennes_semestre=moyennes_sem, # CHANGEMENT DE NOM DE CHAMP NECESSAIRE DANS SCHEMA
            resultats_semestre=statuts_sem, # CHANGEMENT DE NOM DE CHAMP NECESSAIRE DANS SCHEMA
            credits_semestre=credits_sem   # CHANGEMENT DE NOM DE CHAMP NECESSAIRE DANS SCHEMA
        ))

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

    existing_note = db.query(models.Note).filter(
        models.Note.InscriptionSemestre_id_fk == insc_semestre.InscriptionSemestre_id,
        models.Note.MaquetteEC_id_fk == payload.maquette_ec_id,
        models.Note.SessionExamen_id_fk == payload.session_id
    ).first()

    if payload.valeur is None:
        if existing_note:
            db.delete(existing_note)
    else:
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
        db.flush()
        # Recalcule tout pour cet étudiant (UEs + Semestre)
        NotesService.recalculer_tout(db, insc_semestre.InscriptionSemestre_id, payload.session_id)
        db.commit()

        # Récupération des nouveaux résultats d'UE
        res_ue_dict = {}
        resultats_ues = db.query(models.ResultatUE).filter(
            models.ResultatUE.InscriptionSemestre_id_fk == insc_semestre.InscriptionSemestre_id,
            models.ResultatUE.SessionExamen_id_fk == payload.session_id
        ).all()
        
        for r in resultats_ues:
            res_ue_dict[str(r.MaquetteUE_id_fk)] = {
                "moyenne": float(r.ResultatUE_moyenne),
                "valide": r.ResultatUE_is_acquise,
                "credits": float(r.ResultatUE_credit_obtenu)
            }

        # Récupération du résultat global du semestre
        res_sem = db.query(models.ResultatSemestre).filter(
            models.ResultatSemestre.InscriptionSemestre_id_fk == insc_semestre.InscriptionSemestre_id,
            models.ResultatSemestre.SessionExamen_id_fk == payload.session_id
        ).first()

        return {
            "message": "Mis à jour",
            "session_id": payload.session_id, # Crucial pour le dispatch frontend
            "updates": {
                "resultats_ue": res_ue_dict,
                "moyenne_semestre": float(res_sem.ResultatSemestre_moyenne_obtenue) if res_sem else 0,
                "statut_semestre": res_sem.ResultatSemestre_statut_validation if res_sem else "AJ",
                "credits_semestre": float(res_sem.ResultatSemestre_credits_acquis) if res_sem else 0
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Erreur lors de la sauvegarde : {str(e)}")
    

@router.post("/recalculer-semestre-global")
def recalculer_semestre_global(payload: dict, db: Session = Depends(get_db)):
    """
    Déclenche le recalcul de tous les étudiants pour un semestre donné (S1 et S2).
    """
    # 1. Trouver tous les étudiants concernés
    inscriptions = db.query(models.InscriptionSemestre).join(models.Inscription).filter(
        models.Inscription.AnneeUniversitaire_id_fk == payload['annee_id'],
        models.Inscription.Parcours_id_fk == payload['parcours_id'],
        models.InscriptionSemestre.Semestre_id_fk == payload['semestre_id']
    ).all()

    for insc in inscriptions:
        # On recalcule les deux sessions pour être sûr
        NotesService.recalculer_tout(db, insc.InscriptionSemestre_id, "SESS_1")
        NotesService.recalculer_tout(db, insc.InscriptionSemestre_id, "SESS_2")
    
    db.commit()
    return {"status": "success", "message": f"{len(inscriptions)} étudiants recalculés."}