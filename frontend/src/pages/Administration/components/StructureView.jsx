// src/pages/Administration/components/StructureView.jsx
import React from "react";
import { FaEdit, FaTrash, FaListUl, FaMinus, FaPlus } from "react-icons/fa";

// --- UTILITAIRE FORMATAGE ---
const formatHeures = (val) => {
    const num = parseFloat(val);
    return isNaN(num) || num === 0 ? null : num;
};

const getTypeEnseignementCode = (vol, typesEnseignement = []) => {
  if (!vol) return "?";
  if (vol.type_enseignement_code) return vol.type_enseignement_code;

  const typeId = vol.type_enseignement_id || vol.TypeEnseignement_id_fk || vol.type_id;

  const match = typesEnseignement.find(t => 
    String(t.id) === String(typeId) || 
    String(t.TypeEnseignement_id) === String(typeId)
  );

  return match?.TypeEnseignement_code || match?.code || "?";
};

// --- COMPOSANT BADGE (Minimaliste) ---
const VolumeBadge = ({ type, heures }) => {
    if (!heures) return null;
    // Couleurs soft pour ne pas surcharger la vue
    const colors = {
        "CM": "text-purple-600 bg-purple-50 border-purple-100",
        "TD": "text-blue-600 bg-blue-50 border-blue-100",
        "TP": "text-orange-600 bg-orange-50 border-orange-100",
    };
    const style = colors[type] || "text-gray-500 bg-gray-50 border-gray-200";

    return (
        <span className={`text-[9px] font-bold px-1 rounded border ${style} flex items-center gap-0.5 ml-1 leading-none h-4`}>
            {type} {heures}h
        </span>
    );
};

// --- VUE PRINCIPALE ---
export const StructureView = ({
  view,
  semestres,
  searchTerm,
  openModal,
  openEcModal,
  setUeToDelete,
  setDeleteModalOpen,
  typesEnseignement
}) => {

  if (!semestres || !Array.isArray(semestres)) {
    return <div className="text-center py-10 text-gray-500">Chargement de la structure...</div>;
  }

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
                key={ue.id}
                ue={ue}
                semId={sem.id}
                openModal={openModal}
                openEcModal={openEcModal}
                setUeToDelete={setUeToDelete}
                setDeleteModalOpen={setDeleteModalOpen}
                typesEnseignement={typesEnseignement}
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
                      key={ue.id}
                      ue={ue}
                      semId={sem.id}
                      openModal={openModal}
                      openEcModal={openEcModal}
                      setUeToDelete={setUeToDelete}
                      setDeleteModalOpen={setDeleteModalOpen}
                      typesEnseignement={typesEnseignement}
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

// --- ITEMS MODIFIÉS POUR INCLURE LES VOLUMES ---

const UeGridItem = ({ 
  ue,
  semId,
  openModal,
  setUeToDelete,
  setDeleteModalOpen,
  openEcModal,
  typesEnseignement
}) => (
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
          <div className="space-y-2">
            {ue.ecs.map(ec => (
              <div key={ec.id} className="flex flex-col text-[13px] text-gray-600 leading-tight">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0 mt-1.5"></div>
                  <span className="leading-tight">{ec.intitule}</span>
                </div>
                {/* INSERTION VOLUMES HORAIRES DANS LA GRILLE */}
                {ec.volumes && ec.volumes.length > 0 && (
                   <div className="flex flex-wrap gap-1 pl-3.5 mt-0.5">
                       {ec.volumes.map(vol => (
                           <VolumeBadge key={vol.id} type={getTypeEnseignementCode(vol, typesEnseignement)}
                            heures={formatHeures(vol.heures)} />
                       ))}
                   </div>
                )}
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

const UeListItem = ({ 
  ue,
  semId,
  openModal,
  setUeToDelete,
  setDeleteModalOpen,
  openEcModal,
  typesEnseignement
}) => (
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
            <div key={ec.id} className="mb-1 last:mb-0 flex items-center flex-wrap gap-1">
              <span className="font-medium">• {ec.intitule}</span>
              <span className="text-gray-500 font-mono text-[10px]"> (Coeff {parseFloat(ec.coefficient || 0).toFixed(1) * 1})</span>
              
              {/* INSERTION VOLUMES HORAIRES DANS LA LISTE */}
              {ec.volumes && ec.volumes.length > 0 && (
                  <div className="flex gap-1 ml-1">
                      {ec.volumes.map(vol => (
                          <VolumeBadge key={vol.id} type={getTypeEnseignementCode(vol, typesEnseignement)}
 heures={formatHeures(vol.heures)} />
                      ))}
                  </div>
              )}
            </div>
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