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

// --- DONNÉES FICTIVES (MOCK) ---
const MOCK_INSCRITS_DB = [
    { id: "DOS_999", nom: "ZAFY", prenom: "Paul", matricule: "24INF_001", semestre: "Semestre 1", cin: "101 202 303 404", ddn: "01/01/2000" }
];

const MOCK_OPTIONS = {
    institutions: [{id: "1", label: "IST - Polytechnique"}, {id: "2", label: "ENI - Informatique"}],
    composantes: [{id: "C1", label: "Département INFO"}, {id: "C2", label: "Département MECANIQUE"}],
    mentions: [{id: "M1", label: "Informatique Générale"}, {id: "M2", label: "Intelligence Artificielle"}],
    annees: [], // Initialisé à vide, sera rempli par l'API
    niveaux: [{id: "L1", label: "Licence 1"}, {id: "L2", label: "Licence 2"}, {id: "M1", label: "Master 1"}],
    parcours: [{id: "P1", label: "Génie Logiciel"}, {id: "P2", label: "Admin Systèmes"}],
    modes: [{id: "MD1", label: "Initial"}, {id: "MD2", label: "Par Crédit"}],
};

const MOCK_NIVEAU_SEMESTRES_MAP = {
    "L1": [{id: "S1", label: "Semestre 1"}, {id: "S2", label: "Semestre 2"}],
    "L2": [{id: "S3", label: "Semestre 3"}, {id: "S4", label: "Semestre 4"}],
    "M1": [{id: "S5", label: "Semestre 5"}, {id: "S6", label: "Semestre 6"}],
    "": [] 
};

