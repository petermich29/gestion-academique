import uuid
import time
from typing import List
import traceback
from datetime import date
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, tuple_
from sqlalchemy.inspection import inspect
from thefuzz import fuzz 

from app.database import get_db, SessionLocal 
from app.models import (
    Etudiant, GroupeDoublon, MembreDoublon, 
    DossierInscription, Inscription, InscriptionSemestre, SuiviCreditCycle
)

router = APIRouter(prefix="/doublons", tags=["Gestion Doublons"])

SCAN_STATUS = {}

def cleanup_status():
    current_time = time.time()
    keys_to_del = [k for k, v in SCAN_STATUS.items() if (current_time - v.get("timestamp", 0)) > 86400]
    for k in keys_to_del: del SCAN_STATUS[k]

def object_as_dict(obj):
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}

def get_dossiers_count_for_id(session: Session, etudiant_id: str) -> int:
    return session.query(DossierInscription).filter(DossierInscription.Etudiant_id_fk == etudiant_id).count()

def background_db_scan_process(job_id: str):
    db = SessionLocal()
    BATCH_LIMIT = 20 
    
    try:
        SCAN_STATUS[job_id].update({
            "status": "processing",
            "temp_groups": [], 
            "found_count": 0,
            "stop_requested": False
        })

        query = db.query(Etudiant)
        total = query.count()
        SCAN_STATUS[job_id]["total"] = total
        
        students_light = []
        cin_map = defaultdict(list)
        year_map = defaultdict(list)

        for row in query.yield_per(1000):
            if SCAN_STATUS[job_id].get("stop_requested"): break
            try:
                raw_data = object_as_dict(row)
            except:
                raw_data = {}

            s_obj = {
                "id": row.Etudiant_id,
                "nom": (row.Etudiant_nom or "").strip().lower(),
                "prenoms": (row.Etudiant_prenoms or "").strip().lower(),
                "cin": (row.Etudiant_cin or "").replace(" ", "").replace("-", "").strip(),
                "annee": row.Etudiant_naissance_annee or (row.Etudiant_naissance_date.year if row.Etudiant_naissance_date else 0),
                "raw": raw_data 
            }
            if len(s_obj["cin"]) > 5: cin_map[s_obj["cin"]].append(s_obj)
            year_map[s_obj["annee"]].append(s_obj)
            students_light.append(s_obj)

        existing_sigs = {s[0] for s in db.query(GroupeDoublon.signature).all()}
        processed_ids = set()
        pending_orm_objects = []

        for i, s1 in enumerate(students_light):
            if SCAN_STATUS[job_id].get("stop_requested"):
                SCAN_STATUS[job_id]["status"] = "stopped"
                break

            if i % 50 == 0:
                SCAN_STATUS[job_id].update({"progress": round((i/total)*100, 2), "current_index": i})

            if s1["id"] in processed_ids: continue

            potential_dupes = []
            if s1["cin"]:
                for m in cin_map.get(s1["cin"], []):
                    if m["id"] != s1["id"] and m["id"] not in processed_ids:
                        potential_dupes.append((m, "CIN Identique", 100))

            full_name_1 = f"{s1['nom']} {s1['prenoms']}"
            candidates = year_map.get(s1["annee"], [])
            for s2 in candidates:
                if s2["id"] == s1["id"] or s2["id"] in processed_ids: continue
                if any(d[0]["id"] == s2["id"] for d in potential_dupes): continue
                full_name_2 = f"{s2['nom']} {s2['prenoms']}"
                score = fuzz.token_sort_ratio(full_name_1, full_name_2)
                if score >= 90: potential_dupes.append((s2, f"Similitude Nom ({score}%)", score))

            if potential_dupes:
                ids_group = sorted([s1["id"]] + [x[0]["id"] for x in potential_dupes])
                sig = "|".join(map(str, ids_group))

                if sig not in existing_sigs:
                    # MISE À JOUR TEMPS RÉEL DU COMPTEUR UI
                    SCAN_STATUS[job_id]["found_count"] += 1
                    
                    ui_group = {
                        "group_id": f"temp_{s1['id']}",
                        "score": int(sum(x[2] for x in potential_dupes)/len(potential_dupes)),
                        "students": [
                            {"id": s1["id"], "Etudiant_nom": s1["nom"], "Etudiant_prenoms": s1["prenoms"], "raw": s1["raw"], "dossiers_count": get_dossiers_count_for_id(db, s1["id"])},
                            *[{"id": x[0]["id"], "Etudiant_nom": x[0]["nom"], "Etudiant_prenoms": x[0]["prenoms"], "raw": x[0]["raw"], "dossiers_count": get_dossiers_count_for_id(db, x[0]["id"])} for x in potential_dupes]
                        ]
                    }
                    SCAN_STATUS[job_id]["temp_groups"].append(ui_group)

                    new_group = GroupeDoublon(signature=sig, statut='DETECTE', date_detection=date.today(), score_moyen=ui_group["score"])
                    membres = [MembreDoublon(etudiant_id=s1["id"], raison="Référence")]
                    for (dup, reason, sc) in potential_dupes: membres.append(MembreDoublon(etudiant_id=dup["id"], raison=reason))
                    new_group.membres = membres
                    
                    pending_orm_objects.append(new_group)
                    existing_sigs.add(sig)
                    processed_ids.add(s1["id"])
                    for x in potential_dupes: processed_ids.add(x[0]["id"])

            if len(pending_orm_objects) >= BATCH_LIMIT:
                db.add_all(pending_orm_objects)
                db.commit()
                SCAN_STATUS[job_id]["temp_groups"] = [] # Vide le buffer UI après commit
                pending_orm_objects = []
                time.sleep(0.05)

        if pending_orm_objects:
            db.add_all(pending_orm_objects)
            db.commit()
            SCAN_STATUS[job_id]["temp_groups"] = []

        if not SCAN_STATUS[job_id].get("stop_requested"):
            SCAN_STATUS[job_id].update({"progress": 100, "status": "completed"})

    except Exception as e:
        db.rollback()
        SCAN_STATUS[job_id].update({"status": "failed", "error": str(e)})
        traceback.print_exc()
    finally:
        db.close()

