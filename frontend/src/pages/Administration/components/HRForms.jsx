// src/pages/HR/components/HRForms.jsx
import React, { useEffect } from "react";
import { DraggableModal } from "../../../components/ui/Modal";
import { AppStyles } from "../../../components/ui/AppStyles";
import { SpinnerIcon } from "../../../components/ui/Icons";
import { FaSave, FaUser, FaGraduationCap, FaAddressCard, FaBriefcase } from "react-icons/fa";

// --- FORMULAIRE ÉTUDIANT ---
export const StudentFormModal = ({ isOpen, onClose, data, onChange, onSubmit, isSubmitting, title }) => {
  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-4xl">
      <form onSubmit={onSubmit} className="space-y-6">
        
        {/* SECTION 1: IDENTITÉ */}
        <div>
           <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 border-b border-blue-100 pb-1 mb-3">
             <FaUser /> Identité & État Civil
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                 <label className={AppStyles.input.label}>N° Inscription</label>
                 <input name="Etudiant_numero_inscription" value={data.Etudiant_numero_inscription || ""} onChange={onChange} className={AppStyles.input.formControl} placeholder="ex: ETU-2024-001" />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Nom <span className="text-red-500">*</span></label>
                 <input required name="Etudiant_nom" value={data.Etudiant_nom || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Prénoms</label>
                 <input name="Etudiant_prenoms" value={data.Etudiant_prenoms || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Sexe</label>
                 <select name="Etudiant_sexe" value={data.Etudiant_sexe || ""} onChange={onChange} className={AppStyles.input.formControl}>
                    <option value="">-- Choisir --</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                 </select>
              </div>
              <div>
                 <label className={AppStyles.input.label}>Date de Naissance</label>
                 <input type="date" name="Etudiant_naissance_date" value={data.Etudiant_naissance_date || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Lieu de Naissance</label>
                 <input name="Etudiant_naissance_lieu" value={data.Etudiant_naissance_lieu || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Nationalité</label>
                 <input name="Etudiant_nationalite" value={data.Etudiant_nationalite || "Malgache"} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>CIN (Numéro)</label>
                 <input name="Etudiant_cin" value={data.Etudiant_cin || ""} onChange={onChange} className={AppStyles.input.formControl} maxLength={12} />
              </div>
           </div>
        </div>

        {/* SECTION 2: CONTACT */}
        <div>
           <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 border-b border-blue-100 pb-1 mb-3">
             <FaAddressCard /> Coordonnées
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                 <label className={AppStyles.input.label}>Adresse</label>
                 <input name="Etudiant_adresse" value={data.Etudiant_adresse || ""} onChange={onChange} className={AppStyles.input.formControl} placeholder="Adresse physique..." />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Téléphone</label>
                 <input name="Etudiant_telephone" value={data.Etudiant_telephone || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div className="md:col-span-2">
                 <label className={AppStyles.input.label}>Email</label>
                 <input type="email" name="Etudiant_mail" value={data.Etudiant_mail || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
           </div>
        </div>

        {/* SECTION 3: BACCALAUREAT */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
           <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
             <FaGraduationCap /> Informations Bacc
           </h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                 <label className={AppStyles.input.label}>Année Bacc</label>
                 <input type="number" name="Etudiant_bacc_annee" value={data.Etudiant_bacc_annee || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Série</label>
                 <input name="Etudiant_bacc_serie" value={data.Etudiant_bacc_serie || ""} onChange={onChange} className={AppStyles.input.formControl} placeholder="A, C, D..." />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Numéro Bacc</label>
                 <input name="Etudiant_bacc_numero" value={data.Etudiant_bacc_numero || ""} onChange={onChange} className={AppStyles.input.formControl} />
              </div>
              <div>
                 <label className={AppStyles.input.label}>Mention</label>
                 <select name="Etudiant_bacc_mention" value={data.Etudiant_bacc_mention || ""} onChange={onChange} className={AppStyles.input.formControl}>
                    <option value="">-- Choisir --</option>
                    <option value="Passable">Passable</option>
                    <option value="Assez Bien">Assez Bien</option>
                    <option value="Bien">Bien</option>
                    <option value="Très Bien">Très Bien</option>
                 </select>
              </div>
           </div>
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} justify-center py-3`}>
            {isSubmitting ? <SpinnerIcon className="animate-spin mr-2" /> : <FaSave className="mr-2" />} 
            Enregistrer l'étudiant
        </button>
      </form>
    </DraggableModal>
  );
};

// --- FORMULAIRE ENSEIGNANT ---
export const TeacherFormModal = ({ isOpen, onClose, data, onChange, onSubmit, isSubmitting, title, composantesList = [] }) => {
    return (
      <DraggableModal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Identité */}
             <div className="col-span-2">
                 <h4 className="text-xs font-bold text-gray-400 uppercase border-b mb-2 pb-1">Identité</h4>
             </div>
             
             <div>
                <label className={AppStyles.input.label}>Matricule</label>
                <input name="Enseignant_matricule" value={data.Enseignant_matricule || ""} onChange={onChange} className={AppStyles.input.formControl} />
             </div>
             <div>
                <label className={AppStyles.input.label}>Nom <span className="text-red-500">*</span></label>
                <input required name="Enseignant_nom" value={data.Enseignant_nom || ""} onChange={onChange} className={AppStyles.input.formControl} />
             </div>
             <div>
                <label className={AppStyles.input.label}>Prénoms</label>
                <input name="Enseignant_prenoms" value={data.Enseignant_prenoms || ""} onChange={onChange} className={AppStyles.input.formControl} />
             </div>
             <div>
                <label className={AppStyles.input.label}>Sexe</label>
                <select name="Enseignant_sexe" value={data.Enseignant_sexe || ""} onChange={onChange} className={AppStyles.input.formControl}>
                   <option value="">-- Choisir --</option>
                   <option value="M">Masculin</option>
                   <option value="F">Féminin</option>
                </select>
             </div>

             {/* Pro */}
             <div className="col-span-2 mt-2">
                 <h4 className="text-xs font-bold text-gray-400 uppercase border-b mb-2 pb-1">Info Professionnelle</h4>
             </div>

             <div>
                <label className={AppStyles.input.label}>Statut <span className="text-red-500">*</span></label>
                <select required name="Enseignant_statut" value={data.Enseignant_statut || "PERM"} onChange={onChange} className={AppStyles.input.formControl}>
                   <option value="PERM">Permanent</option>
                   <option value="VAC">Vacataire</option>
                </select>
             </div>
             <div>
                <label className={AppStyles.input.label}>Grade</label>
                <input name="Enseignant_grade" value={data.Enseignant_grade || ""} onChange={onChange} className={AppStyles.input.formControl} placeholder="ex: Maître de Conférences" />
             </div>
             <div className="col-span-2">
                <label className={AppStyles.input.label}>Affectation (Composante)</label>
                <select name="Composante_id_affectation_fk" value={data.Composante_id_affectation_fk || ""} onChange={onChange} className={AppStyles.input.formControl}>
                   <option value="">-- Aucune / Transversale --</option>
                   {composantesList.map(c => (
                       <option key={c.Composante_id} value={c.Composante_id}>{c.Composante_label}</option>
                   ))}
                </select>
             </div>

             {/* Contact */}
             <div className="col-span-2 mt-2">
                 <h4 className="text-xs font-bold text-gray-400 uppercase border-b mb-2 pb-1">Contact</h4>
             </div>
             <div>
                <label className={AppStyles.input.label}>Email</label>
                <input type="email" name="Enseignant_mail" value={data.Enseignant_mail || ""} onChange={onChange} className={AppStyles.input.formControl} />
             </div>
             <div>
                <label className={AppStyles.input.label}>Téléphone</label>
                <input name="Enseignant_telephone" value={data.Enseignant_telephone || ""} onChange={onChange} className={AppStyles.input.formControl} />
             </div>
          </div>
  
          <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} justify-center py-3`}>
              {isSubmitting ? <SpinnerIcon className="animate-spin mr-2" /> : <FaSave className="mr-2" />} 
              Enregistrer l'enseignant
          </button>
        </form>
      </DraggableModal>
    );
  };