import React, { useState, useEffect, useMemo } from 'react';
import { 
    FaCheck, FaThumbtack, FaUserGraduate, FaSearch, 
    FaPen, FaTimes, FaUser, FaLock 
} from "react-icons/fa";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CELLULE INTELLIGENTE ---
const SmartCell = ({ value, onChange, readOnly, sessionCode, isColumnEditing, isSaving, isLocked }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Si verrouillé (logique métier), on affiche le cadenas
    if (isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100/50 cursor-not-allowed text-gray-300">
                {/* On peut afficher la valeur en gris pâle si elle existe, ou un cadenas */}
                {value !== null && value !== undefined ? (
                    <span className="text-gray-400 opacity-50">{value}</span>
                ) : (
                    <FaLock size={10} />
                )}
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
                className="w-full h-full text-center text-sm font-bold bg-blue-50 focus:outline-none ring-2 ring-blue-400 ring-inset"
            />
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-between px-2 group transition-colors hover:bg-gray-50">
            <span className={`text-sm flex-1 text-center ${value < 10 ? 'text-red-600' : 'text-slate-700'}`}>
                {value !== null ? value : "-"}
            </span>
            {!readOnly && (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity"
                >
                    <FaPen size={10} />
                </button>
            )}
        </div>
    );
};

