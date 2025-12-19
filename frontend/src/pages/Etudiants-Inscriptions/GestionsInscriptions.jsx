import React, { useState, useEffect, useMemo } from "react";
import { 
    FaSearch, FaTrash, FaAngleRight, FaAngleLeft, FaSave, 
    FaFilter, FaExternalLinkAlt, FaLayerGroup, FaPlus, 
    FaChevronLeft, FaChevronRight, FaSpinner, FaUserGraduate, 
    FaExchangeAlt, FaInfoCircle, FaEdit, FaTimes
} from "react-icons/fa";
import { useToast } from "../../context/ToastContext";
import StudentFormModal from "./components/FormEtudiantsAjout"; 
import ConfigurationInscription from "./components/ConfigurationInscription";
import EnrollmentResultModal from "./components/EnrollmentResultModal";
import DeleteInscriptionModal from "./components/DeleteInscriptionModal";

const API_BASE_URL = "http://127.0.0.1:8000"; 
const INITIAL_OPTIONS = { institutions: [], composantes: [], mentions: [], annees: [], niveaux: [], parcours: [], modes: [] };

// --- Sous-composants extraits pour alléger le code principal ---
const TableHeader = ({ children, className = "" }) => (
    <th className={`px-3 py-2 bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 ${className}`}>{children}</th>
);

