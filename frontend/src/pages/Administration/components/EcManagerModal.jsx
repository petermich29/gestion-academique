import React, { useState, useEffect } from "react";
import { 
  FaEdit, FaTrash, FaListUl, FaTimes, FaCheck, FaPlus, 
  FaClock, FaArrowLeft, FaSave, FaExclamationTriangle, FaUndo 
} from "react-icons/fa";
import { DraggableModal } from "../../../components/ui/Modal";
import { SpinnerIcon } from "../../../components/ui/Icons";
import { AppStyles } from "../../../components/ui/AppStyles";
import ECDeleteConfirmModal from "./ECDeleteConfirmModal";

const API_BASE_URL = "http://127.0.0.1:8000";

// --- HELPERS ---
const formatHeures = (vol) => {
    if (!vol) return 0;
    const val = vol.heures !== undefined ? vol.heures : vol.Volume_heures;
    return parseFloat(val) || 0;
};

const getTypeCode = (vol, types) => {
    if (!vol) return "?";
    if (vol.type_enseignement_code) return vol.type_enseignement_code;
    const typeId = vol.type_enseignement_id || vol.TypeEnseignement_id_fk || vol.type_id;
    return types?.find(t => String(t.TypeEnseignement_id) === String(typeId))?.TypeEnseignement_code || "?";
};

