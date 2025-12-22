import React, { useState, useEffect, useMemo } from 'react';
import { 
    FaCheck, FaThumbtack, FaUserGraduate, FaSearch, 
    FaPen, FaTimes, FaUser, FaLock, FaFilter, FaExclamationCircle 
} from "react-icons/fa";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- COMPOSANT JAUGE CIRCULAIRE (Progress Ring) ---
const ProgressRing = ({ radius, stroke, progress }) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    // Couleur dynamique
    let color = "text-red-500";
    if (progress > 50) color = "text-amber-500";
    if (progress === 100) color = "text-green-500";

    return (
        <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                <circle
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className={`${color} transition-all duration-500 ease-out`}
                />
                {/* Fond du cercle (gris) */}
                <circle
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="text-gray-200 -z-10 absolute"
                    style={{ strokeDasharray: 0 }} 
                />
            </svg>
            <span className="absolute text-[8px] font-bold text-slate-600">{Math.round(progress)}%</span>
        </div>
    );
};

// --- CELLULE INTELLIGENTE (Reste inchangée) ---
const SmartCell = ({ value, onChange, readOnly, sessionCode, isColumnEditing, isSaving, isLocked }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => { setLocalValue(value); }, [value]);

    if (isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 cursor-not-allowed text-gray-300">
                {value !== null && value !== undefined ? <span className="text-gray-400 opacity-50">{value}</span> : <FaLock size={10} />}
            </div>
        );
    }

    const handleBlur = () => {
        setIsEditing(false);
        let valToParse = localValue === "" ? null : localValue;
        const numVal = valToParse === null ? null : parseFloat(String(valToParse).replace(',', '.'));
        if (numVal !== value) onChange(numVal);
    };

    if (!readOnly && (isEditing || isColumnEditing)) {
        return (
            <input
                autoFocus
                type="number"
                value={localValue ?? ""}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
                className="w-full h-full text-center text-sm font-bold bg-blue-50 focus:outline-none ring-2 ring-blue-400 ring-inset"
            />
        );
    }

    return (
        <div 
            onClick={() => !readOnly && setIsEditing(true)}
            className="w-full h-full flex items-center justify-between px-2 cursor-text transition-colors group-hover/cell:bg-white"
        >
            <span className={`text-sm flex-1 text-center font-medium ${value < 10 && value !== null ? 'text-red-600' : 'text-slate-700'}`}>
                {value !== null ? value : "-"}
            </span>
            {!readOnly && (
                <FaPen size={9} className="opacity-0 group-hover:opacity-30 text-blue-500" />
            )}
        </div>
    );
};

