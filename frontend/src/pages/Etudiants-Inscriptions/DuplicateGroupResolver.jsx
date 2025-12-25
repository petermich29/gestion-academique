import React, { useState } from "react";
import { FaExclamationTriangle, FaUser, FaCheckCircle, FaRandom, FaEye, FaBan, FaUndo } from "react-icons/fa";
import api from "../../api/axios"; 

// CONFIGURATION CONSTANTES
const STATIC_URL = "http://localhost:8000/"; 

// LISTE COMPLÈTE DES CHAMPS À FUSIONNER (Conservée telle quelle)
const FIELDS = [
    { key: "Etudiant_photo_profil_path", label: "Photo", isImage: true },
    { key: "Etudiant_nom", label: "Nom" },
    { key: "Etudiant_prenoms", label: "Prénoms" },
    { key: "Etudiant_sexe", label: "Sexe" },
    { key: "Etudiant_nationalite", label: "Nationalité" },
    { key: "Etudiant_naissance_date", label: "Né(e) le" },
    { key: "Etudiant_naissance_date_Exact", label: "Date Exacte?" },
    { key: "Etudiant_naissance_annee", label: "Année Naissance" },
    { key: "Etudiant_naissance_lieu", label: "Lieu Naissance" },
    { key: "Etudiant_cin", label: "CIN" },
    { key: "Etudiant_cin_date", label: "Date CIN" },
    { key: "Etudiant_cin_lieu", label: "Lieu CIN" },
    { key: "Etudiant_adresse", label: "Adresse" },
    { key: "Etudiant_telephone", label: "Téléphone" },
    { key: "Etudiant_mail", label: "Email" },
    { key: "Etudiant_bacc_serie", label: "Bacc Série" },
    { key: "Etudiant_bacc_annee", label: "Année Bacc" },
    { key: "Etudiant_bacc_numero", label: "Num Bacc" },
    { key: "Etudiant_bacc_centre", label: "Centre Bacc" },
];

