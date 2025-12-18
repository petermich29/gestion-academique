import React, { useState, useEffect, useMemo } from "react";
import { 
    FaSearch, FaTrash, 
    FaAngleRight, FaAngleLeft, FaSave, 
    FaFilter, FaExternalLinkAlt, FaLayerGroup, 
    FaPlus, FaChevronLeft, FaChevronRight, FaSpinner, 
    FaUserGraduate, FaExchangeAlt, FaInfoCircle, FaEdit, FaTimes
} from "react-icons/fa";

// Imports UI et Contextes
import { AppStyles } from "../../components/ui/AppStyles"; 
import { useToast } from "../../context/ToastContext";

// Imports des composants enfants
import StudentFormModal from "./components/FormEtudiantsAjout"; 
import ConfigurationInscription from "./components/ConfigurationInscription";
import EnrollmentResultModal from "./components/EnrollmentResultModal"; // Assurez-vous que le chemin est correct
import DeleteInscriptionModal from "./components/DeleteInscriptionModal";

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
    const { addToast } = useToast(); 

    // --- STATE : DONNÉES & UI ---
    const [fetchedStudents, setFetchedStudents] = useState([]); 
    const [selectedObjects, setSelectedObjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 }); 
    const [searchTerm, setSearchTerm] = useState("");

    // --- STATE : LISTES INSCRIPTIONS ---
    const [leftSelection, setLeftSelection] = useState(new Set()); 
    const [rightListDb, setRightListDb] = useState([]); // Inscrits validés (DB)
    const [rightListPending, setRightListPending] = useState([]); // En attente (Locales)
    const [rightSelection, setRightSelection] = useState(new Set()); 

    // --- ÉDITION INLINE ---
    const [editingId, setEditingId] = useState(null); 
    const [editData, setEditData] = useState({ mode: "", semestres: [] });
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

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

    const [allInscritsRaw, setAllInscritsRaw] = useState([]);

    // --- États pour les nouvelles modales ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [enrollmentResults, setEnrollmentResults] = useState(null);

    // =========================================================
    // 1. CHARGEMENT INITIAL & METADONNEES
    // =========================================================
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
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
        setFilters(prev => ({ ...prev, niveau: "" })); 
    }, [filters.parcours]);

    useEffect(() => {
        if (!filters.niveau) {
            setSemestresOptions([]);
            setRightListPending(prev => prev.map(item => ({ ...item, semestres: [] })));
            return;
        }
        fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`)
            .then(res => res.json())
            .then(data => setSemestresOptions(data))
            .catch(() => setSemestresOptions([]));
    }, [filters.niveau]);


    useEffect(() => {
        const enrolledIds = new Set(rightListDb.map(i => i.etudiant_id));

        setSelectedObjects(prev =>
            prev.filter(s => !enrolledIds.has(s.id))
        );

        setLeftSelection(prev => {
            const clean = new Set(
                [...prev].filter(id => !enrolledIds.has(id))
            );
            return clean;
        });
    }, [rightListDb]);



    // =========================================================
    // 3. CHARGEMENT DES LISTES (ETUDIANTS & INSCRITS)
    // =========================================================
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
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(fetchStudents, 300);
        return () => clearTimeout(t);
    }, [pagination.page, pagination.limit, searchTerm]);

    const fetchExistingInscriptions = async () => {
        // On a besoin au minimum de l'année et de la mention pour charger quelque chose de pertinent
        if (!filters.annee || !filters.mention) {
            setRightListDb([]);
            setAllInscritsRaw([]); // Reset aussi la liste brute
            return;
        }
        try {
            const params = new URLSearchParams({ 
                annee_id: filters.annee, 
                mention_id: filters.mention 
            });
            if (filters.institution) params.append("institution_id", filters.institution);
            if (filters.composante) params.append("composante_id", filters.composante);
            if (filters.parcours) params.append("parcours_id", filters.parcours);
            if (filters.niveau) params.append("niveau_id", filters.niveau);

            // --- CHANGEMENT MAJEUR ---
            // On N'ENVOIE PAS le filtre mode au backend ici.
            // On veut récupérer TOUS les étudiants (Hybride + Classique) pour pouvoir les griser à gauche.
            // if (filters.mode) params.append("mode_inscription_id", filters.mode); <--- SUPPRIMÉ
            
            const res = await fetch(`${API_BASE_URL}/api/inscriptions/?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const mappedInscrits = data.map(item => ({
                    id: item.id, 
                    etudiant_id: item.etudiant_id, 
                    nom: item.etudiant_nom || "Inconnu",
                    prenom: item.etudiant_prenom || "",
                    matricule: item.matricule || "N/A",
                    semestre: item.semestre_label || "—",
                    niveau: item.niveau_label || "",
                    parcours: item.parcours_label || "",
                    mode: item.mode_label || "—",
                    mode_id: item.mode_id // On récupère l'ID pour filtrer
                }));

                // A. On stocke TOUT le monde pour le verrouillage (grisage)
                setAllInscritsRaw(mappedInscrits);

                // B. On filtre pour l'affichage à droite selon le mode sélectionné dans la liste déroulante
                if (filters.mode) {
                    const filteredList = mappedInscrits.filter(i => i.mode_id === filters.mode);
                    setRightListDb(filteredList);
                } else {
                    setRightListDb(mappedInscrits);
                }
            }
        } catch (e) { console.error("Erreur chargement inscrits:", e); }
    };

    useEffect(() => {
        fetchExistingInscriptions();
    }, [filters.annee, filters.mention, filters.parcours, filters.niveau, filters.mode, filters.institution, filters.composante]);


    // =========================================================
    // 4. LOGIQUE UI ET ACTIONS DE TRANSFERT
    // =========================================================

    const { frozenList, scrollableList } = useMemo(() => {
        const enrolledIds = new Set(rightListDb.map(i => i.etudiant_id));
        const selectedIds = new Set(selectedObjects.map(s => s.id));

        // 🔒 Les inscrits validés ne peuvent JAMAIS être frozen
        const frozen = selectedObjects.filter(
            s => !enrolledIds.has(s.id)
        );

        const scrollable = fetchedStudents.filter(
            s => !selectedIds.has(s.id)
        );

        return { frozenList: frozen, scrollableList: scrollable };
    }, [selectedObjects, fetchedStudents, rightListDb]);


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

    // Création d'un Set pour vérification ultra-rapide (O(1)) des inscrits
    const enrolledIdsSet = useMemo(() => {
        return new Set(allInscritsRaw.map(i => String(i.etudiant_id)));
    }, [allInscritsRaw]);

    const toggleLeft = (student) => {
        // ⛔ BLOCAGE STRICT : Si l'étudiant est dans le Set des inscrits, on arrête tout.
        if (enrolledIdsSet.has(String(student.id))) {
            addToast("Cet étudiant est déjà inscrit pour ce contexte.", "info"); // Feedback optionnel
            return; 
        }

        const id = student.id;
        const newSet = new Set(leftSelection);

        if (newSet.has(id)) {
            newSet.delete(id);
            setSelectedObjects(prev => prev.filter(s => s.id !== id));
        } else {
            newSet.add(id);
            setSelectedObjects(prev =>
                prev.find(s => s.id === id) ? prev : [...prev, student]
            );
        }

        setLeftSelection(newSet);
    };


    // Fonction helper pour rendre les lignes du panneau gauche
    const renderLeftStudentRow = (etu) => {
        // Vérification avec conversion String
        const isEnrolled = enrolledIdsSet.has(String(etu.id));
        
        return (
            <tr 
            key={`scroll-${etu.id}`} 
            onClick={() => toggleLeft(etu)} 
            // Amélioration du contraste gris pour bien voir qu'il est désactivé
            className={`group transition-colors border-b border-slate-50 last:border-none ${
                isEnrolled 
                ? 'bg-slate-100 cursor-not-allowed opacity-50' // Plus gris et moins opaque
                : 'cursor-pointer hover:bg-slate-50 bg-white'
            }`}
            >
            <td className="p-3 w-8 text-center">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isEnrolled
                    ? 'border-slate-300 bg-slate-200 text-slate-400' // Case visiblement désactivée
                    : leftSelection.has(etu.id) 
                        ? 'border-indigo-500 bg-indigo-500 text-white' 
                        : 'border-gray-300 group-hover:border-indigo-400 bg-white'
                }`}>
                    {isEnrolled && <span className="text-[8px]">🔒</span>} 
                </div>
            </td>
            {/* ... le reste des cellules (Identity, Details, ID) reste identique ... */}
             <td className={`p-3 ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-700'}`}>
                <div className="font-semibold truncate">{etu.nom}</div>
                <div className="truncate text-[11px]">{etu.prenom}</div>
            </td>
            <td className={`p-3 text-[10px] ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-400'}`}>
                <div>CIN: {etu.cin}</div>
                <div>N°: {etu.ddn}</div>
            </td>
            <td className={`p-3 text-center text-[10px] font-mono ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                {etu.id}
            </td>
            </tr>
        );
    };


    const ModeToggleGroup = ({ options, currentInfo, onChange }) => {
        return (
            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 w-fit">
                {options.map((opt) => {
                    const isSelected = currentInfo === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`
                                px-3 py-1 text-[10px] font-bold rounded-sm transition-all duration-200
                                ${isSelected 
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 transform scale-105" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }
                            `}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Helper UI : Composant Checkbox Moderne pour les Semestres (Style Chips)
    const SemestreChipSelector = ({ options, selectedIds, onToggle }) => {
        return (
            <div className="flex flex-wrap gap-1.5">
                {options.map((sem) => {
                    const isSelected = selectedIds.includes(sem.id);
                    return (
                        <div
                            key={sem.id}
                            onClick={() => onToggle(sem.id)}
                            className={`
                                cursor-pointer select-none px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5
                                ${isSelected 
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" 
                                    : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500"
                                }
                            `}
                        >
                            <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-slate-300"}`} />
                            {sem.label}
                        </div>
                    );
                })}
            </div>
        );
    };


    const moveRight = () => {
        if (!isConfigured) return;
        
        const dbIds = new Set(rightListDb.map(i => i.etudiant_id));
        const pendingIds = new Set(rightListPending.map(s => s.id));

        const alreadyInDbNames = [];
        const alreadyPendingNames = [];
        const validStudentsToMove = [];

        selectedObjects.forEach(etu => {
            if (dbIds.has(etu.id)) {
                alreadyInDbNames.push(`${etu.nom}`);
            } else if (pendingIds.has(etu.id)) {
                alreadyPendingNames.push(`${etu.nom}`);
            } else {
                validStudentsToMove.push(etu);
            }
        });

        if (alreadyInDbNames.length > 0) {
            const namesStr = alreadyInDbNames.slice(0, 3).join(", ") + (alreadyInDbNames.length > 3 ? "..." : "");
            addToast(`Déjà inscrits (refusé) : ${namesStr}`, "error");
        }

        if (alreadyPendingNames.length > 0) {
            const namesStr = alreadyPendingNames.slice(0, 3).join(", ") + (alreadyPendingNames.length > 3 ? "..." : "");
            addToast(`Déjà en liste d'attente : ${namesStr}`, "warning");
        }

        if (validStudentsToMove.length === 0) return;

        const defaultSemestres = semestresOptions.map(s => s.id);
        const newOnes = validStudentsToMove.map(s => ({ ...s, semestres: defaultSemestres })); 

        setRightListPending([...rightListPending, ...newOnes]);
        setLeftSelection(new Set());
        setSelectedObjects([]);
        addToast(`${newOnes.length} étudiant(s) ajouté(s) à la liste d'attente`, "success");
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

    // =============================================================
    // 5. LOGIQUE DE SAUVEGARDE ET AUTO-INSCRIPTION (MODIFIÉE ICI)
    // =============================================================

    const handleSave = async () => {
        // Validation basique
        const incomplete = rightListPending.filter(s => !s.semestres || s.semestres.length === 0);
        if (incomplete.length > 0) {
            addToast(`Veuillez sélectionner au moins un semestre pour tous les étudiants.`, "error");
            return;
        }

        setIsLoading(true);

        const report = { 
            uniqueSuccessIds: new Set(), // ICI: On stockera les ID uniques qui ont réussi
            alreadyEnrolledCount: 0,
            errors: [] 
        };
        
        // Groupement par semestre (identique à avant)
        const mapBySemestre = {};
        rightListPending.forEach(etu => {
            etu.semestres.forEach(semId => {
                if (!mapBySemestre[semId]) mapBySemestre[semId] = [];
                mapBySemestre[semId].push(etu); 
            });
        });

        const semestresUtilisesLabels = new Set(); // Pour l'affichage des badges

        // Envoi séquentiel
        for (const [semestreId, studentsList] of Object.entries(mapBySemestre)) {
            const etudiantsIds = studentsList.map(s => s.id);
            const semestreLabel = semestresOptions.find(s => s.id == semestreId)?.label || "Semestre ??";

            const payload = {
                annee_id: filters.annee,
                mention_id: filters.mention,
                parcours_id: filters.parcours,
                niveau_id: filters.niveau,
                semestre_id: semestreId,
                mode_inscription_id: filters.mode,
                etudiants_ids: etudiantsIds
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/inscriptions/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok) {
                    const existingIds = result.existing_ids || []; 
                    
                    // Calculer qui a réussi dans ce lot
                    const successfulIdsInBatch = etudiantsIds.filter(id => !existingIds.includes(id));
                    
                    // Ajouter les réussites au Set global (dé-doublonnage automatique)
                    successfulIdsInBatch.forEach(id => {
                        report.uniqueSuccessIds.add(id);
                        semestresUtilisesLabels.add(semestreLabel);
                    });

                    // Compter les "déjà inscrits" (ce sont des opérations échouées, pas des étudiants uniques ici)
                    report.alreadyEnrolledCount += existingIds.length;

                } else {
                    report.errors.push(`Erreur semestre ${semestreLabel}`);
                }
            } catch (e) {
                console.error(e);
                report.errors.push(`Erreur connexion ${semestreLabel}`);
            }
        }

        setIsLoading(false);

        // Préparation des résultats pour le modal
        setEnrollmentResults({
            count: report.uniqueSuccessIds.size, // LE FIX EST ICI : Nombre d'étudiants uniques
            semestres: Array.from(semestresUtilisesLabels),
            details: report.alreadyEnrolledCount > 0 
                ? `${report.alreadyEnrolledCount} opération(s) ignorée(s) (déjà existantes).` 
                : "Toutes les opérations ont réussi."
        });

        setIsResultModalOpen(true); 
        setRightListPending([]); 
        fetchExistingInscriptions(); 
    };

    // --- AUTO INSCRIPTION (NOUVEAU ETUDIANT) ---
    const handleAutoEnrollment = async (newStudent) => {
        fetchStudents(); 
        if (!isConfigured) {
            addToast("Étudiant créé. Inscription impossible (contexte manquant).", "warning");
            return;
        }

        const semestresIds = semestresOptions.map(s => s.id);
        if (semestresIds.length === 0) {
            addToast("Étudiant créé. Pas de semestres pour ce niveau.", "warning");
            return;
        }

        // On simule une structure "pending" pour réutiliser la logique ou faire une logique simplifiée
        // Ici on garde la logique simplifiée pour l'auto-enrollment (un seul étudiant)
        setIsLoading(true);
        const report = { successes: [], alreadyEnrolled: [], errors: [] };

        for (const semId of semestresIds) {
            const semLabel = semestresOptions.find(s=>s.id === semId)?.label;
            const payload = {
                annee_id: filters.annee,
                mention_id: filters.mention,
                parcours_id: filters.parcours,
                niveau_id: filters.niveau,
                semestre_id: semId,
                mode_inscription_id: filters.mode,
                etudiants_ids: [newStudent.Etudiant_id] 
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/inscriptions/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const json = await res.json();
                    if(json.deja_inscrits_count > 0) {
                        report.alreadyEnrolled.push({ nom: newStudent.Etudiant_nom, details: semLabel });
                    } else {
                        report.successes.push(`${newStudent.Etudiant_nom} (${semLabel})`);
                    }
                } else {
                    report.errors.push({ nom: "Erreur", reason: `Échec inscription ${semLabel}`});
                }
            } catch (e) {
                report.errors.push({ nom: "Erreur", reason: "Connexion impossible"});
            }
        }

        setIsLoading(false);
        setEnrollmentResults(report);
        setIsResultModalOpen(true); // On ouvre aussi la modale pour l'auto-inscription
        fetchExistingInscriptions();
    };

    // --- LOGIQUE DE SUPPRESSION ---
    
    // 1. Fonction appelée par le bouton "Poubelle" du tableau : Ouvre le modal
    const handleRequestDelete = (item) => {
        setStudentToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (idToDelete) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inscriptions/${idToDelete}`, { 
                method: 'DELETE' 
            });

            if (response.ok) {
                // 1. Mise à jour UI Immédiate (Liste Droite)
                setRightListDb(prev => prev.filter(i => i.id !== idToDelete));
                
                // 2. CORRECTION CRUCIALE : Mise à jour de la liste brute pour déverrouiller à gauche
                // Si on ne fait pas ça, enrolledIdsSet contient toujours l'ID
                setAllInscritsRaw(prev => prev.filter(i => i.id !== idToDelete));
                
                // 3. Nettoyer les sélections pour éviter les bugs
                setSelectedObjects(prev => prev.filter(obj => obj.id !== idToDelete));
                
                // 4. Actualiser la liste de gauche (Base) pour être sûr
                // On relance aussi fetchExistingInscriptions pour être synchro avec le serveur
                fetchStudents(); 
                fetchExistingInscriptions(); 
                
                addToast("Inscription supprimée et étudiant libéré.", "success");
            } else {
                addToast("Erreur lors de la suppression sur le serveur", "error");
            }
        } catch (e) {
            console.error(e);
            addToast("Erreur de connexion lors de la suppression", "error");
        }
    };

    const handleStartEdit = async (item) => {
        try {
            // 1. Charger les semestres du niveau pour savoir quoi afficher en checkboxes
            const res = await fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`);
            if (res.ok) {
                const sems = await res.json();
                setAvailableSemesters(sems);
                
                // 2. Pré-remplir les semestres cochés (on déduit de la string "S1, S2")
                const currentLabels = item.semestre.split(",").map(s => s.trim());
                const initialSemIds = sems
                    .filter(s => currentLabels.some(l => s.label.includes(l)))
                    .map(s => s.id);

                setEditData({
                    mode: item.mode_id, // Assurez-vous que le backend renvoie mode_id
                    semestres: initialSemIds
                });
                setEditingId(item.id);
            }
        } catch (e) {
            addToast("Erreur lors de la préparation de l'édition", "error");
        }
    };

    const handleSaveInline = async (id) => {
        setIsSavingEdit(true);
        try {
            // [CORRECTION IMPORTANTE]
            // Dans handleStartEdit, vous faites : setEditData({ mode: item.mode_id ... })
            // Donc ici, il faut utiliser editData.mode et non editData.mode_id
            
            const payload = {
                mode_inscription_id: String(editData.mode || ""), // Correction ici
                semestres_ids: Array.isArray(editData.semestres) ? editData.semestres : [] // Correction ici (c'est .semestres dans le state, pas .semestres_ids)
            };

            // Vérification console pour débogage
            // console.log("Payload envoyé:", payload);

            const response = await fetch(`${API_BASE_URL}/api/inscriptions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                addToast("Modification enregistrée", "success");
                setEditingId(null);
                
                // On recharge la liste pour être sûr d'avoir les labels à jour (ex: "S1, S2")
                fetchExistingInscriptions(); 
            } else {
                const errorData = await response.json();
                console.error("Erreur API:", errorData);
                addToast("Erreur de validation : " + (errorData.detail || "Vérifiez les données"), "error");
            }
        } catch (error) {
            console.error(error);
            addToast("Erreur de connexion", "error");
        } finally {
            setIsSavingEdit(false);
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
                        <input type="checkbox" checked={selectedSemestres.includes(sem.id)} onChange={() => onToggle(sem.id)} className="hidden" />
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
            
            <div className="flex flex-grow gap-2 overflow-hidden">
                {/* 1. GAUCHE: Base Étudiants */}
                <div className="w-[38%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-white flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><FaLayerGroup /></div> Base Étudiants
                            </h3>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">{pagination.total}</span>
                        </div>
                        <div className="relative group">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors text-xs" />
                            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto relative">
                        {isLoading && <div className="absolute inset-0 bg-white/80 z-50 flex justify-center items-center"><FaSpinner className="animate-spin text-indigo-600 text-2xl"/></div>}
                        <table className="w-full text-left text-xs border-separate border-spacing-0">
                            <thead className="sticky top-0 z-50 bg-white">
                                <tr>
                                    <TableHeader className="w-8 text-center border-b border-gray-200 py-3">#</TableHeader>
                                    <TableHeader className="border-b border-gray-200 py-3">Identité</TableHeader>
                                    <TableHeader className="border-b border-gray-200 py-3">Détails</TableHeader>
                                    <TableHeader className="w-12 text-center border-b border-gray-200 py-3">ID</TableHeader>
                                </tr>
                            </thead>
                            
                            {frozenList.length > 0 && (
                                <tbody className="sticky top-[37px] z-40"> 
                                    {frozenList.map((etu, idx) => (
                                        <tr key={`frozen-${etu.id}`} onClick={() => toggleLeft(etu)} className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                            <td className="p-3 w-8 text-center border-b border-indigo-100">
                                                <div className="w-4 h-4 rounded border border-indigo-400 bg-indigo-600 flex items-center justify-center text-white text-[10px]">✓</div>
                                            </td>
                                            <td className="p-3 font-bold text-indigo-900 border-b border-indigo-100">{etu.nom} {etu.prenom}</td>
                                            <td className="p-3 text-indigo-700 border-b border-indigo-100">CIN: {etu.cin}</td>
                                            <td className="p-3 text-center font-mono text-indigo-400 border-b border-indigo-100">{etu.id}</td>
                                        </tr>
                                    ))}
                                    <tr className="h-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]"><td colSpan="4" className="p-0 bg-indigo-50"></td></tr>
                                </tbody>
                            )}

                            <tbody className="divide-y divide-slate-50">
                                {scrollableList.map(renderLeftStudentRow)}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-2 border-t bg-slate-50 flex justify-between items-center shrink-0">
                        <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page === 1} className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><FaChevronLeft/></button>
                        <span className="text-[10px] font-bold text-slate-500">PAGE {pagination.page}</span>
                        <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page * pagination.limit >= pagination.total} className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><FaChevronRight/></button>
                    </div>
                </div>

                {/* 2. CENTRE: Boutons de transfert */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-4 shrink-0">
                    <button onClick={moveRight} disabled={leftSelection.size === 0 || !isConfigured} className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 transform active:scale-95 ${ (isConfigured) ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed" }`}>
                        <FaAngleRight />
                    </button>
                    <button onClick={moveLeft} disabled={rightSelection.size === 0} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-slate-600 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <FaAngleLeft />
                    </button>
                </div>

                {/* 3. DROITE: Configuration et Listes */}
                <div className="w-[58%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    
                    <div className="p-3 border-b border-gray-100 bg-slate-50/50 flex justify-between items-start shrink-0">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><FaFilter /></div>
                                Contexte
                            </h3>
                            {isConfigured ? (
                                <div className="bg-white p-2.5 rounded border border-indigo-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                                    <div className="col-span-1 lg:col-span-2 flex gap-4 border-b border-dashed border-gray-100 pb-1 mb-1">
                                        <p className="truncate text-[10px] text-gray-500"><span className="font-bold text-indigo-700 uppercase">Inst:</span> {getFilterLabel('institution')}</p>
                                        <p className="truncate text-[10px] text-gray-500"><span className="font-bold text-indigo-700 uppercase">Comp:</span> {getFilterLabel('composante')}</p>
                                    </div>
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
                                    <FaInfoCircle className="text-lg shrink-0"/> <span>Veuillez configurer le contexte d'inscription pour commencer.</span>
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
                                    <span className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-2"><FaExchangeAlt /> En attente de validation</span>
                                    <span className="bg-white text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{rightListPending.length}</span>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-indigo-50/30 text-indigo-900 border-b border-indigo-100">
                                        <tr><th className="p-2 w-8">#</th><th className="p-2">Étudiant</th><th className="p-2">Semestres à inscrire</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rightListPending.map(etu => (
                                            <tr key={etu.id} onClick={() => toggleRight(etu.id)} className={`transition ${rightSelection.has(etu.id) ? "bg-red-50" : "hover:bg-gray-50"}`}>
                                                <td className="p-2 text-center"><input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500 cursor-pointer" /></td>
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
                                <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase"><FaUserGraduate /> Inscrits Validés</span>
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">{rightListDb.length}</span>
                            </div>
                            
                            <div className="overflow-y-auto flex-grow h-0">
                                
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-20 shadow-sm">
                                        <tr>
                                        <TableHeader className="w-8 text-center">#</TableHeader>
                                        <TableHeader className="w-32">Matricule</TableHeader>
                                        <TableHeader>Étudiant</TableHeader>
                                        <TableHeader className="w-16">Niveau</TableHeader>
                                        <TableHeader>Semestres</TableHeader>
                                        <TableHeader>Mode</TableHeader>
                                        <TableHeader className="w-10"></TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {rightListDb.map((item, index) => {
                                        const isEditing = editingId === item.id;

                                        return (
                                            <tr
                                            key={item.id}
                                            className={`transition-colors ${
                                                isEditing ? "bg-indigo-50/50" : "hover:bg-gray-50/50"
                                            }`}
                                            >
                                            {/* # */}
                                            <td className="px-3 py-3 text-center align-middle text-slate-400">
                                                {index + 1}
                                            </td>

                                            {/* Matricule */}
                                            <td className="px-3 py-3 align-middle text-[10px] text-slate-400 font-mono tracking-tight">
                                                {item.matricule}
                                            </td>

                                            {/* Étudiant */}
                                            <td className="px-3 py-3 align-middle">
                                                <span className="font-bold text-slate-700 text-[12px]">
                                                {item.nom} {item.prenom}
                                                </span>
                                            </td>

                                            {/* Niveau */}
                                            <td className="px-3 py-3 align-middle text-slate-500 text-[11px]">
                                                {item.niveau}
                                            </td>

                                            {/* Semestres */}
                                            <td className="px-3 py-3 align-middle">
                                                {isEditing ? (
                                                <SemestreChipSelector
                                                    options={semestresOptions}
                                                    selectedIds={editData.semestres}
                                                    onToggle={(sid) => {
                                                    const current = editData.semestres;
                                                    setEditData({
                                                        ...editData,
                                                        semestres: current.includes(sid)
                                                        ? current.filter((id) => id !== sid)
                                                        : [...current, sid],
                                                    });
                                                    }}
                                                />
                                                ) : (
                                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {item.semestre}
                                                </span>
                                                )}
                                            </td>

                                            {/* Mode */}
                                            <td className="px-3 py-3 align-middle">
                                                {isEditing ? (
                                                <ModeToggleGroup
                                                    options={options.modes}
                                                    currentInfo={editData.mode}
                                                    onChange={(newMode) =>
                                                    setEditData({ ...editData, mode: newMode })
                                                    }
                                                />
                                                ) : (
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase border border-slate-200">
                                                    {item.mode}
                                                </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                    <button
                                                        onClick={() => handleSaveInline(item.id)}
                                                        className="p-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 shadow-sm transition-all"
                                                        title="Sauvegarder"
                                                    >
                                                        {isSavingEdit ? (
                                                        <FaSpinner className="animate-spin text-xs" />
                                                        ) : (
                                                        <FaSave className="text-xs" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-md hover:bg-slate-100"
                                                        title="Annuler"
                                                    >
                                                        <FaTimes className="text-xs" />
                                                    </button>
                                                    </>
                                                ) : (
                                                    <>
                                                    <button
                                                        onClick={() => handleStartEdit(item)}
                                                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRequestDelete(item)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                    </>
                                                )}
                                                </div>
                                            </td>
                                            </tr>
                                        );
                                        })}
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
            
            <StudentFormModal 
                isOpen={isStudentFormOpen} 
                onClose={() => setIsStudentFormOpen(false)} 
                data={null} 
                reloadList={fetchStudents}
                onSuccess={handleAutoEnrollment} 
            />

            <DeleteInscriptionModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete} 
                studentData={studentToDelete}
            />

            <EnrollmentResultModal 
                isOpen={isResultModalOpen}
                onClose={() => setIsResultModalOpen(false)}
                results={enrollmentResults}
            />

        </div>
    );
}