# --- ROUTES ---

@router.post("/scan/start")
def start_scan(background_tasks: BackgroundTasks):
    cleanup_status()
    job_id = str(uuid.uuid4())
    SCAN_STATUS[job_id] = {
        "status": "pending", "progress": 0, "found_count": 0, "temp_groups": [], "timestamp": time.time()
    }
    background_tasks.add_task(background_db_scan_process, job_id)
    return {"job_id": job_id, "message": "Scan démarré"}

@router.post("/scan/stop/{job_id}")
def stop_scan(job_id: str):
    if job_id in SCAN_STATUS:
        SCAN_STATUS[job_id]["stop_requested"] = True
        return {"message": "Arrêt du scan demandé..."}
    raise HTTPException(404, "Job introuvable")

@router.get("/scan/status/{job_id}")
def get_status(job_id: str):
    return SCAN_STATUS.get(job_id, {"status": "unknown"})

@router.get("/list")
def get_doublons(page: int = 1, limit: int = 10, statut: str = "DETECTE", db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    
    query = db.query(GroupeDoublon)\
        .options(joinedload(GroupeDoublon.membres).joinedload(MembreDoublon.etudiant))\
        .filter(GroupeDoublon.statut == statut)
    
    total = query.count()
    groups = query.order_by(GroupeDoublon.score_moyen.desc()).offset(offset).limit(limit).all()
    
    result = []
    for g in groups:
        students_data = []
        for m in g.membres:
            s = m.etudiant 
            # Fallback manuel si relation cassée
            if s is None and m.etudiant_id:
                s = db.query(Etudiant).filter(Etudiant.Etudiant_id == str(m.etudiant_id).strip()).first()

            if s:
                try: raw_data = object_as_dict(s)
                except: raw_data = {}
                
                # NOUVEAU: Calcul explicite du nombre de DossierInscription
                dossiers_count = get_dossiers_count_for_id(db, s.Etudiant_id)

                students_data.append({
                    'id': str(s.Etudiant_id),
                    'nom': s.Etudiant_nom,
                    'prenoms': s.Etudiant_prenoms,
                    'reason': m.raison,
                    # Mise à jour de la clé pour utiliser la nouvelle valeur calculée
                    'dossiers_count': dossiers_count, 
                    'raw': raw_data
                })
        
        if students_data:
            result.append({
                "group_id": g.id,
                "statut": g.statut,
                "score": g.score_moyen,
                "students": students_data
            })
        
    return {
        "data": result, 
        "total": total, 
        "page": page, 
        "pages": (total // limit) + 1 if total > 0 else 1
    }

@router.post("/action/{group_id}")
def action_doublon(group_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    action = payload.get("action")
    group = db.query(GroupeDoublon).filter(GroupeDoublon.id == group_id).first()
    if not group: raise HTTPException(404, "Groupe introuvable")
        
    if action == "ignore": group.statut = "IGNORE"
    elif action == "surveiller": group.statut = "SURVEILLANCE"
    elif action == "restore": group.statut = "DETECTE"
    
    db.commit()
    return {"message": f"Statut mis à jour : {group.statut}"}

# --- ADVANCED MERGE LOGIC ---
@router.post("/merge/advanced")
def merge_students_advanced(
    payload: dict = Body(...), 
    db: Session = Depends(get_db)
):
    master_id = payload.get("master_id")
    ids_to_merge = payload.get("ids_to_merge", []) 
    overrides = payload.get("overrides", {}) 
    group_id = payload.get("group_id") # On récupère l'ID du groupe pour le clôturer

    if not master_id or not ids_to_merge:
        raise HTTPException(status_code=400, detail="Paramètres manquants")

    master = db.query(Etudiant).filter(Etudiant.Etudiant_id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master introuvable")

    try:
        # 1. Apply Overrides
        for field, value in overrides.items():
            if hasattr(master, field):
                setattr(master, field, value)

        # 2. Loop Slaves
        for slave_id in ids_to_merge:
            slave = db.query(Etudiant).filter(Etudiant.Etudiant_id == slave_id).first()
            if not slave: continue

            # --- A. DOSSIERS & INSCRIPTIONS ---
            slave_dossiers = db.query(DossierInscription).filter(
                DossierInscription.Etudiant_id_fk == slave_id
            ).all()

            for s_dossier in slave_dossiers:
                master_dossier = db.query(DossierInscription).filter(
                    DossierInscription.Etudiant_id_fk == master.Etudiant_id,
                    DossierInscription.Mention_id_fk == s_dossier.Mention_id_fk
                ).first()

                if not master_dossier:
                    # Move Dossier
                    s_dossier.Etudiant_id_fk = master.Etudiant_id 
                    db.flush()
                else:
                    # Merge Inscriptions
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
                            insc_slave.DossierInscription_id_fk = master_dossier.DossierInscription_id
                            db.flush()
                        else:
                            # Conflict Inscription -> Check Semestres
                            semestres_slave = db.query(InscriptionSemestre).filter(InscriptionSemestre.Inscription_id_fk == insc_slave.Inscription_id).all()
                            for sem_slave in semestres_slave:
                                sem_master = db.query(InscriptionSemestre).filter(
                                    InscriptionSemestre.Inscription_id_fk == insc_master.Inscription_id,
                                    InscriptionSemestre.Semestre_id_fk == sem_slave.Semestre_id_fk
                                ).first()
                                if not sem_master:
                                    sem_slave.Inscription_id_fk = insc_master.Inscription_id
                            
                            # Delete empty slave inscription
                            db.delete(insc_slave)
                            db.flush()

                    # Delete empty slave dossier
                    db.delete(s_dossier)
                    db.flush()

            # --- B. CREDITS & DELETE ---
            db.query(SuiviCreditCycle).filter(SuiviCreditCycle.Etudiant_id_fk == slave_id).delete()
            db.flush()
            
            db.delete(slave)

        # 3. Update Group Status
        if group_id:
            group_doublon = db.query(GroupeDoublon).filter(GroupeDoublon.id == group_id).first()
            if group_doublon:
                group_doublon.statut = "TRAITE"

        db.commit()
        return {"success": True, "message": "Fusion effectuée avec succès."}

    except Exception as e:
        db.rollback()
        print(f"Merge Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur fusion: {str(e)}")