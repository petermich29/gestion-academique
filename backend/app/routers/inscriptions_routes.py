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
    Composante,
    Institution
)
from app.schemas.inscriptions_schemas import InscriptionCreatePayload, InscriptionResponse, InscriptionUpdatePayload

router = APIRouter(prefix="/inscriptions", tags=["Dossiers d'Inscription"])

# ... (Gardez la route GET "/" telle quelle, elle est correcte) ...
@router.get("/")
def get_inscriptions_list(
    annee_id: str = Query(...),
    institution_id: Optional[str] = Query(None),
    composante_id: Optional[str] = Query(None),
    mention_id: Optional[str] = Query(None),
    parcours_id: Optional[str] = Query(None),
    niveau_id: Optional[str] = Query(None),
    semestre_id: Optional[str] = Query(None),
    mode_inscription_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Inscription)
    query = query.join(Inscription.dossier_inscription)
    
    if institution_id or composante_id or mention_id:
        query = query.join(DossierInscription.mention)
    if institution_id or composante_id:
        query = query.join(Mention.composante)
    if institution_id:
        query = query.join(Composante.institution)

    query = query.options(
        joinedload(Inscription.dossier_inscription).joinedload(DossierInscription.etudiant),
        joinedload(Inscription.niveau),
        joinedload(Inscription.parcours),
        joinedload(Inscription.mode_inscription),
        joinedload(Inscription.semestres).joinedload(InscriptionSemestre.semestre)
    )

    query = query.filter(Inscription.AnneeUniversitaire_id_fk == annee_id)
    
    if institution_id: query = query.filter(Institution.Institution_id == institution_id)
    if composante_id: query = query.filter(Composante.Composante_id == composante_id)
    if mention_id: query = query.filter(DossierInscription.Mention_id_fk == mention_id)
    if parcours_id: query = query.filter(Inscription.Parcours_id_fk == parcours_id)
    if niveau_id: query = query.filter(Inscription.Niveau_id_fk == niveau_id)
    if mode_inscription_id: query = query.filter(Inscription.ModeInscription_id_fk == mode_inscription_id)

    if semestre_id:
        query = query.join(Inscription.semestres).filter(
            InscriptionSemestre.Semestre_id_fk == semestre_id
        )

    query = query.join(DossierInscription.etudiant).order_by(Etudiant.Etudiant_nom.asc())

    results = query.all()

    response_data = []
    for insc in results:
        semestres_labels = [s.semestre.Semestre_numero for s in insc.semestres if s.semestre]
        semestre_str = ", ".join(semestres_labels) if semestres_labels else "—"

        dossier = insc.dossier_inscription
        etudiant = dossier.etudiant

        response_data.append({
            "id": insc.Inscription_id,
            "etudiant_id": etudiant.Etudiant_id, 
            "DossierInscription_id": dossier.DossierInscription_id,
            "matricule": dossier.DossierInscription_numero,
            "etudiant_nom": etudiant.Etudiant_nom,
            "etudiant_prenom": etudiant.Etudiant_prenoms,
            "niveau_label": insc.niveau.Niveau_label if insc.niveau else "",
            "parcours_label": insc.parcours.Parcours_label if insc.parcours else "",
            "mode_id": insc.ModeInscription_id_fk,
            "mode_label": insc.mode_inscription.ModeInscription_label if insc.mode_inscription else "—",
            "semestre_label": semestre_str
        })

    return response_data

