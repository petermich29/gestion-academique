import uuid
import time
from threading import Thread
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from thefuzz import fuzz 

# Assurez-vous d'importer SessionLocal ici
from app.database import get_db, SessionLocal 
from app.models import Etudiant, DossierInscription, Inscription, InscriptionSemestre, SuiviCreditCycle

router = APIRouter(prefix="/doublons", tags=["Gestion Doublons"])

# --- STOCKAGE EN MÉMOIRE POUR LA PROGRESSION ---
SCAN_JOBS = {}

def cleanup_jobs():
    """Nettoie les vieux jobs terminés"""
    current_time = time.time()
    keys_to_del = [
        k for k, v in SCAN_JOBS.items() 
        if v.get("status") in ["completed", "failed"] and (current_time - v.get("timestamp", 0)) > 3600
    ]
    for k in keys_to_del:
        del SCAN_JOBS[k]

# --- ALGORITHME DE DÉTECTION (Thread Safe) ---
def background_scan_process(job_id: str, db: Session):
    try:
        SCAN_JOBS[job_id]["status"] = "processing"
        
        # Récupération des étudiants
        students = db.query(Etudiant).all()
        total = len(students)
        SCAN_JOBS[job_id]["total"] = total

        if total > 0:
            SCAN_JOBS[job_id]["progress"] = 1 

        duplicates_groups = []
        processed_ids = set()

        # Optimisation : Map des CIN pour recherche O(1)
        cin_map = {}
        for s in students:
            if s.Etudiant_cin:
                clean_cin = s.Etudiant_cin.replace(" ", "").replace("-", "")
                if clean_cin not in cin_map: cin_map[clean_cin] = []
                cin_map[clean_cin].append(s)

        # Début de l'analyse
        for i, s1 in enumerate(students):
            
            # Mise à jour progression
            if total > 0 and i % 10 == 0:
                current_percent = int((i / total) * 100)
                SCAN_JOBS[job_id]["progress"] = max(1, current_percent)

            if s1.Etudiant_id in processed_ids:
                continue
            
            current_group = [format_student_for_ui(s1)]
            potential_dupes = []

            # 1. Critère CIN (Prioritaire)
            if s1.Etudiant_cin:
                clean_cin_1 = s1.Etudiant_cin.replace(" ", "").replace("-", "")
                matches = cin_map.get(clean_cin_1, [])
                for m in matches:
                    if m.Etudiant_id != s1.Etudiant_id and m.Etudiant_id not in processed_ids:
                        potential_dupes.append((m, "CIN Identique"))

            # 2. Critère Fuzzy Name + Date
            name1 = f"{s1.Etudiant_nom or ''} {s1.Etudiant_prenoms or ''}".strip().lower()
            
            for s2 in students[i+1:]:
                if s2.Etudiant_id in processed_ids or s2.Etudiant_id == s1.Etudiant_id:
                    continue
                
                # Si déjà trouvé par CIN, on saute le check fuzzy
                if any(p[0].Etudiant_id == s2.Etudiant_id for p in potential_dupes):
                    continue

                name2 = f"{s2.Etudiant_nom or ''} {s2.Etudiant_prenoms or ''}".strip().lower()
                ratio = fuzz.token_sort_ratio(name1, name2)
                
                same_birth = False
                if s1.Etudiant_naissance_date and s2.Etudiant_naissance_date:
                    same_birth = (s1.Etudiant_naissance_date == s2.Etudiant_naissance_date)
                elif s1.Etudiant_naissance_annee and s2.Etudiant_naissance_annee:
                    same_birth = (s1.Etudiant_naissance_annee == s2.Etudiant_naissance_annee)

                is_dupe = False
                reason = ""

                # Règles de décision
                if ratio > 92: 
                    is_dupe = True
                    reason = f"Nom très similaire ({ratio}%)"
                elif ratio > 80 and same_birth:
                    is_dupe = True
                    reason = f"Nom ({ratio}%) + Date Naissance"
                
                if is_dupe:
                    potential_dupes.append((s2, reason))

            # Consolidation du groupe
            if potential_dupes:
                processed_ids.add(s1.Etudiant_id)
                for (s_dupe, reason) in potential_dupes:
                    if s_dupe.Etudiant_id not in processed_ids:
                        fmt_s = format_student_for_ui(s_dupe)
                        fmt_s['reason'] = reason 
                        current_group.append(fmt_s)
                        processed_ids.add(s_dupe.Etudiant_id)
                
                # Ajout du groupe à la liste locale
                duplicates_groups.append({
                    "group_id": str(uuid.uuid4()),
                    "students": current_group,
                    "confidence": "High"
                })

                SCAN_JOBS[job_id]["result"] = duplicates_groups

        SCAN_JOBS[job_id]["progress"] = 100
        SCAN_JOBS[job_id]["result"] = duplicates_groups
        SCAN_JOBS[job_id]["status"] = "completed"

    except Exception as e:
        print(f"Erreur Scan: {e}")
        SCAN_JOBS[job_id]["status"] = "failed"
        SCAN_JOBS[job_id]["error"] = str(e)

