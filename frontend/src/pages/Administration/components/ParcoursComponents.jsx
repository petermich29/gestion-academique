// src/pages/Administration/components/ParcoursComponents.jsx
import React from "react";
import { FaEdit, FaTrash, FaListUl, FaMinus, FaCalendarAlt, FaExclamationTriangle, FaSave, FaTimes, FaCheck, FaPlus } from "react-icons/fa";
import { DraggableModal } from "../../../components/ui/Modal";
import { SpinnerIcon, PlusIcon } from "../../../components/ui/Icons";
import { AppStyles } from "../../../components/ui/AppStyles";

// --- 1. COMPOSANT D'AFFICHAGE DES UEs (Grille ou Liste) ---
export const StructureView = ({ view, semestres, searchTerm, openModal, openEcModal, setUeToDelete, setDeleteModalOpen }) => {
  return semestres.map((sem) => {
    const filteredUEs = sem.ues.filter(ue =>
      ue.intitule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ue.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (searchTerm && filteredUEs.length === 0) return null;

    const totalCreditsSemestre = sem.ues.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);
    const totalCreditsFiltered = filteredUEs.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);

    return (
      <div key={sem.id} className="space-y-4">
        {/* Header Semestre */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800">Semestre {sem.numero}</span>
              <span className="text-xs text-gray-500">
                {sem.ues.length} Unité(s) • Total {totalCreditsSemestre} Crédits
              </span>
            </div>
          </div>
          <button onClick={() => openModal(sem.id)} className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-2 transition-colors">
            <FaPlus className="text-[10px]" /> Ajouter une UE
          </button>
        </div>

        {/* Contenu */}
        {filteredUEs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <p className="text-gray-400 text-sm">Aucune UE trouvée pour ce semestre.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5">
            {filteredUEs.map(ue => (
              <UeGridItem 
                key={ue.id} ue={ue} semId={sem.id} 
                openModal={openModal} openEcModal={openEcModal} 
                setUeToDelete={setUeToDelete} setDeleteModalOpen={setDeleteModalOpen} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 w-24">Code</th>
                  <th className="p-4 w-1/4">Intitulé de l'UE</th>
                  <th className="p-4 w-32 text-center">Crédits</th>
                  <th className="p-4">Modules (EC)</th>
                  <th className="p-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredUEs.map(ue => (
                   <UeListItem 
                     key={ue.id} ue={ue} semId={sem.id} 
                     openModal={openModal} openEcModal={openEcModal}
                     setUeToDelete={setUeToDelete} setDeleteModalOpen={setDeleteModalOpen} 
                     totalCreditsFiltered={totalCreditsFiltered} // Note: Passed strictly for matching props if needed, used in tfoot usually
                   />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan="2" className="p-3 text-right text-xs font-bold text-gray-500">TOTAL SEMESTRE</td>
                  <td className="p-3 text-center text-xs font-bold text-gray-800">{totalCreditsFiltered} / 30</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  });
};

// Sous-composant : Item Grille
const UeGridItem = ({ ue, semId, openModal, setUeToDelete, setDeleteModalOpen, openEcModal }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:border-blue-300 transition-all duration-200 flex flex-col h-full group relative overflow-hidden">
    <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{ue.code}</span>
        <div className="flex gap-1">
          <button onClick={() => openModal(semId, ue)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors" title="Modifier"><FaEdit size={12} /></button>
          <button onClick={() => { setUeToDelete(ue); setDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Supprimer"><FaTrash size={12} /></button>
        </div>
      </div>
      <h3 className="font-bold text-gray-800 text-sm leading-tight mb-3 line-clamp-2 min-h-[2.5em]" title={ue.intitule}>{ue.intitule}</h3>
      <div className="flex-grow mb-3">
        {ue.ecs && ue.ecs.length > 0 ? (
          <div className="space-y-1.5">
            {ue.ecs.map(ec => (
              <div key={ec.id} className="flex items-start gap-2 text-[13px] text-gray-600">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0 mt-1.5"></div>
                <span className="leading-tight">{ec.intitule}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 italic pl-1 flex items-center gap-1"><FaMinus className="text-[8px]" /> Pas de modules</div>
        )}
      </div>
      <div className="flex items-center justify-between mt-auto border-t border-gray-50 pt-3">
        <button onClick={() => openEcModal(ue)} className="text-xs text-gray-500 hover:text-blue-700 font-medium flex items-center gap-1 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
          <FaListUl className="text-[10px]" /> Modules ({ue.ecs?.length || 0})
        </button>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold text-gray-800 leading-none">{ue.credit}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase">Crédits</span>
        </div>
      </div>
    </div>
  </div>
);

// Sous-composant : Item Liste
const UeListItem = ({ ue, semId, openModal, setUeToDelete, setDeleteModalOpen, openEcModal }) => (
  <tr className="hover:bg-blue-50/30 transition-colors group">
    <td className="p-4 font-mono font-bold text-gray-600 text-xs align-top pt-5">{ue.code}</td>
    <td className="p-4 font-medium text-gray-800 align-top pt-5">{ue.intitule}</td>
    <td className="p-4 text-center align-top pt-5">
      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{ue.credit} pts</span>
    </td>
    <td className="p-4 align-top">
      {ue.ecs && ue.ecs.length > 0 ? (
        <div className="text-xs text-gray-700 leading-relaxed cursor-pointer p-2 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all" onClick={() => openEcModal(ue)} title="Cliquez pour gérer les modules">
          {ue.ecs.map((ec, idx) => (
            <span key={ec.id}>
              <span className="font-medium">{ec.intitule}</span>
              <span className="text-gray-500 font-mono ml-0.5">({parseFloat(ec.coefficient || 0).toFixed(1) * 1})</span>
              {idx < ue.ecs.length - 1 && <span className="mr-1 text-gray-400">,</span>}
            </span>
          ))}
        </div>
      ) : (
        <button onClick={() => openEcModal(ue)} className="text-gray-400 italic text-xs hover:text-blue-600 hover:underline p-2">Aucun module (Ajouter)</button>
      )}
    </td>
    <td className="p-4 text-right align-top pt-4">
      <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onClick={() => openModal(semId, ue)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded" title="Modifier"><FaEdit /></button>
        <button onClick={() => { setUeToDelete(ue); setDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded" title="Supprimer"><FaTrash /></button>
      </div>
    </td>
  </tr>
);


// --- 2. MODALE FORMULAIRE UE ---
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

// --- 3. MODALE GESTION EC ---
export const EcManagerModal = ({ isOpen, onClose, ue, editingEcId, editEcData, setEditEcData, ecForm, setEcForm, handleAddEC, handleUpdateEC, handleDeleteEC, startEditEC, cancelEditEC, isEcSubmitting, errors }) => {
  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={ue ? `Modules de ${ue.code}` : "Gestion Modules"} width="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6 h-[500px]">
        {/* Colonne Gauche : Liste des ECs */}
        <div className="flex-1 flex flex-col border-r border-gray-100 pr-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
            <span><FaListUl className="text-blue-500 inline mr-2" /> Éléments Constitutifs</span>
            <span className="text-xs font-normal text-gray-500">Coeff Total: <span className="text-blue-600 font-bold ml-1">{ue?.ecs?.reduce((acc, curr) => acc + (parseFloat(curr.coefficient) || 0), 0).toFixed(2).replace(/\.?0+$/, '') || 0}</span></span>
          </h4>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {ue?.ecs && ue.ecs.length > 0 ? (
              ue.ecs.map((ec) => (
                <div key={ec.id} className={`bg-white border rounded-lg p-2 shadow-sm transition-all ${editingEcId === ec.id ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300 group"}`}>
                  {editingEcId === ec.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input className="w-24 text-xs border border-gray-300 rounded px-2 py-1 font-mono focus:border-blue-500 outline-none" value={editEcData.code} onChange={(e) => setEditEcData({ ...editEcData, code: e.target.value })} placeholder="Code" />
                        <input type="number" min="0" step="0.01" className="w-16 text-xs border border-gray-300 rounded px-2 py-1 text-center font-bold text-blue-600 focus:border-blue-500 outline-none" value={editEcData.coefficient} onChange={(e) => setEditEcData({ ...editEcData, coefficient: parseFloat(e.target.value) || 0 })} title="Coefficient" />
                      </div>
                      <textarea className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 outline-none resize-none" rows="2" value={editEcData.intitule} onChange={(e) => setEditEcData({ ...editEcData, intitule: e.target.value })} placeholder="Intitulé" />
                      <div className="flex justify-end gap-2 mt-1">
                        <button onClick={cancelEditEC} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"><FaTimes className="inline mr-1" />Annuler</button>
                        <button onClick={handleUpdateEC} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold"><FaCheck className="inline mr-1" />Sauvegarder</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono bg-gray-100 px-1 rounded text-gray-600 font-bold border border-gray-200">{ec.code}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">Coef. {parseFloat(ec.coefficient).toFixed(2).replace(/\.?0+$/, '')}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{ec.intitule}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditEC(ec)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifier"><FaEdit size={12} /></button>
                        <button onClick={() => handleDeleteEC(ec.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Supprimer"><FaTrash size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-xs italic">Aucun module.</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite : Formulaire Ajout EC */}
        <div className={`w-full md:w-64 flex flex-col bg-gray-50 p-4 rounded-lg border border-gray-100 flex-shrink-0 ${editingEcId ? "opacity-50 pointer-events-none grayscale" : ""}`}>
          <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FaPlus className="text-green-600" /> Nouveau Module</h4>
          <form onSubmit={handleAddEC} className="space-y-3 flex-1 flex flex-col">
            {errors.ec_form && <div className="text-red-600 text-xs p-2 bg-red-100 border border-red-200 rounded">{errors.ec_form}</div>}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Code EC <span className="text-red-500">*</span></label>
              <input required className={AppStyles.input.formControl} value={ecForm.code} onChange={e => setEcForm({ ...ecForm, code: e.target.value })} placeholder="ex: MATH101" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Intitulé <span className="text-red-500">*</span></label>
              <textarea required className={`${AppStyles.input.formControl} min-h-[80px]`} value={ecForm.intitule} onChange={e => setEcForm({ ...ecForm, intitule: e.target.value })} placeholder="Nom du module..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Coefficient</label>
              <input type="number" min="0" step="0.01" className={AppStyles.input.formControl} value={ecForm.coefficient} onChange={e => setEcForm({ ...ecForm, coefficient: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="mt-auto pt-4">
              <button type="submit" disabled={isEcSubmitting} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex justify-center items-center gap-2">
                {isEcSubmitting ? <SpinnerIcon className="animate-spin" /> : <FaPlus />} Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>
    </DraggableModal>
  );
};