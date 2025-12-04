import React, { useState, useEffect } from "react";
import { EditIcon, SpinnerIcon, CheckIcon, CrossIcon } from "./Icons"; // Assurez-vous que les imports d'icônes sont corrects
import { AppStyles } from "./AppStyles";

const API_BASE_URL = "http://127.0.0.1:8000/api";

/**
 * Composant générique pour gérer l'historique (activation d'années + renommage).
 * Fonctionne pour : Institutions, Composantes (Établissements), Mentions, Parcours.
 * * @param {boolean} isOpen - État d'ouverture
 * @param {function} onClose - Fonction de fermeture
 * @param {string} entityId - ID de l'entité (ex: COMP_001)
 * @param {string} entityType - Le préfixe de la route API ("institutions", "composantes", "mentions", "parcours")
 * @param {string} title - Titre du modal
 */
const EntityHistoryManager = ({ isOpen, onClose, entityId, entityType = "institutions", title }) => {
  const [allYears, setAllYears] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(null); // ID de l'année en cours de traitement

  // État pour l'édition en ligne (Renommage/Code)
  const [editingYear, setEditingYear] = useState(null);
  const [editForm, setEditForm] = useState({ nom: "", code: "", description: "" });

  useEffect(() => {
    if (isOpen && entityId) {
      loadData();
    }
  }, [isOpen, entityId, entityType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Charger toutes les années disponibles
      const resYears = await fetch(`${API_BASE_URL}/metadonnees/annees-universitaires`);
      const yearsData = resYears.ok ? await resYears.json() : [];

      // 2. Charger l'historique spécifique de l'entité
      // La route est construite dynamiquement grâce à 'entityType'
      const resHist = await fetch(`${API_BASE_URL}/${entityType}/${entityId}/historique-details`);
      const histData = resHist.ok ? await resHist.json() : [];
      
      // Tri du plus récent au plus ancien
      setAllYears(yearsData.sort((a, b) => b.AnneeUniversitaire_annee.localeCompare(a.AnneeUniversitaire_annee)));
      setHistoryData(histData);
    } catch (error) {
      console.error("Erreur chargement historique", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS : Switch ON/OFF une année ---
  const handleToggleYear = async (yearId, isChecked) => {
    setIsToggling(yearId);
    try {
      if (isChecked) {
        // Ajouter : POST /api/{entityType}/{id}/historique
        const res = await fetch(`${API_BASE_URL}/${entityType}/${entityId}/historique`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annee_id: yearId })
        });
        if (!res.ok) throw new Error("Erreur ajout");
      } else {
        // Supprimer : DELETE /api/{entityType}/{id}/historique/{yearId}
        const res = await fetch(`${API_BASE_URL}/${entityType}/${entityId}/historique/${yearId}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Erreur suppression");
      }
      
      // Recharger les données fraîches
      const resHist = await fetch(`${API_BASE_URL}/${entityType}/${entityId}/historique-details`);
      if (resHist.ok) setHistoryData(await resHist.json());

    } catch (e) {
      console.error(e);
      // Feedback utilisateur simple
      alert("Erreur lors de la modification de l'historique.");
    } finally {
      setIsToggling(null);
    }
  };

  // --- ACTIONS : Édition (Renommage) ---
  const startEdit = (histItem) => {
    setEditingYear(histItem.annee_id);
    setEditForm({
      nom: histItem.nom_historique || "",
      code: histItem.code_historique || "",
      description: histItem.description_historique || "",
      abbreviation: histItem.abbreviation_historique || "" // <--- AJOUT
    });
  };

  const cancelEdit = () => {
    setEditingYear(null);
    setEditForm({ nom: "", code: "", description: "", abbreviation: "" }); // <--- AJOUT
  };

  const saveEdit = async (anneeId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${entityType}/${entityId}/historique/${anneeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        setHistoryData(prev => prev.map(item => {
          if (item.annee_id === anneeId) {
            return { 
                ...item, 
                nom_historique: editForm.nom, 
                code_historique: editForm.code, 
                description_historique: editForm.description,
                abbreviation_historique: editForm.abbreviation // <--- AJOUT
            };
          }
          return item;
        }));
        setEditingYear(null);
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    // OVERLAY FIXE (Z-Index élevé pour passer au-dessus des autres modals)
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div>
             <h3 className="text-lg font-bold text-gray-800">
               {title || "Gestion de l'Historique"}
             </h3>
             <p className="text-xs text-gray-500 font-mono mt-1">
               ID: {entityId} | Type: {entityType}
             </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"
          >
            <CrossIcon className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            
            <div className="mb-5 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
               <div className="text-xl"><EditIcon /></div>
               <div>
                  <strong>Fonctionnement :</strong>
                  <ul className="list-disc ml-4 mt-1 space-y-1 text-xs text-blue-700">
                      <li><strong>Cochez</strong> une année pour indiquer que l'entité était active (existait) cette année-là.</li>
                      <li>Cliquez sur le <strong>crayon</strong> pour modifier le Nom ou le Code spécifiquement pour une année passée (ex: changement de dénomination).</li>
                  </ul>
               </div>
            </div>

            {isLoading && allYears.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                    <SpinnerIcon className="animate-spin text-4xl text-blue-600" />
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                        <th className="px-4 py-3 text-center w-16">Active</th>
                        <th className="px-4 py-3 w-28">Année Univ.</th>
                        <th className="px-4 py-3">Nom à cette date</th>
                        <th className="px-4 py-3 w-24">Code</th>
                        <th className="px-4 py-3 w-24">Abréviation</th> {/* <--- AJOUT HEADER */}
                        <th className="px-4 py-3">Desc.</th>
                        <th className="px-4 py-3 text-center w-28">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {allYears.map((year) => {
                            const histItem = historyData.find(h => h.annee_id === year.AnneeUniversitaire_id);
                            const isChecked = !!histItem;
                            const isEditing = editingYear === year.AnneeUniversitaire_id;
                            const isProcessing = isToggling === year.AnneeUniversitaire_id;

                            return (
                                <tr key={year.AnneeUniversitaire_id} className={`transition-colors ${isChecked ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 text-gray-400"}`}>
                                    
                                    {/* COL 1: CHECKBOX */}
                                    <td className="px-4 py-3 text-center">
                                        {isProcessing ? (
                                            <SpinnerIcon className="animate-spin text-blue-600 mx-auto" />
                                        ) : (
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleToggleYear(year.AnneeUniversitaire_id, e.target.checked)}
                                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                        )}
                                    </td>

                                    {/* COL 2: ANNÉE */}
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {year.AnneeUniversitaire_annee}
                                            {year.AnneeUniversitaire_is_active && (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* COL 3, 4, 5, 6: DONNÉES OU ÉDITION */}
                                    {isChecked && histItem ? (
                                        isEditing ? (
                                            <>
                                                <td className="px-2 py-2">
                                                    <input className={AppStyles.input.formControl} value={editForm.nom} onChange={(e) => setEditForm({...editForm, nom: e.target.value})} placeholder="Nom historique" autoFocus />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input className={AppStyles.input.formControl} value={editForm.code} onChange={(e) => setEditForm({...editForm, code: e.target.value})} placeholder="Code" />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input className={AppStyles.input.formControl} value={editForm.abbreviation} onChange={(e) => setEditForm({...editForm, abbreviation: e.target.value})} placeholder="Abrév." />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input className={AppStyles.input.formControl} value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="Optionnel" />
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => saveEdit(year.AnneeUniversitaire_id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Sauvegarder"><CheckIcon className="w-4 h-4"/></button>
                                                        <button onClick={cancelEdit} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Annuler"><CrossIcon className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3 font-semibold text-gray-700">{histItem.nom_historique}</td>
                                                <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono border border-blue-100">{histItem.code_historique}</span></td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{histItem.abbreviation_historique || "-"}</td>
                                                <td className="px-4 py-3 text-xs italic text-gray-500 truncate max-w-[150px]">{histItem.description_historique || "-"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => startEdit(histItem)} className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded hover:bg-blue-50">
                                                        <EditIcon />
                                                    </button>
                                                </td>
                                            </>
                                        )
                                    ) : (
                                        <td colSpan="4" className="px-4 py-3 text-xs italic text-gray-400 text-center bg-gray-50/30">
                                            Non actif pour cette année académique.
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className={AppStyles.button.primary}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityHistoryManager;