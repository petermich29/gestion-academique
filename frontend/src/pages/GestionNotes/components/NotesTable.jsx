// src/pages/GestionNotes/components/NotesTable.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    FaCheck, FaThumbtack, FaUserGraduate, FaSearch, 
    FaPen, FaTimes, FaUser, FaFilter, FaSpinner 
} from "react-icons/fa";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CELLULE INTELLIGENTE (LECTURE / ÉCRITURE) ---
const SmartCell = ({ value, onChange, readOnly, sessionCode, isColumnEditing, isSaving }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Synchronisation : Si la valeur change depuis le parent, on met à jour le local
    useEffect(() => { 
        setLocalValue(value); 
    }, [value]);

    const editMode = !readOnly && (isEditing || isColumnEditing);

    const handleBlur = () => {
        setIsEditing(false);
        let valToParse = localValue === "" ? null : localValue;
        if (typeof valToParse === 'string') valToParse = valToParse.replace(',', '.');
        
        const numVal = valToParse === null ? null : parseFloat(valToParse);

        if (numVal !== value) {
            onChange(numVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleBlur();
    };

    const bgColor = sessionCode === 'SESS_1' ? 'bg-white' : 'bg-amber-50/30';
    const textColor = (localValue < 10 && localValue !== null && localValue !== "" && localValue !== undefined) ? 'text-red-600' : 'text-slate-700';

    // 1. CAS : EN COURS DE SAUVEGARDE (Spinner bleu local)
    if (isSaving) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${bgColor}`}>
                <FaSpinner className="animate-spin text-blue-500 text-xs" />
            </div>
        );
    }

    // 2. CAS : MODE ÉDITION
    if (editMode) {
        return (
            <input
                autoFocus={!isColumnEditing} 
                type="number"
                step="0.01"
                value={localValue ?? ""}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`w-full h-full text-center text-xs font-bold focus:outline-none focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-400 border-none p-0 ${textColor} ${bgColor}`}
            />
        );
    }

    // 3. CAS : AFFICHAGE STANDARD
    return (
        <div 
            onClick={() => !readOnly && setIsEditing(true)}
            className={`w-full h-full flex items-center justify-center relative group cursor-text ${bgColor}`}
        >
            <span className={`text-xs font-semibold ${textColor}`}>
                {value !== null && value !== undefined ? value : "-"}
            </span>
            {!readOnly && (
                <div className="absolute top-0 right-0 p-1 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <FaPen size={6} />
                </div>
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
            className="px-2 py-2 text-center border-l border-b border-r border-r-gray-300 bg-slate-50 hover:bg-slate-100 min-w-[160px] relative z-20 group">
            <div className="flex flex-col items-center gap-1" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{ue.code}</span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">{ue.credit} ECTS</span>
            </div>
        </th>
    );
};

// --- COMPOSANT PRINCIPAL ---
export const NotesTable = ({ structure, students, onNoteChange, readOnly = false, savingCells }) => {
    const [orderedUes, setOrderedUes] = useState([]);
    const [showUeDetails, setShowUeDetails] = useState(true);
    // Initialisation avec les IDs corrects de la base de données
    const [activeSessions, setActiveSessions] = useState(["SESS_1", "SESS_2"]);
    const [pinnedStudents, setPinnedStudents] = useState(true);
    const [pinnedResults, setPinnedResults] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingColumn, setEditingColumn] = useState(null);

    // DÉFINITION DES SESSIONS ET LABELS
    const sessionLabels = {
        "SESS_1": { label: "SN", full: "SESSION NORMALE", color: "text-blue-600" },
        "SESS_2": { label: "SR", full: "SESSION RATTRAPAGE", color: "text-amber-600" }
    };

    useEffect(() => { if (structure?.ues) setOrderedUes(structure.ues); }, [structure]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const lowerQ = searchQuery.toLowerCase();
        return students.filter(s => 
            (s.nom?.toLowerCase().includes(lowerQ)) ||
            (s.prenoms?.toLowerCase().includes(lowerQ)) ||
            (s.matricule?.toLowerCase().includes(lowerQ))
        );
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

    const colMoyWidth = 80; const colCredWidth = 60; const colStatutWidth = 90;
    const totalResultBlockWidth = (colMoyWidth + colCredWidth + colStatutWidth);

    return (
        <div className="flex flex-col h-full w-full">
            {/* TOOLBAR */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center z-50 shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sessions</span>
                    <div className="flex gap-4">
                        {/* Génération dynamique des checkboxes basée sur sessionLabels */}
                        {Object.entries(sessionLabels).map(([key, info]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <input type="checkbox" checked={activeSessions.includes(key)} onChange={() => {
                                    setActiveSessions(prev => prev.includes(key) && prev.length > 1 ? prev.filter(x => x!==key) : !prev.includes(key) ? [...prev, key].sort() : prev)
                                }} className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0" />
                                <span className={`text-xs font-bold ${activeSessions.includes(key) ? info.color : 'text-gray-400'}`}>{info.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {editingColumn && (
                        <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded text-xs font-bold animate-pulse border border-amber-200">
                            <FaPen size={10}/> Édition colonne active
                            <button onClick={() => setEditingColumn(null)} className="ml-2 hover:bg-amber-200 p-0.5 rounded transition-colors"><FaTimes/></button>
                        </div>
                    )}
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                        <input type="checkbox" checked={showUeDetails} onChange={e => setShowUeDetails(e.target.checked)} className="w-3.5 h-3.5 rounded text-blue-600" />
                        Détails UE
                    </label>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="flex-1 overflow-auto relative bg-slate-50 w-full">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="border-separate border-spacing-0 w-max min-w-full">
                        <thead className="sticky top-0 z-40 bg-gray-50">
                            {/* LIGNE 1 : UEs */}
                            <tr className="h-[50px]">
                                <th rowSpan={3} className={`bg-slate-100 border-r border-b border-gray-300 text-left w-[280px] min-w-[280px] top-0 z-50 p-0 align-top ${pinnedStudents ? "sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-100">
                                            <span className="font-black text-slate-700 uppercase tracking-wide text-[10px] flex items-center gap-2">
                                                <FaUserGraduate className="text-slate-400"/> Étudiants ({filteredStudents.length})
                                            </span>
                                            <button onClick={() => setPinnedStudents(!pinnedStudents)} className={`p-1.5 rounded-full transition-colors ${pinnedStudents ? 'bg-blue-100 text-blue-600' : 'bg-gray-200'}`}>
                                                <FaThumbtack size={10} className={!pinnedStudents ? "rotate-45" : ""} />
                                            </button>
                                        </div>
                                        <div className="p-2 bg-white flex-1 flex items-center">
                                            <div className="relative w-full">
                                                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                                <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </th>

                                <SortableContext items={orderedUes} strategy={horizontalListSortingStrategy}>
                                    {orderedUes.map(ue => <SortableUeHeader key={ue.id} ue={ue} activeSessions={activeSessions} showDetails={showUeDetails} />)}
                                </SortableContext>
                                
                                <th colSpan={activeSessions.length * 3} 
                                    className={`bg-slate-800 border-l border-b border-slate-900 top-0 z-50 text-white transition-all ${pinnedResults ? 'sticky right-0 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Synthèse Semestre</span>
                                    </div>
                                </th>
                            </tr>

                            {/* LIGNE 2 : EC Headers */}
                            <tr className="bg-white h-[40px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h2-${ue.id}`}>
                                        {ue.ecs.map((ec, idx) => (
                                            <th key={ec.id} colSpan={activeSessions.length} className={`border-l border-b border-gray-200 px-1 text-center min-w-[120px] relative ${idx === ue.ecs.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px]">{ec.code}</span>
                                                        {!readOnly && (
                                                            <button onClick={() => setEditingColumn(editingColumn === ec.id ? null : ec.id)}
                                                                className={`p-1 rounded-full ${editingColumn === ec.id ? 'bg-amber-500 text-white' : 'text-gray-300 hover:text-blue-500'}`}>
                                                                <FaPen size={8} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] text-slate-400">Coef. {ec.coefficient}</span>
                                                </div>
                                            </th>
                                        ))}
                                        {showUeDetails && <th colSpan={activeSessions.length * 2} className="border-l border-b border-r border-r-gray-300 bg-blue-50/50 text-[9px] font-black text-blue-800 text-center">RÉSULTATS UE</th>}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => (
                                    <th key={`sh-f-${s}`} colSpan={3} 
                                        style={{ right: pinnedResults ? (activeSessions.length - 1 - idx) * totalResultBlockWidth + 'px' : 'auto' }}
                                        className={`bg-slate-700 text-slate-200 text-[9px] border-l border-b border-slate-600 ${pinnedResults ? 'sticky right-0 z-40' : ''}`}>
                                        {/* Affichage du Label COMPLET (SN / SR) */}
                                        {sessionLabels[s]?.full || s}
                                    </th>
                                ))}
                            </tr>

                            {/* LIGNE 3 : Sessions (S1/RAT) */}
                            <tr className="bg-slate-50 h-[30px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h3-${ue.id}`}>
                                        {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => (
                                            <th key={`${ec.id}-${s}`} className={`border-l border-b border-gray-200 text-[9px] font-black w-[60px] text-center ${s === 'SESS_1' ? 'text-blue-500' : 'text-amber-600'} ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                {/* Affichage du Label COURT (SN / SR) */}
                                                {sessionLabels[s]?.label || s}
                                            </th>
                                        )))}
                                        {showUeDetails && activeSessions.map((s, sIdx) => (
                                            <React.Fragment key={`ue-sub-${s}`}>
                                                <th className="border-l border-b border-blue-100 text-[8px] bg-blue-50/50 text-blue-800 w-[50px] text-center">MOY</th>
                                                <th className={`border-l border-b border-blue-100 text-[8px] bg-blue-50/50 text-blue-800 w-[40px] text-center ${sIdx === activeSessions.length - 1 ? 'border-r border-r-gray-300' : ''}`}>VAL</th>
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => {
                                    const offset = (activeSessions.length - 1 - idx) * totalResultBlockWidth;
                                    return (
                                        <React.Fragment key={`fsh-3-${idx}`}>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto' }} className={`bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 w-[80px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>MOY. GEN</th>
                                            <th style={{ right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto' }} className={`bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 w-[60px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>ECTS</th>
                                            <th style={{ right: pinnedResults ? offset + 'px' : 'auto' }} className={`bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 w-[90px] text-center ${pinnedResults ? 'sticky z-40' : ''}`}>DÉCISION</th>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            {filteredStudents.map((student) => (
                                <tr key={student.etudiant_id} className="hover:bg-blue-50/20 group">
                                    <td className={`bg-white group-hover:bg-blue-50/20 border-r border-gray-300 border-b border-gray-200 px-4 py-2 ${pinnedStudents ? "sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border shrink-0">
                                                {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full rounded-full object-cover"/> : <FaUser size={12} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-bold text-slate-800 uppercase truncate w-[180px]">{student.nom} {student.prenoms}</span>
                                                <span className="text-[9px] font-mono text-slate-400">{student.matricule || "N/A"}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {orderedUes.map(ue => (
                                        <React.Fragment key={`row-${ue.id}`}>
                                            {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => {
                                                const cellKey = `${student.etudiant_id}-${ec.id}-${s}`;
                                                const isCellSaving = savingCells?.has(cellKey);
                                                
                                                // --- CORRECTION ACCÈS DONNÉES ---
                                                // Récupération sécurisée depuis le dictionnaire [ec.id][session_id]
                                                let displayValue = null;
                                                // On vérifie si student.notes[ec.id] existe et si c'est un objet (cas multi-session)
                                                if (student.notes?.[ec.id] && typeof student.notes[ec.id] === 'object') {
                                                    displayValue = student.notes[ec.id][s];
                                                } 
                                                // Fallback au cas où le backend renverrait encore une structure plate pour SESS_1 (sécurité)
                                                else if (s === 'SESS_1' && student.notes?.[ec.id] !== undefined && typeof student.notes[ec.id] !== 'object') {
                                                    displayValue = student.notes[ec.id];
                                                }

                                                return (
                                                    <td key={`${ec.id}-${s}`} className={`border-l border-gray-200 border-b border-gray-200 p-0 h-10 w-[60px] ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                        <SmartCell 
                                                            value={displayValue} 
                                                            sessionCode={s} 
                                                            readOnly={readOnly}
                                                            isSaving={isCellSaving}
                                                            isColumnEditing={editingColumn === ec.id}
                                                            onChange={(val) => onNoteChange(student.etudiant_id, ec.id, val, s)}
                                                        />
                                                    </td>
                                                );
                                            }))}
                                            {showUeDetails && activeSessions.map((s, sIdx) => (
                                                <React.Fragment key={`res-ue-${s}`}>
                                                    <td className="border-l border-gray-200 border-b border-gray-200 text-center font-bold text-[10px] bg-slate-50/30 text-slate-600 w-[50px]">
                                                        {/* Accès sécurisé aux résultats UE par session */}
                                                        {student.resultats_ue?.[ue.id]?.[s]?.moyenne?.toFixed(2) || "-"}
                                                    </td>
                                                    <td className={`border-l border-gray-200 border-b border-gray-200 text-center bg-slate-50/30 w-[40px] ${sIdx === activeSessions.length - 1 ? 'border-r border-r-gray-300' : ''}`}>
                                                        {student.resultats_ue?.[ue.id]?.[s]?.valide ? <FaCheck className="text-green-500 mx-auto" size={9}/> : <span className="text-gray-300">-</span>}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}

                                    {activeSessions.map((s, idx) => {
                                        const offset = (activeSessions.length - 1 - idx) * totalResultBlockWidth;
                                        return (
                                            <React.Fragment key={`res-fin-${idx}`}>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-200 font-black text-center text-[11px] ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth + colCredWidth) + 'px' : 'auto', width: colMoyWidth + 'px'}}>
                                                    {/* Accès sécurisé aux résultats SEMESTRE par session */}
                                                    {student.moyennes_semestre?.[s]?.toFixed(2) || "-"}
                                                </td>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-200 text-center text-[10px] font-bold text-slate-500 ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                    style={{right: pinnedResults ? (offset + colStatutWidth) + 'px' : 'auto', width: colCredWidth + 'px'}}>
                                                    {student.credits_semestre?.[s] || "0"}
                                                </td>
                                                <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-200 text-center px-2 ${pinnedResults ? 'sticky z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`} 
                                                    style={{right: pinnedResults ? offset + 'px' : 'auto', width: colStatutWidth + 'px'}}>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${student.resultats_semestre?.[s] === 'VAL' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {student.resultats_semestre?.[s] || "AJ"}
                                                    </span>
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
        </div>
    );
};