// --- HEADER TRIABLE (UE) ---
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
    const [searchQuery, setSearchQuery] = useState("");
    const [editingColumn, setEditingColumn] = useState(null);

    const sessionLabels = {
        "SESS_1": { label: "SN", full: "Session Normale", color: "text-blue-700" },
        "SESS_2": { label: "SR", full: "Rattrapage", color: "text-amber-700" }
    };

    useEffect(() => { if (structure?.ues) setOrderedUes(structure.ues); }, [structure]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const lowerQ = searchQuery.toLowerCase();
        return students.filter(s => s.nom?.toLowerCase().includes(lowerQ) || s.matricule?.toLowerCase().includes(lowerQ));
    }, [students, searchQuery]);

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
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex justify-between items-center z-50 shrink-0">
                <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Affichage</span>
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
                </div>
                
                <div className="flex items-center gap-4">
                     <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                        <div className={`w-9 h-5 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${showUeDetails ? 'bg-blue-500' : ''}`}>
                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${showUeDetails ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <input type="checkbox" checked={showUeDetails} onChange={e => setShowUeDetails(e.target.checked)} className="hidden" />
                        Détails Résultats UE
                    </label>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="flex-1 overflow-auto relative bg-slate-50 w-full scrollbar-thin scrollbar-thumb-gray-300">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="border-separate border-spacing-0 w-max min-w-full">
                        <thead className="sticky top-0 z-40 bg-white shadow-sm">
                            <tr className="h-[55px]">
                                <th rowSpan={3} className={`bg-white border-r border-b border-gray-200 text-left w-[320px] min-w-[320px] top-0 z-50 p-0 align-top ${pinnedStudents ? "sticky left-0 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex flex-col h-full bg-slate-50">
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                            <span className="font-bold text-slate-700 text-xs flex items-center gap-2">
                                                <FaUserGraduate className="text-blue-500"/> LISTE ÉTUDIANTS ({filteredStudents.length})
                                            </span>
                                            <button onClick={() => setPinnedStudents(!pinnedStudents)} className={`text-gray-400 hover:text-blue-500 transition-colors`}>
                                                <FaThumbtack size={12} className={!pinnedStudents ? "rotate-45" : ""} />
                                            </button>
                                        </div>
                                        <div className="p-2 bg-white flex-1 flex items-center">
                                            <div className="relative w-full">
                                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
                                                <input type="text" placeholder="Filtrer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-md focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </th>

                                <SortableContext items={orderedUes} strategy={horizontalListSortingStrategy}>
                                    {orderedUes.map(ue => <SortableUeHeader key={ue.id} ue={ue} activeSessions={activeSessions} showDetails={showUeDetails} />)}
                                </SortableContext>
                                
                                <th colSpan={activeSessions.length * 3} 
                                    className={`bg-slate-800 border-l border-b border-slate-900 top-0 z-50 text-white transition-all ${pinnedResults ? 'sticky right-0 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]' : ''}`}>
                                    <div className="flex items-center justify-between px-4 h-full">
                                        <button onClick={() => setPinnedResults(!pinnedResults)} className="text-slate-400 hover:text-white transition-colors">
                                            <FaThumbtack size={12} className={!pinnedResults ? "rotate-45" : "text-blue-400"} />
                                        </button>
                                        <span className="text-xs font-bold uppercase tracking-widest flex-1 text-center">Synthèse Semestre</span>
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
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded mt-0.5">Coef {ec.coefficient}</span>
                                                </div>
                                            </th>
                                        ))}
                                        {showUeDetails && <th colSpan={activeSessions.length * 2} className="border-l border-b border-r border-gray-200 bg-blue-50/30 text-[10px] font-bold text-blue-800/70 text-center tracking-wide">RÉSULTAT</th>}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => (
                                    <th key={`sh-f-${s}`} colSpan={3} 
                                        style={{ right: pinnedResults ? (activeSessions.length - 1 - idx) * totalResultBlockWidth + 'px' : 'auto' }}
                                        className={`bg-slate-700 text-slate-200 text-[10px] font-bold border-l border-b border-slate-600 uppercase tracking-wider ${pinnedResults ? 'sticky right-0 z-40' : ''}`}>
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
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto' }} className={`bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colMoyWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>MOYENNE</th>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto' }} className={`bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colCredWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>CREDITS</th>
                                            <th style={{ right: pinnedResults ? offset + 'px' : 'auto' }} className={`bg-gray-100 border-l border-b border-gray-300 text-[9px] font-bold text-slate-500 w-[${colStatutWidth}px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>DECISION</th>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            {filteredStudents.map((student, rowIndex) => {
                                // 1. CALCUL POUR SAVOIR SI ON AFFICHE LA SYNTHÈSE RATTRA
                                // On vérifie si l'étudiant a au moins une note en SESS_2 dans toute la structure
                                const hasAnyS2Note = structure.ues.some(u => 
                                    u.ecs.some(ec => {
                                        const n = student.notes?.[ec.id]?.['SESS_2'];
                                        return n !== null && n !== undefined && n !== "";
                                    })
                                );

                                return (
                                <tr key={student.etudiant_id} className={`hover:bg-blue-50/30 transition-colors group ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    <td className={`bg-white group-hover:bg-blue-50/30 border-r border-gray-200 border-b border-gray-100 px-4 py-3 ${pinnedStudents ? "sticky left-0 z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]" : ""}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm shrink-0 overflow-hidden">
                                                {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover"/> : <FaUser size={14} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-slate-800 uppercase truncate w-[220px]">{student.nom} {student.prenoms}</span>
                                                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 inline-block px-1.5 rounded w-fit">{student.matricule || "N/A"}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {orderedUes.map(ue => {
                                        // A. Vérification validation UE en S1
                                        const isUeAcquiseS1 = student.resultats_ue?.[ue.id]?.['SESS_1']?.valide;

                                        // B. Vérification complétude S1 (Est-ce que TOUS les ECs de cette UE ont une note en S1 ?)
                                        const allS1NotesFilled = ue.ecs.every(ec => {
                                            const val = student.notes?.[ec.id]?.['SESS_1'];
                                            return val !== null && val !== undefined && val !== "";
                                        });

                                        return (
                                            <React.Fragment key={`row-${ue.id}`}>
                                                {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => {
                                                    const cellKey = `${student.etudiant_id}-${ec.id}-${s}`;
                                                    const isCellSaving = savingCells?.has(cellKey);
                                                    
                                                    // LOGIQUE DE VERROUILLAGE S2
                                                    // 1. Si UE Validée en S1 -> S2 verrouillé
                                                    // 2. Si S1 incomplet -> S2 verrouillé
                                                    let isLocked = false;
                                                    if (s === 'SESS_2') {
                                                        if (isUeAcquiseS1) isLocked = true;
                                                        else if (!allS1NotesFilled) isLocked = true;
                                                    }

                                                    // MASQUAGE VISUEL POUR UE VALIDÉE S1
                                                    // Si UE validée S1, on ne montre rien en S2 (même si la note est copiée en back)
                                                    let displayValue = null;
                                                    const rawValue = student.notes?.[ec.id]?.[s];
                                                    
                                                    if (s === 'SESS_2' && isUeAcquiseS1) {
                                                        displayValue = null; // Visuellement vide
                                                    } else {
                                                        if (typeof student.notes?.[ec.id] === 'object') {
                                                            displayValue = rawValue;
                                                        } else if (s === 'SESS_1' && student.notes?.[ec.id] !== undefined) {
                                                            displayValue = student.notes[ec.id];
                                                        }
                                                    }

                                                    return (
                                                        <td key={`${ec.id}-${s}`} className={`border-l border-gray-100 border-b border-gray-100 p-0 h-12 w-[70px] ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-gray-200' : ''}`}>
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
                                                    let moyenneUe = resUe?.moyenne;
                                                    let isValide = resUe?.valide;
                                                    const isBorderRight = sIdx === activeSessions.length - 1;

                                                    // C. MASQUAGE RESULTAT UE EN S2 SI UE VALIDÉE EN S1
                                                    // "Moyenne et statut de l'UE devraient aussi vide"
                                                    if (s === 'SESS_2' && isUeAcquiseS1) {
                                                        return (
                                                            <React.Fragment key={`res-ue-${s}`}>
                                                                <td className="border-l border-gray-100 border-b border-gray-100 bg-slate-50/50"></td>
                                                                <td className={`border-l border-gray-100 border-b border-gray-100 bg-slate-50/50 ${isBorderRight ? 'border-r border-gray-200' : ''}`}></td>
                                                            </React.Fragment>
                                                        );
                                                    }

                                                    return (
                                                        <React.Fragment key={`res-ue-${s}`}>
                                                            <td className="border-l border-gray-100 border-b border-gray-100 text-center font-bold text-xs bg-slate-50/50 text-slate-700 w-[60px]">
                                                                {moyenneUe !== undefined && moyenneUe !== null ? moyenneUe.toFixed(2) : "-"}
                                                            </td>
                                                            <td className={`border-l border-gray-100 border-b border-gray-100 text-center bg-slate-50/50 w-[50px] ${isBorderRight ? 'border-r border-gray-200' : ''}`}>
                                                                {isValide ? (
                                                                    <FaCheck className="text-green-500 mx-auto drop-shadow-sm" size={12}/>
                                                                ) : moyenneUe !== undefined && moyenneUe !== null ? (
                                                                    <FaTimes className="text-red-400 mx-auto opacity-50" size={12}/>
                                                                ) : <span className="text-gray-200">-</span>}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}

                                    {activeSessions.map((s, idx) => {
                                        const offset = (activeSessions.length - 1 - idx) * totalResultBlockWidth;
                                        
                                        // D. MASQUAGE SYNTHÈSE SEMESTRE
                                        // "les cellules moyennes credits decision devraient restées vides tant qu'aucune note de rattrapage n'est ajoutée"
                                        let showSynthesis = true;
                                        if (s === 'SESS_2' && !hasAnyS2Note) {
                                            showSynthesis = false;
                                        }

                                        const moyenneGen = student.moyennes_semestre?.[s];
                                        const isMoyenneGood = moyenneGen >= 10;
                                        const credits = student.credits_semestre?.[s] || 0;
                                        const statut = student.resultats_semestre?.[s] || "AJ";
                                        
                                        const moyenneColorClass = moyenneGen !== undefined 
                                            ? (isMoyenneGood ? "text-green-700 font-black" : "text-red-600 font-bold")
                                            : "text-gray-400";

                                        return (
                                            <React.Fragment key={`res-fin-${idx}`}>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-100 text-center text-sm ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto', width: colMoyWidth + 'px'}}>
                                                    {showSynthesis && <span className={moyenneColorClass}>{moyenneGen?.toFixed(2) || "-"}</span>}
                                                </td>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-100 text-center text-xs font-semibold text-slate-600 ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto', width: colCredWidth + 'px'}}>
                                                    {showSynthesis && credits}
                                                </td>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-100 text-center px-2 ${pinnedResults ? 'sticky z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]' : ''}`} 
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