import uuid
import time
from threading import Thread
from typing import List, Dict, Any, Optional
import traceback

from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from thefuzz import fuzz 

from app.database import get_db, SessionLocal 
from app.models import Etudiant, DossierInscription, Inscription, InscriptionSemestre, SuiviCreditCycle, DoublonNonAvere 

from datetime import date

router = APIRouter(prefix="/doublons", tags=["Gestion Doublons"])

# --- STOCKAGE EN MÉMOIRE POUR LA PROGRESSION ---
# Structure enrichie : { "job_id": { "status": "...", "progress": 0, "last_index": 0, "result": [] } }
SCAN_JOBS = {}

def cleanup_jobs():
    """Nettoie les vieux jobs terminés ou échoués"""
    current_time = time.time()
    keys_to_del = [
        k for k, v in SCAN_JOBS.items() 
        if v.get("status") in ["completed", "failed"] and (current_time - v.get("timestamp", 0)) > 3600
    ]
    for k in keys_to_del:
        del SCAN_JOBS[k]

# --- ALGORITHME DE DÉTECTION (Thread Safe & Stoppable) ---
def background_scan_process(job_id: str, db: Session, start_index: int = 0):
    try:
        SCAN_JOBS[job_id]["status"] = "processing"
        
        # 1. Charger les signatures ignorées en mémoire (Set pour recherche rapide O(1))
        ignored_sigs = {row.signature for row in db.query(DoublonNonAvere.signature).all()}

        students = db.query(Etudiant).order_by(Etudiant.Etudiant_id).all()
        total = len(students)
        SCAN_JOBS[job_id]["total"] = total
        
        # Récupération résultats existants
        duplicates_groups = SCAN_JOBS[job_id].get("result", [])
        
        # Nettoyage des résultats existants : 
        # Si un groupe a été ignoré pendant la pause, on le retire de la liste en mémoire
        duplicates_groups = [
            g for g in duplicates_groups 
            if generate_signature([s['id'] for s in g['students']]) not in ignored_sigs
        ]
        SCAN_JOBS[job_id]["result"] = duplicates_groups

        processed_ids = set()
        # On marque comme traités ceux qui sont déjà dans les résultats
        for group in duplicates_groups:
            for stu in group['students']:
                processed_ids.add(stu['id'])

        # Map CIN ... (code inchangé)
        cin_map = {}
        for s in students:
            if s.Etudiant_cin:
                clean = s.Etudiant_cin.replace(" ", "").replace("-", "")
                if clean not in cin_map: cin_map[clean] = []
                cin_map[clean].append(s)

        # Début de l'analyse (On commence à start_index)
        for i in range(start_index, total):
            # ... (Logique de pause inchangée) ...
            if SCAN_JOBS[job_id]["status"] == "stopping":
                SCAN_JOBS[job_id]["status"] = "paused"
                SCAN_JOBS[job_id]["last_index"] = i
                return

            s1 = students[i]
            
            # Mise à jour progression
            if i % 10 == 0:
                SCAN_JOBS[job_id]["progress"] = int((i / total) * 100)

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
            
            # On compare uniquement avec les étudiants suivants
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
                # Créer une liste temporaire d'IDs pour vérifier la signature
                ids_in_group = [s1.Etudiant_id] + [x[0].Etudiant_id for x in potential_dupes]
                sig = generate_signature(ids_in_group)

                # VÉRIFICATION BASE DE DONNÉES : Si ignoré, on saute !
                if sig in ignored_sigs:
                    continue

                # Si non ignoré, on construit le groupe
                current_group = [format_student_for_ui(s1)]
                processed_ids.add(s1.Etudiant_id)
                
                for (s_dupe, reason) in potential_dupes:
                    if s_dupe.Etudiant_id not in processed_ids:
                        fmt_s = format_student_for_ui(s_dupe)
                        fmt_s['reason'] = reason 
                        current_group.append(fmt_s)
                        processed_ids.add(s_dupe.Etudiant_id)
                
                duplicates_groups.append({
                    "group_id": str(uuid.uuid4()),
                    "students": current_group,
                    "confidence": "High"
                })
                # Mise à jour temps réel
                SCAN_JOBS[job_id]["result"] = duplicates_groups

        # Fin normale
        SCAN_JOBS[job_id]["progress"] = 100
        SCAN_JOBS[job_id]["last_index"] = total
        SCAN_JOBS[job_id]["status"] = "completed"

    except Exception as e:
        print(f"Erreur Scan: {e}")
        SCAN_JOBS[job_id]["status"] = "failed"
        SCAN_JOBS[job_id]["error"] = str(e)