# ... (Gardez la route PUT telle quelle) ...
@router.put("/{inscription_id}")
def update_inscription(
    inscription_id: str, 
    payload: InscriptionUpdatePayload, 
    db: Session = Depends(get_db)
):
    insc = db.query(Inscription).filter(Inscription.Inscription_id == inscription_id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")

    try:
        insc.ModeInscription_id_fk = payload.mode_inscription_id
        existing_links = db.query(InscriptionSemestre).filter(
            InscriptionSemestre.Inscription_id_fk == inscription_id
        ).all()
        
        existing_sem_ids = {l.Semestre_id_fk for l in existing_links}
        target_sem_ids = set(payload.semestres_ids)

        for link in existing_links:
            if link.Semestre_id_fk not in target_sem_ids:
                db.delete(link)

        for sem_id in target_sem_ids:
            if sem_id not in existing_sem_ids:
                new_link_id = f"{inscription_id}_{sem_id}"
                new_link = InscriptionSemestre(
                    InscriptionSemestre_id=new_link_id,
                    Inscription_id_fk=inscription_id,
                    Semestre_id_fk=sem_id,
                    InscriptionSemestre_statut='INSCRIT'
                )
                db.add(new_link)

        db.commit()
        return {"success": True, "message": "Mise à jour effectuée"}

    except Exception as e:
        db.rollback()
        print(f"ERREUR SERVEUR (PUT): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


# ==============================================================================
# POST : Inscription en masse (CORRIGÉ)
# ==============================================================================
@router.post("/bulk", response_model=InscriptionResponse)
def create_bulk_dossiers(payload: InscriptionCreatePayload, db: Session = Depends(get_db)):
    
    mention = db.query(Mention).filter(Mention.Mention_id == payload.mention_id).first()
    annee = db.query(AnneeUniversitaire).filter(AnneeUniversitaire.AnneeUniversitaire_id == payload.annee_id).first()
    semestre = db.query(Semestre).filter(Semestre.Semestre_id == payload.semestre_id).first()

    if not mention or not annee or not semestre:
        raise HTTPException(status_code=404, detail="Mention, Année ou Semestre introuvable.")
    
    mode_inscription_id_final = payload.mode_inscription_id or 'MODE_001'
    
    # ... (Code de génération de séquence dossier identique) ...
    annee_label = annee.AnneeUniversitaire_annee
    yy = annee_label.split("-")[-1][-2:] if annee_label and "-" in annee_label else annee_label[-2:]
    abbr = mention.Mention_abbreviation or mention.Mention_code or "UNK"
    prefix_numero = f"{yy}{abbr}_"

    last_dossier = db.query(DossierInscription).filter(
        DossierInscription.DossierInscription_numero.like(f"{prefix_numero}%")
    ).order_by(desc(DossierInscription.DossierInscription_numero)).first()

    current_sequence = 0
    if last_dossier and last_dossier.DossierInscription_numero:
        try:
            num_part = last_dossier.DossierInscription_numero.split("_")[-1]
            current_sequence = int(num_part)
        except ValueError:
            current_sequence = 0

    # Compteurs corrigés
    success_count = 0 
    already_enrolled_count = 0
    existing_ids_list = []

    try:
        for etu_id in payload.etudiants_ids:
            
            # 1. DOSSIER
            dossier_id = f"{etu_id}_{payload.mention_id}_{payload.annee_id}"
            dossier = db.query(DossierInscription).filter(DossierInscription.DossierInscription_id == dossier_id).first()

            if not dossier:
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
                db.flush()

            # 2. INSCRIPTION ADMINISTRATIVE
            inscription_id = f"{dossier_id}_{payload.parcours_id}_{payload.niveau_id}"
            inscription = db.query(Inscription).filter(Inscription.Inscription_id == inscription_id).first()
            
            is_new_inscription = False
            if not inscription:
                inscription = Inscription(
                    Inscription_id=inscription_id,
                    DossierInscription_id_fk=dossier.DossierInscription_id,
                    AnneeUniversitaire_id_fk=payload.annee_id,
                    Parcours_id_fk=payload.parcours_id,
                    Niveau_id_fk=payload.niveau_id,
                    ModeInscription_id_fk=mode_inscription_id_final,
                    Inscription_date=date.today()
                )
                db.add(inscription)
                db.flush()
                is_new_inscription = True

            # 3. LIAISON SEMESTRE (C'est ici qu'on détermine le vrai succès)
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
                # SUCCÈS : Soit nouvelle inscription, soit ajout d'un nouveau semestre
                success_count += 1
            else:
                # ÉCHEC : L'étudiant a déjà ce semestre spécifiquement
                already_enrolled_count += 1
                existing_ids_list.append(etu_id)

        db.commit()
        
        return {
            "success": True, 
            "message": "Inscriptions traitées", 
            "inscrits_count": success_count,
            "deja_inscrits_count": already_enrolled_count,
            "existing_ids": existing_ids_list
        }

    except Exception as e:
        db.rollback()
        print(f"Erreur SQL Bulk: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))

# ... (Gardez get_semestres et delete tels quels) ...
@router.get("/structure/semestres/{niveau_id}")
def get_semestres_by_niveau(niveau_id: str, db: Session = Depends(get_db)):
    semestres = db.query(Semestre).filter(
        Semestre.Niveau_id_fk == niveau_id
    ).order_by(Semestre.Semestre_numero.asc()).all()
    return [{"id": s.Semestre_id, "label": f"Semestre {s.Semestre_numero}"} for s in semestres]

@router.delete("/{inscription_id}")
def delete_inscription(inscription_id: str, db: Session = Depends(get_db)):
    inscription = db.query(Inscription).filter(Inscription.Inscription_id == inscription_id).first()
    if not inscription:
        raise HTTPException(status_code=404, detail="Inscription introuvable")

    try:
        db.query(InscriptionSemestre).filter(InscriptionSemestre.Inscription_id_fk == inscription_id).delete()
        db.delete(inscription)
        db.commit()
        return {"success": True, "message": "Inscription supprimée avec succès"}
    except Exception as e:
        db.rollback()
        print(f"Erreur DELETE: {str(e)}")
        raise HTTPException(status_code=500, detail="Impossible de supprimer l'inscription")