// --- COMPOSANT CHECKBOX (Inchangé) ---
const SemestreCheckbox = ({ options, selectedSemestres, onToggle, isLevelSelected }) => (
    <div className={`flex flex-wrap gap-1.5 ${!isLevelSelected ? 'opacity-50 pointer-events-none' : ''}`}>
        {!isLevelSelected && <span className="text-xs italic text-gray-500">Choisir un Niveau pour débloquer les semestres.</span>}
        {options.map(sem => (
            <label 
                key={sem.id} 
                className={`flex items-center text-[10px] px-2 py-0.5 border rounded cursor-pointer transition-all 
                            ${selectedSemestres.includes(sem.id) 
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400'
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
        ))}
    </div>
);

export default function InscriptionsMain() {
    
    // --- API & PAGINATION STATES ---
    const [fetchedStudents, setFetchedStudents] = useState([]); 
    const [selectedObjects, setSelectedObjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 }); 
    const [searchTerm, setSearchTerm] = useState("");

    // --- STATES EXISTANTS ---
    const [leftSelection, setLeftSelection] = useState(new Set()); 
    const [rightListDb, setRightListDb] = useState(MOCK_INSCRITS_DB);
    const [rightListPending, setRightListPending] = useState([]);
    const [rightSelection, setRightSelection] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);

    const [filters, setFilters] = useState({
        institution: "", composante: "", mention: "",
        annee: "", parcours: "", niveau: "", mode: ""
    });
    const [options, setOptions] = useState(MOCK_OPTIONS);

    // =========================================================
    // CORRECTION ROBUSTE : CHARGEMENT DES ANNÉES UNIVERSITAIRES
    // =========================================================
    useEffect(() => {
        const fetchMetadonnees = async () => {
            try {
                // Vérifiez si votre API backend (FastAPI) est bien lancée et accessible à cette adresse.
                const response = await fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // IMPORTANT : Ouvrez la console du navigateur (F12 > Console)
                    // pour voir les données reçues et leurs clés exactes (Alias Pydantic ou nom SQL).
                    console.log("Données Années reçues du Backend:", data); 
                    
                    if (!Array.isArray(data)) {
                         console.error("Le backend n'a pas renvoyé un tableau pour les années universitaires.");
                         return;
                    }

                    const anneesFormattees = data.map(item => {
                        // Récupération sécurisée des clés (Alias Pydantic OU nom de variable Python/SQL)
                        const id = item.AnneeUniversitaire_id || item.id_annee_universitaire;
                        const libelle = item.AnneeUniversitaire_annee || item.annee;
                        const isActive = (item.AnneeUniversitaire_is_active !== undefined) ? item.AnneeUniversitaire_is_active : item.is_active;

                        return {
                            id: id, 
                            // Utilisation de String(libelle) pour plus de sécurité
                            label: `${String(libelle || 'Année Inconnue')} ${isActive ? "(Active)" : ""}`
                        };
                    }).filter(item => item.id && item.label && item.id !== 'Année Inconnue'); // Filtrer les entrées invalides

                    if (anneesFormattees.length > 0) {
                        setOptions(prev => ({
                            ...prev,
                            annees: anneesFormattees
                        }));
                    } else {
                        console.warn("La liste des années universitaires est vide après traitement. Vérifiez votre base de données.");
                    }
                } else {
                    console.error("Erreur de l'API lors du chargement des années (Status):", response.status);
                }
            } catch (error) {
                // Cette erreur se produit si le backend n'est pas lancé
                console.error("Erreur de connexion ou traitement lors du chargement des années universitaires (Backend non joignable?):", error);
            }
        };

        fetchMetadonnees();
    }, []);
    // =========================================================


    // --- FETCH DATA (ETUDIANTS) ---
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const skip = (pagination.page - 1) * pagination.limit;
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: pagination.limit.toString(),
            });
            if (searchTerm) params.append("search", searchTerm);

            const url = `${API_BASE_URL}/api/etudiants?${params.toString()}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const result = await res.json();
                const mappedItems = (result.items || []).map(item => ({
                    id: item.Etudiant_id,
                    nom: item.Etudiant_nom,
                    prenom: item.Etudiant_prenoms,
                    matricule: item.Etudiant_id,
                    cin: item.Etudiant_cin || "—",
                    ddn: item.Etudiant_naissance_date ? new Date(item.Etudiant_naissance_date).toLocaleDateString("fr-FR") : "—",
                    original: item 
                }));
                
                setFetchedStudents(mappedItems);
                setPagination(prev => ({ ...prev, total: result.total || 0 }));
            } else {
                setFetchedStudents([]);
            }
        } catch (error) {
            console.error("Erreur fetch", error);
            setFetchedStudents([]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(fetchStudents, 300);
        return () => clearTimeout(t);
    }, [pagination.page, pagination.limit, searchTerm]);

    // --- SÉPARATION DES LISTES ---
    const { frozenList, scrollableList } = useMemo(() => {
        const selectedIds = new Set(selectedObjects.map(s => s.id));
        const frozen = [...selectedObjects];
        const scrollable = fetchedStudents.filter(s => !selectedIds.has(s.id));
        return { frozenList: frozen, scrollableList: scrollable };
    }, [selectedObjects, fetchedStudents]);


    const getFilterLabel = (key) => {
        const id = filters[key];
        const list = options[key + 's'] || []; 
        const item = list.find(opt => opt.id === id);
        return item ? item.label : id;
    };
    
    const isConfigured = filters.mention && filters.annee;
    
    const availableSemestres = useMemo(() => {
        return MOCK_NIVEAU_SEMESTRES_MAP[filters.niveau] || [];
    }, [filters.niveau]);


    useEffect(() => {
        setRightListPending(prev => prev.map(item => ({ ...item, semestres: [] })));
    }, [filters.niveau]);


    // --- ACTIONS ---
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

    const toggleRight = (id) => {
        const newSet = new Set(rightSelection);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setRightSelection(newSet);
    };

    const handleSemestreToggle = (id, semestreId) => {
        if (!filters.niveau) return;
        setRightListPending(prev => 
            prev.map(item => {
                if (item.id === id) {
                    const currentSemestres = item.semestres || [];
                    const isSelected = currentSemestres.includes(semestreId);
                    return { 
                        ...item, 
                        semestres: isSelected 
                            ? currentSemestres.filter(s => s !== semestreId) 
                            : [...currentSemestres, semestreId]
                    };
                }
                return item;
            })
        );
    };

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

    const moveLeft = () => {
        setRightListPending(rightListPending.filter(s => !rightSelection.has(s.id)));
        setRightSelection(new Set());
    };

    const handleSave = () => {
        const incomplete = rightListPending.filter(s => !s.semestres || s.semestres.length === 0);
        if (incomplete.length > 0) {
            alert(`Veuillez sélectionner au moins un Semestre.`);
            return;
        }

        const savedList = rightListPending.flatMap(s => {
            const anneeLabel = getFilterLabel('annee');
            const matriculeBase = `${anneeLabel ? anneeLabel.substring(0,2) : 'XX'}${filters.mention}_${s.id.slice(4)}`;
            return s.semestres.map((semestreId, index) => {
                const semesterInfo = Object.values(MOCK_NIVEAU_SEMESTRES_MAP).flat().find(opt => opt.id === semestreId);
                const semestreLabel = semesterInfo ? semesterInfo.label : semestreId;
                return { 
                    ...s, 
                    id: `DOS_${Math.floor(Math.random() * 1000) + 100}_${index}_${semestreId}`, 
                    matricule: `${matriculeBase}/${semestreLabel}`, 
                    semestre: semestreLabel 
                };
            });
        });

        setRightListDb([...rightListDb, ...savedList]);
        setRightListPending([]);
    };

    const handleDeleteInscription = (idToDelete) => {
        if (!window.confirm(`Supprimer cette inscription ?`)) return;
        setRightListDb(prev => prev.filter(item => item.id !== idToDelete));
    };
    
    const handleStudentAdded = () => {
        fetchStudents();
        setIsStudentFormOpen(false);
    };

    // --- LOGIQUE PAGINATION ---
    const renderPagination = () => {
        if (pagination.total === 0) return null;
        const total = Math.ceil(pagination.total / pagination.limit);
        const current = pagination.page;
        const delta = 1; 
        const range = [];
        const rangeWithDots = [];
        let l;

        range.push(1);
        for (let i = current - delta; i <= current + delta; i++) {
            if (i < total && i > 1) range.push(i);
        }
        if (total > 1) range.push(total);

        for (let i of range) {
            if (l) {
                if (i - l === 2) rangeWithDots.push(l + 1);
                else if (i - l !== 1) rangeWithDots.push('...');
            }
            rangeWithDots.push(i);
            l = i;
        }

        return (
            <div className="flex gap-1 items-center">
                <button 
                    disabled={current === 1} 
                    onClick={() => setPagination(p => ({...p, page: p.page - 1}))} 
                    className="p-1 border rounded hover:bg-white disabled:opacity-50 text-gray-500"
                >
                    <FaChevronLeft/>
                </button>
                {rangeWithDots.map((p, idx) => (
                    p === '...' ? (
                        <span key={idx} className="text-gray-400 text-xs px-1">...</span>
                    ) : (
                        <button
                            key={idx}
                            onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                            className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                                pagination.page === p
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-600 hover:bg-gray-50 border-gray-300"
                            }`}
                        >
                            {p}
                        </button>
                    )
                ))}
                <button 
                    disabled={current >= total} 
                    onClick={() => setPagination(p => ({...p, page: p.page + 1}))} 
                    className="p-1 border rounded hover:bg-white disabled:opacity-50 text-gray-500"
                >
                    <FaChevronRight/>
                </button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            <div className="flex flex-grow gap-0.5 overflow-hidden">
                {/* COLONNE GAUCHE (inchangé) */}
                <div className="w-[40%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2 border-b bg-blue-50/50 flex flex-col gap-2 shrink-0">
                        <h3 className="text-sm font-extrabold text-blue-800 uppercase flex justify-between items-center">
                             <span><FaLayerGroup className="inline mr-1"/> Base Étudiants</span>
                             <span className="bg-blue-200 text-blue-800 px-1.5 rounded text-[10px]">{pagination.total}</span>
                        </h3>
                        <div className="relative">
                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPagination(p => ({...p, page: 1}));
                                }}
                                className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 z-50 flex justify-center items-center">
                                <FaSpinner className="animate-spin text-blue-600 text-2xl"/>
                            </div>
                        )}
                        <table className="w-full text-left text-xs table-fixed border-collapse">
                            <thead className="sticky top-0 bg-gray-100 border-b text-gray-600 z-30 shadow-sm h-9">
                                <tr>
                                    <th className="p-2 w-8 text-center bg-gray-100">#</th>
                                    <th className="p-2 w-[40%] bg-gray-100">Nom & Prénoms</th>
                                    <th className="p-2 w-[35%] bg-gray-100">Infos (CIN / Né)</th>
                                    <th className="p-2 w-[15%] text-center bg-gray-100">ID</th>
                                </tr>
                            </thead>
                            {frozenList.length > 0 && (
                                <tbody className="divide-y divide-blue-200 bg-blue-50 sticky top-[36px] z-20 shadow-md border-b-2 border-blue-200">
                                    {frozenList.map(etu => (
                                        <tr key={etu.id} onClick={() => toggleLeft(etu)} className="cursor-pointer bg-blue-100 border-l-4 border-l-blue-600 font-semibold">
                                            <td className="p-2 w-8 text-center"><input type="checkbox" checked={true} readOnly className="pointer-events-none accent-blue-600"/></td>
                                            <td className="p-2 truncate" title={`${etu.nom} ${etu.prenom}`}><div className="text-gray-900">{etu.nom} {etu.prenom}</div></td>
                                            <td className="p-2">
                                                <div className="flex flex-col text-[10px] leading-tight text-gray-700">
                                                    <span className="flex items-center gap-1"><FaIdCard className="text-blue-400"/> {etu.cin}</span>
                                                    <span className="flex items-center gap-1"><FaBirthdayCake className="text-blue-400"/> {etu.ddn}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-[10px] text-blue-600 text-center font-mono">{etu.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {scrollableList.length > 0 ? scrollableList.map(etu => (
                                    <tr key={etu.id} onClick={() => toggleLeft(etu)} className="cursor-pointer transition border-l-4 hover:bg-blue-50 border-l-transparent group">
                                        <td className="p-2 w-8 text-center"><input type="checkbox" checked={false} readOnly className="pointer-events-none accent-blue-600"/></td>
                                        <td className="p-2 truncate" title={`${etu.nom} ${etu.prenom}`}><div className="text-gray-800">{etu.nom} {etu.prenom}</div></td>
                                        <td className="p-2"><div className="flex flex-col text-[10px] leading-tight text-gray-500"><span className="flex items-center gap-1"><FaIdCard className="text-gray-400"/> {etu.cin}</span><span className="flex items-center gap-1"><FaBirthdayCake className="text-gray-400"/> {etu.ddn}</span></div></td>
                                        <td className="p-2 text-[10px] text-gray-400 text-center font-mono group-hover:text-blue-500">{etu.id}</td>
                                    </tr>
                                )) : (frozenList.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Aucun étudiant trouvé.</td></tr>))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gray-50 border-t p-2 flex justify-between items-center text-xs shrink-0">
                        <span className="text-gray-500 ml-1">Total {pagination.total}</span>
                        {renderPagination()}
                    </div>
                </div>

                {/* COLONNE CENTRALE (inchangé) */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-4 shrink-0 bg-gray-50/50">
                    <button onClick={moveRight} disabled={leftSelection.size === 0 || !isConfigured || !filters.niveau} className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md transition-all ${(isConfigured && filters.niveau) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}><FaAngleRight /></button>
                    <button onClick={moveLeft} disabled={rightSelection.size === 0} className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center shadow-md hover:bg-red-500 hover:text-white disabled:opacity-50"><FaAngleLeft /></button>
                </div>

                {/* COLONNE DROITE (inchangé) */}
                <div className="w-[56%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-3 border-b bg-gray-50 flex justify-between items-start flex-col sm:flex-row shrink-0">
                        <div className="mb-2 sm:mb-0">
                            <h3 className="text-sm font-extrabold text-gray-800 uppercase flex items-center gap-2"><FaFilter className="text-base"/> Contexte d'Inscription Actif</h3>
                            {isConfigured ? (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                    <p><span className="font-bold text-blue-600">Institution:</span> {getFilterLabel('institution') || "—"}</p>
                                    <p><span className="font-bold text-blue-600">Composante:</span> {getFilterLabel('composante') || "—"}</p>
                                    <p><span className="font-bold text-blue-600">Mention:</span> {getFilterLabel('mention')}</p>
                                    <p><span className="font-bold text-blue-600">Parcours:</span> {getFilterLabel('parcours') || "—"}</p>
                                    <p><span className="font-bold text-blue-600">Année:</span> {getFilterLabel('annee')}</p>
                                    <p><span className="font-bold text-blue-600">Niveau:</span> {getFilterLabel('niveau') || "—"}</p>
                                    <p><span className="font-bold text-blue-600">Mode:</span> {getFilterLabel('mode') || "—"}</p>
                                </div>
                            ) : (<p className="text-xs italic text-red-500 mt-2">Aucune configuration minimale sélectionnée (Mention et Année requises).</p>)}
                        </div>
                        <div className="flex flex-col gap-2"> 
                            <button onClick={() => setIsModalOpen(true)} className={AppStyles.button.secondary + " flex items-center gap-2 px-3 py-1.5 text-xs"}><FaExternalLinkAlt/> Configurer l'inscription</button>
                            <button onClick={() => setIsStudentFormOpen(true)} disabled={!isConfigured} className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs ${isConfigured ? AppStyles.button.secondary + " text-green-700 hover:bg-green-100 border-green-300" : "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed"}`}><FaPlus/> Ajouter un étudiant</button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto bg-gray-50/30">
                        {rightListPending.length > 0 && (
                            <div className="bg-white border-b border-green-200 mb-2 shadow-md">
                                <div className="px-3 py-2 bg-green-100 text-green-800 text-xs font-extrabold uppercase flex items-center justify-between"><span><FaTags className="inline mr-1 text-sm"/> En attente de validation ({rightListPending.length})</span></div>
                                <table className="w-full text-left text-xs">
                                    <thead><tr className="bg-green-50 text-green-700"><th className="p-2 w-8">#</th><th className="p-2 w-48">Nom & Prénoms</th><th className="p-2">Semestres à inscrire (Sélectionner au moins un)</th></tr></thead>
                                    <tbody className="divide-y divide-green-50">
                                        {rightListPending.map(etu => (
                                            <tr key={etu.id} onClick={() => toggleRight(etu.id)} className={`cursor-pointer transition ${rightSelection.has(etu.id) ? "bg-red-100" : "hover:bg-red-50"}`}>
                                                <td className="p-2 w-8 text-center text-red-500"><input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500" /></td>
                                                <td className="p-2"><div className="font-bold text-green-700">{etu.nom} {etu.prenom}</div><div className="flex gap-2 text-[9px] text-gray-400"><span>CIN: {etu.cin}</span><span>Né: {etu.ddn}</span></div></td>
                                                <td className="p-2" onClick={(e) => e.stopPropagation()}><SemestreCheckbox options={availableSemestres} selectedSemestres={etu.semestres} onToggle={(semestreId) => handleSemestreToggle(etu.id, semestreId)} isLevelSelected={!!filters.niveau}/></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-2">
                            <div className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-extrabold uppercase border-y border-gray-300"><FaCheckCircle className="inline mr-1 text-sm"/> Inscrits validés ({rightListDb.length})</div>
                            <table className="w-full text-left text-xs bg-white">
                                <thead><tr className="bg-gray-100 text-gray-600 font-bold border-b"><th className="p-3 w-8"></th><th className="p-3">Étudiant & Matricule (Semestre)</th><th className="p-3 w-16 text-right">Actions</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rightListDb.map(etu => (
                                        <tr key={etu.id} className="text-gray-500 hover:bg-gray-50">
                                            <td className="p-3 w-8 text-center text-gray-300"><FaCheckCircle /></td>
                                            <td className="p-3"><div className="font-semibold text-gray-800">{etu.nom} {etu.prenom}</div><div className="text-[10px] font-mono bg-gray-100 inline-block px-1 rounded">{etu.matricule} ({etu.semestre})</div></td>
                                            <td className="p-3 w-16 text-right"><button onClick={(e) => {e.stopPropagation(); handleDeleteInscription(etu.id);}} className="text-red-500 hover:text-red-700 p-1 rounded transition-colors" title={`Supprimer l'inscription`}><FaTrash className="text-sm" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-1 p-3 bg-white border border-green-300 rounded-lg shadow-lg flex justify-between items-center shrink-0">
                <div className="text-sm text-gray-600"><span className="font-extrabold text-green-600">{rightListPending.length}</span> nouvel(s) étudiant(s) prêt(s) à être inscrit(s).</div>
                <button onClick={handleSave} disabled={rightListPending.length === 0} className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all ${rightListPending.length > 0 ? "bg-green-600 text-white hover:bg-green-700 transform hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}><FaSave /> Valider les Inscriptions ({rightListPending.length})</button>
            </div>
            
            <ConfigurationInscription 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                filters={filters} 
                setFilters={setFilters} 
                options={options} 
                onSave={() => setIsModalOpen(false)}
            />
            <StudentFormModal isOpen={isStudentFormOpen} onClose={() => setIsStudentFormOpen(false)} data={null} reloadList={handleStudentAdded}/>
        </div>
    );
}