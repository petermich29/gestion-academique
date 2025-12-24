import React, { useState, useEffect } from "react";
import { 
    FaSearch, FaRandom, FaCheckCircle, FaExclamationTriangle, 
    FaChevronLeft, FaChevronRight, FaInfoCircle, FaUser 
} from "react-icons/fa";
import api from "../../api/axios"; 

const STORAGE_KEY = "doublons_scan_results";
const STATIC_URL = "http://localhost:8000/"; // Ajustez selon votre URL backend

export default function GestionDoublons() {
    const [groups, setGroups] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setGroups(parsed);
            } catch (e) { console.error("Erreur cache", e); }
        }
    }, []);

    const startScan = async () => {
        setIsScanning(true);
        setProgress(0);
        setError(null);
        setGroups([]); 
        
        try {
            const resInit = await api.post("/doublons/scan/start");
            const jobId = resInit.data.job_id;

            const interval = setInterval(async () => {
                const resStatus = await api.get(`/doublons/scan/status/${jobId}`);
                const { status, progress, result, error } = resStatus.data;
                setProgress(progress);
                if (result) setGroups(result);

                if (status === "completed") {
                    clearInterval(interval);
                    setIsScanning(false);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
                } else if (status === "failed") {
                    clearInterval(interval);
                    setIsScanning(false);
                    setError(error);
                }
            }, 1000);
        } catch (err) {
            setIsScanning(false);
            setError(err.message);
        }
    };

    const onGroupMerged = (groupId) => {
        const newGroups = groups.filter(g => g.group_id !== groupId);
        setGroups(newGroups);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
        setSuccessMsg("Fusion réussie.");
    };

    const currentGroups = groups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(groups.length / itemsPerPage);

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <FaRandom className="text-3xl text-orange-500" />
                        <div>
                            <h3 className="text-xl font-bold">Fusion des Dossiers Étudiants</h3>
                            <p className="text-gray-500 text-sm">Comparez les photos, identités et parcours BACC avant fusion.</p>
                        </div>
                    </div>
                    {!isScanning ? (
                        <button onClick={startScan} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
                            <FaSearch /> Lancer l'analyse
                        </button>
                    ) : (
                        <div className="w-48">
                            {/* Barre de progression */}
                            <div className="bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            
                            {/* Pourcentage */}
                            <p className="text-center text-xs mt-1 font-semibold">{progress}%</p>
                            
                            {/* AJOUT ICI : Nombre de groupes trouvés en temps réel */}
                            <p className="text-center text-xs text-orange-600 mt-1 animate-pulse">
                                {groups.length} groupe(s) trouvé(s)
                            </p>
                        </div>
                    )}
                </div>
                {successMsg && <div className="mt-4 p-2 bg-green-100 text-green-700 rounded text-sm">{successMsg}</div>}
            </div>

            <div className="space-y-8">
                {currentGroups.map(group => (
                    <DuplicateGroupResolver key={group.group_id} group={group} onSuccess={() => onGroupMerged(group.group_id)} />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 border rounded bg-white disabled:opacity-50"><FaChevronLeft /></button>
                    <span className="p-2">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 border rounded bg-white disabled:opacity-50"><FaChevronRight /></button>
                </div>
            )}
        </div>
    );
}