def generate_signature(ids: List[str]) -> str:
    """Génère une signature unique pour un groupe d'IDs (triés)"""
    return "|".join(sorted(ids))

# --- NOUVELLES ROUTES POUR IGNORER ---

@router.post("/ignore")
def ignore_group(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Ajoute un groupe à la liste des faux doublons"""
    ids = payload.get("student_ids", [])
    if not ids: raise HTTPException(400, "IDs requis")
    
    sig = generate_signature(ids)
    
    # Vérifier si existe déjà
    exists = db.query(DoublonNonAvere).filter_by(signature=sig).first()
    if not exists:
        new_ignore = DoublonNonAvere(signature=sig, date_ignore=date.today())
        db.add(new_ignore)
        db.commit()
    
    return {"message": "Groupe ignoré", "signature": sig}

@router.get("/ignored")
def get_ignored_groups(db: Session = Depends(get_db)):
    """Récupère la liste des signatures ignorées (pour l'UI)"""
    # Note: Idéalement, il faudrait stocker un snapshot JSON des noms pour l'affichage
    # Ici on renvoie juste les objets pour l'instant ou on reconstruit si nécessaire
    ignored = db.query(DoublonNonAvere).all()
    return [{"id": i.id, "signature": i.signature, "date": i.date_ignore} for i in ignored]

@router.delete("/ignored/{id}")
def restore_group(id: int, db: Session = Depends(get_db)):
    """Supprime un groupe des ignorés (le scan le retrouvera la prochaine fois)"""
    item = db.query(DoublonNonAvere).filter(DoublonNonAvere.id == id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Restauré"}

# --- ENDPOINTS ---

@router.post("/scan/start")
def start_scan(
    background_tasks: BackgroundTasks, 
    payload: dict = Body(default={})
):
    """
    Lance le scan. 
    Payload optionnel: {"resume": True, "job_id": "..."} pour reprendre.
    """
    resume = payload.get("resume", False)
    existing_job_id = payload.get("job_id")
    
    start_index = 0
    job_id = str(uuid.uuid4())

    # Logique de reprise
    if resume and existing_job_id and existing_job_id in SCAN_JOBS:
        old_job = SCAN_JOBS[existing_job_id]
        if old_job["status"] == "paused":
            job_id = existing_job_id # On garde le même ID
            start_index = old_job.get("last_index", 0)
            print(f"Reprise du scan {job_id} à l'index {start_index}")
        else:
            # Si on demande reprise mais que ce n'est pas possible, on restart clean
            cleanup_jobs()
    else:
        cleanup_jobs()
        SCAN_JOBS[job_id] = {
            "status": "pending", 
            "progress": 0, 
            "last_index": 0,
            "timestamp": time.time(),
            "result": [] 
        }
    
    def run_scan_in_new_session(jid: str, idx: int):
        new_db = SessionLocal()
        try:
            background_scan_process(jid, new_db, start_index=idx)
        finally:
            new_db.close()
            
    background_tasks.add_task(run_scan_in_new_session, job_id, start_index)
    
    return {"job_id": job_id, "status": "started", "start_index": start_index}

@router.post("/scan/stop/{job_id}")
def stop_scan(job_id: str):
    """Demande l'arrêt du scan en cours"""
    if job_id in SCAN_JOBS:
        if SCAN_JOBS[job_id]["status"] == "processing":
            SCAN_JOBS[job_id]["status"] = "stopping" # Signal au thread
            return {"message": "Arrêt demandé..."}
        elif SCAN_JOBS[job_id]["status"] == "paused":
             return {"message": "Déjà en pause."}
    raise HTTPException(status_code=404, detail="Job introuvable")

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
        # 1. Overrides (Mise à jour des infos du master)
        for field, value in overrides.items():
            if hasattr(master, field):
                if field == "Etudiant_naissance_date_Exact":
                    if value == "Oui": 
                        value = True
                    elif value == "Non": 
                        value = False
                    # Si c'est déjà True/False ou None, on laisse passer
                # --------------------------------------
                setattr(master, field, value)

        # 2. Boucle sur les doublons (Slaves)
        for slave_id in ids_to_merge:
            slave = db.query(Etudiant).filter(Etudiant.Etudiant_id == slave_id).first()
            if not slave: continue

            print(f"--- Traitement fusion : {slave_id} vers {master_id} ---")

            # --- A. GESTION DES DOSSIERS & INSCRIPTIONS ---
            slave_dossiers = db.query(DossierInscription).filter(
                DossierInscription.Etudiant_id_fk == slave_id
            ).all()

            for s_dossier in slave_dossiers:
                # Vérifie si le Master a DÉJÀ un dossier pour cette mention
                master_dossier = db.query(DossierInscription).filter(
                    DossierInscription.Etudiant_id_fk == master.Etudiant_id,
                    DossierInscription.Mention_id_fk == s_dossier.Mention_id_fk
                ).first()

                if not master_dossier:
                    # CAS A: Pas de conflit de Mention. 
                    # On essaie de réattribuer le dossier au Master.
                    print(f"Déplacement dossier {s_dossier.DossierInscription_id} (Mention {s_dossier.Mention_id_fk})")
                    try:
                        s_dossier.Etudiant_id_fk = master.Etudiant_id 
                        db.flush() # <--- C'est souvent ICI que ça casse (Unique Constraint)
                    except Exception as integrity_err:
                        print(f"ERREUR INTEGRITE sur déplacement dossier : {integrity_err}")
                        # Si déplacement impossible (ex: doublon caché), on passe en mode fusion manuelle (CAS B forcé) ou on skip
                        db.rollback() 
                        # Réattacher les objets session après rollback est complexe, 
                        # ici on lève l'erreur pour comprendre ce qu'il se passe
                        raise integrity_err 
                
                else:
                    # CAS B: Conflit (Le master a déjà cette mention -> Fusion des INSCRIPTIONS)
                    print(f"Fusion contenu dossier {s_dossier.DossierInscription_id} vers {master_dossier.DossierInscription_id}")
                    
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
                            # Déplacement de l'inscription vers le dossier du master
                            insc_slave.DossierInscription_id_fk = master_dossier.DossierInscription_id
                            db.flush()
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
                                # Sinon sem_slave sera supprimé via cascade ou manuellement ci-dessous

                            db.delete(insc_slave)
                            db.flush()

                    # Une fois vidé, on supprime le dossier esclave
                    db.delete(s_dossier)
                    db.flush()


            # --- B. GESTION DES CREDITS ET SUPPRESSION FINALE ---
            db.query(SuiviCreditCycle).filter(SuiviCreditCycle.Etudiant_id_fk == slave_id).delete()
            db.flush()
            
            db.delete(slave)
            # Le commit final validera tout

        db.commit()
        return {"success": True, "message": "Fusion avancée terminée avec succès."}

    except Exception as e:
        db.rollback()
        print("!!!!!!!!!!!!!!!! ERREUR CRITIQUE FUSION !!!!!!!!!!!!!!!!")
        traceback.print_exc() # <--- CELA VA AFFICHER L'ERREUR DANS TON TERMINAL
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la fusion: {str(e)}")

def format_student_for_ui(etu: Etudiant):
    inscriptions_count = len(etu.dossiers_inscription) if etu.dossiers_inscription else 0
    
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
            "Etudiant_naissance_date_Exact": "Oui" if etu.Etudiant_naissance_date_Exact else "Non",
            "Etudiant_naissance_annee": str(etu.Etudiant_naissance_annee) if etu.Etudiant_naissance_annee else None,
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
            "Etudiant_bacc_annee": str(etu.Etudiant_bacc_annee) if etu.Etudiant_bacc_annee else None
        }
    }