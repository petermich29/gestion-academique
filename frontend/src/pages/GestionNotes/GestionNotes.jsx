// src/pages/GestionNotes/GestionNotesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FaFilter, FaSpinner, FaCalculator, FaFileExcel, FaSave } from "react-icons/fa";
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
        mention: "", parcours: "", niveau: "", semestre: "",
        session: "SESS_01" // ID de session par défaut (Normale)
    });
    
    const [options, setOptions] = useState({ 
        annees: [], institutions: [], composantes: [], 
        mentions: [], parcours: [], niveaux: [], semestres: [], sessions: []
    });

    const [gridData, setGridData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // 1. Initialisation
    useEffect(() => {
        const loadInit = async () => {
            try {
                const [resA, resI] = await Promise.all([
                    fetch(`${API_BASE_URL}/metadonnees/annees-universitaires`),
                    fetch(`${API_BASE_URL}/institutions/`)
                ]);
                
                // Mettre vos IDs de session réels ici
                const sessionsFake = [
                    { id: "SESS_01", label: "Session Normale" },
                    { id: "SESS_02", label: "Rattrapage" }
                ];

                const annees = await resA.json();
                const insts = await resI.json();

                setOptions(prev => ({
                    ...prev,
                    annees: annees.map(a => ({ id: a.AnneeUniversitaire_id, label: a.AnneeUniversitaire_annee, active: a.AnneeUniversitaire_is_active })),
                    institutions: insts.map(i => ({ id: i.Institution_id, label: i.Institution_nom })),
                    sessions: sessionsFake
                }));

                const active = annees.find(a => a.AnneeUniversitaire_is_active);
                if(active) setFilters(f => ({ ...f, annee: active.AnneeUniversitaire_id }));

            } catch (err) { console.error(err); }
        };
        loadInit();
    }, []);

    // 2. Cascades
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
        if (!filters.annee || !filters.parcours || !filters.semestre || !filters.session) return;
        
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                annee_id: filters.annee,
                parcours_id: filters.parcours,
                semestre_id: filters.semestre,
                session_id: filters.session
            });
            const res = await fetch(`${API_BASE_URL}/notes/grille?${params}`);
            if (res.ok) {
                const data = await res.json();
                setGridData(data);
            }
        } catch (err) { console.error(err); } 
        finally { setIsLoading(false); }
    }, [filters.annee, filters.parcours, filters.semestre, filters.session]);

    useEffect(() => { loadGrille(); }, [loadGrille]);

    // 4. Handlers
    const handleNoteChange = async (etudiantId, ecId, newValue) => {
        // Optimistic UI update
        setGridData(prev => {
            const clone = JSON.parse(JSON.stringify(prev));
            const row = clone.donnees.find(r => r.etudiant_id === etudiantId);
            if(row) row.notes[ecId] = newValue;
            return clone;
        });

        try {
            await fetch(`${API_BASE_URL}/notes/saisie`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    etudiant_id: etudiantId,
                    maquette_ec_id: ecId,
                    session_id: filters.session,
                    valeur: newValue,
                    annee_id: filters.annee,
                    semestre_id: filters.semestre,
                    parcours_id: filters.parcours
                })
            });
        } catch (e) {
            alert("Erreur sauvegarde");
            loadGrille(); // Rollback
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Filtres */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
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
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                             <span className="text-sm font-bold text-gray-600 uppercase">Session active :</span>
                             <select 
                                value={filters.session} 
                                onChange={e => setFilters(f => ({...f, session: e.target.value}))}
                                className="bg-blue-50 text-blue-800 font-bold text-sm px-3 py-1 rounded border border-blue-200 focus:outline-none"
                             >
                                {options.sessions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                             </select>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                disabled
                                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-indigo-700 transition opacity-50 cursor-not-allowed"
                                title="À implémenter côté backend"
                            >
                                <FaCalculator /> Calculer Moyennes
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <FaSpinner className="text-4xl animate-spin mb-2" />
                            <span className="text-sm font-medium">Chargement des notes...</span>
                        </div>
                    ) : (
                        <div className="h-[65vh]">
                            <NotesTable 
                                structure={gridData.structure}
                                students={gridData.donnees}
                                onNoteChange={handleNoteChange}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}