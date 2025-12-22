import React from 'react';
import { FaTimes, FaCalculator, FaChartBar, FaTrophy, FaArrowDown, FaArrowUp, FaEquals, FaPercent } from "react-icons/fa";

// --- UTILITAIRES ---
const calculateStats = (values) => {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    
    // Ecart type
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
    const median = sorted[Math.floor((sorted.length - 1) * 0.5)];
    const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];

    // Taux de réussite (Note >= 10)
    const passing = sorted.filter(v => v >= 10).length;
    const passRate = (passing / sorted.length) * 100;

    return { min, max, mean, stdDev, q1, median, q3, passRate, count: sorted.length };
};

// --- COMPOSANT BOXPLOT SVG ---
const BoxPlot = ({ stats, width = 450, height = 120 }) => {
    if (!stats) return null;
    const { min, max, q1, median, q3 } = stats;
    
    // Marges pour ne pas couper les textes
    const paddingX = 30;
    const graphWidth = width - (paddingX * 2);
    
    // Echelle linéaire
    const range = max - min || 1; // Eviter division par 0
    const xScale = (val) => paddingX + ((val - min) / range) * graphWidth;

    const yMid = height / 2;
    const boxHeight = 40;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none">
            {/* Dégradé pour la boite */}
            <defs>
                <linearGradient id="boxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                </linearGradient>
            </defs>

            {/* Ligne de fond (Min à Max) */}
            <line x1={xScale(min)} y1={yMid} x2={xScale(max)} y2={yMid} stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            
            {/* Moustaches verticales (Min/Max) */}
            <line x1={xScale(min)} y1={yMid - 10} x2={xScale(min)} y2={yMid + 10} stroke="#64748b" strokeWidth="2" />
            <line x1={xScale(max)} y1={yMid - 10} x2={xScale(max)} y2={yMid + 10} stroke="#64748b" strokeWidth="2" />

            {/* Boîte (Q1 à Q3) */}
            <rect 
                x={xScale(q1)} 
                y={yMid - boxHeight / 2} 
                width={Math.max(xScale(q3) - xScale(q1), 2)} 
                height={boxHeight} 
                fill="url(#boxGradient)" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                rx="4"
            />

            {/* Médiane */}
            <line x1={xScale(median)} y1={yMid - boxHeight / 2} x2={xScale(median)} y2={yMid + boxHeight / 2} stroke="#1e40af" strokeWidth="3" strokeLinecap="round" />

            {/* Labels dynamiques */}
            <g className="text-[10px] font-medium fill-slate-500">
                <text x={xScale(min)} y={yMid + 35} textAnchor="middle">Min: {min}</text>
                <text x={xScale(max)} y={yMid + 35} textAnchor="middle">Max: {max}</text>
                <text x={xScale(q1)} y={yMid - 30} textAnchor="middle">Q1: {q1}</text>
                <text x={xScale(q3)} y={yMid - 30} textAnchor="middle">Q3: {q3}</text>
                
                {/* Label Médiane Mis en valeur */}
                <text x={xScale(median)} y={yMid - 45} textAnchor="middle" className="font-bold fill-blue-800 text-xs">Med: {median}</text>
            </g>
        </svg>
    );
};

// --- COMPOSANT CARTE DE STAT ---
const StatCard = ({ label, value, subtext, icon: Icon, colorClass, bgClass }) => (
    <div className={`p-4 rounded-xl border ${bgClass} flex items-start justify-between transition-all hover:shadow-md`}>
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
            {subtext && <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
            <Icon size={18} />
        </div>
    </div>
);

// --- MODAL PRINCIPAL ---
const StatsModal = ({ data, onClose }) => {
    if (!data) return null;
    const stats = calculateStats(data.values);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FaChartBar className="text-blue-200"/> Analyse Statistique
                        </h3>
                        <p className="text-blue-100 text-sm mt-1 opacity-90 font-medium">
                            {data.title} • <span className="opacity-75">{stats?.count || 0} notes analysées</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {stats ? (
                        <div className="space-y-8">
                            
                            {/* Grille des KPI */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard 
                                    label="Moyenne" 
                                    value={stats.mean.toFixed(2)} 
                                    icon={FaCalculator} 
                                    colorClass="text-blue-600" 
                                    bgClass="bg-blue-50/50 border-blue-100"
                                />
                                <StatCard 
                                    label="Médiane" 
                                    value={stats.median} 
                                    subtext="50% des notes"
                                    icon={FaEquals} 
                                    colorClass="text-purple-600" 
                                    bgClass="bg-purple-50/50 border-purple-100"
                                />
                                <StatCard 
                                    label="Écart Type" 
                                    value={stats.stdDev.toFixed(2)} 
                                    subtext="Dispersion"
                                    icon={FaChartBar} 
                                    colorClass="text-slate-600" 
                                    bgClass="bg-slate-50/50 border-slate-200"
                                />
                                <StatCard 
                                    label="Réussite" 
                                    value={`${Math.round(stats.passRate)}%`} 
                                    subtext="Note ≥ 10"
                                    icon={stats.passRate >= 50 ? FaTrophy : FaPercent} 
                                    colorClass={stats.passRate >= 50 ? "text-green-600" : "text-amber-600"} 
                                    bgClass={stats.passRate >= 50 ? "bg-green-50/50 border-green-100" : "bg-amber-50/50 border-amber-100"}
                                />
                            </div>

                            {/* Section Graphique */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                    Distribution (Boîte à moustaches)
                                </h4>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl pt-6 pb-2 px-4 shadow-inner">
                                    <BoxPlot stats={stats} />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-2">
                                    <span>Note Min: {stats.min}</span>
                                    <span>Note Max: {stats.max}</span>
                                </div>
                            </div>

                            {/* Détails supplémentaires (Min/Max/Quartiles) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between border border-red-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-1.5 rounded-md shadow-sm text-red-500"><FaArrowDown size={12}/></div>
                                        <span className="text-xs font-bold text-red-800 uppercase">Min</span>
                                    </div>
                                    <span className="text-lg font-black text-red-600">{stats.min}</span>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 flex items-center justify-between border border-green-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-1.5 rounded-md shadow-sm text-green-500"><FaArrowUp size={12}/></div>
                                        <span className="text-xs font-bold text-green-800 uppercase">Max</span>
                                    </div>
                                    <span className="text-lg font-black text-green-600">{stats.max}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <FaCalculator size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aucune donnée numérique disponible</p>
                            <p className="text-sm">Impossible de calculer des statistiques sur cette colonne.</p>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
                    <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;