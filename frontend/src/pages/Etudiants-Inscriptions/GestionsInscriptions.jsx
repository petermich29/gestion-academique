import React, { useState, useEffect, useMemo } from "react";
import { 
    FaSearch, FaUniversity, FaGraduationCap, FaTrash, 
    FaAngleRight, FaAngleLeft, FaCheckCircle, FaSave, FaTimes, 
    FaFilter, FaCog, FaExternalLinkAlt, FaLayerGroup, FaTags,
    FaPlus 
} from "react-icons/fa";
// Importez ces styles et composants si vous les utilisez réellement
import { AppStyles } from "../../components/ui/AppStyles"; 
// import { SpinnerIcon } from "../../components/ui/Icons"; 
// import { ToastContainer } from "../../components/ui/Toast";

// Import du composant de formulaire étudiant (Chemin supposé)
import StudentFormModal from "./components/FormEtudiantsAjout"; 

const API_BASE_URL = "http://127.0.0.1:8000"; 

// --- DONNÉES FICTIVES (MOCK) ---
const MOCK_STUDENTS = [
    { id: "ETU_001", nom: "RAKOTO", prenom: "Jean", matricule: "—" },
    { id: "ETU_002", nom: "RABE", prenom: "Nary", matricule: "—" },
    { id: "ETU_003", nom: "ANDRIA", prenom: "Soa", matricule: "—" },
    { id: "ETU_004", nom: "RASOA", prenom: "Koto", matricule: "—" },
    { id: "ETU_005", nom: "RANDRIA", prenom: "Faly", matricule: "—" },
    { id: "ETU_006", nom: "RAZAFY", prenom: "Miora", matricule: "—" },
];

const MOCK_INSCRITS_DB = [
    { id: "DOS_999", nom: "ZAFY", prenom: "Paul", matricule: "24INF_001", semestre: "Semestre 1" }
];

const MOCK_OPTIONS = {
    institutions: [{id: "1", label: "IST - Polytechnique"}, {id: "2", label: "ENI - Informatique"}],
    composantes: [{id: "C1", label: "Département INFO"}, {id: "C2", label: "Département MECANIQUE"}],
    mentions: [{id: "M1", label: "Informatique Générale"}, {id: "M2", label: "Intelligence Artificielle"}],
    annees: [{id: "A1", label: "2023-2024 (Active)"}, {id: "A2", label: "2024-2025"}],
    // Ajout de niveaux standard (L1, L2, M1)
    niveaux: [{id: "L1", label: "Licence 1"}, {id: "L2", label: "Licence 2"}, {id: "M1", label: "Master 1"}],
    parcours: [{id: "P1", label: "Génie Logiciel"}, {id: "P2", label: "Admin Systèmes"}],
    modes: [{id: "MD1", label: "Initial"}, {id: "MD2", label: "Par Crédit"}],
};

// --- MAP POUR LA DÉPENDANCE NIVEAU -> SEMESTRES ---
const MOCK_NIVEAU_SEMESTRES_MAP = {
    "L1": [
        {id: "S1", label: "Semestre 1"}, 
        {id: "S2", label: "Semestre 2"}
    ],
    "L2": [
        {id: "S3", label: "Semestre 3"}, 
        {id: "S4", label: "Semestre 4"}
    ],
    "M1": [
        {id: "S5", label: "Semestre 5"}, 
        {id: "S6", label: "Semestre 6"}
    ],
    // Fallback pour les autres niveaux ou si Niveau n'est pas sélectionné
    "": [] 
};


// --- COMPOSANTS INTERNES (Non modifiés) ---

