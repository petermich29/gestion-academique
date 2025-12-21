// src/pages/GestionNotes/GestionNotesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FaFilter, FaSpinner, FaCalculator } from "react-icons/fa";
import { NotesTable } from "./components/NotesTable";

// CHANGEZ L'URL SI BESOIN
const API_BASE_URL = "http://127.0.0.1:8000/api"; 

// Composant Helper Select
const FilterSelect = ({ label, value, onChange, options, disabled = false }) => (
    <div className="flex flex-col min-w-[140px]">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
        <select 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            disabled={disabled}
            className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 transition-shadow shadow-sm"
        >
            <option value="">-- Choisir --</option>
            {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export default function GestionNotes() {
    const [filters, setFilters] = useState({
        annee: "", institution: "", composante: "", 
        mention: "", parcours: "", niveau: "", semestre: ""
    });
    
    const [options, setOptions] = useState({ 
        annees: [], institutions: [], composantes: [], 
        mentions: [], parcours: [], niveaux: [], semestres: []
    });

    const [gridData, setGridData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [savingCells, setSavingCells] = useState(new Set());

    // 1. Initialisation
    useEffect(() => {
        const loadInit = async () => {
            try {
                const [resA, resI] = await Promise.all([
                    fetch(`${API_BASE_URL}/metadonnees/annees-universitaires`),
                    fetch(`${API_BASE_URL}/institutions/`)
                ]);
                
                const annees = await resA.json();
                const insts = await resI.json();

                setOptions(prev => ({
                    ...prev,
                    annees: annees.map(a => ({ id: a.AnneeUniversitaire_id, label: a.AnneeUniversitaire_annee, active: a.AnneeUniversitaire_is_active })),
                    institutions: insts.map(i => ({ id: i.Institution_id, label: i.Institution_nom })),
                }));

                const active = annees.find(a => a.AnneeUniversitaire_is_active);
                if(active) setFilters(f => ({ ...f, annee: active.AnneeUniversitaire_id }));

            } catch (err) { console.error(err); }
        };
        loadInit();
    }, []);

    // 2. Cascades (inchangées)
    useEffect(() => {
        if (!filters.institution) return;
        fetch(`${API_BASE_URL}/composantes/institution?institution_id=${filters.institution}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, composantes: data.map(c => ({ id: c.Composante_id, label: c.Composante_label })) })));
    }, [filters.institution]);

    useEffect(() => {
        if (!filters.composante) return;
        fetch(`${API_BASE_URL}/mentions/composante/${filters.composante}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, mentions: data.map(m => ({ id: m.Mention_id, label: m.Mention_label })) })));
    }, [filters.composante]);

    useEffect(() => {
        if (!filters.mention) return;
        fetch(`${API_BASE_URL}/parcours/mention/${filters.mention}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, parcours: data.map(p => ({ id: p.Parcours_id, label: p.Parcours_label })) })));
    }, [filters.mention]);

    useEffect(() => {
        if (!filters.parcours) return;
        fetch(`${API_BASE_URL}/parcours/${filters.parcours}/niveaux`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, niveaux: data.map(n => ({ id: n.Niveau_id || n.id_niveau, label: n.Niveau_label || n.label })) })));
    }, [filters.parcours]);

    useEffect(() => {
        if (!filters.niveau) return;
        fetch(`${API_BASE_URL}/inscriptions/structure/semestres/${filters.niveau}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({ ...prev, semestres: data.map(s => ({ id: s.id, label: s.label })) })));
    }, [filters.niveau]);

    // 3. Chargement Grille
    const loadGrille = useCallback(async () => {
        if (!filters.annee || !filters.parcours || !filters.semestre) return;
        
        setIsLoading(true);
        try {
            // CORRECTION ICI : On ajoute session_id pour éviter l'erreur 422
            // On force "SESS_01" (Session Normale) par défaut pour satisfaire le backend
            const params = new URLSearchParams({
                annee_id: filters.annee,
                parcours_id: filters.parcours,
                semestre_id: filters.semestre,
                session_id: "SESS_01" 
            });

            const res = await fetch(`${API_BASE_URL}/notes/grille?${params}`);
            
            if (res.ok) {
                const data = await res.json();
                setGridData(data);
            } else {
                console.error("Erreur chargement grille", res.status);
            }
        } catch (err) { console.error(err); } 
        finally { setIsLoading(false); }
    }, [filters.annee, filters.parcours, filters.semestre]);

    useEffect(() => { loadGrille(); }, [loadGrille]);

    // 4. Handlers
    // --- Modification du handler de changement de note dans GestionNotes.jsx ---
    const handleNoteChange = async (etudiantId, ecId, newValue, sessionId) => {
        // 1. Recherche sécurisée de l'UE parente
        let ueIdFound = null;
        
        // On vérifie que structure existe et est un tableau
        if (gridData?.structure && Array.isArray(gridData.structure)) {
            gridData.structure.forEach(ue => {
                if (ue.ecs && ue.ecs.some(ec => ec.id === ecId)) {
                    ueIdFound = ue.id;
                }
            });
        }

        const cellKey = `${etudiantId}-${ecId}-${sessionId}`;
        setSavingCells(prev => new Set(prev).add(cellKey));

        try {
            const response = await fetch(`${API_BASE_URL}/notes/saisie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etudiant_id: etudiantId,
                    maquette_ec_id: ecId,
                    valeur: newValue,
                    annee_id: filters.annee,
                    parcours_id: filters.parcours,
                    semestre_id: filters.semestre,
                    session_id: sessionId
                }),
            });

            const data = await response.json();

            if (response.ok && data.updates) {
                setGridData(prev => {
                    // Si par hasard le state a été vidé entre temps
                    if (!prev.donnees) return prev;

                    return {
                        ...prev,
                        donnees: prev.donnees.map(student => {
                            if (student.etudiant_id === etudiantId) {
                                // On crée une copie profonde de l'étudiant
                                const updatedStudent = { ...student };

                                // Mise à jour de la note de l'EC (structure [ecId][sessionId])
                                updatedStudent.notes = {
                                    ...student.notes,
                                    [ecId]: {
                                        ...(typeof student.notes[ecId] === 'object' ? student.notes[ecId] : {}),
                                        [sessionId]: newValue
                                    }
                                };

                                // Mise à jour des résultats d'UE si l'ID a été trouvé
                                if (ueIdFound && data.updates.resultats_ue?.[ueIdFound]) {
                                    updatedStudent.resultats_ue = {
                                        ...student.resultats_ue,
                                        [ueIdFound]: {
                                            ...student.resultats_ue?.[ueIdFound],
                                            [sessionId]: data.updates.resultats_ue[ueIdFound]
                                        }
                                    };
                                }

                                // Mise à jour des résultats du Semestre
                                updatedStudent.moyennes_semestre = {
                                    ...student.moyennes_semestre,
                                    [sessionId]: data.updates.moyenne_semestre
                                };
                                updatedStudent.resultats_semestre = {
                                    ...student.resultats_semestre,
                                    [sessionId]: data.updates.statut_semestre
                                };
                                updatedStudent.credits_semestre = {
                                    ...student.credits_semestre,
                                    [sessionId]: data.updates.credits_semestre
                                };

                                return updatedStudent;
                            }
                            return student;
                        })
                    };
                });
            }
        } catch (error) {
            console.error("Erreur mise à jour notes:", error);
        } finally {
            setSavingCells(prev => {
                const next = new Set(prev);
                next.delete(cellKey);
                return next;
            });
        }
    };

    return (
        // Structure Flex pour gérer la hauteur correcte
        <div className="flex flex-col h-[calc(100vh-80px)] p-6 bg-gray-50 overflow-hidden">
            {/* Filtres */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-4 shrink-0">
                <div className="flex items-center gap-2 mb-4 text-blue-800 border-b border-gray-100 pb-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><FaFilter className="text-blue-600" /></div>
                    <h1 className="text-lg font-bold tracking-tight">Saisie des Notes & Résultats</h1>
                </div>

                <div className="flex flex-wrap gap-3">
                    <FilterSelect label="Année" value={filters.annee} onChange={v => setFilters(f => ({...f, annee: v}))} options={options.annees} />
                    <FilterSelect label="Institution" value={filters.institution} onChange={v => setFilters(f => ({...f, institution: v, composante: ""}))} options={options.institutions} />
                    <FilterSelect label="Composante" value={filters.composante} onChange={v => setFilters(f => ({...f, composante: v, mention: ""}))} options={options.composantes} disabled={!filters.institution} />
                    <FilterSelect label="Mention" value={filters.mention} onChange={v => setFilters(f => ({...f, mention: v, parcours: ""}))} options={options.mentions} disabled={!filters.composante} />
                    <FilterSelect label="Parcours" value={filters.parcours} onChange={v => setFilters(f => ({...f, parcours: v, niveau: ""}))} options={options.parcours} disabled={!filters.mention} />
                    <FilterSelect label="Niveau" value={filters.niveau} onChange={v => setFilters(f => ({...f, niveau: v, semestre: ""}))} options={options.niveaux} disabled={!filters.parcours} />
                    <FilterSelect label="Semestre" value={filters.semestre} onChange={v => setFilters(f => ({...f, semestre: v}))} options={options.semestres} disabled={!filters.niveau} />
                </div>
            </div>

            {/* Actions & Tableau */}
            {gridData && (
                <div className="flex flex-col flex-1 min-h-0 animate-fadeIn">
                    <div className="flex justify-end items-center mb-4 shrink-0">
                        <button 
                            disabled
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-indigo-700 transition opacity-50 cursor-not-allowed"
                        >
                            <FaCalculator /> Calculer Moyennes
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <FaSpinner className="text-4xl animate-spin mb-2" />
                            <span className="text-sm font-medium">Chargement des notes...</span>
                        </div>
                    ) : (
                        // Conteneur principal qui force le tableau à prendre l'espace restant
                        // overflow-hidden ici est crucial pour que le scroll interne du tableau prenne le relais
                        <div className="flex-1 w-full relative bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            <NotesTable 
                                structure={gridData.structure}
                                students={gridData.donnees}
                                onNoteChange={handleNoteChange}
                                savingCells={savingCells} // <--- ON PASSE LA PROP ICI
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}