const SemestreCheckbox = ({ options, selectedSemestres, onToggle }) => (
    <div className="flex flex-wrap gap-1">
        {options.length > 0 ? options.map(sem => (
            <label key={sem.id} className={`flex items-center justify-center text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all border ${selectedSemestres.includes(sem.id) ? 'bg-indigo-600 text-white border-indigo-600 font-medium' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                <input type="checkbox" checked={selectedSemestres.includes(sem.id)} onChange={() => onToggle(sem.id)} className="hidden" />
                {sem.label}
            </label>
        )) : <span className="text-[10px] italic text-amber-600">Sélectionnez le niveau</span>}
    </div>
);

const ModeToggleGroup = ({ options, currentInfo, onChange }) => (
    <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 w-fit">
        {options.map((opt) => (
            <button key={opt.id} onClick={() => onChange(opt.id)} className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all duration-200 ${currentInfo === opt.id ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 transform scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                {opt.label}
            </button>
        ))}
    </div>
);

const SemestreChipSelector = ({ options, selectedIds, onToggle }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map((sem) => {
            const isSelected = selectedIds.includes(sem.id);
            return (
                <div key={sem.id} onClick={() => onToggle(sem.id)} className={`cursor-pointer select-none px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5 ${isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500"}`}>
                    <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-slate-300"}`} />
                    {sem.label}
                </div>
            );
        })}
    </div>
);

export default function InscriptionsMain() {
    const { addToast } = useToast(); 

    // State UI & Données
    const [fetchedStudents, setFetchedStudents] = useState([]); 
    const [selectedObjects, setSelectedObjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 }); 
    const [searchTerm, setSearchTerm] = useState("");

    // State Listes
    const [leftSelection, setLeftSelection] = useState(new Set()); 
    const [rightListDb, setRightListDb] = useState([]); 
    const [rightListPending, setRightListPending] = useState([]); 
    const [rightSelection, setRightSelection] = useState(new Set()); 
    const [allInscritsRaw, setAllInscritsRaw] = useState([]);

    // State Edition & Config
    const [editingId, setEditingId] = useState(null); 
    const [editData, setEditData] = useState({ mode: "", semestres: [] });
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [filters, setFilters] = useState({ institution: "", composante: "", mention: "", annee: "", parcours: "", niveau: "", mode: "" });
    const [options, setOptions] = useState(INITIAL_OPTIONS);
    const [semestresOptions, setSemestresOptions] = useState([]);
    const isConfigured = filters.mention && filters.annee && filters.niveau && filters.parcours && filters.mode;

    // State Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [enrollmentResults, setEnrollmentResults] = useState(null);

    // --- Chargement Initial ---
    useEffect(() => {
        const load = async () => {
            try {
                const mapData = async (url, mapFn) =>
                    (await fetch(url)).ok ? (await (await fetch(url)).json()).map(mapFn) : [];

                const [annees, institutions, modes, niveaux] = await Promise.all([
                    mapData(`${API_BASE_URL}/api/metadonnees/annees-universitaires`, i => ({
                        id: i.AnneeUniversitaire_id || i.id_annee_universitaire,
                        label: `${i.AnneeUniversitaire_annee || i.annee}${i.AnneeUniversitaire_is_active ? " (Active)" : ""}`
                    })),
                    mapData(`${API_BASE_URL}/api/institutions/`, i => ({ id: i.Institution_id, label: i.Institution_nom })),
                    mapData(`${API_BASE_URL}/api/metadonnees/modes-inscription`, i => ({ id: i.ModeInscription_id || i.id_mode, label: i.ModeInscription_label })),
                    mapData(`${API_BASE_URL}/api/metadonnees/niveaux`, i => ({ id: i.Niveau_id || i.id_niveau, label: i.Niveau_label || i.code }))
                ]);

                setOptions(o => ({ ...o, annees, institutions, modes, niveaux }));
            } catch {
                addToast("Erreur init données", "error");
            }
        };
        load();
    }, []);


    // --- Cascades ---
    useEffect(() => {
        if (!filters.institution) return setOptions(p => ({ ...p, composantes: [], mentions: [], parcours: [] }));
        fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${filters.institution}`).then(r=>r.json()).then(d=>setOptions(p=>({...p, composantes: d.map(c=>({id:c.Composante_id, label:c.Composante_label}))}))).catch(console.error);
    }, [filters.institution]);

    useEffect(() => {
        if (!filters.composante) return setOptions(p => ({ ...p, mentions: [], parcours: [] }));
        fetch(`${API_BASE_URL}/api/mentions/composante/${filters.composante}`).then(r=>r.json()).then(d=>setOptions(p=>({...p, mentions: d.map(m=>({id:m.Mention_id, label:m.Mention_label}))}))).catch(console.error);
    }, [filters.composante]);

    useEffect(() => {
        if (!filters.mention) return setOptions(p => ({ ...p, parcours: [] }));
        fetch(`${API_BASE_URL}/api/parcours/mention/${filters.mention}`).then(r=>r.json()).then(d=>setOptions(p=>({...p, parcours: d.map(x=>({id:x.Parcours_id, label:x.Parcours_label}))}))).catch(console.error);
    }, [filters.mention]);

    useEffect(() => {
        if (!filters.parcours) return;
        fetch(`${API_BASE_URL}/api/parcours/${filters.parcours}/niveaux`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setOptions(p => ({ ...p, niveaux: d.map(n => ({ id: n.Niveau_id || n.id_niveau, label: n.Niveau_label || n.label })) })));
        setFilters(p => ({ ...p, niveau: "" })); 
    }, [filters.parcours]);

    useEffect(() => {
        if (!filters.niveau) { setSemestresOptions([]); setRightListPending(p => p.map(i => ({ ...i, semestres: [] }))); return; }
        fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`).then(r=>r.json()).then(setSemestresOptions).catch(()=>setSemestresOptions([]));
    }, [filters.niveau]);

    // --- Logique de filtrage visuel ---
    useEffect(() => {
        const enrolledIds = new Set(rightListDb.map(i => i.etudiant_id));
        setSelectedObjects(prev => prev.filter(s => !enrolledIds.has(s.id)));
        setLeftSelection(prev => new Set([...prev].filter(id => !enrolledIds.has(id))));
    }, [rightListDb]);

    // --- Chargement des listes ---
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ skip: ((pagination.page - 1) * pagination.limit).toString(), limit: pagination.limit.toString() });
            if (searchTerm) params.append("search", searchTerm);
            const res = await fetch(`${API_BASE_URL}/api/etudiants?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setFetchedStudents((result.items || []).map(item => ({ id: item.Etudiant_id, nom: item.Etudiant_nom, prenom: item.Etudiant_prenoms, cin: item.Etudiant_cin || "—", ddn: item.Etudiant_naissance_date || "—", original: item })));
                setPagination(prev => ({ ...prev, total: result.total || 0 }));
            }
        } catch (error) { console.error(error); }
        setIsLoading(false);
    };

    useEffect(() => { const t = setTimeout(fetchStudents, 300); return () => clearTimeout(t); }, [pagination.page, pagination.limit, searchTerm]);

    const fetchExistingInscriptions = async () => {
        if (!filters.annee || !filters.mention) { setRightListDb([]); setAllInscritsRaw([]); return; }
        try {
            const params = new URLSearchParams({ annee_id: filters.annee, mention_id: filters.mention });
            if (filters.institution) params.append("institution_id", filters.institution);
            if (filters.composante) params.append("composante_id", filters.composante);
            if (filters.parcours) params.append("parcours_id", filters.parcours);
            if (filters.niveau) params.append("niveau_id", filters.niveau);

            const res = await fetch(`${API_BASE_URL}/api/inscriptions/?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const mapped = data.map(item => ({ id: item.id, etudiant_id: item.etudiant_id, nom: item.etudiant_nom || "Inconnu", prenom: item.etudiant_prenom || "", matricule: item.matricule || "N/A", semestre: item.semestre_label || "—", niveau: item.niveau_label || "", parcours: item.parcours_label || "", mode: item.mode_label || "—", mode_id: item.mode_id }));
                setAllInscritsRaw(mapped);
                setRightListDb(filters.mode ? mapped.filter(i => i.mode_id === filters.mode) : mapped);
            }
        } catch (e) { console.error("Erreur chargement inscrits:", e); }
    };

    useEffect(() => { fetchExistingInscriptions(); }, [filters.annee, filters.mention, filters.parcours, filters.niveau, filters.mode, filters.institution, filters.composante]);

    // --- Helpers UI & Actions ---
    const { frozenList, scrollableList } = useMemo(() => {
        const enrolledIds = new Set(rightListDb.map(i => i.etudiant_id));
        const selectedIds = new Set(selectedObjects.map(s => s.id));
        return { 
            frozenList: selectedObjects.filter(s => !enrolledIds.has(s.id)), 
            scrollableList: fetchedStudents.filter(s => !selectedIds.has(s.id)) 
        };
    }, [selectedObjects, fetchedStudents, rightListDb]);

    const getFilterLabel = (key) => options[key === 'annee' ? 'annees' : key + 's']?.find(opt => opt.id === filters[key])?.label || "—";
    const enrolledIdsSet = useMemo(() => new Set(allInscritsRaw.map(i => String(i.etudiant_id))), [allInscritsRaw]);

    const toggleLeft = (student) => {
        if (enrolledIdsSet.has(String(student.id))) { addToast("Déjà inscrit pour ce contexte.", "info"); return; }
        const newSet = new Set(leftSelection);
        newSet.has(student.id) ? (newSet.delete(student.id), setSelectedObjects(p => p.filter(s => s.id !== student.id))) : (newSet.add(student.id), setSelectedObjects(p => p.find(s => s.id === student.id) ? p : [...p, student]));
        setLeftSelection(newSet);
    };

    const moveRight = () => {
        if (!isConfigured) return;
        const dbIds = new Set(rightListDb.map(i => i.etudiant_id));
        const pendingIds = new Set(rightListPending.map(s => s.id));
        const valid = [];
        
        selectedObjects.forEach(etu => {
            if (dbIds.has(etu.id) || pendingIds.has(etu.id)) return;
            valid.push(etu);
        });

        if (valid.length === 0) return addToast("Aucun étudiant valide à ajouter.", "warning");
        setRightListPending([...rightListPending, ...valid.map(s => ({ ...s, semestres: semestresOptions.map(o => o.id) }))]);
        setLeftSelection(new Set());
        setSelectedObjects([]);
        addToast(`${valid.length} étudiant(s) ajouté(s)`, "success");
    };

    const moveLeft = () => { setRightListPending(rightListPending.filter(s => !rightSelection.has(s.id))); setRightSelection(new Set()); };
    const toggleRight = (id) => { const s = new Set(rightSelection); s.has(id) ? s.delete(id) : s.add(id); setRightSelection(s); };
    const handleSemestreToggle = (id, sid) => setRightListPending(p => p.map(i => i.id === id ? { ...i, semestres: i.semestres.includes(sid) ? i.semestres.filter(s => s !== sid) : [...i.semestres, sid] } : i));

    // --- Sauvegardes & Suppression ---
    const handleSave = async () => {
        if (rightListPending.some(s => !s.semestres.length)) return addToast("Sélectionnez au moins un semestre.", "error");
        setIsLoading(true);
        const report = { uniqueSuccessIds: new Set(), alreadyEnrolledCount: 0, errors: [] };
        const mapBySemestre = {};
        rightListPending.forEach(e => e.semestres.forEach(sid => (mapBySemestre[sid] ||= []).push(e)));
        const semestresLabels = new Set();

        for (const [sid, list] of Object.entries(mapBySemestre)) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/inscriptions/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ annee_id: filters.annee, mention_id: filters.mention, parcours_id: filters.parcours, niveau_id: filters.niveau, semestre_id: sid, mode_inscription_id: filters.mode, etudiants_ids: list.map(s => s.id) })
                });
                const r = await res.json();
                if (res.ok) {
                    list.map(s=>s.id).filter(id => !(r.existing_ids || []).includes(id)).forEach(id => { report.uniqueSuccessIds.add(id); semestresLabels.add(semestresOptions.find(s=>s.id==sid)?.label); });
                    report.alreadyEnrolledCount += (r.existing_ids || []).length;
                } else report.errors.push(`Erreur API semestre ${sid}`);
            } catch (e) { report.errors.push("Erreur connexion"); }
        }
        setIsLoading(false);
        setEnrollmentResults({ count: report.uniqueSuccessIds.size, semestres: Array.from(semestresLabels), details: report.alreadyEnrolledCount > 0 ? `${report.alreadyEnrolledCount} ignorés.` : "Succès complet." });
        setIsResultModalOpen(true); 
        setRightListPending([]); 
        fetchExistingInscriptions(); 
    };

    const handleAutoEnrollment = async (newStudent) => {
        fetchStudents();
        if (!isConfigured || !semestresOptions.length) return addToast("Contexte incomplet pour inscription auto.", "warning");
        setIsLoading(true);
        const report = { successes: [], alreadyEnrolled: [], errors: [] };
        for (const sem of semestresOptions) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/inscriptions/bulk`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ annee_id: filters.annee, mention_id: filters.mention, parcours_id: filters.parcours, niveau_id: filters.niveau, semestre_id: sem.id, mode_inscription_id: filters.mode, etudiants_ids: [newStudent.Etudiant_id] })
                });
                const json = await res.json();
                if (res.ok) (json.deja_inscrits_count > 0 ? report.alreadyEnrolled : report.successes).push(sem.label);
                else report.errors.push(sem.label);
            } catch (e) { report.errors.push("Connexion"); }
        }
        setIsLoading(false);
        setEnrollmentResults({ count: report.successes.length > 0 ? 1 : 0, semestres: report.successes, details: "Auto-inscription terminée" });
        setIsResultModalOpen(true);
        fetchExistingInscriptions();
    };

    const handleConfirmDelete = async (id) => {
        try {
            if ((await fetch(`${API_BASE_URL}/api/inscriptions/${id}`, { method: 'DELETE' })).ok) {
                setRightListDb(p => p.filter(i => i.id !== id));
                setAllInscritsRaw(p => p.filter(i => i.id !== id));
                setSelectedObjects(p => p.filter(o => o.id !== id));
                fetchStudents(); fetchExistingInscriptions();
                addToast("Inscription supprimée.", "success");
            } else addToast("Erreur suppression", "error");
        } catch (e) { addToast("Erreur connexion", "error"); }
    };

    const handleStartEdit = async (item) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`);
            if (!res.ok) throw new Error();
            const sems = await res.json();
            setAvailableSemesters(sems);
            const currentLabels = item.semestre.split(",").map(s => s.trim());
            setEditData({ mode: item.mode_id, semestres: sems.filter(s => currentLabels.some(l => s.label.includes(l))).map(s => s.id) });
            setEditingId(item.id);
        } catch (e) { addToast("Erreur édition", "error"); }
    };

    const handleSaveInline = async (id) => {
        setIsSavingEdit(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/inscriptions/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode_inscription_id: String(editData.mode || ""), semestres_ids: editData.semestres || [] })
            });
            if (res.ok) { addToast("Modifié", "success"); setEditingId(null); fetchExistingInscriptions(); }
            else addToast("Erreur update", "error");
        } catch (e) { addToast("Erreur connexion", "error"); }
        setIsSavingEdit(false);
    };

    const renderLeftStudentRow = (etu) => {
        const isEnrolled = enrolledIdsSet.has(String(etu.id));
        return (
            <tr key={`scroll-${etu.id}`} onClick={() => toggleLeft(etu)} className={`group transition-colors border-b border-slate-50 last:border-none ${isEnrolled ? 'bg-slate-100 cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50 bg-white'}`}>
                <td className="p-3 w-8 text-center"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isEnrolled ? 'border-slate-300 bg-slate-200 text-slate-400' : leftSelection.has(etu.id) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 group-hover:border-indigo-400 bg-white'}`}>{isEnrolled && <span className="text-[8px]">🔒</span>}</div></td>
                <td className={`p-3 ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-700'}`}><div className="font-semibold truncate">{etu.nom}</div><div className="truncate text-[11px]">{etu.prenom}</div></td>
                <td className={`p-3 text-[10px] ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-400'}`}><div>CIN: {etu.cin}</div><div>N°: {etu.ddn}</div></td>
                <td className={`p-3 text-center text-[10px] font-mono ${isEnrolled ? 'text-gray-400 select-none' : 'text-slate-300 group-hover:text-indigo-400'}`}>{etu.id}</td>
            </tr>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] gap-2">
            <div className="flex flex-grow gap-2 overflow-hidden">
                {/* 1. GAUCHE: Base Étudiants */}
                <div className="w-[38%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-white flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><FaLayerGroup /></div> Base Étudiants</h3>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">{pagination.total}</span>
                        </div>
                        <div className="relative group">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 text-xs" />
                            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto relative">
                        {isLoading && <div className="absolute inset-0 bg-white/80 z-50 flex justify-center items-center"><FaSpinner className="animate-spin text-indigo-600 text-2xl"/></div>}
                        <table className="w-full text-left text-xs border-separate border-spacing-0">
                            <thead className="sticky top-0 z-50 bg-white">
                                <tr><TableHeader className="w-8 text-center border-b py-3">#</TableHeader><TableHeader className="border-b py-3">Identité</TableHeader><TableHeader className="border-b py-3">Détails</TableHeader><TableHeader className="w-12 text-center border-b py-3">ID</TableHeader></tr>
                            </thead>
                            {frozenList.length > 0 && <tbody className="sticky top-[37px] z-40">
                                {frozenList.map(etu => (
                                    <tr key={`frozen-${etu.id}`} onClick={() => toggleLeft(etu)} className="cursor-pointer bg-indigo-50 hover:bg-indigo-100">
                                        <td className="p-3 w-8 text-center border-b border-indigo-100"><div className="w-4 h-4 rounded border border-indigo-400 bg-indigo-600 flex items-center justify-center text-white text-[10px]">✓</div></td>
                                        <td className="p-3 font-bold text-indigo-900 border-b border-indigo-100">{etu.nom} {etu.prenom}</td>
                                        <td className="p-3 text-indigo-700 border-b border-indigo-100">CIN: {etu.cin}</td>
                                        <td className="p-3 text-center font-mono text-indigo-400 border-b border-indigo-100">{etu.id}</td>
                                    </tr>
                                ))}
                                <tr className="h-0 shadow-md"><td colSpan="4" className="p-0 bg-indigo-50"></td></tr>
                            </tbody>}
                            <tbody className="divide-y divide-slate-50">{scrollableList.map(renderLeftStudentRow)}</tbody>
                        </table>
                    </div>
                    <div className="p-2 border-t bg-slate-50 flex justify-between items-center shrink-0">
                        <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page === 1} className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><FaChevronLeft/></button>
                        <span className="text-[10px] font-bold text-slate-500">PAGE {pagination.page}</span>
                        <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page * pagination.limit >= pagination.total} className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><FaChevronRight/></button>
                    </div>
                </div>

                {/* 2. CENTRE: Transfert */}
                <div className="w-[4%] flex flex-col justify-center items-center gap-4 shrink-0">
                    <button onClick={moveRight} disabled={leftSelection.size === 0 || !isConfigured} className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${isConfigured ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}><FaAngleRight /></button>
                    <button onClick={moveLeft} disabled={rightSelection.size === 0} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-slate-600 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 disabled:opacity-50"><FaAngleLeft /></button>
                </div>

                {/* 3. DROITE: Config & Listes */}
                <div className="w-[58%] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-slate-50/50 flex justify-between items-start shrink-0">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2"><div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><FaFilter /></div> Contexte</h3>
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
                                    <p className="text-[11px] text-slate-600 col-span-1 lg:col-span-2 border-t border-dashed border-gray-100 pt-1 mt-1"><span className="font-bold text-indigo-600 text-[10px] uppercase w-14 inline-block">Mode:</span> <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100">{getFilterLabel('mode')}</span></p>
                                </div>
                            ) : <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 w-full"><FaInfoCircle className="text-lg shrink-0"/> <span>Configurez le contexte.</span></div>}
                        </div>
                        <div className="flex flex-col gap-2 ml-3"> 
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white border border-gray-300 rounded text-slate-700 hover:bg-gray-50 transition shadow-sm"><FaExternalLinkAlt/> Configurer</button>
                            <button onClick={() => setIsStudentFormOpen(true)} disabled={!isConfigured} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded border transition shadow-sm ${isConfigured ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><FaPlus/> Nouvel Étudiant</button>
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
                                    <thead className="bg-indigo-50/30 text-indigo-900 border-b border-indigo-100"><tr><th className="p-2 w-8">#</th><th className="p-2">Étudiant</th><th className="p-2">Semestres à inscrire</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rightListPending.map(etu => (
                                            <tr key={etu.id} onClick={() => toggleRight(etu.id)} className={`transition ${rightSelection.has(etu.id) ? "bg-red-50" : "hover:bg-gray-50"}`}>
                                                <td className="p-2 text-center"><input type="checkbox" checked={rightSelection.has(etu.id)} readOnly className="accent-red-500 cursor-pointer" /></td>
                                                <td className="p-2 font-medium text-slate-700">{etu.nom} {etu.prenom}</td>
                                                <td className="p-2" onClick={(e) => e.stopPropagation()}><SemestreCheckbox options={semestresOptions} selectedSemestres={etu.semestres} onToggle={(sid) => handleSemestreToggle(etu.id, sid)} /></td>
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
                                    <thead className="sticky top-0 z-20 shadow-sm"><tr><TableHeader className="w-8 text-center">#</TableHeader><TableHeader className="w-32">Matricule</TableHeader><TableHeader>Étudiant</TableHeader><TableHeader className="w-16">Niveau</TableHeader><TableHeader>Semestres</TableHeader><TableHeader>Mode</TableHeader><TableHeader className="w-10"></TableHeader></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rightListDb.map((item, index) => {
                                            const isEditing = editingId === item.id;
                                            return (
                                                <tr key={item.id} className={`transition-colors ${isEditing ? "bg-indigo-50/50" : "hover:bg-gray-50/50"}`}>
                                                    <td className="px-3 py-3 text-center align-middle text-slate-400">{index + 1}</td>
                                                    <td className="px-3 py-3 align-middle text-[10px] text-slate-400 font-mono tracking-tight">{item.matricule}</td>
                                                    <td className="px-3 py-3 align-middle"><span className="font-bold text-slate-700 text-[12px]">{item.nom} {item.prenom}</span></td>
                                                    <td className="px-3 py-3 align-middle text-slate-500 text-[11px]">{item.niveau}</td>
                                                    <td className="px-3 py-3 align-middle">{isEditing ? <SemestreChipSelector options={semestresOptions} selectedIds={editData.semestres} onToggle={(sid) => setEditData(p => ({...p, semestres: p.semestres.includes(sid) ? p.semestres.filter(i => i !== sid) : [...p.semestres, sid]}))} /> : <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{item.semestre}</span>}</td>
                                                    <td className="px-3 py-3 align-middle">{isEditing ? <ModeToggleGroup options={options.modes} currentInfo={editData.mode} onChange={(m) => setEditData({ ...editData, mode: m })} /> : <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase border border-slate-200">{item.mode}</span>}</td>
                                                    <td className="px-3 py-3 align-middle text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {isEditing ? (
                                                                <><button onClick={() => handleSaveInline(item.id)} className="p-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 shadow-sm transition-all">{isSavingEdit ? <FaSpinner className="animate-spin text-xs" /> : <FaSave className="text-xs" />}</button>
                                                                <button onClick={() => setEditingId(null)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-md hover:bg-slate-100"><FaTimes className="text-xs" /></button></>
                                                            ) : (
                                                                <><button onClick={() => handleStartEdit(item)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><FaEdit /></button>
                                                                <button onClick={() => { setStudentToDelete(item); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><FaTrash /></button></>
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

            {/* Actions & Modals */}
            <div className="mt-1 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex justify-between items-center shrink-0">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConfigured ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></span>
                    {isConfigured ? "Système prêt à inscrire." : "En attente de configuration."}
                </div>
                <div className="flex items-center gap-4">
                     {rightListPending.length > 0 && <span className="text-xs font-medium text-slate-600"><strong className="text-indigo-600">{rightListPending.length}</strong> étudiant(s) prêt(s)</span>}
                    <button onClick={handleSave} disabled={rightListPending.length === 0 || !isConfigured || isLoading} className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-xs shadow-md transition-all hover:-translate-y-0.5 ${(rightListPending.length > 0 && isConfigured && !isLoading) ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}>
                        {isLoading ? <FaSpinner className="animate-spin"/> : <FaSave />} {isLoading ? "Traitement..." : "Valider Inscriptions"}
                    </button>
                </div>
            </div>
            
            <ConfigurationInscription isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} filters={filters} setFilters={setFilters} options={options} onSave={() => setIsModalOpen(false)}/>
            <StudentFormModal isOpen={isStudentFormOpen} onClose={() => setIsStudentFormOpen(false)} data={null} reloadList={fetchStudents} onSuccess={handleAutoEnrollment} />
            <DeleteInscriptionModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} studentData={studentToDelete}/>
            <EnrollmentResultModal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} results={enrollmentResults}/>
        </div>
    );
}