# --- ENDPOINTS ---

@router.post("/scan/start")
def start_scan(background_tasks: BackgroundTasks):
    """Lance le scan en arrière-plan et retourne un Job ID"""
    cleanup_jobs()
    job_id = str(uuid.uuid4())
    
    SCAN_JOBS[job_id] = {
        "status": "pending", 
        "progress": 0, 
        "timestamp": time.time(),
        "result": [] 
    }
    
    def run_scan_in_new_session(job_id: str):
        new_db = SessionLocal()
        try:
            background_scan_process(job_id, new_db)
        finally:
            new_db.close()
            
    background_tasks.add_task(run_scan_in_new_session, job_id)
    
    return {"job_id": job_id}

@router.get("/scan/status/{job_id}")
def get_scan_status(job_id: str):
    job = SCAN_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from app.models import Inscription, InscriptionSemestre # Assurez-vous d'importer ces modèles

from app.models import Etudiant, DossierInscription, Inscription, InscriptionSemestre, SuiviCreditCycle # Assurez-vous d'avoir TOUS les imports

@router.post("/merge/advanced")
def merge_students_advanced(
    payload: dict = Body(...), 
    db: Session = Depends(get_db)
):
    master_id = payload.get("master_id")
    ids_to_merge = payload.get("ids_to_merge", []) 
    overrides = payload.get("overrides", {}) 

    if not master_id or not ids_to_merge:
        raise HTTPException(status_code=400, detail="Paramètres manquants")

    master = db.query(Etudiant).filter(Etudiant.Etudiant_id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master introuvable")

    try:
        # 1. Overrides
        for field, value in overrides.items():
            if hasattr(master, field):
                setattr(master, field, value)

        # 2. Boucle sur les doublons
        for slave_id in ids_to_merge:
            slave = db.query(Etudiant).filter(Etudiant.Etudiant_id == slave_id).first()
            if not slave: continue

            # --- A. GESTION DES DOSSIERS & INSCRIPTIONS ---
            slave_dossiers = db.query(DossierInscription).filter(
                DossierInscription.Etudiant_id_fk == slave_id
            ).all()

            for s_dossier in slave_dossiers:
                master_dossier = db.query(DossierInscription).filter(
                    DossierInscription.Etudiant_id_fk == master.Etudiant_id,
                    DossierInscription.Mention_id_fk == s_dossier.Mention_id_fk
                ).first()

                if not master_dossier:
                    # CAS A: Pas de conflit. On réattribue le dossier au Master.
                    s_dossier.Etudiant_id_fk = master.Etudiant_id 
                    db.flush() # 1. CRITIQUE (CAS A) : Force l'UPDATE de la FK du dossier immédiatement
                
                else:
                    # CAS B: Conflit (Fusion des INSCRIPTIONS)
                    inscriptions_slave = db.query(Inscription).filter(
                        Inscription.DossierInscription_id_fk == s_dossier.DossierInscription_id
                    ).all()

                    for insc_slave in inscriptions_slave:
                        insc_master = db.query(Inscription).filter(
                            Inscription.DossierInscription_id_fk == master_dossier.DossierInscription_id,
                            Inscription.AnneeUniversitaire_id_fk == insc_slave.AnneeUniversitaire_id_fk,
                            Inscription.Parcours_id_fk == insc_slave.Parcours_id_fk,
                            Inscription.Niveau_id_fk == insc_slave.Niveau_id_fk
                        ).first()

                        if not insc_master:
                            # Déplacement de l'inscription
                            insc_slave.DossierInscription_id_fk = master_dossier.DossierInscription_id
                            db.flush() # 2. CRITIQUE (CAS B / Déplacement Inscription)
                        else:
                            # Conflit Inscription : On déplace les semestres
                            semestres_slave = db.query(InscriptionSemestre).filter(InscriptionSemestre.Inscription_id_fk == insc_slave.Inscription_id).all()
                            for sem_slave in semestres_slave:
                                sem_master = db.query(InscriptionSemestre).filter(
                                    InscriptionSemestre.Inscription_id_fk == insc_master.Inscription_id,
                                    InscriptionSemestre.Semestre_id_fk == sem_slave.Semestre_id_fk
                                ).first()
                                if not sem_master:
                                    sem_slave.Inscription_id_fk = insc_master.Inscription_id
                                # Si sem_master existe, l'objet sem_slave est laissé en attente de suppression

                            # On s'assure que les semestres ont été traités (déplacés/supprimés) avant de supprimer l'inscription parent
                            db.delete(insc_slave)
                            db.flush() # 3. CRITIQUE (CAS B / Suppression Inscription) : Force la suppression de l'inscription vide.

                    db.delete(s_dossier)
                    db.flush() # 4. CRITIQUE (CAS B / Suppression Dossier) : Force la suppression du dossier vide.


            # --- B. GESTION DES CREDITS ET SUPPRESSION FINALE ---
            # 3. Nettoyer les suivis de crédits (suppression en masse)
            db.query(SuiviCreditCycle).filter(SuiviCreditCycle.Etudiant_id_fk == slave_id).delete()
            db.flush() # 5. Force la suppression des crédits
            
            # 4. Supprimer l'étudiant doublon
            db.delete(slave)
            # Le commit final prendra en charge la suppression de l'étudiant.

        db.commit()
        return {"success": True, "message": "Fusion avancée terminée avec succès."}

    except Exception as e:
        db.rollback()
        # Ne pas enlever le print pour le diagnostic local
        # import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la fusion: {str(e)}")

def format_student_for_ui(etu: Etudiant):
    inscriptions_count = len(etu.dossiers_inscription) if etu.dossiers_inscription else 0
    
    # Formatage affichage simple
    ddn_display = "Inconnue"
    if etu.Etudiant_naissance_date:
        ddn_display = etu.Etudiant_naissance_date.strftime("%d/%m/%Y")
    elif etu.Etudiant_naissance_annee:
        ddn_display = f"Vers {etu.Etudiant_naissance_annee}"

    return {
        "id": etu.Etudiant_id,
        "nom": etu.Etudiant_nom,
        "prenoms": etu.Etudiant_prenoms,
        "inscriptions_count": inscriptions_count,
        # Données complètes pour la fusion (valeurs brutes)
        "raw": {
            # IDENTITÉ
            "Etudiant_photo_profil_path": etu.Etudiant_photo_profil_path,
            "Etudiant_nom": etu.Etudiant_nom,
            "Etudiant_prenoms": etu.Etudiant_prenoms,
            "Etudiant_sexe": etu.Etudiant_sexe,
            "Etudiant_nationalite": etu.Etudiant_nationalite,
            
            # NAISSANCE
            "Etudiant_naissance_date": str(etu.Etudiant_naissance_date) if etu.Etudiant_naissance_date else None,
            "Etudiant_naissance_lieu": etu.Etudiant_naissance_lieu,
            
            # CIN
            "Etudiant_cin": etu.Etudiant_cin,
            "Etudiant_cin_date": str(etu.Etudiant_cin_date) if etu.Etudiant_cin_date else None,
            "Etudiant_cin_lieu": etu.Etudiant_cin_lieu,
            
            # CONTACT
            "Etudiant_adresse": etu.Etudiant_adresse,
            "Etudiant_telephone": etu.Etudiant_telephone,
            "Etudiant_mail": etu.Etudiant_mail,
            
            # BACC
            "Etudiant_bacc_serie": etu.Etudiant_bacc_serie,
            "Etudiant_bacc_numero": etu.Etudiant_bacc_numero,
            "Etudiant_bacc_mention": etu.Etudiant_bacc_mention,
            "Etudiant_bacc_centre": etu.Etudiant_bacc_centre,
            "Etudiant_bacc_annee": etu.Etudiant_bacc_annee
        }
    }