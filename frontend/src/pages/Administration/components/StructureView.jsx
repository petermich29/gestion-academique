// src/pages/Administration/components/StructureView.jsx
import React, { useMemo } from "react";
import { FaEdit, FaTrash, FaListUl, FaMinus, FaPlus, FaClock } from "react-icons/fa";

// --- UTILITAIRES ---
const formatHeures = (vol) => {
    if (!vol) return null;
    const val = vol.heures !== undefined ? vol.heures : vol.Volume_heures;
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

// --- COMPOSANT BADGE (Pour la vue Grille) ---
const VolumeBadge = ({ type, heures }) => {
    if (!heures) return null;
    const colors = { 
        "CM": "text-purple-600 bg-purple-50 border-purple-100", 
        "TD": "text-blue-600 bg-blue-50 border-blue-100", 
        "TP": "text-orange-600 bg-orange-50 border-orange-100" 
    };
    return (
        <span className={`text-[9px] font-bold px-1 rounded border ${colors[type] || "text-gray-500 bg-gray-50 border-gray-200"} flex items-center gap-0.5 ml-1 leading-none h-4`}>
            {type} {heures}h
        </span>
    );
};

// --- VUE PRINCIPALE ---
export const StructureView = ({ view, semestres, searchTerm, openModal, openEcModal, setUeToDelete, setDeleteModalOpen, typesEnseignement }) => {
  if (!semestres || !Array.isArray(semestres)) return <div className="text-center py-10 text-gray-500">Chargement de la structure...</div>;

  return semestres.map((sem) => {
    const filteredUEs = sem.ues.filter(ue => 
        ue.intitule.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ue.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // CALCUL DU TOTAL DES HEURES DU SEMESTRE
    const totalHeuresSemestre = sem.ues.reduce((accSem, ue) => {
        const ueTotal = ue.ecs?.reduce((accUE, ec) => {
            return accUE + (ec.volumes?.reduce((accEC, v) => accEC + (formatHeures(v) || 0), 0) || 0);
        }, 0) || 0;
        return accSem + ueTotal;
    }, 0);

    if (searchTerm && filteredUEs.length === 0) return null;
    const totalCreditsSemestre = sem.ues.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);
    const totalCreditsFiltered = filteredUEs.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);

    return (
      <div key={sem.id} className="space-y-4 mb-10">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex flex-col">
            {/* Titre du semestre */}
            <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-800">Semestre {sem.numero}</span>
            </div>

            {/* Ligne d'infos alignée : Unités, Crédits et Volume Horaire */}
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                    {sem.ues.length} Unité(s) • Total {totalCreditsSemestre} Crédits
                </span>
                
                {totalHeuresSemestre > 0 && (
                    <>
                        <span className="text-gray-300 text-xs">•</span>
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <FaClock className="text-[9px]" /> {totalHeuresSemestre}h Total
                        </span>
                    </>
                )}
            </div>
          </div>

          <button onClick={() => openModal(sem.id)} className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-2 transition-colors">
            <FaPlus className="text-[10px]" /> Ajouter une UE
          </button>
        </div>

        {filteredUEs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <p className="text-gray-400 text-sm">Aucune UE trouvée.</p>
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
                  <th className="p-4 w-20 text-center">Crédits</th>
                  <th className="p-4">Détail des Modules (EC)</th>
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
                    <td colSpan="2" className="p-3 text-right text-xs font-bold text-gray-500 uppercase">Récapitulatif Semestre</td>
                    <td className="p-3 text-center text-xs font-bold text-gray-800 border-x border-gray-100">{totalCreditsFiltered} / 30 ECTS</td>
                    <td colSpan="2" className="p-3 text-left text-xs font-bold text-blue-700 bg-blue-50/50">
                        Total : {totalHeuresSemestre} heures de cours
                    </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  });
};

// --- ITEM GRILLE (Miniatures) ---
const UeGridItem = ({ ue, semId, typesEnseignement, openModal, openEcModal, setUeToDelete, setDeleteModalOpen }) => {
    const ueTotalHeures = useMemo(() => {
        return ue.ecs?.reduce((totalUE, ec) => {
            const ecTotal = ec.volumes?.reduce((sum, v) => sum + (formatHeures(v) || 0), 0) || 0;
            return totalUE + ecTotal;
        }, 0) || 0;
    }, [ue.ecs]);

    return (
        <div className="relative bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col h-full min-h-[220px]">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={(e) => { e.stopPropagation(); openModal(semId, ue); }} className="bg-white/90 shadow-sm border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white p-1.5 rounded-lg transition-colors"><FaEdit size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); setUeToDelete(ue); setDeleteModalOpen(true); }} className="bg-white/90 shadow-sm border border-gray-100 text-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded-lg transition-colors"><FaTrash size={12} /></button>
            </div>
            <div className="flex justify-between items-start mb-3 pr-14">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 leading-tight truncate" title={ue.intitule}>{ue.intitule}</h4>
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{ue.code}</span>
                </div>
            </div>
            <div className="space-y-2 mb-4 flex-1">
                {ue.ecs?.map(ec => {
                    const ecTotal = ec.volumes?.reduce((sum, v) => sum + (formatHeures(v) || 0), 0) || 0;
                    return (
                        <div key={ec.id} className="text-[11px] text-gray-600 flex flex-col bg-gray-50/50 p-1.5 rounded border border-gray-100/50">
                            <div className="flex justify-between items-start gap-2">
                                <span className="font-medium line-clamp-1 flex-1">• {ec.intitule}</span>
                                <span className="text-gray-400 shrink-0 italic">(Coeff {parseFloat(ec.coefficient || 0).toFixed(1) * 1})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex gap-1">
                                    {ec.volumes?.map((vol, idx) => (
                                        <VolumeBadge key={idx} type={getTypeEnseignementCode(vol, typesEnseignement)} heures={formatHeures(vol)} />
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">{ecTotal}h</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between mt-auto border-t border-gray-50 pt-3">
                <button onClick={() => openEcModal(ue)} className="text-xs text-gray-500 hover:text-blue-700 font-medium flex items-center gap-1 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors"><FaListUl className="text-[10px]" /> Modules ({ue.ecs?.length || 0})</button>
                <div className="flex gap-4 items-center">
                    {ueTotalHeures > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-blue-600 leading-none">{ueTotalHeures}h</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Volume</span>
                        </div>
                    )}
                    <div className="flex flex-col items-end border-l border-gray-100 pl-3">
                        <span className="text-lg font-bold text-gray-800 leading-none">{ue.credit}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Crédits</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ITEM LISTE ---
const UeListItem = ({ ue, semId, openModal, setUeToDelete, setDeleteModalOpen, openEcModal, typesEnseignement }) => {
    const uniqueTypes = useMemo(() => {
        const types = new Set();
        ue.ecs?.forEach(ec => ec.volumes?.forEach(v => types.add(getTypeEnseignementCode(v, typesEnseignement))));
        return Array.from(types).sort();
    }, [ue.ecs, typesEnseignement]);

    const ueTotalHeures = ue.ecs?.reduce((totalUE, ec) => {
        return totalUE + (ec.volumes?.reduce((sum, v) => sum + (formatHeures(v) || 0), 0) || 0);
    }, 0) || 0;

    return (
        <tr className="hover:bg-blue-50/30 transition-colors group">
            <td className="p-4 font-mono font-bold text-gray-600 text-xs align-top pt-5">{ue.code}</td>
            <td className="p-4 font-medium text-gray-800 align-top pt-5">{ue.intitule}</td>
            <td className="p-4 text-center align-top pt-5"><span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{ue.credit} pts</span></td>
            <td className="p-2 align-top">
                {ue.ecs && ue.ecs.length > 0 ? (
                    <div className="bg-white rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors" onClick={() => openEcModal(ue)}>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                    <th className="py-1 px-2 text-left font-semibold">Module</th>
                                    <th className="py-1 px-2 text-center font-semibold w-12">Coeff</th>
                                    {uniqueTypes.map(t => <th key={t} className="py-1 px-2 text-center font-semibold border-l border-gray-100 min-w-[30px]">{t}</th>)}
                                    <th className="py-1 px-2 text-center font-bold text-gray-700 border-l border-gray-200 bg-gray-100 w-14">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ue.ecs.map(ec => {
                                    const rowTotal = ec.volumes?.reduce((sum, v) => sum + (formatHeures(v) || 0), 0) || 0;
                                    return (
                                        <tr key={ec.id} className="hover:bg-gray-50">
                                            <td className="py-1.5 px-2 font-medium text-gray-700">{ec.intitule}</td>
                                            <td className="py-1.5 px-2 text-center text-gray-500 font-mono">{parseFloat(ec.coefficient || 0).toFixed(1)*1}</td>
                                            {uniqueTypes.map(typeCode => {
                                                const vol = ec.volumes?.find(v => getTypeEnseignementCode(v, typesEnseignement) === typeCode);
                                                const val = formatHeures(vol); 
                                                return (
                                                    <td key={typeCode} className="py-1.5 px-2 text-center border-l border-gray-50 text-gray-600">
                                                        {val ? <span className="font-semibold">{val}h</span> : <span className="text-gray-200">-</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-1.5 px-2 text-center font-bold text-blue-600 border-l border-gray-200 bg-gray-50/50">{rowTotal > 0 ? rowTotal + "h" : "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {ueTotalHeures > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-blue-50/30">
                                        <td colSpan={2 + uniqueTypes.length} className="py-2 px-2 text-right font-semibold text-gray-600">Total UE :</td>
                                        <td className="py-2 px-2 text-center font-black text-blue-700 bg-blue-100/50">{ueTotalHeures}h</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                ) : (
                    <button onClick={() => openEcModal(ue)} className="text-gray-400 italic text-xs hover:text-blue-600 hover:underline p-2 border border-dashed border-gray-200 rounded w-full text-left">Aucun module configuré</button>
                )}
            </td>
            <td className="p-4 text-right align-top pt-4">
                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(semId, ue)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded"><FaEdit /></button>
                    <button onClick={() => { setUeToDelete(ue); setDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded"><FaTrash /></button>
                </div>
            </td>
        </tr>
    );
};