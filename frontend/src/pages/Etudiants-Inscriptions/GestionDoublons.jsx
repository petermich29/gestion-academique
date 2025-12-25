import React, { useState, useEffect, useCallback } from "react";
import { FaRandom, FaSearch, FaListUl, FaHistory, FaBan, FaSync, FaPause, FaPlay, FaTrash, FaCheckCircle } from "react-icons/fa";
import api from "../../api/axios";

// Import des sous-composants
import GestionDoublonsATraiter from "./GestionDoublonsATraiter";
import GestionDoublonsTraites from "./GestionDoublonsTraites";

const KEY_HISTORY = "doublons_history_v2"; 
const KEY_JOB_ID = "active_scan_job";

const getGroupSignature = (students) => {
    if (!students) return "";
    return students.map(s => s.id).sort().join("|");
};

export default function GestionDoublons() {
    const [view, setView] = useState("todo");
    const [groups, setGroups] = useState([]); 
    const [history, setHistory] = useState([]); 
    const [ignoredDB, setIgnoredDB] = useState([]); // <--- État pour les faux doublons
    
    const [isScanning, setIsScanning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [activeJobId, setActiveJobId] = useState(localStorage.getItem(KEY_JOB_ID));

    // --- CHARGEMENT INITIAL ---
    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem(KEY_HISTORY) || "[]");
        setHistory(savedHistory);
        fetchIgnoredFromDB(); // Charger les faux doublons au démarrage

        if (activeJobId) {
            checkJobStatus(activeJobId);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }, [history]);

    // --- API : GESTION DES IGNORÉS (DB) ---
    const fetchIgnoredFromDB = async () => {
        try {
            const res = await api.get("/doublons/ignored");
            setIgnoredDB(res.data);
        } catch (e) {
            console.error("Erreur lors de la récupération des ignorés", e);
        }
    };

    const handleIgnore = async (group) => {
        try {
            const studentIds = group.students.map(s => s.id);
            await api.post("/doublons/ignore", { student_ids: studentIds });
            
            setGroups(prev => prev.filter(g => g.group_id !== group.group_id));
            fetchIgnoredFromDB(); // Actualiser la liste après l'ajout
        } catch (err) {
            setError("Erreur lors de l'enregistrement du faux doublon");
        }
    };

    const handleRestore = async (idEnBase) => {
        try {
            await api.delete(`/doublons/ignored/${idEnBase}`);
            fetchIgnoredFromDB(); // Actualiser la liste après suppression
        } catch (err) {
            setError("Erreur lors de la restauration");
        }
    };

    // --- LOGIQUE DE SCAN ---
    const startPolling = useCallback((jobId) => {
        setIsScanning(true);
        setIsPaused(false);
        setError(null);

        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/doublons/scan/status/${jobId}`);
                const { status, progress, result, error: jobError } = res.data;
                
                setProgress(progress);

                if (result && Array.isArray(result)) {
                    // Filtrage local pour ne pas montrer ce qui est en historique de session
                    const historySigs = new Set(history.map(g => getGroupSignature(g.students)));
                    const filtered = result.filter(g => !historySigs.has(getGroupSignature(g.students)));
                    setGroups(filtered);
                }

                if (status === "completed" || status === "failed" || status === "paused") {
                    clearInterval(interval);
                    setIsScanning(false);
                    if (status === "completed") {
                        localStorage.removeItem(KEY_JOB_ID);
                        setActiveJobId(null);
                    }
                    if (status === "paused") setIsPaused(true);
                    if (status === "failed") setError(jobError);
                }
            } catch (err) {
                clearInterval(interval);
            }
        }, 1500);
    }, [history]);

    const startScan = async (resume = false) => {
        setIsScanning(true);
        setError(null);
        try {
            const payload = resume ? { resume: true, job_id: activeJobId } : {};
            const res = await api.post("/doublons/scan/start", payload);
            const jobId = res.data.job_id;
            
            setActiveJobId(jobId);
            localStorage.setItem(KEY_JOB_ID, jobId);
            startPolling(jobId);
        } catch (err) {
            setIsScanning(false);
            setError("Erreur démarrage : " + err.message);
        }
    };

    const stopScan = async () => {
        if(!activeJobId) return;
        try {
            await api.post(`/doublons/scan/stop/${activeJobId}`);
        } catch (err) {
            setError("Erreur pause : " + err.message);
        }
    };

    const checkJobStatus = async (jobId) => {
        try {
            const res = await api.get(`/doublons/scan/status/${jobId}`);
            if(res.data.status === "processing") {
                startPolling(jobId);
            } else if (res.data.status === "paused") {
                setIsPaused(true);
                setProgress(res.data.progress);
            }
        } catch(e) {
            localStorage.removeItem(KEY_JOB_ID);
            setActiveJobId(null);
        }
    };

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <FaRandom className="text-2xl text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Gestion des Doublons</h3>
                            <p className="text-gray-500 text-sm">Détection et nettoyage des fiches.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {!isScanning && !isPaused && (
                            <button onClick={() => startScan(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow transition-all">
                                <FaSearch /> Nouveau Scan
                            </button>
                        )}
                        {!isScanning && isPaused && (
                            <button onClick={() => startScan(true)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow animate-pulse">
                                <FaPlay /> Reprendre ({progress}%)
                            </button>
                        )}
                        {isScanning && (
                            <div className="flex items-center gap-4 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                                <div className="w-48">
                                    <div className="flex justify-between text-[10px] mb-1 font-bold text-blue-700 uppercase">
                                        <span className="flex items-center gap-1"><FaSync className="animate-spin"/> Analyse...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="bg-blue-200 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                                <button onClick={stopScan} className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors">
                                    <FaPause />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* LES 3 ONGLETS SONT ICI */}
                <div className="flex gap-2 border-b border-gray-100 pb-1">
                    <NavButton active={view === "todo"} onClick={() => setView("todo")} icon={<FaListUl />} label="À traiter" count={groups.length} color="blue" />
                    <NavButton active={view === "history"} onClick={() => setView("history")} icon={<FaHistory />} label="Traités" count={history.length} color="green" />
                    <NavButton active={view === "false"} onClick={() => setView("false")} icon={<FaBan />} label="Faux doublons" count={ignoredDB.length} color="gray" />
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 mb-4 flex items-center gap-3"><FaBan /> {error}</div>}

            <div className="min-h-[400px]">
                {view === "todo" && (
                    <GestionDoublonsATraiter 
                        groups={groups} 
                        onMerge={(group) => {
                            setHistory([group, ...history]);
                            setGroups(prev => prev.filter(g => g.group_id !== group.group_id));
                        }} 
                        onIgnore={handleIgnore} 
                    />
                )}
                
                {view === "history" && <GestionDoublonsTraites groups={history} />}

                {/* AFFICHAGE DE L'ONGLET FAUX DOUBLONS */}
                {view === "false" && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center">
                            <span className="flex items-center gap-2"><FaBan className="text-gray-400"/> Groupes marqués comme "Faux Doublons"</span>
                            <span className="text-xs font-normal bg-gray-200 px-2 py-1 rounded-full">{ignoredDB.length} enregistré(s)</span>
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {ignoredDB.length === 0 ? (
                                <div className="p-20 text-center text-gray-400">
                                    <FaCheckCircle className="text-5xl mx-auto mb-4 text-gray-100" />
                                    <p>Aucun faux doublon n'a été enregistré en base de données.</p>
                                </div>
                            ) : (
                                ignoredDB.map(item => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                                                {item.signature.split('|').join(' ↔ ')}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-2 uppercase tracking-tighter">
                                                Identifié le {new Date(item.date_ignore).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRestore(item.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Supprimer des ignorés"
                                        >
                                            <FaTrash size={14} /> <span className="text-xs font-bold">Restaurer</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label, count, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700 border-blue-600",
        green: "bg-green-50 text-green-700 border-green-600",
        gray: "bg-gray-100 text-gray-700 border-gray-500"
    };
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold transition-all border-b-2 ${active ? colors[color] : "text-gray-500 border-transparent hover:bg-gray-50"}`}>
            {icon} <span className="hidden md:inline">{label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${active ? "bg-white shadow-sm" : "bg-gray-200"}`}>{count}</span>
        </button>
    );
}