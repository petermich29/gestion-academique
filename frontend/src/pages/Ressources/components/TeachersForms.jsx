// frontend\src\pages\Ressources\components\TeachersForms.jsx
import React, { useEffect } from "react";
import { DraggableModal } from "../../../components/ui/Modal";
import { AppStyles } from "../../../components/ui/AppStyles";
import { SpinnerIcon } from "../../../components/ui/Icons";
import { FaSave, FaUser, FaGraduationCap, FaAddressCard, FaBriefcase } from "react-icons/fa";

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