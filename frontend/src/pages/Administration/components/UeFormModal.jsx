// src/pages/Administration/components/UeFormModal.jsx
import React from "react";
import { FaCalendarAlt, FaExclamationTriangle, FaSave } from "react-icons/fa";
import { DraggableModal } from "../../../components/ui/Modal";
import { SpinnerIcon } from "../../../components/ui/Icons";
import { AppStyles } from "../../../components/ui/AppStyles";

export const UeFormModal = ({ isOpen, onClose, editUE, form, setForm, errors, isSubmitting, handleSubmit, semestresList, selectedYearLabel, nextUeId, maxCreditsAllowed }) => {
  const maxRangeValue = Math.max(1, maxCreditsAllowed);
  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={editUE ? "Modifier UE" : "Nouvelle UE"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100 mb-2 flex items-center gap-2">
          <FaCalendarAlt /> Rattachée à l'année : <strong>{selectedYearLabel}</strong>
        </div>

        {editUE && (form.code !== editUE.code || form.intitule !== editUE.intitule) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3 mb-3">
              <FaExclamationTriangle className="text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-orange-800">Modification de référence détectée</h4>
                <p className="text-xs text-orange-700 mt-1">Vous avez modifié le Code ou l'Intitulé. Comment souhaitez-vous appliquer ce changement ?</p>
              </div>
            </div>
            <div className="space-y-3 pl-2">
              <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${form.update_mode === 'global' ? 'bg-white border-orange-400 shadow-sm' : 'border-transparent hover:bg-orange-100/50'}`}>
                <input type="radio" name="update_mode" value="global" checked={form.update_mode === 'global'} onChange={(e) => setForm({ ...form, update_mode: e.target.value })} className="mt-1 text-orange-600 focus:ring-orange-500" />
                <div className="flex-1">
                  <span className="block text-sm font-bold text-gray-800">Correction Globale</span>
                  <span className="block text-xs text-gray-500">Renomme l'UE existante. Impacte toutes les années et parcours liés.</span>
                  <div className="mt-2 text-xs bg-gray-100 inline-block px-2 py-1 rounded text-gray-600 font-mono">ID Catalogue : <strong>{editUE.id_catalog}</strong> (Inchangé)</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${form.update_mode === 'fork' ? 'bg-white border-blue-400 shadow-sm' : 'border-transparent hover:bg-blue-50'}`}>
                <input type="radio" name="update_mode" value="fork" checked={form.update_mode === 'fork'} onChange={(e) => setForm({ ...form, update_mode: e.target.value })} className="mt-1 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <span className="block text-sm font-bold text-gray-800">Créer une nouvelle version (Fork)</span>
                  <span className="block text-xs text-gray-500">Détache cette maquette de l'ancienne UE et crée une nouvelle entrée catalogue.</span>
                  <div className="mt-2 text-xs bg-blue-100 inline-block px-2 py-1 rounded text-blue-700 font-mono border border-blue-200">Nouvel ID prévu : <strong>{nextUeId}</strong></div>
                </div>
              </label>
            </div>
          </div>
        )}

        {errors.global && <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-100 rounded">{errors.global}</div>}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre <span className="text-red-500">*</span></label>
          <select name="semestre_id" value={form.semestre_id} onChange={e => setForm({ ...form, semestre_id: e.target.value })} className={AppStyles.input.formControl} required>
            <option value="">-- Sélectionner --</option>
            {semestresList.map(s => <option key={s.Semestre_id} value={s.Semestre_id}>{s.Semestre_numero}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
            <input name="code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className={AppStyles.input.formControl} placeholder="UE_..." required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Intitulé <span className="text-red-500">*</span></label>
            <input name="intitule" value={form.intitule} onChange={e => setForm({ ...form, intitule: e.target.value })} className={AppStyles.input.formControl} required />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Crédits <span className="text-xs font-normal text-gray-500">(Restant: {maxCreditsAllowed})</span></label>
            <span className={`text-sm font-bold ${maxCreditsAllowed === 0 ? "text-red-500" : form.credit === maxCreditsAllowed ? "text-orange-500" : "text-blue-600"}`}>{form.credit} / 30</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400">1</span>
            <input type="range" min="1" max={maxRangeValue} value={form.credit} disabled={maxCreditsAllowed === 0} onChange={e => setForm({ ...form, credit: parseInt(e.target.value) })} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${maxCreditsAllowed === 0 ? "bg-gray-200" : "bg-gray-200 accent-blue-600"}`} />
            <span className="text-xs font-bold text-gray-400">{maxRangeValue}</span>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} mt-2 justify-center`}>
          {isSubmitting ? <SpinnerIcon className="animate-spin inline mr-2" /> : <FaSave className="inline mr-2" />} Enregistrer
        </button>
      </form>
    </DraggableModal>
  );
};