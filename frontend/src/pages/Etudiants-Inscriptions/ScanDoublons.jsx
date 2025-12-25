import React, { useState, useEffect, useRef } from "react";
import { FaPlay, FaStop, FaSearch, FaUserFriends, FaCheckCircle, FaRocket } from "react-icons/fa";
import api from "../../api/axios";

export default function ScanDoublons({ onRefreshNeeded }) {
    const [status, setStatus] = useState("idle"); 
    const [progress, setProgress] = useState(0);
    const [metrics, setMetrics] = useState({ found: 0, total: 0, current: 0 });
    const [jobId, setJobId] = useState(null);
    
    const lastFoundCountRef = useRef(0);
    const pollingRef = useRef(null);

    useEffect(() => {
        const savedJobId = localStorage.getItem("current_scan_job_id");
        if (savedJobId) {
            setJobId(savedJobId);
            setStatus("processing");
            startPolling(savedJobId);
        }
        return () => stopPolling();
    }, []);

    const startPolling = (id) => {
        if (pollingRef.current) return;
        const poll = async () => {
            try {
                const res = await api.get(`/doublons/scan/status/${id}`);
                const data = res.data;
                if (!data || data.status === "unknown") { stopScanLocal(); return; }

                setProgress(data.progress || 0);
                setMetrics({ found: data.found_count || 0, total: data.total || 0, current: data.current_index || 0 });

                if (data.found_count > lastFoundCountRef.current) {
                    lastFoundCountRef.current = data.found_count;
                    onRefreshNeeded?.();
                }

                if (["completed", "failed", "stopped"].includes(data.status)) {
                    setStatus(data.status);
                    stopScanLocal();
                    onRefreshNeeded?.();
                } else {
                    pollingRef.current = setTimeout(poll, 1000);
                }
            } catch (err) { pollingRef.current = setTimeout(poll, 3000); }
        };
        poll();
    };

    const stopPolling = () => { if (pollingRef.current) clearTimeout(pollingRef.current); pollingRef.current = null; };
    const stopScanLocal = () => { stopPolling(); localStorage.removeItem("current_scan_job_id"); };

    const handleAction = async () => {
        if (status === "processing") {
            await api.post(`/doublons/scan/stop/${jobId}`);
        } else {
            setStatus("processing");
            setProgress(0);
            const res = await api.post("/doublons/scan/start");
            setJobId(res.data.job_id);
            localStorage.setItem("current_scan_job_id", res.data.job_id);
            startPolling(res.data.job_id);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full transition-all duration-500">
            <div className="p-6 lg:p-8 flex flex-col gap-6">
                
                {/* Header & Bouton */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl shadow-lg transition-all duration-500 ${status === 'processing' ? 'bg-indigo-600 text-white rotate-12' : 'bg-gray-100 text-gray-400'}`}>
                            {status === 'processing' ? <FaRocket size={24} /> : <FaSearch size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 tracking-tight">Analyse Intelligente</h2>
                            <p className="text-sm font-bold text-indigo-500/80 uppercase tracking-widest">Moteur de détection</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="hidden sm:block text-right">
                            <div className="text-3xl font-black text-orange-500 flex items-center justify-end gap-2">
                                <FaUserFriends size={20} className="text-orange-200" />
                                {metrics.found.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Doublons identifiés</div>
                        </div>

                        <button 
                            onClick={handleAction}
                            className={`px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${
                                status === "processing" 
                                ? "bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-red-100" 
                                : "bg-gray-900 text-white hover:bg-indigo-600 shadow-gray-200"
                            }`}
                        >
                            {status === "processing" ? "Arrêter" : "Lancer le Scan"}
                        </button>
                    </div>
                </div>

                {/* ZONE DE PROGRESSION EMBELLIE */}
                {(status === "processing" || progress > 0) && (
                    <div className="relative pt-4">
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase mb-1">État du processus</span>
                                <span className="text-sm font-bold text-gray-600">
                                    {metrics.current.toLocaleString()} / {metrics.total.toLocaleString()} profils vérifiés
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-indigo-600 tabular-nums">
                                    {Math.round(progress)}<span className="text-xl">%</span>
                                </span>
                            </div>
                        </div>

                        {/* Barre principale grosse et stylisée */}
                        <div className="relative w-full h-6 bg-gray-100 rounded-full p-1 shadow-inner border border-gray-200">
                            <div 
                                className="relative h-full rounded-full transition-all duration-500 ease-out overflow-hidden shadow-lg"
                                style={{ 
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #4f46e5 100%)',
                                    backgroundSize: '200% 100%'
                                }}
                            >
                                {/* Effet de brillance animé sur la barre */}
                                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ backgroundSize: '200% 100%' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer de statut */}
            {status === "completed" && (
                <div className="bg-green-600 px-6 py-3 text-white text-sm font-bold flex items-center justify-center gap-3 animate-fade-in">
                    <FaCheckCircle className="animate-bounce" /> ANALYSE TERMINÉE : {metrics.found} DOUBLONS PRÊTS POUR RÉVISION
                </div>
            )}
        </div>
    );
}