// --- HEADER TRIABLE (Reste inchangé) ---
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
    
    // --- États de Tri et Filtre ---
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, VAL, AJ
    const [filterSaisie, setFilterSaisie] = useState("ALL"); // ALL, COMPLETE, INCOMPLETE
    const [sortConfig, setSortConfig] = useState({ key: 'nom', direction: 'asc' });

    const sessionLabels = {
        "SESS_1": { label: "SN", full: "Session Normale", color: "text-blue-700" },
        "SESS_2": { label: "SR", full: "Rattrapage", color: "text-amber-700" }
    };

    useEffect(() => { if (structure?.ues) setOrderedUes(structure.ues); }, [structure]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

    // --- LOGIQUE DE CALCUL DE PROGRESSION ---
    // Retourne le % de notes saisies pour les sessions actives
    const getStudentProgress = (student) => {
        let totalCells = 0;
        let filledCells = 0;

        structure.ues.forEach(ue => {
            ue.ecs.forEach(ec => {
                activeSessions.forEach(sess => {
                    // Logique métier : Si UE validée en S1, on ne compte pas S2 comme "manquant"
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

    // --- LOGIQUE DE FILTRE ET TRI ---
    const processedStudents = useMemo(() => {
        let result = [...students];

        // 1. Recherche
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase().trim();
            result = result.filter(s => {
                const fullName = `${s.nom || ''} ${s.prenoms || ''}`.toLowerCase();
                const matricule = (s.matricule || '').toLowerCase();
                return fullName.includes(lowerQ) || matricule.includes(lowerQ);
            });
        }

        // 2. Filtre par Statut (Résultat)
        if (filterStatus !== 'ALL') {
            result = result.filter(s => {
                const statuts = Object.values(s.resultats_semestre || {});
                if (filterStatus === 'VAL') return statuts.includes('VAL');
                if (filterStatus === 'AJ') return statuts.includes('AJ') || statuts.length === 0;
                return true;
            });
        }

        // 3. Filtre par Saisie (Complétude)
        if (filterSaisie !== 'ALL') {
            result = result.filter(s => {
                const progress = getStudentProgress(s);
                if (filterSaisie === 'COMPLETE') return progress === 100;
                if (filterSaisie === 'INCOMPLETE') return progress < 100;
                return true;
            });
        }

        // 4. Tri
        result.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'nom') {
                valA = a.nom?.toLowerCase() || "";
                valB = b.nom?.toLowerCase() || "";
            } else if (sortConfig.key === 'moyenne') {
                valA = Math.max(...Object.values(a.moyennes_semestre || {a:0}));
                valB = Math.max(...Object.values(b.moyennes_semestre || {a:0}));
            } else if (sortConfig.key === 'credits') {
                valA = Math.max(...Object.values(a.credits_semestre || {a:0}));
                valB = Math.max(...Object.values(b.credits_semestre || {a:0}));
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [students, searchQuery, filterStatus, filterSaisie, sortConfig, structure, activeSessions]); // structure ajouté aux deps

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
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

    if (!structure || !students) return null;

    const colMoyWidth = 90; const colCredWidth = 70; const colStatutWidth = 100;
    const totalResultBlockWidth = (colMoyWidth + colCredWidth + colStatutWidth);

    return (
        <div className="flex flex-col h-full w-full font-sans">
            {/* TOOLBAR */}
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex justify-between items-center z-50 shrink-0 gap-4">
                
                {/* Zone de Recherche et Filtres */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-56">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
                        />
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    {/* Filtre Saisie (Nouveau) */}
                    <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-gray-400 uppercase">Saisie:</span>
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

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs font-bold text-gray-400 uppercase">Tri:</span>
                        <button onClick={() => handleSort('nom')} className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2">Nom {sortConfig.key==='nom' && (sortConfig.direction==='asc'?'↓':'↑')}</button>
                        <button onClick={() => handleSort('moyenne')} className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2">Moyenne {sortConfig.key==='moyenne' && (sortConfig.direction==='asc'?'↑':'↓')}</button>
                    </div>
                </div>

                {/* Options d'affichage */}
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
            <div className="flex-1 overflow-auto relative bg-slate-50 w-full scrollbar-thin scrollbar-thumb-gray-300">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="border-separate border-spacing-0 w-max min-w-full">
                        <thead className="sticky top-0 z-40 bg-white shadow-sm">
                            <tr className="h-[55px]">
                                {/* Colonne Etudiant Distincte : bg-slate-100 et border-r-2 */}
                                <th rowSpan={3} className={`bg-slate-100 border-r-2 border-b border-slate-300 text-left w-[300px] min-w-[300px] top-0 z-50 p-0 align-top ${pinnedStudents ? "sticky left-0 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex flex-col h-full bg-slate-100">
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 h-full">
                                            <span className="font-bold text-slate-700 text-xs flex items-center gap-2">
                                                <FaUserGraduate className="text-blue-500"/> ETUDIANTS ({processedStudents.length})
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
                                
                                {/* Colonne Synthèse Distincte : border-l-2 */}
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

                            {/* ... [Le reste des en-têtes reste identique sauf ajustement visuel bordures] ... */}
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
                                        {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => (
                                            <th key={`${ec.id}-${s}`} className={`border-l border-b border-gray-200 text-[10px] font-bold w-[70px] text-center uppercase tracking-wide ${s === 'SESS_1' ? 'text-blue-600 bg-white' : 'text-amber-600 bg-amber-50/30'} ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-gray-200' : ''}`}>
                                                {sessionLabels[s]?.label}
                                            </th>
                                        )))}
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
                                    return (
                                        <React.Fragment key={`fsh-3-${idx}`}>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto' }} className={`bg-gray-100 border-l-4 border-slate-300 border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colMoyWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>MOYENNE</th>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto' }} className={`bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colCredWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>CREDITS</th>
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
                                    {/* Colonne Etudiant : Fond Distinct + Bordure + Progress Ring */}
                                    <td className={`bg-slate-50 border-r-2 border-slate-300 border-b border-gray-200 px-4 py-3 ${pinnedStudents ? "sticky left-0 z-30" : ""}`}>
                                        <div className="flex items-center gap-3">
                                            {/* Photo */}
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-300 shadow-sm shrink-0 overflow-hidden relative">
                                                {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover"/> : <FaUser size={14} />}
                                            </div>
                                            
                                            {/* Nom & Matricule */}
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-bold text-slate-800 uppercase truncate w-[160px]">{student.nom} {student.prenoms}</span>
                                                <span className="text-[10px] font-mono text-slate-500 inline-block">{student.matricule || "N/A"}</span>
                                            </div>

                                            {/* Indicateur de Progression */}
                                            <div className="shrink-0" title={`Saisie complète à ${Math.round(progress)}%`}>
                                                <ProgressRing radius={14} stroke={3} progress={progress} />
                                            </div>
                                        </div>
                                    </td>

                                    {/* ... [Cellules de notes identiques au code précédent] ... */}
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
                                                    const isCellSaving = savingCells?.has(cellKey);
                                                    
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
                                                                sessionCode={s} 
                                                                readOnly={readOnly}
                                                                isSaving={isCellSaving}
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
                                                    if (s === 'SESS_2' && isUeAcquiseS1) {
                                                        return <React.Fragment key={`res-ue-${s}`}><td className="border-l border-gray-100 border-b border-gray-100 bg-slate-50/50 group-hover:bg-blue-50/50"></td><td className={`border-l border-gray-100 border-b border-gray-100 bg-slate-50/50 group-hover:bg-blue-50/50 ${isBorderRight ? 'border-r border-gray-200' : ''}`}></td></React.Fragment>;
                                                    }
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

                                    {/* Colonne Synthèse : Fond Distinct + Bordure gauche */}
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
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l-4 border-slate-300 border-b border-gray-200 text-center text-sm ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto', width: colMoyWidth + 'px'}}>
                                                    {showSynthesis && <span className={moyenneColorClass}>{moyenneGen?.toFixed(2) || "-"}</span>}
                                                </td>
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l border-gray-200 border-b border-gray-200 text-center text-xs font-semibold text-slate-600 ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto', width: colCredWidth + 'px'}}>
                                                    {showSynthesis && credits}
                                                </td>
                                                <td className={`bg-slate-50 group-hover:bg-blue-100 border-l border-gray-200 border-b border-gray-200 text-center px-2 ${pinnedResults ? 'sticky z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]' : ''}`} 
                                                    style={{right: pinnedResults ? offset + 'px' : 'auto', width: colStatutWidth + 'px'}}>
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