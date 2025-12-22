import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    FaCheck, FaThumbtack, FaUserGraduate, FaSearch, 
    FaPen, FaTimes, FaUser, FaLock, FaFilter, FaSortAmountDown, 
    FaSortAmountUp, FaTrash, FaChartBar
} from "react-icons/fa";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import du nouveau composant Modal
import StatsModal from './StatsModal';
import StudentDetailsModal from '../../Etudiants-Inscriptions/components/StudentDetailsModal';

// --- JAUGE CIRCULAIRE ---
const ProgressRing = ({ radius, stroke, progress }) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    let color = "text-red-500";
    if (progress > 50) color = "text-amber-500";
    if (progress === 100) color = "text-green-500";

    return (
        <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} r={normalizedRadius} cx={radius} cy={radius} className={`${color} transition-all duration-500 ease-out`} />
                <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} className="text-gray-200 -z-10 absolute" style={{ strokeDasharray: 0 }} />
            </svg>
            <span className="absolute text-[9px] font-bold text-slate-600">{Math.round(progress)}%</span>
        </div>
    );
};

// --- MENU FILTRE & TRI ---
const ColumnMenu = ({ columnKey, columnTitle, onSort, onFilter, onShowStats, currentFilter, currentSort, onClose }) => {
    const [filterVal, setFilterVal] = useState(currentFilter?.value || "");
    const [filterOp, setFilterOp] = useState(currentFilter?.operator || "lt");
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleApplyFilter = () => {
        if (filterVal === "") onFilter(null);
        else onFilter({ operator: filterOp, value: parseFloat(filterVal) });
        onClose();
    };

    return (
        <div ref={menuRef} className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] text-left p-0 animate-fadeIn overflow-hidden">
             <div className="bg-slate-50 px-3 py-2 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Actions
            </div>
            
            <div className="p-2 border-b border-gray-100 flex flex-col gap-1">
                <button onClick={() => { onSort('asc'); onClose(); }} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded w-full text-left transition-colors ${currentSort === 'asc' ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <FaSortAmountUp className="text-slate-400"/> Tri Croissant
                </button>
                <button onClick={() => { onSort('desc'); onClose(); }} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded w-full text-left transition-colors ${currentSort === 'desc' ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <FaSortAmountDown className="text-slate-400"/> Tri Décroissant
                </button>
                <button onClick={() => { onShowStats(); onClose(); }} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded w-full text-left text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    <FaChartBar className="text-slate-400"/> Statistiques
                </button>
            </div>
            
            <div className="bg-slate-50 px-3 py-2 border-b border-gray-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Filtre Numérique
            </div>

            <div className="p-3 bg-white">
                <select value={filterOp} onChange={e => setFilterOp(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-1.5 mb-2 bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="gt">Supérieur à (&gt;)</option>
                    <option value="lt">Inférieur à (&lt;)</option>
                    <option value="eq">Égal à (=)</option>
                    <option value="gte">Supérieur ou égal (&ge;)</option>
                    <option value="lte">Inférieur ou égal (&le;)</option>
                </select>
                <input 
                    type="number" 
                    placeholder="Valeur (ex: 10)" 
                    value={filterVal} 
                    onChange={e => setFilterVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                    className="w-full text-xs border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-blue-500 outline-none mb-3"
                />
                <div className="flex justify-between items-center">
                    <button onClick={() => { onFilter(null); onClose(); }} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1"><FaTrash /> Effacer</button>
                    <button onClick={handleApplyFilter} className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-blue-700 transition-colors">Appliquer</button>
                </div>
            </div>
        </div>
    );
};

// --- CELLULE INTELLIGENTE ---
const SmartCell = ({ value, onChange, readOnly, isColumnEditing, isLocked }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [error, setError] = useState(false);

    useEffect(() => { setLocalValue(value); setError(false); }, [value]);

    if (isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 cursor-not-allowed">
                {value !== null && value !== undefined ? <span className="text-gray-400 opacity-50 text-xs">{value}</span> : <FaLock size={8} className="text-gray-300" />}
            </div>
        );
    }

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue === "" || localValue === null) {
            if (value !== null) onChange(null);
            setError(false);
            return;
        }

        const numVal = parseFloat(String(localValue).replace(',', '.'));
        if (isNaN(numVal) || numVal < 0 || numVal > 20) {
            setError(true);
            setLocalValue(value); 
        } else {
            setError(false);
            if (numVal !== value) onChange(numVal);
        }
    };

    if (!readOnly && (isEditing || isColumnEditing)) {
        return (
            <input
                autoFocus
                type="number"
                min="0" max="20"
                value={localValue ?? ""}
                onChange={(e) => {
                    setLocalValue(e.target.value);
                    const val = parseFloat(e.target.value);
                    setError(val < 0 || val > 20);
                }}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
                className={`w-full h-full text-center text-sm font-bold focus:outline-none ring-2 ring-inset ${error ? 'bg-red-50 text-red-600 ring-red-400' : 'bg-blue-50 ring-blue-400'}`}
            />
        );
    }

    return (
        <div 
            onClick={() => !readOnly && setIsEditing(true)}
            className={`w-full h-full flex items-center justify-between px-2 cursor-text transition-colors group-hover/cell:bg-white ${error ? 'bg-red-50' : ''}`}
        >
            <span className={`text-sm flex-1 text-center font-medium ${value < 10 && value !== null ? 'text-red-600' : 'text-slate-700'}`}>
                {value !== null ? value : "-"}
            </span>
            {!readOnly && <FaPen size={9} className="opacity-0 group-hover:opacity-30 text-blue-500" />}
        </div>
    );
};

// --- HEADER TRIABLE ---
const SortableUeHeader = ({ ue, activeSessions, showDetails }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ue.id });
    const colSpan = (ue.ecs.length * activeSessions.length) + (showDetails ? activeSessions.length * 2 : 0);
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

    return (
        <th ref={setNodeRef} style={style} colSpan={colSpan} 
            className="px-4 py-3 text-center border-l border-b border-r border-gray-200 bg-gray-50 hover:bg-gray-100 min-w-[200px] relative z-20 group cursor-grab">
            <div className="flex flex-col items-center gap-1.5" {...attributes} {...listeners}>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{ue.code}</span>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-md">{ue.credit} ECTS</span>
            </div>
        </th>
    );
};

