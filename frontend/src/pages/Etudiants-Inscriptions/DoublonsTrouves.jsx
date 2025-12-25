import React, { useState, useEffect } from "react";
import { FaList, FaEye, FaBan, FaSpinner, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import api from "../../api/axios";
import DuplicateGroupResolver from "./DuplicateGroupResolver";

// On ajoute la prop externalRefreshTrigger
export default function DoublonsTrouves({ externalRefreshTrigger = 0 }) {
    const [currentTab, setCurrentTab] = useState("DETECTE");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ groups: [], total: 0, pages: 1 });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Chargement des données
    useEffect(() => {
        const fetchData = async () => {
            // Optionnel: on peut mettre loading à true ou garder l'ancien contenu pendant le refresh
            // setLoading(true); 
            try {
                const res = await api.get("/doublons/list", {
                    params: { page: page, limit: 10, statut: currentTab }
                });
                setData({
                    groups: res.data.data,
                    total: res.data.total,
                    pages: res.data.pages
                });
            } catch (err) {
                console.error("Erreur", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        // On écoute externalRefreshTrigger ici
    }, [page, currentTab, refreshTrigger, externalRefreshTrigger]);

    const handleAction = async (groupId, action) => {
        try {
            await api.post(`/doublons/action/${groupId}`, { action });
            setRefreshTrigger(prev => prev + 1);
        } catch (err) { alert(err.message); }
    };

    const handleSuccessMerge = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // --- LOGIQUE DE PAGINATION (Identique) ---
    const getPaginationRange = (current, total) => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }
        range.forEach(i => {
            if (l) {
                if (i - l === 2) { rangeWithDots.push(l + 1); }
                else if (i - l !== 1) { rangeWithDots.push('...'); }
            }
            rangeWithDots.push(i);
            l = i;
        });
        return rangeWithDots;
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 min-h-[500px]">
            {/* TABS HEADER */}
            <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-xl px-4 pt-4 gap-2">
                <TabButton label="À Traiter" icon={<FaList />} isActive={currentTab === 'DETECTE'} onClick={() => { setCurrentTab('DETECTE'); setPage(1); }} count={currentTab === 'DETECTE' ? data.total : null} color="orange"/>
                <TabButton label="À Surveiller" icon={<FaEye />} isActive={currentTab === 'SURVEILLANCE'} onClick={() => { setCurrentTab('SURVEILLANCE'); setPage(1); }} color="yellow"/>
                <TabButton label="Ignorés" icon={<FaBan />} isActive={currentTab === 'IGNORE'} onClick={() => { setCurrentTab('IGNORE'); setPage(1); }} color="gray"/>
            </div>

            {/* CONTENU */}
            <div className="p-6">
                {loading && data.groups.length === 0 ? (
                    <div className="py-20 text-center text-gray-400"><FaSpinner className="animate-spin text-3xl mx-auto mb-2" />Chargement...</div>
                ) : (
                    <>
                        {data.groups.length === 0 ? (
                            <div className="bg-gray-50 p-10 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                                Aucun résultat pour le statut <strong>"{currentTab}"</strong>.
                                <br/><span className="text-sm">Lancez un scan ci-dessus pour trouver de nouveaux doublons.</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {data.groups.map((group) => (
                                    <DuplicateGroupResolver 
                                        key={group.group_id} 
                                        group={group} 
                                        onSuccess={handleSuccessMerge}
                                        onStatusChange={handleAction}
                                    />
                                ))}
                            </div>
                        )}

                        {/* PAGINATION */}
                        {data.pages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                                    disabled={page === 1}
                                    className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <FaChevronLeft />
                                </button>
                                {getPaginationRange(page, data.pages).map((p, idx) => (
                                    p === '...' ? <span key={idx} className="px-2 text-gray-300">...</span> :
                                    <button
                                        key={idx}
                                        onClick={() => setPage(p)}
                                        className={`px-3 py-1 rounded border font-medium transition-colors ${
                                            page === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setPage(p => Math.min(data.pages, p + 1))} 
                                    disabled={page === data.pages}
                                    className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const TabButton = ({ label, icon, isActive, onClick, color, count }) => {
    const colorClasses = {
        orange: "border-orange-500 text-orange-700 bg-white shadow-sm",
        yellow: "border-yellow-500 text-yellow-700 bg-white shadow-sm",
        gray: "border-gray-500 text-gray-700 bg-white shadow-sm",
    };
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold border-t-2 border-x-2 border-b-0 transition-all text-sm ${isActive ? `${colorClasses[color]} translate-y-px` : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
        >
            {icon} {label} {count !== null && count !== undefined && <span className="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">{count}</span>}
        </button>
    );
};