function DuplicateGroupResolver({ group, onSuccess }) {
    const students = group.students;
    const [includedIds, setIncludedIds] = useState(students.map(s => s.id));
    const [masterId, setMasterId] = useState(() => [...students].sort((a,b) => b.inscriptions_count - a.inscriptions_count)[0].id);
    const [fieldOverrides, setFieldOverrides] = useState({});

    // Configuration des colonnes
    const fields = [
        { key: "Etudiant_photo_profil_path", label: "Photo", isImage: true },
        { key: "Etudiant_nom", label: "Nom" },
        { key: "Etudiant_prenoms", label: "Prénoms" },
        { key: "Etudiant_sexe", label: "Sexe" },
        { key: "Etudiant_nationalite", label: "Nationalité" },
        { key: "Etudiant_naissance_date", label: "Né(e) le" },
        { key: "Etudiant_naissance_lieu", label: "Lieu Naiss." },
        { key: "Etudiant_cin", label: "CIN" },
        { key: "Etudiant_cin_date", label: "Date CIN" },
        { key: "Etudiant_adresse", label: "Adresse" },
        { key: "Etudiant_bacc_serie", label: "Bacc Série" },
        { key: "Etudiant_bacc_numero", label: "Bacc N°" },
        { key: "Etudiant_bacc_mention", label: "Mention" },
        { key: "Etudiant_bacc_centre", label: "Centre Bacc" },
    ];

    // LARGEURS STRICTES POUR POSITIONNEMENT STICKY
    const W_ACTION = 60; 
    const W_ID = 180;

    const getFinalValue = (fieldKey) => fieldOverrides[fieldKey] !== undefined ? fieldOverrides[fieldKey] : students.find(s => s.id === masterId)?.raw?.[fieldKey];

    const handleMerge = async () => {
        const idsToMerge = includedIds.filter(id => id !== masterId);
        if (idsToMerge.length === 0) return alert("Sélectionnez des doublons.");
        if (!window.confirm("Fusionner les dossiers ?")) return;
        try {
            await api.post("/doublons/merge/advanced", { master_id: masterId, ids_to_merge: idsToMerge, overrides: fieldOverrides });
            onSuccess();
        } catch (err) { alert(err.message); }
    };

    return (
        <div className="bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-2 text-orange-700 font-bold">
                <FaExclamationTriangle /> Groupe de doublons potentiels
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr className="bg-gray-100">
                            {/* COLONNE ACTION FIGÉE */}
                            <th className="sticky left-0 z-30 bg-gray-100 p-3 border-b border-r border-gray-200" style={{ minWidth: W_ACTION, width: W_ACTION }}>Action</th>
                            {/* COLONNE ID FIGÉE */}
                            <th className="sticky z-30 bg-gray-100 p-3 border-b border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ left: W_ACTION, minWidth: W_ID, width: W_ID }}>Identifiant</th>
                            {/* AUTRES COLONNES */}
                            {fields.map(f => (
                                <th key={f.key} className="p-3 border-b border-r border-gray-200 text-left whitespace-nowrap bg-gray-100">{f.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => {
                            const isIncluded = includedIds.includes(student.id);
                            const isMaster = masterId === student.id;
                            
                            // Couleur de fond de cellule calculée pour l'opacité visuelle sans transparence réelle
                            const cellBg = isMaster ? "#eff6ff" : (isIncluded ? "#ffffff" : "#f9fafb");
                            const textColor = isIncluded ? "text-gray-900" : "text-gray-400";

                            return (
                                <tr key={student.id} className={isMaster ? "bg-blue-50" : (isIncluded ? "bg-white" : "bg-gray-50")}>
                                    <td className="sticky left-0 z-20 p-3 border-b border-r border-gray-200 text-center" style={{ backgroundColor: cellBg }}>
                                        <div className="flex flex-col gap-2 items-center">
                                            <input type="checkbox" checked={isIncluded} disabled={isMaster} onChange={e => e.target.checked ? setIncludedIds([...includedIds, student.id]) : setIncludedIds(includedIds.filter(id => id !== student.id))} className="accent-blue-600" />
                                            <input type="radio" name={`m-${group.group_id}`} checked={isMaster} disabled={!isIncluded} onChange={() => {setMasterId(student.id); setFieldOverrides({});}} />
                                        </div>
                                    </td>
                                    <td className={`sticky z-20 p-3 border-b border-r border-gray-200 font-mono font-bold shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${textColor}`} style={{ left: W_ACTION, backgroundColor: cellBg }}>
                                        {student.id}
                                        <div className="text-[10px] font-normal text-blue-500 mt-1">{student.inscriptions_count} inscription(s)</div>
                                    </td>
                                    {fields.map(f => {
                                        const val = student.raw?.[f.key];
                                        const isOverridden = fieldOverrides[f.key] === val && val !== undefined;
                                        const isSelected = isOverridden || (fieldOverrides[f.key] === undefined && isMaster);

                                        return (
                                            <td 
                                                key={f.key} 
                                                onClick={() => isIncluded && val && setFieldOverrides({...fieldOverrides, [f.key]: val})}
                                                className={`p-2 border-b border-r border-gray-100 cursor-pointer transition-all ${isSelected ? "bg-blue-100 ring-1 ring-inset ring-blue-400" : ""} ${textColor}`}
                                            >
                                                {f.isImage ? (
                                                    <div className="flex justify-center">
                                                        {val ? (
                                                            <img src={`${STATIC_URL}${val}`} alt="Profil" className="w-12 h-12 rounded object-cover border border-gray-200 shadow-sm" />
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded text-gray-300"><FaUser /></div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="max-w-[200px] truncate" title={val}>{val || "-"}</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {/* LIGNE DE PREVISUALISATION FINALE */}
                        <tr className="bg-gray-800 text-white font-bold h-16">
                            <td className="sticky left-0 z-20 bg-gray-800 p-3 border-r border-gray-700 text-center text-green-400"><FaCheckCircle className="mx-auto" /></td>
                            <td className="sticky z-20 bg-gray-800 p-3 border-r border-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.3)] text-right pr-4" style={{ left: W_ACTION }}>RÉSULTAT FINAL :</td>
                            {fields.map(f => {
                                const final = getFinalValue(f.key);
                                return (
                                    <td key={f.key} className="p-2 px-3 border-r border-gray-700 text-blue-300">
                                        {f.isImage ? (final ? <div className="text-[9px] truncate w-24">IMAGE SÉLECTIONNÉE</div> : "-") : (final || "-")}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                <p className="text-sm text-gray-500 flex items-center gap-2"><FaInfoCircle /> Cliquez sur une cellule pour choisir la valeur à conserver.</p>
                <button onClick={handleMerge} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95">
                    Confirmer la Fusion
                </button>
            </div>
        </div>
    );
}