// --- COMPOSANT PRINCIPAL ---
export const NotesTable = ({ structure, students, onNoteChange, readOnly = false, savingCells }) => {
    const [orderedUes, setOrderedUes] = useState([]);
    const [showUeDetails, setShowUeDetails] = useState(true);
    const [activeSessions, setActiveSessions] = useState(["SESS_1", "SESS_2"]);
    const [pinnedStudents, setPinnedStudents] = useState(true);
    const [pinnedResults, setPinnedResults] = useState(true);
    const [editingColumn, setEditingColumn] = useState(null);
    
    // Etats pour la modal de stats
    const [statsModalData, setStatsModalData] = useState(null);

    // [NOUVEAU] Etat pour la modal étudiant
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    // Filtres & Tri
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSaisie, setFilterSaisie] = useState("ALL"); 
    const [activeMenu, setActiveMenu] = useState(null); 
    const [colFilters, setColFilters] = useState({}); 
    const [sortConfig, setSortConfig] = useState({ key: 'nom', direction: 'asc' }); 

    const sessionLabels = {
        "SESS_1": { label: "SN", full: "Session Normale", color: "text-blue-700" },
        "SESS_2": { label: "SR", full: "Rattrapage", color: "text-amber-700" }
    };

    useEffect(() => { if (structure?.ues) setOrderedUes(structure.ues); }, [structure]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

    const getStudentProgress = (student) => {
        let totalCells = 0; let filledCells = 0;
        structure.ues.forEach(ue => {
            ue.ecs.forEach(ec => {
                activeSessions.forEach(sess => {
                    const isUeAcquiseS1 = student.resultats_ue?.[ue.id]?.['SESS_1']?.valide;
                    if (sess === 'SESS_2' && isUeAcquiseS1) return;
                    totalCells++;
                    const val = student.notes?.[ec.id]?.[sess];
                    if (val !== null && val !== undefined && val !== "") filledCells++;
                });
            });
        });
        return totalCells === 0 ? 100 : (filledCells / totalCells) * 100;
    };

    const getCellValue = (student, colKey) => {
        if (!student) return null;
        if (colKey === 'nom') return student.nom;
        
        let cellValue = null;
        if (colKey.startsWith('NOTE-')) {
            const parts = colKey.split('-');
            const ecId = parts[1];
            const sess = parts[2];
            const raw = student.notes?.[ecId]?.[sess];
            cellValue = (raw !== undefined && raw !== null && raw !== "") ? Number(raw) : null;
        } else if (colKey.startsWith('MOY-')) {
            const sess = colKey.split('-')[1];
            const raw = student.moyennes_semestre?.[sess];
            cellValue = (raw !== undefined && raw !== null) ? Number(raw) : null;
        } else if (colKey.startsWith('CRED-')) {
            const sess = colKey.split('-')[1];
            const raw = student.credits_semestre?.[sess];
            cellValue = (raw !== undefined && raw !== null) ? Number(raw) : null;
        }
        return cellValue;
    };

    const processedStudents = useMemo(() => {
        let result = [...students];

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase().trim();
            result = result.filter(s => 
                `${s.nom} ${s.prenoms}`.toLowerCase().includes(lowerQ) || 
                (s.matricule || '').toLowerCase().includes(lowerQ)
            );
        }

        if (filterSaisie !== 'ALL') {
            result = result.filter(s => {
                const p = getStudentProgress(s);
                return filterSaisie === 'COMPLETE' ? p === 100 : p < 100;
            });
        }

        Object.entries(colFilters).forEach(([colKey, filter]) => {
            if (!filter) return;
            const { operator, value } = filter;
            
            result = result.filter(s => {
                const cellValue = getCellValue(s, colKey);
                if (cellValue === null) return false;

                switch (operator) {
                    case 'gt': return cellValue > value;
                    case 'lt': return cellValue < value;
                    case 'gte': return cellValue >= value;
                    case 'lte': return cellValue <= value;
                    case 'eq': return Math.abs(cellValue - value) < 0.001;
                    default: return true;
                }
            });
        });

        result.sort((a, b) => {
            const valA = getCellValue(a, sortConfig.key);
            const valB = getCellValue(b, sortConfig.key);

            if (valA === valB) return 0;
            if (valA === null) return 1;
            if (valB === null) return -1;

            if (typeof valA === 'string') {
                return sortConfig.direction === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [students, searchQuery, filterSaisie, colFilters, sortConfig, structure, activeSessions]);

    const handleShowStats = (colKey, title) => {
        const values = processedStudents
            .map(s => getCellValue(s, colKey))
            .filter(v => v !== null && typeof v === 'number');

        setStatsModalData({
            title: title,
            values: values
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedUes((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const renderColumnHeaderWithMenu = (label, colKey) => {
        const isFiltered = !!colFilters[colKey];
        const isSorted = sortConfig.key === colKey;
        
        return (
            <div className="flex items-center justify-center gap-1 relative w-full h-full">
                <span>{label}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === colKey ? null : colKey); }}
                    className={`p-1 rounded transition-colors ${isFiltered || isSorted ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:bg-gray-200 hover:text-gray-600'}`}
                >
                    {isFiltered ? <FaFilter size={8} /> : (isSorted ? (sortConfig.direction === 'asc' ? <FaSortAmountUp size={9}/> : <FaSortAmountDown size={9}/>) : <FaSortAmountDown size={8} />)}
                </button>
                {activeMenu === colKey && (
                    <ColumnMenu 
                        columnKey={colKey}
                        columnTitle={label}
                        onSort={(dir) => setSortConfig({ key: colKey, direction: dir })}
                        onFilter={(f) => setColFilters(prev => ({ ...prev, [colKey]: f }))}
                        onShowStats={() => handleShowStats(colKey, label)}
                        currentFilter={colFilters[colKey]}
                        currentSort={isSorted ? sortConfig.direction : null}
                        onClose={() => setActiveMenu(null)}
                    />
                )}
            </div>
        );
    };

    if (!structure || !students) return null;

    const colMoyWidth = 90; const colCredWidth = 70; const colStatutWidth = 100;
    const totalResultBlockWidth = (colMoyWidth + colCredWidth + colStatutWidth);

    return (
        <div className="flex flex-col h-full w-full font-sans">
            {statsModalData && <StatsModal data={statsModalData} onClose={() => setStatsModalData(null)} />}

            {selectedStudentId && (<StudentDetailsModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />)}

            {/* TOOLBAR */}
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex justify-between items-center z-50 shrink-0 gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-56">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                     <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setFilterSaisie('ALL')} className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${filterSaisie==='ALL'?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Tous</button>
                        <button onClick={() => setFilterSaisie('INCOMPLETE')} className={`px-2 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${filterSaisie==='INCOMPLETE'?'bg-white text-amber-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Manquants
                        </button>
                        <button onClick={() => setFilterSaisie('COMPLETE')} className={`px-2 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${filterSaisie==='COMPLETE'?'bg-white text-green-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Complets
                        </button>
                     </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-3">
                        {Object.entries(sessionLabels).map(([key, info]) => (
                            <label key={key} className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full border transition-all ${activeSessions.includes(key) ? 'bg-white border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                <input type="checkbox" checked={activeSessions.includes(key)} onChange={() => {
                                    setActiveSessions(prev => prev.includes(key) && prev.length > 1 ? prev.filter(x => x!==key) : !prev.includes(key) ? [...prev, key].sort() : prev)
                                }} className="hidden" />
                                <span className={`w-2 h-2 rounded-full ${activeSessions.includes(key) ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                <span className={`text-xs font-bold ${activeSessions.includes(key) ? 'text-slate-700' : 'text-gray-400'}`}>{info.full}</span>
                            </label>
                        ))}
                    </div>
                     <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                        <div className={`w-9 h-5 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${showUeDetails ? 'bg-blue-500' : ''}`}>
                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${showUeDetails ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <input type="checkbox" checked={showUeDetails} onChange={e => setShowUeDetails(e.target.checked)} className="hidden" />
                        Détails
                    </label>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="flex-1 overflow-auto relative bg-slate-50 w-full scrollbar-thin scrollbar-thumb-gray-300 pb-12">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="border-separate border-spacing-0 w-max min-w-full">
                        <thead className="sticky top-0 z-40 bg-white shadow-sm">
                            <tr className="h-[55px]">
                                <th rowSpan={3} className={`bg-slate-100 border-r-2 border-b border-slate-300 text-left w-[300px] min-w-[300px] top-0 z-50 p-0 align-top ${pinnedStudents ? "sticky left-0 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex flex-col h-full bg-slate-100">
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 h-full">
                                            <span 
                                                className="font-bold text-slate-700 text-xs flex items-center gap-2 cursor-pointer hover:text-blue-600"
                                                onClick={() => setSortConfig(prev => ({ key: 'nom', direction: prev.key === 'nom' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            >
                                                <FaUserGraduate className="text-blue-500"/> 
                                                ETUDIANTS ({processedStudents.length})
                                                {sortConfig.key === 'nom' && (sortConfig.direction === 'asc' ? <FaSortAmountUp/> : <FaSortAmountDown/>)}
                                            </span>
                                            <button onClick={() => setPinnedStudents(!pinnedStudents)} className={`text-gray-400 hover:text-blue-500 transition-colors`}>
                                                <FaThumbtack size={12} className={!pinnedStudents ? "rotate-45" : ""} />
                                            </button>
                                        </div>
                                    </div>
                                </th>

                                <SortableContext items={orderedUes} strategy={horizontalListSortingStrategy}>
                                    {orderedUes.map(ue => <SortableUeHeader key={ue.id} ue={ue} activeSessions={activeSessions} showDetails={showUeDetails} />)}
                                </SortableContext>
                                
                                <th colSpan={activeSessions.length * 3} 
                                    className={`bg-slate-800 border-l-4 border-slate-900 border-b border-slate-900 top-0 z-50 text-white transition-all ${pinnedResults ? 'sticky right-0 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]' : ''}`}>
                                    <div className="flex items-center justify-between px-4 h-full">
                                        <button onClick={() => setPinnedResults(!pinnedResults)} className="text-slate-400 hover:text-white transition-colors">
                                            <FaThumbtack size={12} className={!pinnedResults ? "rotate-45" : "text-blue-400"} />
                                        </button>
                                        <span className="text-xs font-bold uppercase tracking-widest flex-1 text-center">Synthèse</span>
                                    </div>
                                </th>
                            </tr>

                            <tr className="bg-white h-[45px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h2-${ue.id}`}>
                                        {ue.ecs.map((ec, idx) => (
                                            <th key={ec.id} colSpan={activeSessions.length} className={`border-l border-b border-gray-200 px-2 py-1 text-center min-w-[140px] ${idx === ue.ecs.length - 1 && !showUeDetails ? 'border-r border-gray-200' : ''}`}>
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[100px]" title={ec.intitule}>{ec.code}</span>
                                                        {!readOnly && (
                                                            <button onClick={() => setEditingColumn(editingColumn === ec.id ? null : ec.id)}
                                                                className={`p-1 rounded transition-colors ${editingColumn === ec.id ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-blue-500'}`}>
                                                                <FaPen size={9} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                        {showUeDetails && <th colSpan={activeSessions.length * 2} className="border-l border-b border-r border-gray-200 bg-blue-50/30 text-[10px] font-bold text-blue-800/70 text-center tracking-wide">RÉSULTAT</th>}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => (
                                    <th key={`sh-f-${s}`} colSpan={3} 
                                        style={{ right: pinnedResults ? (activeSessions.length - 1 - idx) * totalResultBlockWidth + 'px' : 'auto' }}
                                        className={`bg-slate-700 text-slate-200 text-[10px] font-bold border-l-4 border-slate-900 border-b border-slate-600 uppercase tracking-wider ${pinnedResults ? 'sticky right-0 z-40' : ''}`}>
                                        {sessionLabels[s]?.full}
                                    </th>
                                ))}
                            </tr>

                            <tr className="bg-gray-50 h-[35px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h3-${ue.id}`}>
                                        {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => {
                                            const colKey = `NOTE-${ec.id}-${s}`;
                                            return (
                                            <th key={colKey} className={`group border-l border-b border-gray-200 text-[10px] font-bold w-[70px] text-center uppercase tracking-wide ${s === 'SESS_1' ? 'text-blue-600 bg-white' : 'text-amber-600 bg-amber-50/30'} ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-gray-200' : ''}`}>
                                                {renderColumnHeaderWithMenu(sessionLabels[s]?.label, colKey)}
                                            </th>
                                        )}))}
                                        {showUeDetails && activeSessions.map((s, sIdx) => (
                                            <React.Fragment key={`ue-sub-${s}`}>
                                                <th className="border-l border-b border-blue-100 text-[9px] bg-blue-50/30 text-slate-600 w-[60px] text-center font-bold">MOY</th>
                                                <th className={`border-l border-b border-blue-100 text-[9px] bg-blue-50/30 text-slate-600 w-[50px] text-center ${sIdx === activeSessions.length - 1 ? 'border-r border-gray-200' : ''}`}>V.</th>
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => {
                                    const offset = (activeSessions.length - 1 - idx) * totalResultBlockWidth;
                                    const colMoyKey = `MOY-${s}`;
                                    const colCredKey = `CRED-${s}`;

                                    return (
                                        <React.Fragment key={`fsh-3-${idx}`}>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto' }} className={`group bg-gray-100 border-l-4 border-slate-300 border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colMoyWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>
                                                {renderColumnHeaderWithMenu("MOYENNE", colMoyKey)}
                                            </th>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto' }} className={`group bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colCredWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>
                                                {renderColumnHeaderWithMenu("CREDITS", colCredKey)}
                                            </th>
                                            <th style={{ right: pinnedResults ? offset + 'px' : 'auto' }} className={`bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colStatutWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>DECISION</th>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            {processedStudents.map((student, rowIndex) => {
                                const hasAnyS2Note = structure.ues.some(u => u.ecs.some(ec => { const n = student.notes?.[ec.id]?.['SESS_2']; return n !== null && n !== undefined && n !== ""; }));
                                const progress = getStudentProgress(student);

                                return (
                                <tr key={student.etudiant_id} className="group hover:bg-blue-50 transition-colors duration-0">
                                    <td className={`bg-slate-50 border-r-2 border-slate-300 border-b border-gray-200 px-4 py-3 ${pinnedStudents ? "sticky left-0 z-30" : ""}`}>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={() => setSelectedStudentId(student.etudiant_id)}
                                                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-300 shadow-sm shrink-0 overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                            >
                                                {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover"/> : <FaUser size={14} />}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                {/* Ajout du curseur pointer et onClick sur le nom */}
                                                <span 
                                                    onClick={() => setSelectedStudentId(student.etudiant_id)}
                                                    className="text-sm font-bold text-slate-800 uppercase truncate w-[160px] cursor-pointer hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-2 transition-all"
                                                >
                                                    {student.nom} {student.prenoms}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-500 inline-block">{student.matricule || "N/A"}</span>
                                            </div>
                                            <div className="shrink-0" title={`Saisie complète à ${Math.round(progress)}%`}>
                                                <ProgressRing radius={18} stroke={4} progress={progress} />
                                            </div>
                                        </div>
                                    </td>

                                    {orderedUes.map(ue => {
                                        const isUeAcquiseS1 = student.resultats_ue?.[ue.id]?.['SESS_1']?.valide;
                                        const allS1NotesFilled = ue.ecs.every(ec => {
                                            const val = student.notes?.[ec.id]?.['SESS_1'];
                                            return val !== null && val !== undefined && val !== "";
                                        });

                                        return (
                                            <React.Fragment key={`row-${ue.id}`}>
                                                {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => {
                                                    const cellKey = `${student.etudiant_id}-${ec.id}-${s}`;
                                                    
                                                    let isLocked = false;
                                                    if (s === 'SESS_2') {
                                                        if (isUeAcquiseS1) isLocked = true;
                                                        else if (!allS1NotesFilled) isLocked = true;
                                                    }

                                                    let displayValue = null;
                                                    const rawValue = student.notes?.[ec.id]?.[s];
                                                    
                                                    if (s === 'SESS_2' && isUeAcquiseS1) displayValue = null; 
                                                    else if (typeof student.notes?.[ec.id] === 'object') displayValue = rawValue;
                                                    else if (s === 'SESS_1' && student.notes?.[ec.id] !== undefined) displayValue = student.notes[ec.id];

                                                    return (
                                                        <td key={`${ec.id}-${s}`} className={`border-l border-gray-100 border-b border-gray-100 p-0 h-12 w-[70px] bg-white group-hover:bg-blue-50 group/cell ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-gray-200' : ''}`}>
                                                            <SmartCell 
                                                                value={displayValue} 
                                                                readOnly={readOnly}
                                                                isColumnEditing={editingColumn === ec.id}
                                                                isLocked={isLocked}
                                                                onChange={(val) => onNoteChange(student.etudiant_id, ec.id, val, s)}
                                                            />
                                                        </td>
                                                    );
                                                }))}
                                                {showUeDetails && activeSessions.map((s, sIdx) => {
                                                    const resUe = student.resultats_ue?.[ue.id]?.[s];
                                                    const isBorderRight = sIdx === activeSessions.length - 1;
                                                    if (s === 'SESS_2' && isUeAcquiseS1) return <React.Fragment key={`res-ue-${s}`}><td className="border-l border-gray-100 border-b border-gray-100 bg-slate-50/50 group-hover:bg-blue-50/50"></td><td className={`border-l border-gray-100 border-b border-gray-100 bg-slate-50/50 group-hover:bg-blue-50/50 ${isBorderRight ? 'border-r border-gray-200' : ''}`}></td></React.Fragment>;
                                                    return (
                                                        <React.Fragment key={`res-ue-${s}`}>
                                                            <td className="border-l border-gray-100 border-b border-gray-100 text-center font-bold text-xs bg-slate-50/50 group-hover:bg-blue-50/50 text-slate-700 w-[60px]">{resUe?.moyenne?.toFixed(2) || "-"}</td>
                                                            <td className={`border-l border-gray-100 border-b border-gray-100 text-center bg-slate-50/50 group-hover:bg-blue-50/50 w-[50px] ${isBorderRight ? 'border-r border-gray-200' : ''}`}>
                                                                {resUe?.valide ? <FaCheck className="text-green-500 mx-auto" size={12}/> : resUe?.moyenne ? <FaTimes className="text-red-400 mx-auto opacity-50" size={12}/> : "-"}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}

                                    {activeSessions.map((s, idx) => {
                                        const offset = (activeSessions.length - 1 - idx) * totalResultBlockWidth;
                                        let showSynthesis = true;
                                        if (s === 'SESS_2' && !hasAnyS2Note) showSynthesis = false;

                                        const moyenneGen = student.moyennes_semestre?.[s];
                                        const isMoyenneGood = moyenneGen >= 10;
                                        const credits = student.credits_semestre?.[s] || 0;
                                        const statut = student.resultats_semestre?.[s] || "AJ";
                                        
                                        const moyenneColorClass = moyenneGen !== undefined ? (isMoyenneGood ? "text-green-700 font-black" : "text-red-600 font-bold") : "text-gray-400";

                                        return (
                                            <React.Fragment key={`res-fin-${idx}`}>
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l-4 border-slate-300 border-b border-gray-200 text-center text-sm ${pinnedResults ? 'sticky z-30' : ''}`} style={{right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto', width: colMoyWidth + 'px'}}>
                                                    {showSynthesis && <span className={moyenneColorClass}>{moyenneGen?.toFixed(2) || "-"}</span>}
                                                </td>
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l border-gray-200 border-b border-gray-200 text-center text-xs font-semibold text-slate-600 ${pinnedResults ? 'sticky z-30' : ''}`} style={{right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto', width: colCredWidth + 'px'}}>
                                                    {showSynthesis && credits}
                                                </td>
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l border-gray-200 border-b border-gray-200 text-center px-2 ${pinnedResults ? 'sticky z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]' : ''}`} style={{right: pinnedResults ? offset + 'px' : 'auto', width: colStatutWidth + 'px'}}>
                                                    {showSynthesis && (
                                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border shadow-sm ${statut === 'VAL' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {statut}
                                                        </span>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </DndContext>
            </div>
        </div>
    );
};