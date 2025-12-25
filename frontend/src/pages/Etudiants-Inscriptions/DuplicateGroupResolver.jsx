import React, { useState } from "react";
import { FaExclamationTriangle, FaUser, FaCheckCircle, FaRandom } from "react-icons/fa";
import api from "../../api/axios"; 

// CONFIGURATION CONSTANTES
const STATIC_URL = "http://localhost:8000/"; 

// LISTE COMPLÈTE DES CHAMPS À FUSIONNER
const FIELDS = [
    { key: "Etudiant_photo_profil_path", label: "Photo", isImage: true },
    // Identité
    { key: "Etudiant_nom", label: "Nom" },
    { key: "Etudiant_prenoms", label: "Prénoms" },
    { key: "Etudiant_sexe", label: "Sexe" },
    { key: "Etudiant_nationalite", label: "Nationalité" },
    // Naissance
    { key: "Etudiant_naissance_date", label: "Né(e) le" },
    { key: "Etudiant_naissance_date_Exact", label: "Date Exacte?" },
    { key: "Etudiant_naissance_annee", label: "Année Naissance" },
    { key: "Etudiant_naissance_lieu", label: "Lieu Naissance" },
    // CIN
    { key: "Etudiant_cin", label: "CIN" },
    { key: "Etudiant_cin_date", label: "Date CIN" },
    { key: "Etudiant_cin_lieu", label: "Lieu CIN" },
    // Contact
    { key: "Etudiant_adresse", label: "Adresse" },
    { key: "Etudiant_telephone", label: "Téléphone" },
    { key: "Etudiant_mail", label: "Email" },
    // Baccalauréat
    { key: "Etudiant_bacc_serie", label: "Bacc Série" },
    { key: "Etudiant_bacc_annee", label: "Année Bacc" },
    { key: "Etudiant_bacc_numero", label: "Num Bacc" },
    { key: "Etudiant_bacc_centre", label: "Centre Bacc" },
];

export default function DuplicateGroupResolver({ group, onSuccess }) {
    const students = group.students;
    const [includedIds, setIncludedIds] = useState(students.map(s => s.id));
    const [masterId, setMasterId] = useState(() => [...students].sort((a,b) => b.inscriptions_count - a.inscriptions_count)[0].id);
    const [fieldOverrides, setFieldOverrides] = useState({});

    const getFinalValue = (key) => fieldOverrides[key] !== undefined ? fieldOverrides[key] : students.find(s => s.id === masterId)?.raw?.[key];

    const handleMerge = async () => {
        const idsToMerge = includedIds.filter(id => id !== masterId);
        if (idsToMerge.length === 0) return alert("Rien à fusionner.");
        if (!window.confirm("Confirmer la fusion irréversible ?")) return;

        try {
            await api.post("/doublons/merge/advanced", { 
                master_id: masterId, 
                ids_to_merge: idsToMerge, 
                overrides: fieldOverrides 
            });
            onSuccess();
        } catch (err) { alert(err.message); }
    };

    return (
        <div className="bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden transition-all hover:shadow-lg">
            <div className="p-3 bg-orange-50 border-b border-orange-100 flex justify-between items-center text-orange-800">
                <div className="font-bold flex gap-2 items-center"><FaExclamationTriangle /> Doublon Probable</div>
                <div className="text-xs">ID Groupe: {group.group_id.split('-')[0]}</div>
            </div>
            
            {/* Ajout overflow-x-auto pour le scroll horizontal */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-2 w-16 text-center sticky left-0 bg-gray-100 z-10 border-r border-gray-200">Action</th>
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
                                        <div className="text-[10px] font-normal text-blue-500">{stu.inscriptions_count} insc.</div>
                                    </td>
                                    {FIELDS.map(f => {
                                        const val = stu.raw?.[f.key];
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
                        <tr className="bg-gray-800 text-blue-100 font-bold border-t-2 border-gray-600">
                            <td className="p-2 text-center text-green-400 sticky left-0 bg-gray-800 z-10 border-r border-gray-600"><FaCheckCircle /></td>
                            <td className="p-2 text-right whitespace-nowrap">FINAL :</td>
                            {FIELDS.map(f => (
                                <td key={f.key} className="p-2 border-l border-gray-700 whitespace-nowrap">
                                    {f.isImage ? "IMG" : (getFinalValue(f.key) || "-")}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-50 flex justify-end border-t">
                <button onClick={handleMerge} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-700">
                    <FaRandom /> Fusionner
                </button>
            </div>
        </div>
    );
}