export default function DuplicateGroupResolver({ group, onSuccess, onStatusChange }) {
    const students = group.students || [];
    console.log('GROUPE:', group);  // Structure complète
    console.log('STUDENTS:', students);  // Vérif students
    console.log('Premier student:', students[0]);  // Champs disponibles

    // Sécurité si le groupe est vide
    if (!students.length) return null;

    const [includedIds, setIncludedIds] = useState(students.map(s => s.id));
    
    // NOUVEAU: Tri par défaut basé sur le nombre de DOSSIERS (dossiers_count)
    const defaultMaster = [...students].sort((a,b) => (b.dossiers_count || 0) - (a.dossiers_count || 0))[0]?.id || students[0].id;
    
    const [masterId, setMasterId] = useState(defaultMaster);
    const [fieldOverrides, setFieldOverrides] = useState({});

    const getFinalValue = (key) => fieldOverrides[key] !== undefined ? fieldOverrides[key] : students.find(s => s.id === masterId)?.raw?.[key];

    const handleMerge = async () => {
        const idsToMerge = includedIds.filter(id => id !== masterId);
        if (idsToMerge.length === 0) return alert("Rien à fusionner.");
        if (!window.confirm("Cette fusion est irréversible. Confirmer ?")) return;

        try {
            // Appel à la route de fusion existante
            await api.post("/doublons/merge/advanced", { 
                master_id: masterId, 
                ids_to_merge: idsToMerge, 
                overrides: fieldOverrides,
                // On passe l'ID du groupe pour le marquer comme TRAITE côté backend si besoin
                group_id: group.group_id 
            });
            onSuccess(); // Rafraîchir la liste parent
        } catch (err) { alert(err.message); }
    };

    // Gestion des actions de statut (Ignorer / Surveiller)
    const handleStatusAction = (action) => {
        if(window.confirm(`Voulez-vous vraiment changer le statut en "${action}" ?`)) {
            onStatusChange(group.group_id, action);
        }
    };

    // Détermine la couleur de l'entête selon le statut
    const getHeaderColor = () => {
        if (group.statut === 'SURVEILLANCE') return "bg-yellow-50 border-yellow-200 text-yellow-800";
        if (group.statut === 'IGNORE') return "bg-gray-100 border-gray-200 text-gray-500";
        return "bg-orange-50 border-orange-100 text-orange-800";
    };

    return (
        <div className={`bg-white border shadow-md rounded-lg overflow-hidden transition-all hover:shadow-lg mb-6 ${group.statut === 'IGNORE' ? 'opacity-75' : ''}`}>
            
            {/* --- HEADER AVEC ACTIONS --- */}
            <div className={`p-3 border-b flex justify-between items-center ${getHeaderColor()}`}>
                <div className="font-bold flex gap-2 items-center">
                    {group.statut === 'SURVEILLANCE' ? <FaEye /> : <FaExclamationTriangle />} 
                    <span className="uppercase text-xs tracking-wider">
                        {group.statut === 'DETECTE' ? 'Doublon Détecté' : group.statut}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs mr-2 opacity-50">ID: {group.group_id} | Score: {group.score}%</span>
                    
                    {/* BOUTONS D'ACTION RAPIDE */}
                    {group.statut !== 'IGNORE' && (
                        <button onClick={() => handleStatusAction('ignore')} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors" title="Marquer comme faux doublon">
                            <FaBan /> Ignorer
                        </button>
                    )}
                    
                    {group.statut === 'IGNORE' && (
                        <button onClick={() => handleStatusAction('restore')} className="bg-white border border-blue-200 text-blue-500 hover:bg-blue-50 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors" title="Remettre en détection">
                            <FaUndo /> Restaurer
                        </button>
                    )}

                    {group.statut === 'DETECTE' && (
                        <button onClick={() => handleStatusAction('surveiller')} className="bg-white border border-yellow-200 text-yellow-600 hover:bg-yellow-50 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors" title="Mettre en surveillance">
                            <FaEye /> Surveiller
                        </button>
                    )}
                </div>
            </div>
            
            {/* --- TABLEAU DE COMPARAISON (Code original conservé) --- */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-2 w-16 text-center sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Sel.</th>
                            <th className="p-2 w-32 whitespace-nowrap">ID Etudiant</th>
                            {FIELDS.map(f => <th key={f.key} className="p-2 border-l border-gray-200 whitespace-nowrap min-w-[100px]">{f.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(stu => {
                            const isIncluded = includedIds.includes(stu.id);
                            const isMaster = masterId === stu.id;
                            const rowClass = isMaster ? "bg-blue-50" : (isIncluded ? "bg-white" : "bg-gray-50 text-gray-400");
                            
                            return (
                                <tr key={stu.id} className={`${rowClass} border-b border-gray-100 hover:bg-blue-50/50`}>
                                    <td className="p-2 text-center sticky left-0 bg-inherit z-10 border-r border-gray-200">
                                        <div className="flex flex-col gap-2 items-center">
                                            <input type="checkbox" checked={isIncluded} disabled={isMaster} onChange={e => e.target.checked ? setIncludedIds([...includedIds, stu.id]) : setIncludedIds(includedIds.filter(i => i !== stu.id))} />
                                            <input type="radio" checked={isMaster} disabled={!isIncluded} onChange={() => { setMasterId(stu.id); setFieldOverrides({}); }} />
                                        </div>
                                    </td>
                                    <td className="p-2 font-mono font-bold whitespace-nowrap">
                                        {stu.id}
                                        {/* NOUVEAU: Affichage du nombre de dossiers d'inscription */}
                                        {stu.dossiers_count !== undefined && (
                                            <div className="text-[10px] font-normal text-blue-500">{stu.dossiers_count} dossier(s)</div>
                                        )}
                                    </td>
                                    {FIELDS.map(f => {
                                        // On accède aux données brutes. Note: vérifiez si le backend renvoie 'raw' ou les champs à plat.
                                        // Adaptation: Si le backend renvoie les champs à plat dans l'objet student, utilisez stu[f.key]
                                        const val = stu[f.key] || stu.raw?.[f.key]; 
                                        const isSelected = (fieldOverrides[f.key] === val && val !== undefined) || (fieldOverrides[f.key] === undefined && isMaster);
                                        return (
                                            <td key={f.key} 
                                                onClick={() => isIncluded && val && setFieldOverrides({...fieldOverrides, [f.key]: val})}
                                                className={`p-2 border-l border-gray-100 cursor-pointer whitespace-nowrap ${isSelected ? "bg-blue-100 font-semibold text-blue-900" : ""}`}>
                                                {f.isImage ? (val ? <img src={STATIC_URL + val} className="w-8 h-8 rounded object-cover" alt="."/> : <FaUser className="text-gray-300"/>) : (val || "-")}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {/* Preview Row */}
                        {group.statut !== 'IGNORE' && (
                            <tr className="bg-gray-800 text-blue-100 font-bold border-t-2 border-gray-600">
                                <td className="p-2 text-center text-green-400 sticky left-0 bg-gray-800 z-10 border-r border-gray-600"><FaCheckCircle /></td>
                                <td className="p-2 text-right whitespace-nowrap">FINAL :</td>
                                {FIELDS.map(f => (
                                    <td key={f.key} className="p-2 border-l border-gray-700 whitespace-nowrap">
                                        {f.isImage ? "IMG" : (getFinalValue(f.key) || "-")}
                                    </td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PIED DE PAGE AVEC BOUTON FUSION --- */}
            {group.statut !== 'IGNORE' && (
                <div className="p-3 bg-gray-50 flex justify-end border-t">
                    <button onClick={handleMerge} className="bg-green-600 text-white px-6 py-2 rounded shadow text-sm font-bold flex items-center gap-2 hover:bg-green-700 hover:shadow-md transition-all">
                        <FaRandom /> FUSIONNER LES DONNÉES
                    </button>
                </div>
            )}
        </div>
    );
}