const generateTempId = (prefix) => `${prefix}_TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isTempId = (id) => id && String(id).includes("_TEMP_");

export const EcManagerModal = ({ isOpen, onClose, ue, onSaveSuccess }) => {
    const [localEcs, setLocalEcs] = useState([]);
    const [typesEnseignement, setTypesEnseignement] = useState([]);
    const [activeEcId, setActiveEcId] = useState(null);
    const [editingEcId, setEditingEcId] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [ecToDelete, setEcToDelete] = useState(null);

    const [ecForm, setEcForm] = useState({ code: "", intitule: "", coefficient: 1.0 });
    const [editEcData, setEditEcData] = useState({ code: "", intitule: "", coefficient: 1.0 });
    const [volumeForm, setVolumeForm] = useState({ type_id: "", heures: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetch(`${API_BASE_URL}/api/metadonnees/types-enseignement`)
                .then(res => res.json()).then(setTypesEnseignement).catch(console.error);
            setLocalEcs(ue?.ecs ? JSON.parse(JSON.stringify(ue.ecs)) : []);
            setActiveEcId(null); setEditingEcId(null); setErrorMsg(null);
            setEcForm({ code: "", intitule: "", coefficient: 1.0 });
        }
    }, [isOpen, ue]);

    // --- HANDLERS EC ---
    const handleLocalAddEC = (e) => {
        e.preventDefault();
        const newEc = { id: generateTempId("MEC"), code: ecForm.code.toUpperCase(), intitule: ecForm.intitule, coefficient: parseFloat(ecForm.coefficient) || 0, volumes: [], isNew: true };
        setLocalEcs([...localEcs, newEc]);
        setEcForm({ code: "", intitule: "", coefficient: 1.0 });
        setActiveEcId(newEc.id);
    };

    const saveEditLocalEC = (e) => {
        e.stopPropagation();
        setLocalEcs(localEcs.map(ec => ec.id === editingEcId ? { ...ec, code: editEcData.code.toUpperCase(), intitule: editEcData.intitule, coefficient: parseFloat(editEcData.coefficient) || 0 } : ec));
        setEditingEcId(null);
    };

    // --- HANDLERS VOLUMES ---
    const handleLocalAddVolume = (e) => {
        e.preventDefault();
        const typeInfo = typesEnseignement.find(t => String(t.TypeEnseignement_id) === String(volumeForm.type_id));
        setLocalEcs(prev => prev.map(ec => {
            if (ec.id === activeEcId) {
                if (ec.volumes?.some(v => String(v.type_enseignement_id || v.TypeEnseignement_id_fk) === String(volumeForm.type_id))) {
                    alert("Type déjà présent"); return ec;
                }
                return { ...ec, volumes: [...(ec.volumes || []), { id: generateTempId("VOL"), type_enseignement_id: volumeForm.type_id, type_enseignement_code: typeInfo?.TypeEnseignement_code, heures: parseFloat(volumeForm.heures) }] };
            }
            return ec;
        }));
        setVolumeForm({ type_id: "", heures: "" });
    };

    const handleLocalDeleteVolume = (volId) => {
        setLocalEcs(prev => prev.map(ec => ec.id === activeEcId ? { ...ec, volumes: ec.volumes.filter(v => v.id !== volId) } : ec));
    };

    // --- SAVE ---
    const handleGlobalSave = async () => {
        setIsSaving(true); setErrorMsg(null);
        try {
            const payload = {
                ue_id: ue.id,
                ecs: localEcs.map(ec => ({
                    id_maquette_ec: isTempId(ec.id) ? null : ec.id,
                    code: ec.code, intitule: ec.intitule, coefficient: parseFloat(ec.coefficient) || 0,
                    volumes: (ec.volumes || []).map(v => ({
                        id: isTempId(v.id) ? null : v.id,
                        type_enseignement_id: v.type_enseignement_id || v.TypeEnseignement_id_fk || v.type_id,
                        heures: formatHeures(v)
                    }))
                }))
            };
            const res = await fetch(`${API_BASE_URL}/api/ecs/maquette/bulk-update`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error("Erreur serveur");
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err) { setErrorMsg(err.message); } finally { setIsSaving(false); }
    };

    const activeEc = localEcs.find(e => e.id === activeEcId);
    const totalCoeff = localEcs.reduce((acc, curr) => acc + (parseFloat(curr.coefficient) || 0), 0);

    return (
        <DraggableModal isOpen={isOpen} onClose={onClose} title={ue ? `Modules : ${ue.code}` : "Modules"} width="max-w-5xl">
            <div className="flex flex-col h-[600px]">
                <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden pb-2">
                    {/* LISTE EC */}
                    <div className="flex-1 flex flex-col border-r border-gray-100 pr-2 overflow-hidden">
                        <div className="flex justify-between items-end mb-3 border-b pb-2 px-1 text-xs">
                            <h4 className="font-bold text-gray-700 flex items-center"><FaListUl className="text-blue-500 mr-2" /> Liste</h4>
                            <div className="bg-gray-100 px-2 py-1 rounded">Total Coeff: <span className="text-blue-600 font-bold">{totalCoeff.toFixed(2)}</span></div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 p-1 custom-scrollbar">
                            {localEcs.map(ec => (
                                <div key={ec.id} onClick={() => editingEcId !== ec.id && setActiveEcId(ec.id)} className={`p-3 border rounded-lg transition-all cursor-pointer ${activeEcId === ec.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                                    {editingEcId === ec.id ? (
                                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                            <div className="flex gap-2">
                                                <input className={`${AppStyles.input.formControl} w-24 text-xs`} value={editEcData.code} onChange={e => setEditEcData({...editEcData, code: e.target.value})} />
                                                <input type="number" className={`${AppStyles.input.formControl} w-16 text-xs`} value={editEcData.coefficient} onChange={e => setEditEcData({...editEcData, coefficient: e.target.value})} />
                                            </div>
                                            <textarea className={`${AppStyles.input.formControl} text-xs`} rows="2" value={editEcData.intitule} onChange={e => setEditEcData({...editEcData, intitule: e.target.value})} />
                                            <div className="flex justify-end gap-2"><button onClick={() => setEditingEcId(null)} className="p-1 text-gray-500"><FaUndo/></button><button onClick={saveEditLocalEC} className="p-1 text-green-600"><FaCheck/></button></div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 text-[10px]">
                                                    <span className="font-mono bg-gray-200 px-1 rounded">{ec.code}</span>
                                                    <span className="text-blue-600 font-bold border px-1 rounded">Coef. {parseFloat(ec.coefficient).toFixed(2)}</span>
                                                    {isTempId(ec.id) && <span className="text-green-600">+ Neuf</span>}
                                                </div>
                                                <p className="text-sm font-medium">{ec.intitule}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {ec.volumes?.map(v => <span key={v.id} className="text-[9px] border px-1 rounded"><b className="text-blue-500">{getTypeCode(v, typesEnseignement)}</b> {formatHeures(v)}h</span>)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingEcId(ec.id); setEditEcData({code: ec.code, intitule: ec.intitule, coefficient: ec.coefficient}); }} className="p-1 text-gray-400 hover:text-blue-600"><FaEdit size={14}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEcToDelete(ec); setDeleteModalOpen(true); }} className="p-1 text-gray-400 hover:text-red-600"><FaTrash size={13}/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PANNEAU DROIT */}
                    <div className="w-full md:w-80 bg-gray-50 rounded-lg border p-4 flex flex-col">
                        {activeEc ? (
                            <>
                                <div className="mb-4 flex items-center gap-2 border-b pb-2">
                                    <button onClick={() => setActiveEcId(null)} className="p-1 hover:bg-gray-200 rounded-full"><FaArrowLeft/></button>
                                    <span className="text-sm font-bold truncate">{activeEc.code}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                    {activeEc.volumes?.map(vol => (
                                        <div key={vol.id} className="flex justify-between bg-white p-2 border rounded shadow-sm">
                                            <div className="text-xs"><b>{getTypeCode(vol, typesEnseignement)}</b> : {formatHeures(vol)}h</div>
                                            <button onClick={() => handleLocalDeleteVolume(vol.id)} className="text-red-400 hover:text-red-600"><FaTimes/></button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleLocalAddVolume} className="space-y-2 border-t pt-2">
                                    <select className={`${AppStyles.input.formControl} text-xs`} value={volumeForm.type_id} onChange={e => setVolumeForm({...volumeForm, type_id: e.target.value})} required>
                                        <option value="">Type d'heures</option>
                                        {typesEnseignement.map(t => <option key={t.TypeEnseignement_id} value={t.TypeEnseignement_id}>{t.TypeEnseignement_label}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <input type="number" step="0.5" className={`${AppStyles.input.formControl} text-xs`} placeholder="Heures" value={volumeForm.heures} onChange={e => setVolumeForm({...volumeForm, heures: e.target.value})} required />
                                        <button type="submit" className="bg-blue-600 text-white px-3 rounded"><FaPlus/></button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <form onSubmit={handleLocalAddEC} className="space-y-3">
                                <h4 className="text-sm font-bold border-b pb-2">Nouveau Module</h4>
                                <div><label className="text-xs text-gray-500">Code</label><input required className={AppStyles.input.formControl} value={ecForm.code} onChange={e => setEcForm({...ecForm, code: e.target.value})} /></div>
                                <div><label className="text-xs text-gray-500">Intitulé</label><textarea required className={`${AppStyles.input.formControl} h-20`} value={ecForm.intitule} onChange={e => setEcForm({...ecForm, intitule: e.target.value})} /></div>
                                <div><label className="text-xs text-gray-500">Coefficient</label><input type="number" className={AppStyles.input.formControl} value={ecForm.coefficient} onChange={e => setEcForm({...ecForm, coefficient: e.target.value})} /></div>
                                <button type="submit" className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 mt-4 flex items-center justify-center gap-2"><FaPlus/> Ajouter à la liste</button>
                            </form>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="pt-3 border-t flex justify-between items-center">
                    <div className="text-xs text-gray-400">{localEcs.length} module(s) configuré(s)</div>
                    <div className="flex items-center gap-3">
                        {errorMsg && <span className="text-xs text-red-600"><FaExclamationTriangle className="inline mr-1"/>{errorMsg}</span>}
                        <button onClick={onClose} className="text-sm text-gray-500 px-3">Annuler</button>
                        <button onClick={handleGlobalSave} disabled={isSaving} className="bg-green-600 text-white px-6 py-2 rounded shadow-md flex items-center gap-2 font-bold text-sm hover:bg-green-700">
                            {isSaving ? <SpinnerIcon className="animate-spin" /> : <FaSave />} Enregistrer
                        </button>
                    </div>
                </div>
            </div>

            <ECDeleteConfirmModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setEcToDelete(null); }} onConfirm={() => { setLocalEcs(prev => prev.filter(ec => ec.id !== ecToDelete.id)); if (activeEcId === ecToDelete.id) setActiveEcId(null); }} ecCode={ecToDelete?.code} ecIntitule={ecToDelete?.intitule} />
        </DraggableModal>
    );
};