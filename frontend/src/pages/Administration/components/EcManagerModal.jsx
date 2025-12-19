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

// --- UTILITAIRES ---
// Correction Robuste
const formatHeures = (vol) => {
    if (!vol) return 0; // Sécurité si vol est undefined
    const val = vol.heures !== undefined ? vol.heures : vol.Volume_heures;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num; 
};

const getTypeEnseignementCode = (vol, typesEnseignement) => {
  if (!vol || !typesEnseignement?.length) return "?";

  // Volume ajouté localement
  if (vol.type_enseignement_code) return vol.type_enseignement_code;

  const typeId =
    vol.type_enseignement_id ||
    vol.TypeEnseignement_id_fk ||
    vol.type_id;

  const type = typesEnseignement.find(
    t => String(t.id) === String(typeId)
  );

  return type?.code || "?";
};

// Génère un ID unique temporaire pour React (clé)
const generateTempId = (prefix) => `${prefix}_TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

export const EcManagerModal = ({ 
    isOpen, onClose, ue, onSaveSuccess
}) => {

  const [ecToDelete, setEcToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    
  // --- ÉTATS LOCAUX (SANDBOX) ---
  const [localEcs, setLocalEcs] = useState([]); 
  const [typesEnseignement, setTypesEnseignement] = useState([]);
  
  // États de sélection et d'édition
  const [activeEcId, setActiveEcId] = useState(null); // Pour gérer les volumes
  const [editingEcId, setEditingEcId] = useState(null); // Pour modifier un EC (nom, code...)
  
  // États Formulaires
  const [ecForm, setEcForm] = useState({ code: "", intitule: "", coefficient: 1.0 }); // Form ajout
  const [editEcData, setEditEcData] = useState({ code: "", intitule: "", coefficient: 1.0 }); // Form édition
  const [volumeForm, setVolumeForm] = useState({ type_id: "", heures: "" });
  
  // États Soumission
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
      if (isOpen) {
          // Charger les types d'enseignement
          fetch(`${API_BASE_URL}/api/metadonnees/types-enseignement`)
            .then(res => res.json())
            .then(data => {
                const normalized = data.map(t => ({
                id: t.TypeEnseignement_id,
                code: t.TypeEnseignement_code,
                label: t.TypeEnseignement_label
                }));
                setTypesEnseignement(normalized);
            })
            .catch(err => console.error("Erreur chargement types ens.", err));


          // CLONE PROFOND des données pour travailler en local sans toucher au parent
          if (ue && ue.ecs) {
              setLocalEcs(JSON.parse(JSON.stringify(ue.ecs)));
          } else {
              setLocalEcs([]);
          }
          
          // Reset UI
          setActiveEcId(null);
          setEditingEcId(null);
          setErrorMsg(null);
          setEcForm({ code: "", intitule: "", coefficient: 1.0 });
      }
  }, [isOpen, ue]);

  // --- GESTION LOCALE DES ECs (Ajout, Edit, Delete) ---

  const handleLocalAddEC = (e) => {
      e.preventDefault();
      if (!ecForm.code || !ecForm.intitule) return;

      const newEc = {
          id: generateTempId("MEC"), 
          code: ecForm.code.toUpperCase(),
          intitule: ecForm.intitule,
          coefficient: parseFloat(ecForm.coefficient) || 0,
          volumes: [],
          isNew: true 
      };

      setLocalEcs([...localEcs, newEc]);
      setEcForm({ code: "", intitule: "", coefficient: 1.0 }); 
      // Focus immédiat sur le nouvel EC pour ajouter des heures
      setActiveEcId(newEc.id);
  };

  // Activer le mode édition pour un EC
  const startEditLocalEC = (ec, e) => {
      e.stopPropagation(); // Empêcher la sélection de l'EC (volumes)
      setEditingEcId(ec.id);
      setEditEcData({ 
          code: ec.code, 
          intitule: ec.intitule, 
          coefficient: ec.coefficient 
      });
  };

  // Sauvegarder les modifications locales de l'EC
  const saveEditLocalEC = (e) => {
      e.stopPropagation();
      const updatedEcs = localEcs.map(ec => {
          if (ec.id === editingEcId) {
              return {
                  ...ec,
                  code: editEcData.code.toUpperCase(),
                  intitule: editEcData.intitule,
                  coefficient: parseFloat(editEcData.coefficient) || 0
              };
          }
          return ec;
      });
      setLocalEcs(updatedEcs);
      setEditingEcId(null);
  };

  // Supprimer un EC de la liste locale
  const handleLocalDeleteEC = (ec, e) => {
    e.stopPropagation();
    setEcToDelete(ec);
    setDeleteModalOpen(true);
};


  // --- GESTION LOCALE DES VOLUMES ---

  const handleLocalAddVolume = (e) => {
    e.preventDefault();
    
    // Validation de base
    if (!activeEcId || !volumeForm.type_id || !volumeForm.heures) return;

    const typeInfo = typesEnseignement.find(
        t => String(t.id) === String(volumeForm.type_id)
    );

    const typeCode = typeInfo?.code || "?";



    // Utilisation de la version fonctionnelle de setState pour plus de sécurité
    setLocalEcs(prevEcs => {
        return prevEcs.map(ec => {
            if (ec.id === activeEcId) {
                // Vérifier les doublons à l'intérieur du map
                const alreadyExists = ec.volumes?.some(v => 
                    String(v.type_enseignement_id || v.TypeEnseignement_id_fk) === String(volumeForm.type_id)
                );

                if (alreadyExists) {
                    alert("Ce type d'enseignement est déjà défini.");
                    return ec;
                }

                const newVol = {
                    id: generateTempId("VOL"),
                    type_enseignement_id: volumeForm.type_id,
                    type_enseignement_code: typeCode,
                    heures: parseFloat(volumeForm.heures) // Stocké en tant que 'heures'
                };

                return { 
                    ...ec, 
                    volumes: [...(ec.volumes || []), newVol] 
                };
            }
            return ec;
        });
    });

    // Reset du petit formulaire
    setVolumeForm({ type_id: "", heures: "" });
};

  const handleLocalDeleteVolume = (volId) => {
  setLocalEcs(prevEcs => {
    const updated = prevEcs.map(ec => {
      if (ec.id === activeEcId) {
        return {
          ...ec,
          volumes: (ec.volumes || []).filter(v => v.id !== volId)
        };
      }
      return ec;
    });

    return updated;
  });
};


  // --- SAUVEGARDE GLOBALE (API CALL) ---

    const handleGlobalSave = async () => {
      setIsSaving(true);
      setErrorMsg(null);

      try {
          const payload = {
              ue_id: ue.id,
              ecs: localEcs.map(ec => ({
                  id_maquette_ec: (ec.id && String(ec.id).includes("_TEMP_")) ? null : ec.id,
                  code: ec.code,
                  intitule: ec.intitule,
                  coefficient: parseFloat(ec.coefficient) || 0,
                  volumes: (ec.volumes || []).map(v => {
                      // On récupère l'ID du type d'enseignement peu importe le nom de la clé source
                      const typeId = v.type_enseignement_id || v.TypeEnseignement_id_fk || v.type_id;
                      // On récupère la valeur des heures peu importe la source
                      const h = v.heures !== undefined ? v.heures : v.Volume_heures;

                      return {
                          id: (v.id && String(v.id).includes("_TEMP_")) ? null : v.id,
                          type_enseignement_id: typeId,
                          heures: parseFloat(h) || 0
                      };
                  })
              }))
          };

          const response = await fetch(`${API_BASE_URL}/api/ecs/maquette/bulk-update`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(JSON.stringify(errData.detail) || "Erreur serveur");
          }

          if (onSaveSuccess) onSaveSuccess();
          onClose();
          
      } catch (err) {
          console.error(err);
          setErrorMsg("Erreur lors de la sauvegarde. Vérifiez les types d'enseignement.");
      } finally {
          setIsSaving(false);
      }
  };


  // --- RENDU UI ---

  const activeEc = localEcs.find(e => e.id === activeEcId);
  const totalCoeff = localEcs.reduce((acc, curr) => acc + (parseFloat(curr.coefficient) || 0), 0);

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={ue ? `Gestion des Modules : ${ue.code}` : "Gestion Modules"} width="max-w-5xl">
      <div className="flex flex-col h-[600px]">
        
        {/* CORPS PRINCIPAL : 2 COLONNES */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 overflow-hidden pb-2">
            
            {/* COLONNE GAUCHE : LISTE DES MODULES */}
            <div className="flex-1 flex flex-col border-r border-gray-100 pr-0 md:pr-4 overflow-hidden">
                <div className="flex justify-between items-end mb-3 border-b border-gray-100 pb-2 px-1">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center">
                        <FaListUl className="text-blue-500 mr-2" /> Liste des Modules
                    </h4>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Total Coeff: <span className="text-blue-600 font-bold">{totalCoeff.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
                    {localEcs.length === 0 && (
                        <div className="text-center py-8 text-gray-400 italic text-xs border border-dashed rounded bg-gray-50">
                            Aucun module. Ajoutez-en un via le formulaire à droite (ou en bas).
                        </div>
                    )}

                    {localEcs.map((ec) => (
                        <div 
                            key={ec.id} 
                            // Clic sur la carte = Sélectionner pour volumes (sauf si mode édition)
                            onClick={() => { 
                                if (editingEcId !== ec.id) {
                                    setActiveEcId(ec.id); 
                                    setVolumeForm({type_id:"", heures:""}); 
                                }
                            }}
                            className={`bg-white border rounded-lg p-3 shadow-sm transition-all relative cursor-pointer group
                                ${activeEcId === ec.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300"}
                            `}
                        >
                            {editingEcId === ec.id ? (
                                // --- MODE ÉDITION INLINE ---
                                <div className="flex flex-col gap-2 bg-white p-1 rounded" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                        <input 
                                            className={AppStyles.input.formControl + " w-28 uppercase font-mono text-sm"} 
                                            value={editEcData.code} 
                                            onChange={e => setEditEcData({...editEcData, code: e.target.value})} 
                                            placeholder="Code" 
                                            autoFocus
                                        />
                                        <input 
                                            type="number" step="0.1" 
                                            className={AppStyles.input.formControl + " w-20 text-sm"} 
                                            value={editEcData.coefficient} 
                                            onChange={e => setEditEcData({...editEcData, coefficient: e.target.value})} 
                                            placeholder="Coef" 
                                        />
                                    </div>
                                    <textarea 
                                        className={AppStyles.input.formControl + " text-sm"} 
                                        rows="2" 
                                        value={editEcData.intitule} 
                                        onChange={e => setEditEcData({...editEcData, intitule: e.target.value})} 
                                    />
                                    <div className="flex justify-end gap-2 mt-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingEcId(null); }} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 flex items-center gap-1"><FaUndo/> Annuler</button>
                                        <button onClick={saveEditLocalEC} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white flex items-center gap-1"><FaCheck/> OK</button>
                                    </div>
                                </div>
                            ) : (
                                // --- MODE AFFICHAGE NORMAL ---
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono bg-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-700 border border-gray-300">
                                                {ec.code}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-600 bg-white border border-blue-100 px-1.5 py-0.5 rounded">
                                                Coef. {parseFloat(ec.coefficient || 0).toFixed(2)}
                                            </span>
                                            {/* Indicateur visuel si nouveau */}
                                            {ec.id.toString().includes("_TEMP_") && (
                                                <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded border border-green-200">
                                                    + Ajout
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-800 leading-snug">{ec.intitule}</p>
                                        
                                        {/* Badges des Volumes horaires déjà configurés */}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {ec.volumes?.map(v => (
                                                <span
                                                key={v.id}
                                                className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-semibold"
                                                >
                                                <b>{getTypeEnseignementCode(v, typesEnseignement)}</b> : {formatHeures(v)} h
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* --- BOUTONS D'ACTION (EDIT / DELETE) --- */}
                                    <div className="flex flex-col gap-1 ml-2">
                                        <button 
                                            onClick={(e) => startEditLocalEC(ec, e)} 
                                            title="Modifier"
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                        >
                                            <FaEdit size={14}/>
                                        </button>
                                        <button
                                            onClick={(e) => handleLocalDeleteEC(ec, e)}
                                            title="Supprimer l’EC"
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                            >
                                            <FaTrash size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* COLONNE DROITE : PANNEAU LATÉRAL (Détails ou Création) */}
            <div className="w-full md:w-80 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative shadow-inner">
                
                {activeEc ? (
                    // --- VUE 1: GESTION DES VOLUMES (Quand un EC est sélectionné) ---
                    <div className="flex flex-col h-full animate-in fade-in duration-200">
                        {/* Header Details */}
                        <div className="p-3 bg-white border-b border-gray-200 flex items-center gap-2 shadow-sm">
                            <button 
                                onClick={() => setActiveEcId(null)} 
                                className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                                title="Retour à l'ajout"
                            >
                                <FaArrowLeft />
                            </button>
                            <div className="overflow-hidden">
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Configuration des heures</span>
                                <span className="block text-sm font-bold text-gray-800 truncate" title={activeEc.intitule}>
                                    {activeEc.code}
                                </span>
                            </div>
                        </div>

                        {/* Liste des volumes */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {activeEc.volumes.map(vol => (
                                <div
                                key={vol.id}
                                className="flex items-center gap-2 bg-white border px-3 py-1 rounded-full shadow-sm"
                                >
                                <span className="text-xs font-bold text-blue-600">
                                    {getTypeEnseignementCode(vol, typesEnseignement)} :
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
                                    {formatHeures(vol)} h
                                </span>

                                <button
                                    onClick={() => handleLocalDeleteVolume(vol.id)}
                                    className="text-gray-400 hover:text-red-500 ml-1"
                                    title="Supprimer"
                                >
                                    <FaTimes size={10} />
                                </button>
                                </div>
                            ))}
                        </div>

                        {/* Formulaire Ajout Volume */}
                        <div className="p-3 bg-white border-t border-gray-200">
                            <h5 className="text-xs font-bold text-gray-600 mb-2 uppercase">Ajouter des heures</h5>
                            <form onSubmit={handleLocalAddVolume} className="space-y-2">
                                <select
                                    className={AppStyles.input.formControl + " text-sm"}
                                    value={volumeForm.type_id}
                                    onChange={e => setVolumeForm({ ...volumeForm, type_id: e.target.value })}
                                    required
                                    >
                                    <option value="">-- Type d'enseignement --</option>
                                    {typesEnseignement.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.label} ({t.code})
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" step="0.5" min="0" 
                                            className={AppStyles.input.formControl + " text-sm pr-8"}
                                            placeholder="Heures" 
                                            value={volumeForm.heures}
                                            onChange={e => setVolumeForm({...volumeForm, heures: e.target.value})}
                                            required
                                        />
                                        <span className="absolute right-3 top-2 text-gray-400 text-xs">h</span>
                                    </div>
                                    <button type="submit" className="bg-blue-600 text-white rounded px-4 hover:bg-blue-700 shadow-sm">
                                        <FaPlus />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    // --- VUE 2: CRÉATION D'UN NOUVEL EC (Défaut) ---
                    <div className="flex flex-col h-full p-4 animate-in fade-in duration-200">
                        <div className="mb-4 pb-2 border-b border-gray-200">
                            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <div className="bg-green-100 p-1.5 rounded-full text-green-600"><FaPlus size={12}/></div>
                                Nouveau Module
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1">Créez le module ici, puis cliquez dessus dans la liste pour configurer ses heures.</p>
                        </div>
                        
                        <form onSubmit={handleLocalAddEC} className="flex-1 flex flex-col space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Code <span className="text-red-500">*</span></label>
                                <input 
                                    required 
                                    className={AppStyles.input.formControl + " font-mono uppercase"} 
                                    value={ecForm.code} 
                                    onChange={e => setEcForm({ ...ecForm, code: e.target.value })} 
                                    placeholder="Ex: INFO201" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Intitulé <span className="text-red-500">*</span></label>
                                <textarea 
                                    required 
                                    className={AppStyles.input.formControl + " h-24 resize-none"} 
                                    value={ecForm.intitule} 
                                    onChange={e => setEcForm({ ...ecForm, intitule: e.target.value })} 
                                    placeholder="Nom complet du module..." 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Coefficient</label>
                                <input 
                                    type="number" min="0" step="0.1" 
                                    className={AppStyles.input.formControl} 
                                    value={ecForm.coefficient} 
                                    onChange={e => setEcForm({ ...ecForm, coefficient: e.target.value })} 
                                />
                            </div>
                            
                            <div className="mt-auto pt-4">
                                <button type="submit" className="w-full bg-white border-2 border-dashed border-blue-300 text-blue-600 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-50 hover:border-blue-500 transition-all flex justify-center items-center gap-2">
                                    <FaPlus /> Ajouter à la liste
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>

        {/* --- FOOTER : ACTION DE VALIDATION FINALE --- */}
        <div className="pt-3 border-t border-gray-200 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">{localEcs.length}</span>
                module(s) prêt(s) à être enregistré(s).
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                {errorMsg && (
                    <span className="text-xs text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-100 animate-pulse">
                        <FaExclamationTriangle /> {errorMsg}
                    </span>
                )}
                
                <button 
                    onClick={onClose} 
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm transition-colors border border-transparent hover:border-gray-200"
                    disabled={isSaving}
                >
                    Annuler
                </button>
                
                <button 
                    onClick={handleGlobalSave} 
                    disabled={isSaving}
                    className={`px-6 py-2 rounded text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all
                        ${isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 hover:shadow-lg transform active:scale-95"}
                    `}
                >
                    {isSaving ? (
                        <>
                            <SpinnerIcon className="animate-spin w-4 h-4" /> Sauvegarde...
                        </>
                    ) : (
                        <>
                            <FaSave /> Valider la configuration
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>

          <ECDeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEcToDelete(null);
        }}
        onConfirm={() => {
          setLocalEcs(prev =>
            prev.filter(ec => ec.id !== ecToDelete.id)
          );
          if (activeEcId === ecToDelete.id) {
            setActiveEcId(null);
          }
        }}
        ecCode={ecToDelete?.code}
        ecIntitule={ecToDelete?.intitule}
      />


    </DraggableModal>
  );
};