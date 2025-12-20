// src/pages/GestionNotes/components/NotesTable.jsx
import React, { useState, useEffect } from 'react';
import { FaCheck, FaThumbtack, FaUserGraduate } from "react-icons/fa";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CELLULE ÉDITABLE ---
const EditableCell = ({ value, onChange, readOnly, sessionCode }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => { setLocalValue(value); }, [value]);

    const handleBlur = () => {
        if (readOnly) return;
        const numVal = localValue === "" ? null : parseFloat(localValue);
        if (numVal !== value) onChange(numVal);
    };

    const bgColor = sessionCode === 'SESS_01' ? 'bg-white' : 'bg-amber-50/40';

    return (
        <input
            type="number"
            step="0.01"
            disabled={readOnly}
            value={localValue ?? ""}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className={`w-full h-full text-center text-xs font-semibold focus:outline-none focus:ring-inset focus:ring-2 focus:ring-blue-400 border-none p-0 ${bgColor}
            ${localValue < 10 && localValue !== null ? 'text-red-600' : 'text-gray-800'}`}
        />
    );
};

const SortableUeHeader = ({ ue, activeSessions, showDetails }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ue.id });
    const colSpan = (ue.ecs.length * activeSessions.length) + (showDetails ? 2 * activeSessions.length : 0);
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, cursor: 'grab' };

    return (
        <th ref={setNodeRef} style={style} colSpan={colSpan} {...attributes} {...listeners}
            className="px-2 py-2 text-center border-l border-b border-r border-r-gray-300 bg-slate-50 hover:bg-slate-100 min-w-[160px] relative z-20 group">
            <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{ue.code}</span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">{ue.credit} ECTS</span>
            </div>
        </th>
    );
};

