// frontend/src/pages/Ressources/GestionsInscriptions.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
    FaSearch, FaTrash, 
    FaAngleRight, FaAngleLeft, FaCheckCircle, FaSave, 
    FaFilter, FaExternalLinkAlt, FaLayerGroup, FaTags,
    FaPlus, FaChevronLeft, FaChevronRight, FaSpinner, FaIdCard, FaBirthdayCake
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles"; 
import StudentFormModal from "./components/FormEtudiantsAjout"; 
import ConfigurationInscription from "./components/ConfigurationInscription";

const API_BASE_URL = "http://127.0.0.1:8000"; 

const INITIAL_OPTIONS = {
    institutions: [],
    composantes: [],
    mentions: [],
    annees: [],
    niveaux: [], // Chargé globalement via metadonnees
    parcours: [],
    modes: [],   // Chargé globalement via metadonnees
};

export default function InscriptionsMain() {
    
    // --- STATE : DONNÉES & UI ---
    const [fetchedStudents, setFetchedStudents] = useState([]); // Colonne Gauche (Base)
    const [selectedObjects, setSelectedObjects] = useState([]); // Sélection Colonne Gauche
    const [isLoading, setIsLoading] = useState(false);
    
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 }); 
    const [searchTerm, setSearchTerm] = useState("");

    // --- STATE : LISTES INSCRIPTIONS ---
    const [leftSelection, setLeftSelection] = useState(new Set()); 
    
    // "Inscrits validés" (Colonne Droite) - Vient de la DB
    const [rightListDb, setRightListDb] = useState([]); 
    
    // "En attente" (Milieu) - Construction locale avant envoi
    const [rightListPending, setRightListPending] = useState([]); 
    const [rightSelection, setRightSelection] = useState(new Set()); // Sélection dans "En attente"

    // --- STATE : MODALS & CONFIG ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);

    const [filters, setFilters] = useState({
        institution: "", composante: "", mention: "",
        annee: "", parcours: "", niveau: "", mode: ""
    });
    
    const [options, setOptions] = useState(INITIAL_OPTIONS);
    
    // Map pour lier un Niveau à ses Semestres (spécifique au parcours choisi)
    const [niveauSemestresMap, setNiveauSemestresMap] = useState({});

    // =========================================================
    // 1. CHARGEMENT INITIAL (Métadonnées Globales)
    // =========================================================
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Années Universitaires
                const resAnnee = await fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`);
                let anneesData = [];
                if (resAnnee.ok) {
                    const data = await resAnnee.json();
                    anneesData = data.map(item => ({
                        id: item.AnneeUniversitaire_id || item.id_annee_universitaire,
                        label: `${item.AnneeUniversitaire_annee || item.annee} ${item.AnneeUniversitaire_is_active ? "(Active)" : ""}`
                    }));
                }

                // 2. Institutions
                const resInst = await fetch(`${API_BASE_URL}/api/institutions/`);
                let instData = [];
                if (resInst.ok) {
                    const data = await resInst.json();
                    instData = data.map(item => ({
                        id: item.Institution_id,
                        label: item.Institution_nom
                    }));
                }

                // 3. Modes d'inscription
                const resModes = await fetch(`${API_BASE_URL}/api/metadonnees/modes-inscription`);
                let modesData = [];
                if (resModes.ok) {
                    const data = await resModes.json();
                    modesData = data.map(item => ({
                        id: item.ModeInscription_id || item.id_mode,
                        label: item.ModeInscription_label
                    }));
                }

                // 4. Tous les Niveaux (Global)
                const resNiv = await fetch(`${API_BASE_URL}/api/metadonnees/niveaux`);
                let niveauxData = [];
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
                console.error("Erreur chargement données initiales:", error);
            }
        };

        fetchInitialData();
    }, []);

    // =========================================================
    // 2. CASCADES DE CHARGEMENT (Institution -> Parcours)
    // =========================================================

    // Institution -> Composantes
    useEffect(() => {
        if (!filters.institution) {
            setOptions(prev => ({ ...prev, composantes: [], mentions: [], parcours: [] }));
            setFilters(prev => ({ ...prev, composante: "", mention: "", parcours: "" }));
            return;
        }
        const fetchComposantes = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${filters.institution}`);
                if (res.ok) {
                    const data = await res.json();
                    setOptions(prev => ({
                        ...prev,
                        composantes: data.map(c => ({ id: c.Composante_id, label: c.Composante_label }))
                    }));
                }
            } catch (e) { console.error(e); }
        };
        fetchComposantes();
    }, [filters.institution]);

    // Composante -> Mentions
    useEffect(() => {
        if (!filters.composante) {
            setOptions(prev => ({ ...prev, mentions: [], parcours: [] }));
            setFilters(prev => ({ ...prev, mention: "", parcours: "" }));
            return;
        }
        const fetchMentions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/mentions/composante/${filters.composante}`);
                if (res.ok) {
                    const data = await res.json();
                    setOptions(prev => ({
                        ...prev,
                        mentions: data.map(m => ({ id: m.Mention_id, label: m.Mention_label }))
                    }));
                }
            } catch (e) { console.error(e); }
        };
        fetchMentions();
    }, [filters.composante]);

    // Mention -> Parcours
    useEffect(() => {
        if (!filters.mention) {
            setOptions(prev => ({ ...prev, parcours: [] }));
            setFilters(prev => ({ ...prev, parcours: "" }));
            return;
        }
        const fetchParcours = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/parcours/mention/${filters.mention}`);
                if (res.ok) {
                    const data = await res.json();
                    setOptions(prev => ({
                        ...prev,
                        parcours: data.map(p => ({ id: p.Parcours_id, label: p.Parcours_label }))
                    }));
                }
            } catch (e) { console.error(e); }
        };
        fetchParcours();
    }, [filters.mention]);

    // Parcours -> Structure (Map Niveau/Semestres)
    useEffect(() => {
        if (!filters.parcours) {
            setNiveauSemestresMap({});
            return;
        }
        const fetchStructure = async () => {
            try {
                let url = `${API_BASE_URL}/api/parcours/${filters.parcours}/structure`;
                if (filters.annee) url += `?annee_id=${filters.annee}`;
                
                const res = await fetch(url);
                if (res.ok) {
                    const structure = await res.json();
                    const mapSemestres = {};
                    structure.forEach(s => {
                        mapSemestres[s.niveau_id] = s.semestres.map(sem => ({
                            id: sem.id,
                            label: `Semestre ${sem.numero}`
                        }));
                    });
                    setNiveauSemestresMap(mapSemestres);
                }
            } catch (e) { console.error(e); }
        };
        fetchStructure();
    }, [filters.parcours, filters.annee]);

    // --- HOOK DE CHARGEMENT DES NIVEAUX SELON LE PARCOURS ---
    useEffect(() => {
        const fetchNiveauxSpecifiques = async () => {
            // On ne déclenche l'appel que si un parcours est sélectionné
            if (!filters.parcours) {
                // Optionnel : on peut vider la liste ou garder les niveaux par défaut
                return;
            }

            try {
                // On utilise la route qui n'a pas besoin de 'annee_id'
                const response = await fetch(`${API_BASE_URL}/api/parcours/${filters.parcours}/niveaux`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // On met à jour l'état global des options pour la modal
                    setOptions(prev => ({
                        ...prev,
                        niveaux: data.map(n => ({
                            id: n.Niveau_id || n.id_niveau,
                            label: n.Niveau_label || n.label
                        }))
                    }));

                    console.log("Niveaux mis à jour pour le parcours:", filters.parcours);
                } else {
                    console.error("Erreur lors de la récupération des niveaux");
                }
            } catch (error) {
                console.error("Erreur réseau:", error);
            }
        };

        fetchNiveauxSpecifiques();
    }, [filters.parcours]); // S'exécute à chaque changement de parcours

    // --- RESET DU NIVEAU QUAND LE PARCOURS CHANGE (UX) ---
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            niveau: ""
        }));
    }, [filters.parcours]);


    // =========================================================
    // 3. CHARGEMENT DES LISTES (Gauche et Droite)
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
        } catch (error) { console.error(error); }
        setIsLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(fetchStudents, 300);
        return () => clearTimeout(t);
    }, [pagination.page, pagination.limit, searchTerm]);

    // DROITE : Inscriptions existantes
    const fetchExistingInscriptions = async () => {
        // On attend au moins l'Année et la Mention pour charger
        if (!filters.annee || !filters.mention) {
            setRightListDb([]);
            return;
        }
        try {
            const params = new URLSearchParams({ 
                annee_id: filters.annee, 
                mention_id: filters.mention 
            });
            
            if (filters.parcours) params.append("parcours_id", filters.parcours);
            if (filters.niveau) params.append("niveau_id", filters.niveau);

            const res = await fetch(`${API_BASE_URL}/api/inscriptions/?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                
                // MAPPING SIMPLIFIÉ (Correspond au nouveau Backend)
                const mappedInscrits = data.map(item => ({
                    id: item.id,
                    nom: item.etudiant_nom || "Inconnu",
                    prenom: item.etudiant_prenom || "",
                    matricule: item.matricule || "N/A", // C'est le DossierInscription_numero
                    semestre: item.semestre_label || "—",
                    niveau: item.niveau_label || "",
                    parcours: item.parcours_label || ""
                }));
                
                setRightListDb(mappedInscrits);
            }
        } catch (e) { console.error("Erreur chargement inscrits:", e); }
    };

    useEffect(() => {
        fetchExistingInscriptions();
    }, [filters.annee, filters.mention, filters.parcours, filters.niveau]);

    // =========================================================
    // 4. LOGIQUE UI ET ACTIONS
    // =========================================================

    const { frozenList, scrollableList } = useMemo(() => {
        const selectedIds = new Set(selectedObjects.map(s => s.id));
        const frozen = [...selectedObjects];
        const scrollable = fetchedStudents.filter(s => !selectedIds.has(s.id));
        return { frozenList: frozen, scrollableList: scrollable };
    }, [selectedObjects, fetchedStudents]);

    const FILTER_OPTIONS_MAP = {
        institution: options.institutions,
        composante: options.composantes,
        mention: options.mentions,
        parcours: options.parcours,
        annee: options.annees,
        niveau: options.niveaux,
        mode: options.modes
    };

    const getFilterLabel = (key) => {
        const id = filters[key];
        if (!id) return "—";
        const list = FILTER_OPTIONS_MAP[key] || [];
        const item = list.find(opt => opt.id === id);
        return item ? item.label : id;
    };


    const isConfigured = filters.mention && filters.annee;
    const availableSemestres = useMemo(() => {
        if (!filters.niveau) return [];
        return niveauSemestresMap[filters.niveau] || [];
    }, [filters.niveau, niveauSemestresMap]);

    // Reset semestres si le niveau change
    useEffect(() => {
        setRightListPending(prev => prev.map(item => ({ ...item, semestres: [] })));
    }, [filters.niveau]);

    // Gestion Selection Gauche
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

    // Mouvement Gauche -> Milieu
    const moveRight = () => {
        if (!isConfigured || !filters.niveau) return;
        const toMove = selectedObjects; 
        const existingIds = new Set([...rightListDb.map(i => i.id), ...rightListPending.map(s => s.id)]);
        const newOnes = toMove.filter(s => !existingIds.has(s.id))
                              .map(s => ({ ...s, semestres: [] })); 

        setRightListPending([...rightListPending, ...newOnes]);
        setLeftSelection(new Set());
        setSelectedObjects([]);
    };

    // Mouvement Milieu -> Gauche (Annuler)
    const moveLeft = () => {
        setRightListPending(rightListPending.filter(s => !rightSelection.has(s.id)));
        setRightSelection(new Set());
    };

    // Toggle Semestres dans le milieu
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

    const toggleRight = (id) => {
        const newSet = new Set(rightSelection);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setRightSelection(newSet);
    };

    // --- SAUVEGARDE (APPEL API) ---
    const handleSave = async () => {
        const incomplete = rightListPending.filter(s => !s.semestres || s.semestres.length === 0);
        if (incomplete.length > 0) {
            alert(`Veuillez sélectionner au moins un Semestre pour tous les étudiants en attente.`);
            return;
        }

        // On groupe les étudiants par semestre car l'API bulk prend un semestre_id unique par appel
        const mapBySemestre = {};
        
        rightListPending.forEach(etu => {
            etu.semestres.forEach(semId => {
                if (!mapBySemestre[semId]) mapBySemestre[semId] = [];
                mapBySemestre[semId].push(etu.id);
            });
        });

        setIsLoading(true);
        let successCount = 0;

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
            } catch (e) {
                console.error(`Erreur inscription semestre ${semestreId}`, e);
            }
        }

        setIsLoading(false);
        if (successCount > 0) {
            setRightListPending([]); // Vide la liste d'attente
            fetchExistingInscriptions(); // Recharge la liste de droite
            alert("Inscriptions validées avec succès !");
        }
    };

    const handleDeleteInscription = async (idToDelete) => {
        if (!window.confirm(`Supprimer cette inscription ?`)) return;
        // Implémentation suppression API si nécessaire
        // await fetch(`${API_BASE_URL}/api/inscriptions/${idToDelete}`, { method: 'DELETE' });
        setRightListDb(prev => prev.filter(item => item.id !== idToDelete));
    };
    
    // --- RENDU PAGINATION ---
    const renderPagination = () => {
        if (pagination.total === 0) return null;
        const total = Math.ceil(pagination.total / pagination.limit);
        const current = pagination.page;
        return (
            <div className="flex gap-1 items-center">
                <button disabled={current === 1} onClick={() => setPagination(p => ({...p, page: p.page - 1}))} className="p-1 border rounded hover:bg-white disabled:opacity-50 text-gray-500"><FaChevronLeft/></button>
                <span className="text-xs px-2 text-gray-600">Page {current} / {total}</span>
                <button disabled={current >= total} onClick={() => setPagination(p => ({...p, page: p.page + 1}))} className="p-1 border rounded hover:bg-white disabled:opacity-50 text-gray-500"><FaChevronRight/></button>
            </div>
        );
    };

    // --- SOUS-COMPOSANT CHECKBOX ---
    const SemestreCheckbox = ({ options, selectedSemestres, onToggle }) => (
        <div className="flex flex-wrap gap-1.5">
            {options.map(sem => (
                <label key={sem.id} className={`flex items-center text-[10px] px-2 py-0.5 border rounded cursor-pointer transition-all ${selectedSemestres.includes(sem.id) ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50'}`}>
                    <input type="checkbox" checked={selectedSemestres.includes(sem.id)} onChange={() => onToggle(sem.id)} className="hidden" />
                    {sem.label}
                </label>
            ))}
            {options.length === 0 && <span className="text-[10px] italic text-red-400">Aucun semestre mappé pour ce niveau/parcours.</span>}
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            <div className="flex flex-grow gap-0.5 overflow-hidden">
                
                {/* 1. GAUCHE: Base Étudiants */}
                <div className="w-[40%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2 border-b bg-blue-50/50 flex flex-col gap-2 shrink-0">
                        <h3 className="text-sm font-extrabold text-blue-800 uppercase flex justify-between items-center">
                             <span><FaLayerGroup className="inline mr-1"/> Base Étudiants</span>
                             <span className="bg-blue-200 text-blue-800 px-1.5 rounded text-[10px]">{pagination.total}</span>
                        </h3>
                        <div className="relative">
                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPagination(p => ({...p, page: 1})); }} className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto relative">
                        {isLoading && <div className="absolute inset-0 bg-white/80 z-50 flex justify-center items-center"><FaSpinner className="animate-spin text-blue-600 text-2xl"/></div>}
                        <table className="w-full text-left text-xs table-fixed border-collapse">
                            <thead className="sticky top-0 bg-gray-100 border-b text-gray-600 z-30 shadow-sm h-9">
                                <tr><th className="p-2 w-8 text-center bg-gray-100">#</th><th className="p-2 w-[40%] bg-gray-100">Nom & Prénoms</th><th className="p-2 w-[35%] bg-gray-100">Infos</th><th className="p-2 w-[15%] text-center bg-gray-100">ID</th></tr>
                            </thead>
                            {frozenList.length > 0 && (
                                <tbody className="divide-y divide-blue-200 bg-blue-50 sticky top-[36px] z-20 shadow-md border-b-2 border-blue-200">
                                    {frozenList.map(etu => (
                                        <tr key={etu.id} onClick={() => toggleLeft(etu)} className="cursor-pointer bg-blue-100 border-l-4 border-l-blue-600 font-semibold">
                                            <td className="p-2 w-8 text-center"><input type="checkbox" checked={true} readOnly className="pointer-events-none accent-blue-600"/></td>
                                            <td className="p-2 truncate" title={`${etu.nom} ${etu.prenom}`}>{etu.nom} {etu.prenom}</td>
                                            <td className="p-2 flex flex-col text-[10px] text-gray-700"><span>CIN: {etu.cin}</span><span>Né: {etu.ddn}</span></td>
                                            <td className="p-2 text-[10px] text-blue-600 text-center font-mono">{etu.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {scrollableList.length > 0 ? scrollableList.map(etu => (
                                    <tr key={etu.id} onClick={() => toggleLeft(etu)} className="cursor-pointer transition border-l-4 hover:bg-blue-50 border-l-transparent group">
                                        <td className="p-2 w-8 text-center"><input type="checkbox" checked={false} readOnly className="pointer-events-none accent-blue-600"/></td>
                                        <td className="p-2 truncate">{etu.nom} {etu.prenom}</td>
                                        <td className="p-2 flex flex-col text-[10px] text-gray-500"><span>CIN: {etu.cin}</span><span>Né: {etu.ddn}</span></td>
                                        <td className="p-2 text-[10px] text-gray-400 text-center font-mono group-hover:text-blue-500">{etu.id}</td>
                                    </tr>
                                )) : (frozenList.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Aucun étudiant trouvé.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gray-50 border-t p-2 flex justify-between items-center text-xs shrink-0">{renderPagination()}</div>
                </div>

                {/* 2. CENTRE: Boutons de transfert */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-4 shrink-0 bg-gray-50/50">
                    <button onClick={moveRight} disabled={leftSelection.size === 0 || !isConfigured || !filters.niveau} className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md transition-all ${(isConfigured && filters.niveau) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}><FaAngleRight /></button>
                    <button onClick={moveLeft} disabled={rightSelection.size === 0} className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center shadow-md hover:bg-red-500 hover:text-white disabled:opacity-50"><FaAngleLeft /></button>
                </div>

                {/* 3. DROITE: Configuration et Listes d'Inscriptions */}
                <div className="w-[56%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    
                    {/* Header Configuration */}
                    <div className="p-3 border-b bg-gray-50 flex justify-between items-start flex-col sm:flex-row shrink-0">
                        <div className="mb-2 sm:mb-0">
                            <h3 className="text-sm font-extrabold text-gray-800 uppercase flex items-center gap-2"><FaFilter className="text-base"/> Contexte d'Inscription</h3>
                            {isConfigured ? (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                    <p><span className="font-bold text-blue-600">Institution:</span> {getFilterLabel('institution')}</p>
                                    <p><span className="font-bold text-blue-600">Composante:</span> {getFilterLabel('composante')}</p>
                                    <p><span className="font-bold text-blue-600">Mention:</span> {getFilterLabel('mention')}</p>
                                    <p><span className="font-bold text-blue-600">Parcours:</span> {getFilterLabel('parcours')}</p>
                                    <p><span className="font-bold text-blue-600">Année:</span> {getFilterLabel('annee')}</p>
                                    <p><span className="font-bold text-blue-600">Niveau:</span> {getFilterLabel('niveau')}</p>
                                    <p><span className="font-bold text-blue-600">Mode:</span> {getFilterLabel('mode')}</p>

                                </div>
                            ) : (<p className="text-xs italic text-red-500 mt-2">Configuration requise (Mention, Année, Niveau).</p>)}
                        </div>
                        <div className="flex flex-col gap-2"> 
                            <button onClick={() => setIsModalOpen(true)} className={AppStyles.button.secondary + " flex items-center gap-2 px-3 py-1.5 text-xs"}><FaExternalLinkAlt/> Configurer</button>
                            <button onClick={() => setIsStudentFormOpen(true)} disabled={!isConfigured} className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs ${isConfigured ? AppStyles.button.secondary + " text-green-700 hover:bg-green-100 border-green-300" : "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed"}`}><FaPlus/> Nouvel Étudiant</button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto bg-gray-50/30">
                        {/* A. LISTE EN ATTENTE (PENDING) */}
                        {rightListPending.length > 0 && (
                            <div className="bg-white border-b border-green-200 mb-2 shadow-md">
                                <div className="px-3 py-2 bg-green-100 text-green-800 text-xs font-extrabold uppercase flex items-center justify-between"><span><FaTags className="inline mr-1 text-sm"/> En attente ({rightListPending.length})</span></div>
                                <table className="w-full text-left text-xs">
                                    <thead><tr className="bg-green-50 text-green-700"><th className="p-2 w-8">#</th><th className="p-2">Nom</th><th className="p-2">Semestres</th></tr></thead>
                                    <tbody className="divide-y divide-green-50">
                                        {rightListPending.map(etu => (
                                            <tr key={etu.id} onClick={() => toggleRight(etu.id)} className={`cursor-pointer transition ${rightSelection.has(etu.id) ? "bg-red-100" : "hover:bg-red-50"}`}>
                                                <td className="p-2 w-8 text-center text-red-500"><input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500" /></td>
                                                <td className="p-2 font-bold text-green-700">{etu.nom} {etu.prenom}</td>
                                                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                                    <SemestreCheckbox options={availableSemestres} selectedSemestres={etu.semestres} onToggle={(sid) => handleSemestreToggle(etu.id, sid)} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* B. LISTE VALIDÉE (DB) */}
                        <div className="mt-2 flex-grow flex flex-col min-h-0 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold uppercase border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                                <span className="flex items-center gap-2 text-green-700"><FaCheckCircle /> Étudiants Inscrits</span>
                                <span className="bg-white px-2 py-0.5 rounded border border-gray-300 text-[11px] font-mono">{rightListDb.length}</span>
                            </div>
                            
                            <div className="overflow-y-auto flex-grow">
                                <table className="w-full text-left table-fixed border-separate border-spacing-0">
                                    <thead className="sticky top-0 bg-white shadow-sm z-20">
                                        <tr className="text-[11px] text-gray-500 uppercase font-bold border-b bg-gray-50">
                                            <th className="p-2 w-10 text-center">#</th>
                                            <th className="p-2 w-40">N° Inscription</th> {/* Largeur augmentée */}
                                            <th className="p-2 w-auto">Nom & Prénoms</th>
                                            <th className="p-2 w-36">Semestres</th> {/* Largeur augmentée */}
                                            <th className="p-2 w-16 text-center">Niv.</th>
                                            <th className="p-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rightListDb.map((etu, index) => (
                                            <tr key={etu.id} className="group hover:bg-green-50/30 transition-colors">
                                                {/* 1. Index */}
                                                <td className="px-1 py-3 text-center text-xs text-gray-400 font-mono italic">
                                                {index + 1}
                                                </td>

                                                {/* 2. N° Inscription : AGRANDI */}
                                                <td className="px-2 py-3">
                                                    <span className="text-[13px] font-black font-mono text-blue-800 bg-blue-100 px-2 py-1 rounded border border-blue-200 shadow-sm">
                                                        {etu.matricule}
                                                    </span>
                                                </td>

                                                {/* 3. Nom & Prénoms */}
                                                <td className="px-2 py-3">
                                                    <div className="text-[14px] text-gray-800 truncate">
                                                        <span className="font-extrabold uppercase">{etu.nom}</span>{" "}
                                                        <span className="text-gray-600 capitalize font-medium">{etu.prenom}</span>
                                                    </div>
                                                </td>

                                                {/* 4. Semestres : AGRANDIS et alignés */}
                                                <td className="px-2 py-3">
                                                    <div className="flex flex-row flex-wrap gap-1.5 items-center">
                                                        {etu.semestre.split(',').map((s, idx) => (
                                                            <span key={idx} className="text-[12px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shadow-sm">
                                                                {s.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* 5. Niveau */}
                                                <td className="px-2 py-3 text-center font-bold text-gray-500 text-xs">
                                                    {etu.niveau}
                                                </td>

                                                {/* 6. Action */}
                                                <td className="px-2 py-3 text-right">
                                                    <button 
                                                        onClick={(e) => {e.stopPropagation(); handleDeleteInscription(etu.id);}} 
                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            {/* BARRE ACTION BAS */}
            <div className="mt-1 p-3 bg-white border border-green-300 rounded-lg shadow-lg flex justify-between items-center shrink-0">
                <div className="text-sm text-gray-600"><span className="font-extrabold text-green-600">{rightListPending.length}</span> étudiant(s) prêt(s).</div>
                <button onClick={handleSave} disabled={rightListPending.length === 0} className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all ${rightListPending.length > 0 ? "bg-green-600 text-white hover:bg-green-700 transform hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}><FaSave /> Valider Inscriptions</button>
            </div>
            
            <ConfigurationInscription isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} filters={filters} setFilters={setFilters} options={options} onSave={() => setIsModalOpen(false)}/>
            <StudentFormModal isOpen={isStudentFormOpen} onClose={() => setIsStudentFormOpen(false)} data={null} reloadList={fetchStudents}/>
        </div>
    );
}