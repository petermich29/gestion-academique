import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    FaSearch, FaChevronRight, FaChevronLeft, FaSave, 
    FaFilter, FaCheckSquare, FaSquare, FaSpinner,
    FaUserGraduate, FaInfoCircle
} from "react-icons/fa";
// Assurez-vous que le chemin vers ToastContext est correct
import { useToast } from "../../../context/ToastContext"; 

const API_BASE_URL = "http://127.00.1:8000";
const ITEMS_PER_PAGE = 25;
const MAX_SELECTION = 10; // Limite demandée

// Styles utilitaires
const s = {
    panel: "flex-1 flex flex-col border border-gray-300 bg-white rounded-lg shadow-sm overflow-hidden h-[600px]",
    panelHeader: "bg-gray-100 border-b border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 uppercase flex justify-between items-center",
    columnHeader: "flex items-center gap-2 px-2 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider",
    listContainer: "flex-1 overflow-y-auto custom-scrollbar bg-white relative",
    listItem: "group flex items-center gap-2 px-2 py-1.5 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors text-xs",
    select: "w-full text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500 py-1.5",
    label: "block text-[10px] font-bold text-gray-500 uppercase mb-1"
};

export default function DossierInscription() {
    const { addToast } = useToast();
    
    // --- ÉTATS LISTES DÉROULANTES ---
    const [anneesList, setAnneesList] = useState([]);
    const [institutionsList, setInstitutionsList] = useState([]);
    const [composantesList, setComposantesList] = useState([]);
    const [mentionsList, setMentionsList] = useState([]);

    // --- ÉTATS SÉLECTION LISTES DÉROULANTES ---
    const [selectedAnnee, setSelectedAnnee] = useState("");
    const [selectedInstitution, setSelectedInstitution] = useState("");
    const [selectedComposante, setSelectedComposante] = useState("");
    const [selectedMention, setSelectedMention] = useState("");

    // --- ÉTATS ÉTUDIANTS ---
    const [allStudents, setAllStudents] = useState([]); // Liste API paginée/recherchée
    const [targetStudents, setTargetStudents] = useState([]); // Liste de droite
    
    // PERSISTANCE DE LA SÉLECTION GAUCHE : Map<ID, Objet Etudiant>
    const [selectedSourceMap, setSelectedSourceMap] = useState(new Map());
    
    // SÉLECTION DROITE : Set<ID>
    const [checkedTarget, setCheckedTarget] = useState(new Set()); 
    
    const [searchSource, setSearchSource] = useState("");
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 1,
    });

    // =========================================================
    // 1. CHARGEMENT INITIAL & CASCADE (Inchangé)
    // =========================================================
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [rAnnees, rInst] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`),
                    fetch(`${API_BASE_URL}/api/institutions`)
                ]);
                if (rAnnees.ok) {
                    const data = await rAnnees.json();
                    setAnneesList(data);
                    if (data.length > 0) setSelectedAnnee(data[0].AnneeUniversitaire_annee); 
                }
                if (rInst.ok) setInstitutionsList(await rInst.json()); 
            } catch (e) { console.error(e); addToast("Erreur connexion serveur", "error"); }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        setComposantesList([]); setMentionsList([]); setSelectedComposante(""); setSelectedMention("");
        if (!selectedInstitution) return;
        fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${selectedInstitution}`)
            .then(res => res.json()).then(setComposantesList).catch(console.error);
    }, [selectedInstitution]);

    useEffect(() => {
        setMentionsList([]); setSelectedMention("");
        if (!selectedComposante) return;
        fetch(`${API_BASE_URL}/api/mentions/composante/${selectedComposante}`)
            .then(res => res.json()).then(setMentionsList).catch(console.error);
    }, [selectedComposante]);

    // =========================================================
    // 2. CHARGEMENT ÉTUDIANTS (Source)
    // =========================================================
    const fetchAllStudents = useCallback(async (page, limit, search) => {
        setIsLoadingStudents(true);
        try {
            const url = `${API_BASE_URL}/api/etudiants?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            const data = await res.json();
            setAllStudents(data.items || []);
            setPagination({ 
                page, limit, total: data.total || 0, pages: Math.ceil((data.total || 0) / limit) 
            });
        } catch (e) { setAllStudents([]); } 
        finally { setIsLoadingStudents(false); }
    }, []);

    useEffect(() => {
        fetchAllStudents(pagination.page, pagination.limit, searchSource);
    }, [pagination.page, searchSource, fetchAllStudents]);


    // =========================================================
    // 3. LOGIQUE SÉLECTION & TRANSFERT
    // =========================================================

    const targetIds = useMemo(() => new Set(targetStudents.map(s => s.Etudiant_id)), [targetStudents]);

    // Étudiants actuellement affichés dans l'API, mais qui ne sont pas déjà à droite
    const visibleApiStudents = useMemo(() => 
        allStudents.filter(s => !targetIds.has(s.Etudiant_id)), 
    [allStudents, targetIds]);
    
    // La liste des étudiants sélectionnés (Map)
    const stickyStudents = useMemo(() => Array.from(selectedSourceMap.values()), [selectedSourceMap]);

    // La liste principale à afficher (ceux de l'API non sélectionnés et non transférés)
    const mainListStudents = useMemo(() => 
        visibleApiStudents.filter(s => !selectedSourceMap.has(s.Etudiant_id)), 
    [visibleApiStudents, selectedSourceMap]);

    // --- Gestion du cochage à Gauche ---
    const toggleSourceSelection = (student) => {
        const newMap = new Map(selectedSourceMap);
        if (newMap.has(student.Etudiant_id)) {
            newMap.delete(student.Etudiant_id);
        } else {
            if (newMap.size >= MAX_SELECTION) {
                addToast(`Maximum ${MAX_SELECTION} étudiants sélectionnables à la fois.`, "warning");
                return;
            }
            newMap.set(student.Etudiant_id, student);
        }
        setSelectedSourceMap(newMap); // Déclenche le re-rendu de la zone sticky et du bouton
    };

    // --- Gestion du cochage à Droite ---
    const toggleTargetCheck = (id) => {
        const newSet = new Set(checkedTarget);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCheckedTarget(newSet);
    };

    const handleSelectAllVisible = () => {
        const newMap = new Map(selectedSourceMap);
        const visibleCheckedCount = visibleApiStudents.filter(s => newMap.has(s.Etudiant_id)).length;
        
        // Si tous les visibles sont déjà cochés -> on décoche les visibles
        if (visibleCheckedCount === visibleApiStudents.length && visibleApiStudents.length > 0) {
            visibleApiStudents.forEach(s => newMap.delete(s.Etudiant_id));
        } else {
            // Sinon on ajoute les visibles
            let freeSlots = MAX_SELECTION - newMap.size;
            if (freeSlots <= 0) {
                addToast("Limite de sélection atteinte.", "warning");
                return;
            }
            for (const s of visibleApiStudents) {
                if (!newMap.has(s.Etudiant_id)) {
                    if (freeSlots > 0) {
                        newMap.set(s.Etudiant_id, s);
                        freeSlots--;
                    }
                }
            }
        }
        setSelectedSourceMap(newMap);
    };

    // --- TRANSFERT GAUCHE -> DROITE ---
    const handleMoveRight = () => {
        if (!selectedMention) {
            addToast("Veuillez sélectionner une mention de destination.", "warning");
            return;
        }
        if (selectedSourceMap.size === 0) {
            addToast("Veuillez sélectionner au moins un étudiant à transférer.", "warning");
            return;
        }

        const toMove = Array.from(selectedSourceMap.values());
        
        // Ajout à la liste de droite
        setTargetStudents(prev => [...prev, ...toMove]);
        
        // Vider la Map de sélection (cela va désactiver le bouton de transfert à droite)
        setSelectedSourceMap(new Map()); 
        
        addToast(`${toMove.length} étudiant(s) transféré(s) à droite.`, "info");
        // NOTE: Le re-rendu de la liste source est géré par la mise à jour de targetStudents 
        // qui fait évoluer targetIds, ce qui filtre visibleApiStudents.
    };

    // --- TRANSFERT DROITE -> GAUCHE ---
    const handleMoveLeft = () => {
        if (checkedTarget.size === 0) return;
        
        // Étudiants à retirer de la liste cible
        const removedStudentsIds = checkedTarget;

        // On garde uniquement ceux qui NE SONT PAS cochés à droite
        const toKeep = targetStudents.filter(s => !removedStudentsIds.has(s.Etudiant_id));
        
        setTargetStudents(toKeep);
        setCheckedTarget(new Set()); // Réinitialisation
        
        addToast(`${removedStudentsIds.size} étudiant(s) retiré(s) de la liste d'inscription.`, "info");

        // NOTE: On ne fait rien avec allStudents/selectedSourceMap car les étudiants 
        // retirés de la liste targetStudents (à droite) réapparaîtront automatiquement
        // dans la liste allStudents/visibleApiStudents (à gauche) si la recherche est vide.
        // Si une recherche est en cours, ils réapparaîtront au prochain vidage de la recherche.
    };

    const handleSave = () => {
        setIsSaving(true);
        // Ici, vous devrez implémenter l'appel à votre route POST /inscriptions
        setTimeout(() => {
            addToast(`Simulation: ${targetStudents.length} étudiants inscrits avec succès dans la mention ${selectedMention} (${selectedAnnee}).`, "success");
            setIsSaving(false);
            setTargetStudents([]);
            setCheckedTarget(new Set());
            // Rafraichir la liste source après l'inscription
            fetchAllStudents(pagination.page, pagination.limit, searchSource);
        }, 800);
    };

    // =========================================================
    // 4. FORMATAGE ET RENDU
    // =========================================================

    const formatMatricule = (id) => {
        if (!id) return "-";
        const parts = id.split('_');
        if (parts.length >= 2 && parts[0].length >= 4) {
            // ...YY_XXXXXX
            return `...${parts[0].slice(-2)}_${parts[1]}`;
        }
        return id;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("fr-FR");
    };

    // --- COMPOSANT ROW ---
    const StudentRow = ({ etudiant, isChecked, onToggle, isTarget }) => (
        <div onClick={onToggle} className={`${s.listItem} ${isChecked ? (isTarget ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100") : ""}`}>
            <div className={`w-5 flex-shrink-0 text-sm ${isChecked ? (isTarget ? "text-red-500" : "text-blue-600") : "text-gray-300"}`}>
                {isChecked ? <FaCheckSquare /> : <FaSquare />}
            </div>
            {/* Formatage Matricule appliqué ici */}
            <div className="w-20 flex-shrink-0 font-mono text-gray-600 font-bold truncate text-[11px]" title={etudiant.Etudiant_id}>
                {formatMatricule(etudiant.Etudiant_id)}
            </div>
            <div className="flex-1 min-w-0">
                <span className="font-bold text-gray-800 uppercase truncate">{etudiant.Etudiant_nom}</span>
                <span className="text-gray-500 truncate capitalize text-[10px] ml-1">{etudiant.Etudiant_prenoms}</span>
            </div>
            <div className="w-24 flex-shrink-0 font-mono text-gray-600 text-[10px] text-center border-l border-gray-100 px-1">
                {etudiant.Etudiant_cin || "-"}
            </div>
            <div className="w-20 flex-shrink-0 text-gray-500 text-[10px] text-right border-l border-gray-100 px-1">
                {etudiant.Etudiant_naissance_date ? formatDate(etudiant.Etudiant_naissance_date) : `Vers ${etudiant.Etudiant_naissance_annee || "?"}`}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* --- ZONES DE FILTRES --- */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm grid grid-cols-4 gap-3">
                {/* Inputs Filtres */}
                <div>
                    <label className={s.label}>Année Universitaire</label>
                    <select value={selectedAnnee} onChange={e => setSelectedAnnee(e.target.value)} className={s.select}>
                        <option value="">- Sélectionner -</option>
                        {anneesList.map(a => <option key={a.AnneeUniversitaire_id} value={a.AnneeUniversitaire_annee}>{a.AnneeUniversitaire_annee}</option>)}
                    </select>
                </div>
                <div>
                    <label className={s.label}>Institution</label>
                    <select value={selectedInstitution} onChange={e => setSelectedInstitution(e.target.value)} className={s.select}>
                        <option value="">- Sélectionner -</option>
                        {institutionsList.map(i => <option key={i.Institution_id} value={i.Institution_id}>{i.Institution_nom}</option>)}
                    </select>
                </div>
                <div>
                    <label className={s.label}>Composante</label>
                    <select value={selectedComposante} onChange={e => setSelectedComposante(e.target.value)} className={s.select} disabled={!selectedInstitution}>
                        <option value="">{selectedInstitution ? "- Sélectionner -" : "..."}</option>
                        {composantesList.map(c => <option key={c.Composante_id} value={c.Composante_id}>{c.Composante_label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={`${s.label} text-blue-600`}>Mention (Destination)</label>
                    <select value={selectedMention} onChange={e => setSelectedMention(e.target.value)} className={`${s.select} bg-blue-50 border-blue-200 font-semibold text-blue-800`} disabled={!selectedComposante}>
                        <option value="">{selectedComposante ? "- Sélectionner Mention -" : "..."}</option>
                        {mentionsList.map(m => <option key={m.Mention_id} value={m.Mention_id}>{m.Mention_label}</option>)}
                    </select>
                </div>
            </div>

            {/* --- DOUBLE LISTE --- */}
            <div className="flex gap-3 flex-1 min-h-[400px]">
                
                {/* --- GAUCHE (SOURCE) --- */}
                <div className={s.panel}>
                    <div className={s.panelHeader}>
                        <span className="flex items-center gap-2"><FaUserGraduate className="text-gray-400"/> Source ({pagination.total})</span>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text" 
                                placeholder="Nom, ID ou CIN..." 
                                value={searchSource} 
                                onChange={e => setSearchSource(e.target.value)} 
                                className="px-2 py-0.5 text-xs border border-gray-300 rounded w-36 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <button onClick={handleSelectAllVisible} className="text-[10px] text-blue-600 hover:underline whitespace-nowrap">
                                Selection visible
                            </button>
                        </div>
                    </div>
                    <div className={s.columnHeader}>
                        <span className="w-5"></span><span className="w-20">Matricule</span><span className="flex-1">Nom</span><span className="w-24 text-center">CIN</span><span className="w-20 text-right">Date</span>
                    </div>

                    <div className={s.listContainer}>
                        {isLoadingStudents && <div className="p-4 text-center"><FaSpinner className="animate-spin inline text-blue-500"/></div>}
                        
                        {!isLoadingStudents && (
                            <>
                                {/* 1. ZONE STICKY (SELECTIONNÉS FIGÉS) */}
                                {stickyStudents.length > 0 && (
                                    <div className="sticky top-0 z-10 bg-blue-50/90 backdrop-blur-sm border-b-2 border-blue-200 shadow-sm">
                                        <div className="px-2 py-1 text-[9px] font-bold text-blue-800 uppercase flex justify-between items-center border-b border-blue-100">
                                            <span>Sélection en cours ({stickyStudents.length} / {MAX_SELECTION})</span>
                                            <span className="text-[9px] cursor-pointer hover:underline" onClick={() => setSelectedSourceMap(new Map())}>Tout effacer</span>
                                        </div>
                                        {stickyStudents.map(stu => (
                                            <StudentRow 
                                                key={stu.Etudiant_id} 
                                                etudiant={stu} 
                                                isChecked={true} 
                                                onToggle={() => toggleSourceSelection(stu)} 
                                                isTarget={false}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* 2. ZONE NORMALE (NON SÉLECTIONNÉS) */}
                                {mainListStudents.map(stu => (
                                    <StudentRow 
                                        key={stu.Etudiant_id} 
                                        etudiant={stu} 
                                        isChecked={false} 
                                        onToggle={() => toggleSourceSelection(stu)} 
                                        isTarget={false}
                                    />
                                ))}

                                {visibleApiStudents.length === 0 && !isLoadingStudents && (
                                    <div className="text-center py-10 text-gray-400 text-xs italic">
                                        <FaInfoCircle className="inline mr-1"/> Aucun étudiant trouvé.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    
                    {/* PAGINATION */}
                    <div className="flex justify-center gap-1 mt-auto py-1 border-t border-gray-100 bg-gray-50/50">
                        <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page === 1} className="p-1 px-2 text-xs border rounded hover:bg-gray-200 disabled:opacity-50"><FaChevronLeft/></button>
                        <span className="p-1 px-2 text-xs font-bold text-gray-600">Page {pagination.page} / {pagination.pages}</span>
                        <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page === pagination.pages} className="p-1 px-2 text-xs border rounded hover:bg-gray-200 disabled:opacity-50"><FaChevronRight/></button>
                    </div>
                </div>

                {/* --- BOUTONS CENTRAUX --- */}
                <div className="flex flex-col justify-center gap-2">
                    <button 
                        onClick={handleMoveRight} 
                        // Condition d'activation/désactivation du bouton de transfert droit
                        disabled={selectedSourceMap.size === 0 || !selectedMention} 
                        title={!selectedMention ? "Choisir une mention" : "Transférer les sélectionnés"}
                        className="p-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:opacity-30 transition-transform active:scale-95"
                    >
                        <FaChevronRight />
                    </button>
                    <button 
                        onClick={handleMoveLeft} 
                        // Condition d'activation/désactivation du bouton de retour gauche
                        disabled={checkedTarget.size === 0} 
                        title="Retirer les sélectionnés"
                        className="p-2 bg-white text-gray-600 border border-gray-300 rounded shadow hover:text-red-600 disabled:opacity-30 transition-transform active:scale-95"
                    >
                        <FaChevronLeft />
                    </button>
                </div>

                {/* --- DROITE (CIBLE) --- */}
                <div className={`${s.panel} border-blue-200`}>
                    <div className={`${s.panelHeader} bg-blue-50 text-blue-900`}>
                        <span className="flex items-center gap-2"><FaSave className="text-blue-400"/> À Inscrire ({targetStudents.length})</span>
                    </div>
                    <div className={s.columnHeader}>
                        <span className="w-5"></span><span className="w-20">Matricule</span><span className="flex-1">Nom</span><span className="w-24 text-center">CIN</span><span className="w-20 text-right">Date</span>
                    </div>
                    <div className={s.listContainer}>
                        {targetStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                                <FaFilter className="text-3xl opacity-20"/>
                                <span className="text-[10px] text-center px-4">Liste de destination vide.</span>
                            </div>
                        ) : (
                            targetStudents.map(stu => (
                                <StudentRow 
                                    key={stu.Etudiant_id} 
                                    etudiant={stu} 
                                    isChecked={checkedTarget.has(stu.Etudiant_id)} 
                                    onToggle={() => toggleTargetCheck(stu.Etudiant_id)} 
                                    isTarget={true}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving || targetStudents.length === 0 || !selectedMention || !selectedAnnee} 
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold text-sm rounded shadow hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                    {isSaving ? <FaSpinner className="animate-spin"/> : <FaSave />} Valider l'inscription
                </button>
            </div>
        </div>
    );
}