export const NotesTable = ({ structure, students, onNoteChange, readOnly = false }) => {
    const [orderedUes, setOrderedUes] = useState([]);
    const [showUeDetails, setShowUeDetails] = useState(true);
    // On garde l'état des sessions ici, ce qui correspond à votre demande de "checkbox multiple"
    const [activeSessions, setActiveSessions] = useState(["SESS_01", "SESS_02"]);
    const [pinnedStudents, setPinnedStudents] = useState(true);
    const [pinnedResults, setPinnedResults] = useState(true);

    useEffect(() => { if (structure?.ues) setOrderedUes(structure.ues); }, [structure]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

    const handleSessionToggle = (id) => {
        setActiveSessions(prev => {
            if (prev.includes(id) && prev.length > 1) return prev.filter(s => s !== id);
            if (!prev.includes(id)) return [...prev, id].sort();
            return prev;
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setOrderedUes((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (!structure || !students) return null;

    const colMoyWidth = 80;
    const colCredWidth = 60;
    const colStatutWidth = 90;
    const sessionBlockWidth = colMoyWidth + colCredWidth + colStatutWidth;
    const colUeMoyWidth = 60;
    const colUeValWidth = 40;

    return (
        // Structure ajustée pour le scroll
        <div className="flex flex-col h-full w-full">
            {/* TOOLBAR */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center z-50 shrink-0">
                <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Affichage</span>
                    <div className="flex gap-4">
                        {[{id: "SESS_01", label: "Session Normale", color: "text-blue-600"}, {id: "SESS_02", label: "Rattrapage", color: "text-amber-600"}].map(s => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer group bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <input type="checkbox" checked={activeSessions.includes(s.id)} onChange={() => handleSessionToggle(s.id)} className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-offset-0 focus:ring-0" />
                                <span className={`text-xs font-bold ${activeSessions.includes(s.id) ? s.color : 'text-gray-400'}`}>{s.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                    <input type="checkbox" checked={showUeDetails} onChange={e => setShowUeDetails(e.target.checked)} className="w-3.5 h-3.5 rounded text-blue-600" />
                    Détails UE
                </label>
            </div>

            {/* ZONE SCROLLABLE */}
            <div className="flex-1 overflow-auto relative bg-slate-50 w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="border-separate border-spacing-0 w-max min-w-full">
                        <thead className="sticky top-0 z-40 bg-gray-50">
                            {/* LIGNE 1 */}
                            <tr className="h-[50px]">
                                <th rowSpan={3} className={`bg-slate-100 border-r border-b border-gray-300 px-4 text-left w-[280px] min-w-[280px] top-0 z-50 ${pinnedStudents ? "sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-slate-700 uppercase tracking-wide text-xs">Liste des Étudiants</span>
                                        <button onClick={() => setPinnedStudents(!pinnedStudents)} className={`p-1.5 rounded-full transition-colors ${pinnedStudents ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                            <FaThumbtack size={12} className={!pinnedStudents ? "rotate-45" : ""} />
                                        </button>
                                    </div>
                                </th>
                                <SortableContext items={orderedUes} strategy={horizontalListSortingStrategy}>
                                    {orderedUes.map(ue => <SortableUeHeader key={ue.id} ue={ue} activeSessions={activeSessions} showDetails={showUeDetails} />)}
                                </SortableContext>
                                <th colSpan={activeSessions.length * 3} className={`bg-slate-800 border-l border-b border-slate-900 top-0 z-50 ${pinnedResults ? "sticky right-0 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]" : "relative"}`}>
                                    <div className="flex items-center justify-center gap-3 px-2 text-white">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Résultats Semestre</span>
                                        <button onClick={() => setPinnedResults(!pinnedResults)} className={`p-1.5 rounded-full transition-all ${pinnedResults ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>
                                            <FaThumbtack size={10} className={!pinnedResults ? "rotate-45" : ""} />
                                        </button>
                                    </div>
                                </th>
                            </tr>

                            {/* LIGNE 2 */}
                            <tr className="bg-white h-[40px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h2-${ue.id}`}>
                                        {ue.ecs.map((ec, idx) => (
                                            <th key={ec.id} colSpan={activeSessions.length} className={`border-l border-b border-gray-200 px-1 text-center min-w-[90px] ${idx === ue.ecs.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold text-slate-700 leading-tight">{ec.code}</span>
                                                    <span className="text-[8px] font-semibold text-slate-500 bg-slate-50 px-1.5 rounded border border-slate-200">Coef. {ec.coefficient || 1}</span>
                                                </div>
                                            </th>
                                        ))}
                                        {showUeDetails && <th colSpan={activeSessions.length * 2} className="border-l border-b border-r border-r-gray-300 bg-blue-50/50 text-[9px] font-black text-blue-800 tracking-tighter">MOY / VAL</th>}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => {
                                    const offset = (activeSessions.length - 1 - idx) * sessionBlockWidth;
                                    return (
                                        <th key={`sh-f-${s}`} colSpan={3} className={`z-40 bg-slate-700 text-slate-200 text-[9px] border-l border-b border-slate-600 ${pinnedResults ? 'sticky' : ''}`} style={{ right: pinnedResults ? offset + 'px' : 'auto', width: sessionBlockWidth + 'px' }}>
                                            {s === 'SESS_01' ? 'SESSION NORMALE' : 'RATTRAPAGE'}
                                        </th>
                                    );
                                })}
                            </tr>

                            {/* LIGNE 3 */}
                            <tr className="bg-slate-50 h-[30px]">
                                {orderedUes.map(ue => (
                                    <React.Fragment key={`h3-${ue.id}`}>
                                        {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => (
                                            <th key={`${ec.id}-${s}`} className={`border-l border-b border-gray-200 text-[9px] font-black w-[70px] ${s === 'SESS_01' ? 'text-blue-500' : 'text-amber-600'} ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                {s === 'SESS_01' ? 'SN' : 'SR'}
                                            </th>
                                        )))}
                                        {showUeDetails && activeSessions.map((s, sIdx) => (
                                            <React.Fragment key={`ue-sub-${s}`}>
                                                <th className="border-l border-b border-blue-100 text-[8px] bg-blue-50/50 text-blue-800" style={{ width: colUeMoyWidth + 'px' }}>MOY</th>
                                                <th className={`border-l border-b border-blue-100 text-[8px] bg-blue-50/50 text-blue-800 ${sIdx === activeSessions.length - 1 ? 'border-r border-r-gray-300' : ''}`} style={{ width: colUeValWidth + 'px' }}>VAL</th>
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {activeSessions.map((s, idx) => {
                                    const offset = (activeSessions.length - 1 - idx) * sessionBlockWidth;
                                    return (
                                        <React.Fragment key={`fsh-3-${idx}`}>
                                            <th className={`z-40 bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 ${pinnedResults ? 'sticky' : ''}`} style={{right: pinnedResults ? offset + colStatutWidth + colCredWidth + 'px' : 'auto', width: colMoyWidth + 'px'}}>MOY. GEN</th>
                                            <th className={`z-40 bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 ${pinnedResults ? 'sticky' : ''}`} style={{right: pinnedResults ? offset + colStatutWidth + 'px' : 'auto', width: colCredWidth + 'px'}}>ECTS</th>
                                            <th className={`z-40 bg-slate-100 border-l border-b border-gray-300 text-[8px] font-black text-slate-600 ${pinnedResults ? 'sticky shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`} style={{right: pinnedResults ? offset + 'px' : 'auto', width: colStatutWidth + 'px'}}>DÉCISION</th>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                        {students.map((student) => (
                            <tr key={student.etudiant_id} className="hover:bg-blue-50/30 group transition-colors">
                                
                                {/* COLONNE ÉTUDIANT */}
                                <td className={`bg-white group-hover:bg-blue-50/30 border-r border-gray-300 border-b border-gray-200 px-4 py-2 ${pinnedStudents ? "sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "relative"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                            <FaUserGraduate size={14} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800 uppercase truncate w-[190px]">
                                                {student.nom} {student.prenoms}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                #{student.matricule || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* ZONE NOTES */}
                                {orderedUes.map(ue => {
                                    const resUe = student.resultats_ue?.[ue.id] || {};
                                    return (
                                        <React.Fragment key={`row-${ue.id}`}>
                                            {ue.ecs.map((ec, ecIdx) => activeSessions.map((s, sIdx) => (
                                                <td key={`${ec.id}-${s}`} 
                                                    className={`border-l border-gray-200 border-b border-gray-200 p-0 h-10 w-[70px] ${ecIdx === ue.ecs.length - 1 && sIdx === activeSessions.length - 1 && !showUeDetails ? 'border-r border-r-gray-300' : ''}`}>
                                                    <EditableCell value={student.notes?.[ec.id]?.[s]} sessionCode={s} onChange={(val) => onNoteChange(student.etudiant_id, ec.id, val, s)} />
                                                </td>
                                            )))}
                                            {showUeDetails && activeSessions.map((s, sIdx) => (
                                                <React.Fragment key={`res-ue-${s}`}>
                                                    <td className="border-l border-gray-200 border-b border-gray-200 text-center font-bold text-[11px] bg-slate-50/40 text-slate-700" style={{ width: colUeMoyWidth + 'px' }}>
                                                        {resUe[s]?.moyenne?.toFixed(2) || "-"}
                                                    </td>
                                                    <td className={`border-l border-gray-200 border-b border-gray-200 text-center bg-slate-50/40 ${sIdx === activeSessions.length - 1 ? 'border-r border-r-gray-300' : ''}`} style={{ width: colUeValWidth + 'px' }}>
                                                        {resUe[s]?.valide ? <FaCheck className="text-green-500 mx-auto" size={10}/> : <span className="text-gray-300 text-[10px]">-</span>}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}

                                {/* ZONE RÉSULTATS */}
                                {activeSessions.map((s, idx) => {
                                    const offset = (activeSessions.length - 1 - idx) * sessionBlockWidth;
                                    return (
                                        <React.Fragment key={`fin-row-${idx}`}>
                                            <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-300 border-b border-gray-200 font-black text-center text-[11px] ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                style={{right: pinnedResults ? offset + colStatutWidth + colCredWidth + 'px' : 'auto', width: colMoyWidth + 'px'}}>
                                                {student.moyennes_semestre?.[s]?.toFixed(2) || "-"}
                                            </td>
                                            <td className={`bg-white group-hover:bg-blue-50/30 border-l border-gray-200 border-b border-gray-200 text-center text-[10px] font-bold text-slate-500 ${pinnedResults ? 'sticky z-30' : ''}`} 
                                                style={{right: pinnedResults ? offset + colStatutWidth + 'px' : 'auto', width: colCredWidth + 'px'}}>
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