const SelectBox = ({ label, options, value, onChange, icon: Icon, required=false, disabled=false }) => (
    <div className="flex flex-col">
        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
            {Icon && <Icon className="text-blue-500"/>}
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select 
            className={`border border-gray-300 rounded text-xs py-1.5 px-2 bg-white outline-none ${disabled ? 'bg-gray-100 text-gray-500' : 'focus:ring-1 focus:ring-blue-500'}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
        >
            <option value="">-- Sélectionner --</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
    </div>
);

const FilterGroup = ({ title, icon: Icon, children }) => (
    <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm mb-3">
        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-2">
            <Icon className="text-blue-600 text-sm" /> {title}
        </h4>
        <div className="grid grid-cols-3 gap-2">
            {children}
        </div>
    </div>
);

// Composant SemestreCheckbox mis à jour pour recevoir les options filtrées
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


const InscriptionConfigModal = ({ isOpen, onClose, filters, setFilters, options, onSave }) => {
    if (!isOpen) return null;

    const handleSave = () => {
        if (!filters.mention || !filters.annee) {
            alert("Veuillez sélectionner une Mention et une Année Universitaire.");
            return;
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl transform transition-all overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-blue-600 text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2"><FaCog/> Configuration de l'Inscription</h3>
                    <button onClick={onClose} className="text-xl opacity-80 hover:opacity-100"><FaTimes/></button>
                </div>
                
                {/* Body */}
                <div className="p-4 overflow-y-auto max-h-[70vh]">
                    <p className="text-sm text-gray-600 mb-4">
                        Définissez les paramètres académiques de la promotion à inscrire.
                    </p>

                    {/* 1. GROUPE ADMINISTRATIF */}
                    <FilterGroup title="Critères Administratifs" icon={FaUniversity}>
                        <SelectBox 
                            label="Institution" options={options.institutions} value={filters.institution} 
                            onChange={(v) => setFilters({...filters, institution:v})} 
                        />
                        <SelectBox 
                            label="Composante (Établissement)" options={options.composantes} value={filters.composante} 
                            onChange={(v) => setFilters({...filters, composante:v})} 
                        />
                        <SelectBox 
                            label="Mention" options={options.mentions} value={filters.mention} 
                            onChange={(v) => setFilters({...filters, mention:v})} required={true}
                        />
                    </FilterGroup>

                    {/* 2. GROUPE PÉDAGOGIQUE */}
                    <FilterGroup title="Critères Pédagogiques" icon={FaGraduationCap}>
                        <SelectBox 
                            label="Année Univ." options={options.annees} value={filters.annee} 
                            onChange={(v) => setFilters({...filters, annee:v})} required={true}
                        />
                        <SelectBox 
                            label="Niveau" options={options.niveaux} value={filters.niveau} 
                            onChange={(v) => setFilters({...filters, niveau:v})} 
                        />
                        <SelectBox 
                            label="Parcours" options={options.parcours} value={filters.parcours} 
                            onChange={(v) => setFilters({...filters, parcours:v})} 
                        />
                        <SelectBox 
                            label="Mode Insc." options={options.modes} value={filters.mode} 
                            onChange={(v) => setFilters({...filters, mode:v})} 
                        />
                    </FilterGroup>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-end">
                    <button 
                        onClick={handleSave}
                        className={AppStyles.button.primary + " flex items-center gap-2"}
                    >
                        <FaSave/> Appliquer la Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- FIN DU COMPOSANT MODAL ---


export default function InscriptionsMain() {
    
    // --- ÉTATS PRINCIPAUX ---
    const [leftList, setLeftList] = useState(MOCK_STUDENTS);
    const [leftSelection, setLeftSelection] = useState(new Set());
    const [rightListDb, setRightListDb] = useState(MOCK_INSCRITS_DB);
    // Chaque étudiant pending a un tableau `semestres` : ['S1', 'S2']
    const [rightListPending, setRightListPending] = useState([]);
    const [rightSelection, setRightSelection] = useState(new Set());
    
    // Contrôle des modals
    const [isModalOpen, setIsModalOpen] = useState(false); // Modal de configuration
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false); // Nouvel état pour le formulaire étudiant

    // --- FILTRES ET OPTIONS ---
    const [filters, setFilters] = useState({
        institution: "", composante: "", mention: "",
        annee: "", parcours: "", niveau: "", mode: ""
    });
    const [options, setOptions] = useState(MOCK_OPTIONS);

    // Fonction d'aide pour obtenir le label à partir de l'ID
    const getFilterLabel = (key) => {
        const id = filters[key];
        const list = options[key + 's'] || []; 
        const item = list.find(opt => opt.id === id);
        return item ? item.label : id;
    };
    
    // Vérifie si la configuration minimale est faite (Mention et Année)
    const isConfigured = filters.mention && filters.annee;
    
    // NOUVEAU: Liste des semestres disponibles en fonction du niveau sélectionné
    const availableSemestres = useMemo(() => {
        return MOCK_NIVEAU_SEMESTRES_MAP[filters.niveau] || [];
    }, [filters.niveau]);


    // NOUVEAU: Effet pour réinitialiser les semestres des étudiants pending si le niveau change
    useEffect(() => {
        setRightListPending(prev => 
            // On s'assure que si le niveau change (et donc les semestres disponibles), 
            // la sélection précédente de semestres est effacée.
            prev.map(item => ({ ...item, semestres: [] }))
        );
    }, [filters.niveau]);


    // --- LOGIQUE DE TRANSFERT ET SAUVEGARDE (Simulée) ---
    const toggleLeft = (id) => {
        const newSet = new Set(leftSelection);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setLeftSelection(newSet);
    };

    const toggleRight = (id) => {
        const newSet = new Set(rightSelection);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setRightSelection(newSet);
    };

    // Gestion de la sélection de semestre par checkbox
    const handleSemestreToggle = (id, semestreId) => {
        if (!filters.niveau) return; // Ne rien faire si le niveau n'est pas sélectionné
        
        setRightListPending(prev => 
            prev.map(item => {
                if (item.id === id) {
                    const currentSemestres = item.semestres || [];
                    const isSelected = currentSemestres.includes(semestreId);
                    
                    return { 
                        ...item, 
                        semestres: isSelected 
                            ? currentSemestres.filter(s => s !== semestreId) // Retirer
                            : [...currentSemestres, semestreId] // Ajouter
                    };
                }
                return item;
            })
        );
    };

    const moveRight = () => {
        if (!isConfigured || !filters.niveau) return; // Configuration et Niveau requis
        
        const toMove = leftList.filter(s => leftSelection.has(s.id));
        
        const existingIds = new Set([...rightListDb.map(i => i.id), ...rightListPending.map(s => s.id)]);
        const newOnes = toMove.filter(s => !existingIds.has(s.id))
                              // Ajouter la propriété 'semestres' comme tableau vide
                              .map(s => ({ ...s, semestres: [] })); 

        setRightListPending([...rightListPending, ...newOnes]);
        setLeftSelection(new Set());
    };

    const moveLeft = () => {
        const toReturn = rightListPending.filter(s => rightSelection.has(s.id));
        
        setLeftList([...leftList, ...toReturn]);
        setRightListPending(rightListPending.filter(s => !rightSelection.has(s.id)));
        setRightSelection(new Set());
    };

    const handleSave = () => {
        // Validation: Vérifier si tous les pending ont au moins un semestre sélectionné
        const incomplete = rightListPending.filter(s => !s.semestres || s.semestres.length === 0);
        if (incomplete.length > 0) {
            alert(`Veuillez sélectionner au moins un Semestre pour les ${incomplete.length} étudiant(s) restants.`);
            return;
        }

        // Simuler la sauvegarde
        const savedList = rightListPending.flatMap(s => {
            const matriculeBase = `${getFilterLabel('annee').substring(0,2)}${filters.mention}_${s.id.slice(4)}`;

            return s.semestres.map((semestreId, index) => {
                // Trouver le label du semestre dans la map complète (ou juste utiliser l'ID)
                const semesterInfo = Object.values(MOCK_NIVEAU_SEMESTRES_MAP).flat().find(opt => opt.id === semestreId);
                const semestreLabel = semesterInfo ? semesterInfo.label : semestreId;
                
                return { 
                    ...s, 
                    // Génère un ID unique pour chaque inscription/semestre validée
                    id: `DOS_${Math.floor(Math.random() * 1000) + 100}_${index}_${semestreId}`, 
                    matricule: `${matriculeBase}/${semestreLabel}`, 
                    semestre: semestreLabel 
                };
            });
        });

        setRightListDb([...rightListDb, ...savedList]);
        setRightListPending([]);
        // addToast(`${savedList.length} inscriptions (incluant les semestres) validées avec succès.`);
    };

    // Supprimer une inscription validée
    const handleDeleteInscription = (idToDelete) => {
        const itemToDelete = rightListDb.find(item => item.id === idToDelete);
        
        if (!itemToDelete) return;

        if (!window.confirm(`Confirmer la suppression de l'inscription de ${itemToDelete.nom} ${itemToDelete.prenom} (${itemToDelete.semestre})? Cette action est irréversible dans cette démo.`)) {
            return;
        }

        // Simuler la suppression de la base de données
        setRightListDb(prev => prev.filter(item => item.id !== idToDelete));
    };
    
    // Simuler le rechargement de la liste après l'ajout d'un étudiant
    const handleStudentAdded = (newStudentData) => {
        // Dans une application réelle, on ferait un fetch des étudiants ici.
        // Pour la démo, nous ajoutons un nouvel étudiant mocké (si ce n'est pas une mise à jour)
        if (!newStudentData.id) {
            const newId = `ETU_${Math.floor(Math.random() * 900) + 100}`;
            const newStudent = {
                id: newId,
                nom: newStudentData.Etudiant_nom || "Nouveau",
                prenom: newStudentData.Etudiant_prenoms || "Étudiant",
                matricule: "—"
            };
            setLeftList(prev => [...prev, newStudent]);
            // alert(`Nouvel étudiant (${newStudent.nom} ${newStudent.prenom}) ajouté à la liste source.`);
        }
        setIsStudentFormOpen(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            
            <div className="flex flex-grow gap-0.5"> {/* Espace ultra réduit: gap-0.5 */}
                
                {/* =======================================================
                    COLONNE GAUCHE (SOURCE: ÉTUDIANTS DISPONIBLES) - 40%
                   ======================================================= */}
                <div className="w-[40%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-3 border-b bg-blue-50/50">
                        <h3 className="text-sm font-extrabold text-blue-800 uppercase mb-2">
                             <FaLayerGroup className="inline mr-1 text-base"/> Base Étudiants ({leftList.length})
                        </h3>
                        <div className="relative">
                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Rechercher nom..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-0">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-gray-100 border-b text-gray-600">
                                <tr>
                                    <th className="p-3 w-8">#</th>
                                    <th className="p-3">Nom & Prénoms</th>
                                    <th className="p-3 w-20 text-center">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leftList.map(etu => (
                                    <tr 
                                        key={etu.id} 
                                        onClick={() => toggleLeft(etu.id)}
                                        className={`cursor-pointer transition ${leftSelection.has(etu.id) ? "bg-blue-100 font-semibold" : "hover:bg-blue-50"}`}
                                    >
                                        <td className="p-3 w-8 text-center">
                                            <input type="checkbox" checked={leftSelection.has(etu.id)} readOnly className="pointer-events-none accent-blue-600"/>
                                        </td>
                                        <td className="p-3 text-gray-800">
                                            {etu.nom} {etu.prenom}
                                        </td>
                                        <td className="p-3 text-[10px] text-gray-500 text-center font-mono">{etu.id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* =======================================================
                    COLONNE CENTRALE (BOUTONS DE TRANSFERT) - 4%
                   ======================================================= */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-6">
                    <button
                        onClick={moveRight}
                        disabled={leftSelection.size === 0 || !isConfigured || !filters.niveau}
                        className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                            (isConfigured && filters.niveau) 
                                ? "bg-blue-600 hover:bg-blue-700" 
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                        title={(isConfigured && filters.niveau) ? "Transférer la sélection à droite" : "Veuillez configurer l'inscription (Mentions/Année/Niveau) d'abord"}
                    >
                        <FaAngleRight className="text-xl"/>
                    </button>

                    <button
                        onClick={moveLeft}
                        disabled={rightSelection.size === 0}
                        className="w-12 h-12 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
                        title="Retirer la sélection (uniquement les ajouts non validés)"
                    >
                        <FaAngleLeft className="text-xl"/>
                    </button>
                </div>


                {/* =======================================================
                    COLONNE DROITE (CONTEXTE + DESTINATION) - 56%
                   ======================================================= */}
                <div className="w-[56%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    
                    {/* ZONE DE CONTEXTE D'INSCRIPTION */}
                    <div className="p-3 border-b bg-gray-50 flex justify-between items-start flex-col sm:flex-row">
                        <div className="mb-2 sm:mb-0">
                            <h3 className="text-sm font-extrabold text-gray-800 uppercase flex items-center gap-2">
                                <FaFilter className="text-base"/> Contexte d'Inscription Actif
                            </h3>
                            {isConfigured ? (
                                // Utilisation d'une grille à deux colonnes pour compacter l'affichage
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                    <p><span className="font-bold text-blue-600">Institution:</span> {getFilterLabel('institution') || <span className="italic text-gray-400">Non spécifié</span>}</p>
                                    <p><span className="font-bold text-blue-600">Composante:</span> {getFilterLabel('composante') || <span className="italic text-gray-400">Non spécifié</span>}</p>
                                    
                                    <p><span className="font-bold text-blue-600">Mention:</span> {getFilterLabel('mention')}</p>
                                    <p><span className="font-bold text-blue-600">Parcours:</span> {getFilterLabel('parcours') || <span className="italic text-gray-400">Non spécifié</span>}</p>

                                    <p><span className="font-bold text-blue-600">Année:</span> {getFilterLabel('annee')}</p>
                                    <p><span className="font-bold text-blue-600">Niveau:</span> {getFilterLabel('niveau') || <span className="italic text-gray-400">Non spécifié</span>}</p>
                                    
                                    <p><span className="font-bold text-blue-600">Mode:</span> {getFilterLabel('mode') || <span className="italic text-gray-400">Non spécifié</span>}</p>
                                </div>
                            ) : (
                                <p className="text-xs italic text-red-500 mt-2">
                                    Aucune configuration minimale sélectionnée (Mention et Année requises).
                                </p>
                            )}
                        </div>
                        
                        {/* CONTENEUR DES BOUTONS D'ACTION DU CONTEXTE */}
                        <div className="flex flex-col gap-2"> 
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className={AppStyles.button.secondary + " flex items-center gap-2 px-3 py-1.5 text-xs"}
                            >
                                <FaExternalLinkAlt/> Configurer l'inscription
                            </button>
                            {/* NOUVEAU BOUTON : Ajouter un étudiant */}
                            <button
                                onClick={() => setIsStudentFormOpen(true)}
                                disabled={!isConfigured} // <<< CONDITION D'ACTIVATION CORRIGÉE
                                className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs ${
                                    isConfigured
                                    ? AppStyles.button.secondary + " text-green-700 hover:bg-green-100 border-green-300"
                                    : "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed" // Style pour désactivé
                                }`}
                                title={!isConfigured ? "Veuillez d'abord configurer la Mention et l'Année Universitaire." : "Ouvrir le formulaire d'ajout d'étudiant."}
                            >
                                <FaPlus/> Ajouter un étudiant
                            </button>
                        </div>
                    </div>

                    {/* LISTE DES ÉTUDIANTS (Mixte: Pending + DB) */}
                    <div className="flex-grow overflow-y-auto bg-gray-50/30">
                        
                        {/* 1. Zone "En attente" (Pending) */}
                        {rightListPending.length > 0 && (
                            <div className="bg-white border-b border-green-200 mb-2 shadow-md">
                                <div className="px-3 py-2 bg-green-100 text-green-800 text-xs font-extrabold uppercase flex items-center justify-between">
                                    <span><FaTags className="inline mr-1 text-sm"/> En attente de validation ({rightListPending.length})</span>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-green-50 text-green-700">
                                            <th className="p-2 w-8">#</th>
                                            <th className="p-2 w-48">Nom & Prénoms</th>
                                            <th className="p-2">Semestres à inscrire (Sélectionner au moins un)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-green-50">
                                        {rightListPending.map(etu => (
                                            <tr 
                                                key={etu.id}
                                                onClick={() => toggleRight(etu.id)}
                                                className={`cursor-pointer transition ${rightSelection.has(etu.id) ? "bg-red-100" : "hover:bg-red-50"}`}
                                            >
                                                <td className="p-2 w-8 text-center text-red-500">
                                                    <input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500" />
                                                </td>
                                                <td className="p-2">
                                                    <div className="font-bold text-green-700">{etu.nom} {etu.prenom}</div>
                                                    <div className="text-[10px] text-gray-400">Nouveau | {getFilterLabel('mention')} / {getFilterLabel('niveau')}</div>
                                                </td>
                                                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                                    <SemestreCheckbox
                                                        options={availableSemestres} // Liste filtrée
                                                        selectedSemestres={etu.semestres}
                                                        onToggle={(semestreId) => handleSemestreToggle(etu.id, semestreId)}
                                                        isLevelSelected={!!filters.niveau}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 2. Zone "Déjà inscrits" (DB Mock) */}
                        <div className="mt-2">
                            <div className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-extrabold uppercase border-y border-gray-300">
                                <FaCheckCircle className="inline mr-1 text-sm"/> Inscrits validés ({rightListDb.length})
                            </div>
                            <table className="w-full text-left text-xs bg-white">
                                {/* Nouvelle ligne d'en-tête pour les inscriptions validées */}
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600 font-bold border-b">
                                        <th className="p-3 w-8"></th>
                                        <th className="p-3">Étudiant & Matricule (Semestre)</th>
                                        <th className="p-3 w-16 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rightListDb.map(etu => (
                                        <tr key={etu.id} className="text-gray-500 hover:bg-gray-50">
                                            <td className="p-3 w-8 text-center text-gray-300"><FaCheckCircle /></td>
                                            <td className="p-3">
                                                <div className="font-semibold text-gray-800">{etu.nom} {etu.prenom}</div>
                                                <div className="text-[10px] font-mono bg-gray-100 inline-block px-1 rounded">{etu.matricule} ({etu.semestre})</div>
                                            </td>
                                            {/* Colonne pour le bouton de suppression */}
                                            <td className="p-3 w-16 text-right">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation(); 
                                                        handleDeleteInscription(etu.id);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                                    title={`Supprimer l'inscription ${etu.matricule}`}
                                                >
                                                    <FaTrash className="text-sm" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {rightListDb.length === 0 && rightListPending.length === 0 && (
                                        <tr><td colSpan="3" className="p-4 text-center text-gray-400 italic">Aucun étudiant inscrit pour ces critères.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER : BOUTON VALIDER --- */}
            <div className="mt-0.5 p-3 bg-white border border-green-300 rounded-lg shadow-2xl flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    <span className="font-extrabold text-green-600">{rightListPending.length}</span> nouvel(s) étudiant(s) prêt(s) à être inscrit(s).
                </div>
                <button 
                    onClick={handleSave}
                    disabled={rightListPending.length === 0}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all ${
                        rightListPending.length > 0 
                        ? "bg-green-600 text-white hover:bg-green-700 transform hover:-translate-y-0.5" 
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                    <FaSave /> Valider les Inscriptions ({rightListPending.length})
                </button>
            </div>
            
            {/* Composant Modal de configuration */}
            <InscriptionConfigModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                filters={filters}
                setFilters={setFilters}
                options={options}
                onSave={() => setIsModalOpen(false)}
            />

            {/* NOUVEAU: Composant Modal du formulaire étudiant */}
            <StudentFormModal
                isOpen={isStudentFormOpen}
                onClose={() => setIsStudentFormOpen(false)}
                data={null} // Pour créer un nouvel étudiant
                reloadList={handleStudentAdded} // Simule l'ajout et le rafraîchissement de la liste source
            />
        </div>
    );
}