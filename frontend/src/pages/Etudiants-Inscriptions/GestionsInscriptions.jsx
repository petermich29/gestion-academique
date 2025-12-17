// frontend/src/pages/Ressources/GestionsInscriptions.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
    FaSearch, FaTrash, 
    FaAngleRight, FaAngleLeft, FaCheckCircle, FaSave, 
    FaFilter, FaExternalLinkAlt, FaLayerGroup, FaTags,
    FaPlus, FaChevronLeft, FaChevronRight, FaSpinner, 
    FaUserGraduate, FaExchangeAlt, FaInfoCircle
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles"; 
import StudentFormModal from "./components/FormEtudiantsAjout"; 
import ConfigurationInscription from "./components/ConfigurationInscription";

// IMPORT DU CONTEXTE TOAST
import { useToast } from "../../context/ToastContext";

const API_BASE_URL = "http://127.0.0.1:8000"; 

const INITIAL_OPTIONS = {
    institutions: [],
    composantes: [],
    mentions: [],
    annees: [],
    niveaux: [],
    parcours: [],
    modes: [],
};

export default function InscriptionsMain() {
    // --- HOOKS ---
    const { addToast } = useToast(); // Utilisation du Toast

    // --- STATE : DONNÉES & UI ---
    const [fetchedStudents, setFetchedStudents] = useState([]); 
    const [selectedObjects, setSelectedObjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 }); 
    const [searchTerm, setSearchTerm] = useState("");

    // --- STATE : LISTES INSCRIPTIONS ---
    const [leftSelection, setLeftSelection] = useState(new Set()); 
    const [rightListDb, setRightListDb] = useState([]); // Inscrits validés
    const [rightListPending, setRightListPending] = useState([]); // En attente
    const [rightSelection, setRightSelection] = useState(new Set()); 

    // --- STATE : MODALS & CONFIG ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);

    const [filters, setFilters] = useState({
        institution: "", composante: "", mention: "",
        annee: "", parcours: "", niveau: "", mode: ""
    });
    
    const [options, setOptions] = useState(INITIAL_OPTIONS);
    const [semestresOptions, setSemestresOptions] = useState([]);

    const isConfigured = filters.mention && filters.annee && filters.niveau && filters.parcours && filters.mode;

    // =========================================================
    // 1. CHARGEMENT INITIAL & METADONNEES
    // =========================================================
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Parallélisation des appels pour performance
                const [resAnnee, resInst, resModes, resNiv] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`),
                    fetch(`${API_BASE_URL}/api/institutions/`),
                    fetch(`${API_BASE_URL}/api/metadonnees/modes-inscription`),
                    fetch(`${API_BASE_URL}/api/metadonnees/niveaux`)
                ]);

                let [anneesData, instData, modesData, niveauxData] = [[], [], [], []];

                if (resAnnee.ok) {
                    const data = await resAnnee.json();
                    anneesData = data.map(item => ({
                        id: item.AnneeUniversitaire_id || item.id_annee_universitaire,
                        label: `${item.AnneeUniversitaire_annee || item.annee} ${item.AnneeUniversitaire_is_active ? "(Active)" : ""}`
                    }));
                }
                if (resInst.ok) {
                    const data = await resInst.json();
                    instData = data.map(item => ({ id: item.Institution_id, label: item.Institution_nom }));
                }
                if (resModes.ok) {
                    const data = await resModes.json();
                    modesData = data.map(item => ({
                        id: item.ModeInscription_id || item.id_mode,
                        label: item.ModeInscription_label
                    }));
                }
                if (resNiv.ok) {
                    const data = await resNiv.json();
                    niveauxData = data.map(item => ({
                        id: item.Niveau_id || item.id_niveau,
                        label: item.Niveau_label || item.code
                    }));
                }

                setOptions(prev => ({ 
                    ...prev, 
                    annees: anneesData, 
                    institutions: instData, 
                    modes: modesData, 
                    niveaux: niveauxData 
                }));

            } catch (error) {
                console.error("Erreur init:", error);
                addToast("Erreur lors du chargement des données initiales", "error");
            }
        };
        fetchInitialData();
    }, []);

    // =========================================================
    // 2. CASCADES DE CHARGEMENT
    // =========================================================

    // Institution -> Composantes
    useEffect(() => {
        if (!filters.institution) {
            setOptions(prev => ({ ...prev, composantes: [], mentions: [], parcours: [] }));
            setFilters(prev => ({ ...prev, composante: "", mention: "", parcours: "" }));
            return;
        }
        fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${filters.institution}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({...prev, composantes: data.map(c => ({ id: c.Composante_id, label: c.Composante_label }))})))
            .catch(console.error);
    }, [filters.institution]);

    // Composante -> Mentions
    useEffect(() => {
        if (!filters.composante) {
            setOptions(prev => ({ ...prev, mentions: [], parcours: [] }));
            setFilters(prev => ({ ...prev, mention: "", parcours: "" }));
            return;
        }
        fetch(`${API_BASE_URL}/api/mentions/composante/${filters.composante}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({...prev, mentions: data.map(m => ({ id: m.Mention_id, label: m.Mention_label }))})))
            .catch(console.error);
    }, [filters.composante]);

    // Mention -> Parcours
    useEffect(() => {
        if (!filters.mention) {
            setOptions(prev => ({ ...prev, parcours: [] }));
            setFilters(prev => ({ ...prev, parcours: "" }));
            return;
        }
        fetch(`${API_BASE_URL}/api/parcours/mention/${filters.mention}`)
            .then(res => res.json())
            .then(data => setOptions(prev => ({...prev, parcours: data.map(p => ({ id: p.Parcours_id, label: p.Parcours_label }))})))
            .catch(console.error);
    }, [filters.mention]);

    // Parcours -> Niveaux Spécifiques
    useEffect(() => {
        if (!filters.parcours) return;
        
        const fetchNiveauxSpecifiques = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/parcours/${filters.parcours}/niveaux`);
                if (response.ok) {
                    const data = await response.json();
                    setOptions(prev => ({
                        ...prev,
                        niveaux: data.map(n => ({
                            id: n.Niveau_id || n.id_niveau,
                            label: n.Niveau_label || n.label
                        }))
                    }));
                }
            } catch (error) { console.error(error); }
        };
        fetchNiveauxSpecifiques();
        setFilters(prev => ({ ...prev, niveau: "" })); // Reset niveau on parcours change
    }, [filters.parcours]);

    // Niveau -> Semestres
    useEffect(() => {
        if (!filters.niveau) {
            setSemestresOptions([]);
            // Reset semestres selectionnés dans pending list si niveau change
            setRightListPending(prev => prev.map(item => ({ ...item, semestres: [] })));
            return;
        }
        fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`)
            .then(res => res.json())
            .then(data => setSemestresOptions(data))
            .catch(() => setSemestresOptions([]));
    }, [filters.niveau]);

    // =========================================================
    // 3. CHARGEMENT DES LISTES
    // =========================================================

    // GAUCHE : Base Étudiants
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const skip = (pagination.page - 1) * pagination.limit;
            const params = new URLSearchParams({ skip: skip.toString(), limit: pagination.limit.toString() });
            if (searchTerm) params.append("search", searchTerm);

            const res = await fetch(`${API_BASE_URL}/api/etudiants?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                const mappedItems = (result.items || []).map(item => ({
                    id: item.Etudiant_id,
                    nom: item.Etudiant_nom,
                    prenom: item.Etudiant_prenoms,
                    cin: item.Etudiant_cin || "—",
                    ddn: item.Etudiant_naissance_date || "—",
                    original: item 
                }));
                setFetchedStudents(mappedItems);
                setPagination(prev => ({ ...prev, total: result.total || 0 }));
            }
        } catch (error) { 
            console.error(error);
            addToast("Erreur chargement étudiants", "error");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(fetchStudents, 300);
        return () => clearTimeout(t);
    }, [pagination.page, pagination.limit, searchTerm]);

    // DROITE : Inscriptions existantes
    const fetchExistingInscriptions = async () => {
        // On vérifie que les filtres minimaux sont là
        if (!filters.annee || !filters.mention) {
            setRightListDb([]);
            return;
        }
        try {
            const params = new URLSearchParams({ 
                annee_id: filters.annee, 
                mention_id: filters.mention 
            });
            
            // --- AJOUT STRICT DE TOUS LES FILTRES ---
            if (filters.institution) params.append("institution_id", filters.institution);
            if (filters.composante) params.append("composante_id", filters.composante);
            if (filters.parcours) params.append("parcours_id", filters.parcours);
            if (filters.niveau) params.append("niveau_id", filters.niveau);
            if (filters.mode) params.append("mode_inscription_id", filters.mode);
            // ----------------------------------------

            const res = await fetch(`${API_BASE_URL}/api/inscriptions/?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                
                const mappedInscrits = data.map(item => ({
                    id: item.id,
                    nom: item.etudiant_nom || "Inconnu",
                    prenom: item.etudiant_prenom || "",
                    matricule: item.matricule || "N/A",
                    semestre: item.semestre_label || "—",
                    niveau: item.niveau_label || "",
                    parcours: item.parcours_label || "",
                    mode: item.mode_label || "—"
                }));
                
                setRightListDb(mappedInscrits);
            }
        } catch (e) { console.error("Erreur chargement inscrits:", e); }
    };

    useEffect(() => {
        fetchExistingInscriptions();
    }, [
        filters.annee, 
        filters.mention, 
        filters.parcours, 
        filters.niveau, 
        filters.mode,         // <--- C'était l'oubli principal !
        filters.institution, 
        filters.composante
    ]);

    // =========================================================
    // 4. LOGIQUE UI ET ACTIONS
    // =========================================================

    const { frozenList, scrollableList } = useMemo(() => {
        const selectedIds = new Set(selectedObjects.map(s => s.id));
        const frozen = [...selectedObjects];
        const scrollable = fetchedStudents.filter(s => !selectedIds.has(s.id));
        return { frozenList: frozen, scrollableList: scrollable };
    }, [selectedObjects, fetchedStudents]);

    const getFilterLabel = (key) => {
        const list = {
            institution: options.institutions,
            composante: options.composantes,
            mention: options.mentions,
            parcours: options.parcours,
            annee: options.annees,
            niveau: options.niveaux,
            mode: options.modes
        }[key] || [];
        const item = list.find(opt => opt.id === filters[key]);
        return item ? item.label : "—";
    };

    const toggleLeft = (student) => {
        const id = student.id;
        const newSet = new Set(leftSelection);
        if (newSet.has(id)) {
            newSet.delete(id);
            setSelectedObjects(prev => prev.filter(s => s.id !== id));
        } else {
            newSet.add(id);
            setSelectedObjects(prev => {
                if (prev.find(s => s.id === id)) return prev;
                return [...prev, student];
            });
        }
        setLeftSelection(newSet);
    };

    const moveRight = () => {
        if (!isConfigured) return;
        const toMove = selectedObjects; 
        const existingIds = new Set([...rightListDb.map(i => i.id), ...rightListPending.map(s => s.id)]);
        const newOnes = toMove.filter(s => !existingIds.has(s.id)).map(s => ({ ...s, semestres: [] })); 

        setRightListPending([...rightListPending, ...newOnes]);
        setLeftSelection(new Set());
        setSelectedObjects([]);
        addToast(`${newOnes.length} étudiant(s) ajouté(s) à la liste d'attente`, "info");
    };

    const moveLeft = () => {
        setRightListPending(rightListPending.filter(s => !rightSelection.has(s.id)));
        setRightSelection(new Set());
    };

    const toggleRight = (id) => {
        const newSet = new Set(rightSelection);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setRightSelection(newSet);
    };

    const handleSemestreToggle = (id, semestreId) => {
        setRightListPending(prev => prev.map(item => {
            if (item.id === id) {
                const current = item.semestres || [];
                const isSel = current.includes(semestreId);
                return { ...item, semestres: isSel ? current.filter(s => s !== semestreId) : [...current, semestreId] };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        const incomplete = rightListPending.filter(s => !s.semestres || s.semestres.length === 0);
        if (incomplete.length > 0) {
            addToast(`Veuillez sélectionner au moins un semestre pour tous les étudiants.`, "error");
            return;
        }

        setIsLoading(true);
        const mapBySemestre = {};
        rightListPending.forEach(etu => {
            etu.semestres.forEach(semId => {
                if (!mapBySemestre[semId]) mapBySemestre[semId] = [];
                mapBySemestre[semId].push(etu.id);
            });
        });

        let successCount = 0;
        let errorCount = 0;

        for (const [semestreId, etuIds] of Object.entries(mapBySemestre)) {
            const payload = {
                annee_id: filters.annee,
                mention_id: filters.mention,
                parcours_id: filters.parcours,
                niveau_id: filters.niveau,
                semestre_id: semestreId,
                mode_inscription_id: filters.mode,
                etudiants_ids: etuIds
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/inscriptions/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (res.ok) successCount++;
                else errorCount++;
            } catch (e) {
                console.error(e);
                errorCount++;
            }
        }

        setIsLoading(false);
        
        if (successCount > 0) {
            setRightListPending([]);
            fetchExistingInscriptions();
            addToast(`${successCount} lots d'inscriptions validés avec succès !`, "success");
        }
        if (errorCount > 0) {
            addToast(`${errorCount} erreurs survenues lors de l'enregistrement.`, "warning");
        }
    };

    const handleDeleteInscription = async (idToDelete) => {
        // Optionnel : un toast de confirmation maison pourrait remplacer window.confirm pour être plus joli
        if (!window.confirm(`Supprimer cette inscription ?`)) return;
        
        try {
            // Simulation API Call
            // await fetch(`${API_BASE_URL}/api/inscriptions/${idToDelete}`, { method: 'DELETE' });
            setRightListDb(prev => prev.filter(item => item.id !== idToDelete));
            addToast("Inscription supprimée.", "success");
        } catch (e) {
            addToast("Erreur lors de la suppression.", "error");
        }
    };

    // --- RENDER HELPERS ---
    const SemestreCheckbox = ({ options, selectedSemestres, onToggle }) => (
        <div className="flex flex-wrap gap-1">
            {options.length > 0 ? (
                options.map(sem => (
                    <label 
                        key={sem.id} 
                        className={`flex items-center justify-center text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all border ${
                            selectedSemestres.includes(sem.id) 
                            ? 'bg-indigo-600 text-white border-indigo-600 font-medium' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        <input 
                            type="checkbox" 
                            checked={selectedSemestres.includes(sem.id)} 
                            onChange={() => onToggle(sem.id)} 
                            className="hidden" 
                        />
                        {sem.label}
                    </label>
                ))
            ) : (
                <span className="text-[10px] italic text-amber-600">Sélectionnez le niveau</span>
            )}
        </div>
    );

    const TableHeader = ({ children, className = "" }) => (
        <th className={`px-3 py-2 bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 ${className}`}>
            {children}
        </th>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] gap-2">
            
            {/* --- ZONES PRINCIPALES --- */}
            <div className="flex flex-grow gap-2 overflow-hidden">
                
                {/* 1. GAUCHE: Base Étudiants */}
                <div className="w-[38%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-white flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><FaLayerGroup /></div>
                                Base Étudiants
                            </h3>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                                {pagination.total}
                            </span>
                        </div>
                        <div className="relative group">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors text-xs" />
                            <input 
                                type="text" 
                                placeholder="Rechercher (Nom, Matricule...)" 
                                value={searchTerm} 
                                onChange={(e) => { setSearchTerm(e.target.value); setPagination(p => ({...p, page: 1})); }} 
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" 
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 z-50 flex justify-center items-center backdrop-blur-sm">
                                <FaSpinner className="animate-spin text-indigo-600 text-2xl"/>
                            </div>
                        )}
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <TableHeader className="w-8 text-center">#</TableHeader>
                                    <TableHeader>Identité</TableHeader>
                                    <TableHeader>Détails</TableHeader>
                                    <TableHeader className="w-12 text-center">ID</TableHeader>
                                </tr>
                            </thead>
                            
                            {/* Liste figée (Sélectionnés) */}
                            {frozenList.length > 0 && (
                                <tbody className="bg-indigo-50/50 border-b-2 border-indigo-100">
                                    {frozenList.map(etu => (
                                        <tr key={etu.id} onClick={() => toggleLeft(etu)} className="cursor-pointer hover:bg-indigo-100 transition-colors">
                                            <td className="p-3 w-8 text-center">
                                                <div className="w-4 h-4 rounded border border-indigo-400 bg-indigo-600 flex items-center justify-center text-white text-[10px]">✓</div>
                                            </td>
                                            <td className="p-3 font-medium text-indigo-900">{etu.nom} {etu.prenom}</td>
                                            <td className="p-3 text-indigo-700 text-[10px]">CIN: {etu.cin}</td>
                                            <td className="p-3 text-center text-[10px] font-mono text-indigo-500">{etu.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}

                            {/* Liste Scrollable */}
                            <tbody className="divide-y divide-slate-50">
                                {scrollableList.length > 0 ? scrollableList.map(etu => (
                                    <tr key={etu.id} onClick={() => toggleLeft(etu)} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="p-3 w-8 text-center">
                                            <div className="w-4 h-4 rounded border border-gray-300 group-hover:border-indigo-400 bg-white"></div>
                                        </td>
                                        <td className="p-3 text-slate-700">
                                            <div className="font-semibold truncate max-w-[140px]">{etu.nom}</div>
                                            <div className="text-slate-500 truncate max-w-[140px]">{etu.prenom}</div>
                                        </td>
                                        <td className="p-3 text-[10px] text-slate-400 flex flex-col gap-0.5">
                                            <span>CIN: <span className="text-slate-600">{etu.cin}</span></span>
                                            <span>Né(e): <span className="text-slate-600">{etu.ddn}</span></span>
                                        </td>
                                        <td className="p-3 text-center text-[10px] text-slate-300 font-mono group-hover:text-indigo-400">{etu.id}</td>
                                    </tr>
                                )) : (!isLoading && frozenList.length === 0 && 
                                    <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Aucun étudiant trouvé.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Simple */}
                    <div className="p-2 border-t bg-slate-50 flex justify-between items-center shrink-0">
                        <button disabled={pagination.page === 1} onClick={() => setPagination(p => ({...p, page: p.page - 1}))} className="p-1.5 rounded hover:bg-white text-slate-500 disabled:opacity-30 transition"><FaChevronLeft/></button>
                        <span className="text-[10px] font-medium text-slate-500">Page {pagination.page} / {Math.ceil(pagination.total / pagination.limit) || 1}</span>
                        <button disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination(p => ({...p, page: p.page + 1}))} className="p-1.5 rounded hover:bg-white text-slate-500 disabled:opacity-30 transition"><FaChevronRight/></button>
                    </div>
                </div>

                {/* 2. CENTRE: Boutons de transfert */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-4 shrink-0">
                    <button 
                        onClick={moveRight} 
                        disabled={leftSelection.size === 0 || !isConfigured} 
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 transform active:scale-95 ${
                            (isConfigured) 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        title={isConfigured ? "Ajouter à la liste d'attente" : "Configurez l'inscription d'abord"}
                    >
                        <FaAngleRight />
                    </button>
                    <button 
                        onClick={moveLeft} 
                        disabled={rightSelection.size === 0} 
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 text-slate-600 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Retirer de la liste d'attente"
                    >
                        <FaAngleLeft />
                    </button>
                </div>

                {/* 3. DROITE: Configuration et Listes */}
                <div className="w-[58%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    
                    {/* Header Config */}
                    <div className="p-3 border-b border-gray-100 bg-slate-50/50 flex justify-between items-start shrink-0">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><FaFilter /></div>
                                Contexte
                            </h3>
                            {isConfigured ? (
                                <div className="bg-white p-2.5 rounded border border-indigo-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                                    {/* Ligne 1 : Institution & Composante */}
                                    <div className="col-span-1 lg:col-span-2 flex gap-4 border-b border-dashed border-gray-100 pb-1 mb-1">
                                        <p className="truncate text-[10px] text-gray-500">
                                            <span className="font-bold text-indigo-700 uppercase">Inst:</span> {getFilterLabel('institution')}
                                        </p>
                                        <p className="truncate text-[10px] text-gray-500">
                                            <span className="font-bold text-indigo-700 uppercase">Comp:</span> {getFilterLabel('composante')}
                                        </p>
                                    </div>

                                    {/* Autres filtres */}
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Année:</span> {getFilterLabel('annee')}</p>
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Mention:</span> {getFilterLabel('mention')}</p>
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Parcours:</span> {getFilterLabel('parcours')}</p>
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Niveau:</span> {getFilterLabel('niveau')}</p>
                                    <p className="text-[11px] text-slate-600 col-span-1 lg:col-span-2 border-t border-dashed border-gray-100 pt-1 mt-1">
                                        <span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Mode:</span> 
                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100">{getFilterLabel('mode')}</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 w-full">
                                    <FaInfoCircle className="text-lg shrink-0"/> 
                                    <span>Veuillez configurer le contexte d'inscription (Année, Mention, Niveau, Mode) pour commencer.</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 ml-3"> 
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white border border-gray-300 rounded text-slate-700 hover:bg-gray-50 hover:text-indigo-600 transition shadow-sm">
                                <FaExternalLinkAlt/> Configurer
                            </button>
                            <button onClick={() => setIsStudentFormOpen(true)} disabled={!isConfigured} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded border transition shadow-sm ${isConfigured ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"}`}>
                                <FaPlus/> Nouvel Étudiant
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto bg-slate-50/30 p-2 flex flex-col gap-3">
                        
                        {/* A. LISTE EN ATTENTE */}
                        {rightListPending.length > 0 && (
                            <div className="bg-white rounded-md border border-indigo-100 shadow-sm overflow-hidden animate-fadeIn">
                                <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-2">
                                        <FaExchangeAlt /> En attente de validation
                                    </span>
                                    <span className="bg-white text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{rightListPending.length}</span>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-indigo-50/30 text-indigo-900 border-b border-indigo-100">
                                        <tr><th className="p-2 w-8">#</th><th className="p-2">Étudiant</th><th className="p-2">Semestres à inscrire</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rightListPending.map(etu => (
                                            <tr key={etu.id} onClick={() => toggleRight(etu.id)} className={`transition ${rightSelection.has(etu.id) ? "bg-red-50" : "hover:bg-gray-50"}`}>
                                                <td className="p-2 text-center">
                                                    <input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500 cursor-pointer" />
                                                </td>
                                                <td className="p-2 font-medium text-slate-700">{etu.nom} {etu.prenom}</td>
                                                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                                    <SemestreCheckbox options={semestresOptions} selectedSemestres={etu.semestres} onToggle={(sid) => handleSemestreToggle(etu.id, sid)} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* B. LISTE VALIDÉE (DB) */}
                        <div className="flex-grow flex flex-col bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-slate-100/50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                                <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
                                    <FaUserGraduate /> Inscrits Validés
                                </span>
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">{rightListDb.length}</span>
                            </div>
                            
                            <div className="overflow-y-auto flex-grow h-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <TableHeader className="w-8 text-center">#</TableHeader>
                                            <TableHeader className="w-32">Matricule</TableHeader>
                                            <TableHeader>Étudiant</TableHeader>
                                            {/* --- AJOUT : Colonne Niveau --- */}
                                            <TableHeader className="w-16">Niveau</TableHeader>
                                            {/* ----------------------------- */}
                                            <TableHeader>Semestres</TableHeader>
                                            <TableHeader>Mode</TableHeader>
                                            <TableHeader className="w-10"></TableHeader>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rightListDb.map((etu, index) => (
                                            <tr key={etu.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="px-2 py-2.5 text-center text-gray-400 font-mono text-[10px]">{index + 1}</td>
                                                
                                                {/* Matricule */}
                                                <td className="px-2 py-2.5">
                                                    <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                                                        {etu.matricule}
                                                    </span>
                                                </td>
                                                
                                                {/* Étudiant */}
                                                <td className="px-2 py-2.5">
                                                    <div className="font-semibold text-slate-700 uppercase text-[11px]">{etu.nom}</div>
                                                    <div className="text-slate-500 capitalize text-[10px]">{etu.prenom}</div>
                                                </td>

                                                {/* --- AJOUT : Affichage du Niveau --- */}
                                                <td className="px-2 py-2.5">
                                                    <span className="text-[10px] font-bold text-slate-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                                                        {etu.niveau || "—"}
                                                    </span>
                                                </td>
                                                {/* ----------------------------------- */}

                                                {/* Semestres */}
                                                <td className="px-2 py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {etu.semestre.split(',').map((s, idx) => (
                                                            <span key={idx} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 rounded">
                                                                {s.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                {/* Mode (Donnée maintenant corrigée par le backend) */}
                                                <td className="px-2 py-2.5">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">
                                                        {etu.mode}
                                                    </span>
                                                </td>

                                                <td className="px-2 py-2.5 text-right">
                                                    {/* Bouton supprimer inchangé */}
                                                    <button 
                                                        onClick={(e) => {e.stopPropagation(); handleDeleteInscription(etu.id);}} 
                                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                        title="Supprimer l'inscription"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* ... */}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRE ACTION BAS */}
            <div className="mt-1 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex justify-between items-center shrink-0">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConfigured ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></span>
                    {isConfigured ? "Système prêt à inscrire." : "En attente de configuration."}
                </div>
                
                <div className="flex items-center gap-4">
                     {rightListPending.length > 0 && (
                        <span className="text-xs font-medium text-slate-600">
                            <strong className="text-indigo-600">{rightListPending.length}</strong> étudiant(s) prêt(s)
                        </span>
                     )}
                    <button 
                        onClick={handleSave} 
                        disabled={rightListPending.length === 0 || !isConfigured || isLoading} 
                        className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-xs shadow-md transition-all transform hover:-translate-y-0.5 
                            ${(rightListPending.length > 0 && isConfigured && !isLoading) 
                                ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg" 
                                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                            }`
                        }>
                        {isLoading ? <FaSpinner className="animate-spin"/> : <FaSave />} 
                        {isLoading ? "Traitement..." : "Valider Inscriptions"}
                    </button>
                </div>
            </div>
            
            {/* MODALS */}
            <ConfigurationInscription isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} filters={filters} setFilters={setFilters} options={options} onSave={() => setIsModalOpen(false)}/>
            <StudentFormModal isOpen={isStudentFormOpen} onClose={() => setIsStudentFormOpen(false)} data={null} reloadList={fetchStudents}/>
        </div>
    );
}