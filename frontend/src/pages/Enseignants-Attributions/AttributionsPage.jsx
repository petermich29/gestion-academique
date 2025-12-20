// frontend/src/pages/Enseignants-Attributions/AttributionsPage.jsx
import React, { useState, useEffect } from "react";
import { FaFilter, FaSpinner, FaUniversity, FaChalkboardTeacher, FaClock, FaSave, FaUndo } from "react-icons/fa";
import { TeacherSelector } from "./components/TeacherSelector";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function AttributionsPage() {
    
    // --- ETATS DE BASE (Les vôtres) ---
    const [filters, setFilters] = useState({
        annee: "", institution: "", composante: "", 
        mention: "", parcours: "", niveau: "", semestre: ""
    });

    const [options, setOptions] = useState({
        annees: [], institutions: [], composantes: [], 
        mentions: [], parcours: [], niveaux: [], semestres: []
    });

    const [matrix, setMatrix] = useState([]);
    const [teachersList, setTeachersList] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState(null);

    // --- NOUVEAUX ETATS POUR LA VALIDATION (Brouillon) ---
    const [pendingChanges, setPendingChanges] = useState({}); // Stocke les modifs locales
    const [isSaving, setIsSaving] = useState(false);

    // =========================================================
    // 1. LOGIQUE DE CASCADES (COPIE EXACTE DE VOTRE CODE)
    // =========================================================

    // 1. Chargement Initial
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [resA, resI, resT] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`),
                    fetch(`${API_BASE_URL}/api/institutions/`),
                    fetch(`${API_BASE_URL}/api/enseignants?limit=1000`)
                ]);
                
                const anneesData = await resA.json();
                const instData = await resI.json();
                const profsData = await resT.json();

                setOptions(prev => ({
                    ...prev,
                    annees: anneesData.map(a => ({ id: a.AnneeUniversitaire_id, label: a.AnneeUniversitaire_annee, active: a.AnneeUniversitaire_is_active })),
                    institutions: instData.map(i => ({ id: i.Institution_id, label: i.Institution_nom }))
                }));

                const activeAnnee = anneesData.find(a => a.AnneeUniversitaire_is_active);
                if (activeAnnee) setFilters(f => ({ ...f, annee: activeAnnee.AnneeUniversitaire_id }));
                
                setTeachersList(Array.isArray(profsData.items) ? profsData.items : []);
            } catch (err) {
                setError("Erreur de connexion au serveur.");
            }
        };
        loadInitial();
    }, []);

    // 2. Cascade Institution -> Composantes
    useEffect(() => {
        if (!filters.institution) return;
        fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${filters.institution}`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({
                    ...prev,
                    composantes: data.map(c => ({ id: c.Composante_id, label: c.Composante_label })),
                    mentions: [], parcours: [], niveaux: [], semestres: []
                }));
                setFilters(f => ({ ...f, composante: "", mention: "", parcours: "", niveau: "", semestre: "" }));
            });
    }, [filters.institution]);

    // 3. Cascade Composante -> Mentions
    useEffect(() => {
        if (!filters.composante) return;
        fetch(`${API_BASE_URL}/api/mentions/composante/${filters.composante}`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({
                    ...prev,
                    mentions: data.map(m => ({ id: m.Mention_id, label: m.Mention_label })),
                    parcours: [], niveaux: [], semestres: []
                }));
                setFilters(f => ({ ...f, mention: "", parcours: "", niveau: "", semestre: "" }));
            });
    }, [filters.composante]);

    // 4. Cascade Mention -> Parcours
    useEffect(() => {
        if (!filters.mention) return;
        fetch(`${API_BASE_URL}/api/parcours/mention/${filters.mention}`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({
                    ...prev,
                    parcours: data.map(p => ({ id: p.Parcours_id, label: p.Parcours_label })),
                    niveaux: [], semestres: []
                }));
                setFilters(f => ({ ...f, parcours: "", niveau: "", semestre: "" }));
            });
    }, [filters.mention]);

    // 5. Cascade Parcours -> Niveaux
    useEffect(() => {
        if (!filters.parcours) return;
        fetch(`${API_BASE_URL}/api/parcours/${filters.parcours}/niveaux`)
            .then(res => res.json())
            .then(data => {
                setOptions(prev => ({
                    ...prev,
                    niveaux: data.map(n => ({ id: n.Niveau_id || n.id_niveau, label: n.Niveau_label || n.label })),
                    semestres: []
                }));
                setFilters(f => ({ ...f, niveau: "", semestre: "" }));
            });
    }, [filters.parcours]);

    // 6. Cascade Niveau -> Semestres
    useEffect(() => {
        if (!filters.niveau) return;
        fetch(`${API_BASE_URL}/api/inscriptions/structure/semestres/${filters.niveau}`) 
            .then(res => {
                if (!res.ok) throw new Error("Erreur chargement semestres");
                return res.json();
            })
            .then(data => {
                setOptions(prev => ({
                    ...prev,
                    semestres: data.map(s => ({ id: s.id, label: s.label }))
                }));
                setFilters(f => ({ ...f, semestre: "" }));
            })
            .catch(err => console.error("Erreur semestres:", err));
    }, [filters.niveau]);


    // =========================================================
    // 2. LOGIQUE DE GESTION DE LA MATRICE ET VALIDATION
    // =========================================================

    // Fonction extraite pour pouvoir être appelée lors du refresh
    const fetchMatrix = async () => {
        if (!filters.annee || !filters.parcours || !filters.semestre) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/attributions/matrice?annee_id=${filters.annee}&parcours_id=${filters.parcours}&semestre_id=${filters.semestre}`);
            if (res.ok) {
                setMatrix(await res.json());
                setPendingChanges({}); // Reset des changements en attente après chargement
            }
        } catch (err) {
            console.error("Erreur matrice:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // 7. Chargement de la Matrice
    useEffect(() => {
        if (filters.annee && filters.parcours && filters.semestre) {
            fetchMatrix();
        } else {
            setMatrix([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.annee, filters.parcours, filters.semestre]);

    // --- GESTION LOCALE (Brouillon) ---
    const handleLocalAssign = (ecId, typeId, teacher) => {
        const key = `${ecId}_${typeId}`;
        setPendingChanges(prev => ({
            ...prev,
            [key]: {
                maquette_ec_id: ecId,
                type_enseignement_id: typeId,
                teacher: teacher, // Pour l'affichage immédiat
                enseignant_id: teacher ? teacher.Enseignant_id : null // Pour l'envoi API
            }
        }));
    };

    const handleCancelChanges = () => {
        if (window.confirm("Annuler toutes les modifications non sauvegardées ?")) {
            setPendingChanges({});
        }
    };

    // --- GESTION SAUVEGARDE GLOBALE ---
    const saveAllChanges = async () => {
        setIsSaving(true);
        try {
            const promises = Object.values(pendingChanges).map(change => 
                fetch(`${API_BASE_URL}/api/attributions/assign`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        maquette_ec_id: change.maquette_ec_id,
                        type_enseignement_id: change.type_enseignement_id,
                        enseignant_id: change.enseignant_id
                    })
                })
            );

            await Promise.all(promises);
            await fetchMatrix(); // Recharger les données depuis le serveur
            alert("Répartition enregistrée avec succès !");
        } catch (error) {
            console.error("Erreur sauvegarde", error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helpers d'affichage
    const getDisplayTeacher = (slot, ecId) => {
        const key = `${ecId}_${slot.type_id}`;
        
        // 1. Si on a une modification locale (en attente)
        if (pendingChanges[key] !== undefined) {
            // On retourne l'objet enseignant complet tel qu'il est dans teachersList
            // pour que TeacherSelector puisse le normaliser lui-même
            return pendingChanges[key].teacher; 
        }
        
        // 2. Sinon, si on a un enseignant déjà enregistré en base
        if (slot.enseignant_id) {
            // On crée un objet compatible avec la normalisation de TeacherSelector
            return { 
                enseignant_id: slot.enseignant_id, 
                enseignant_nom: slot.enseignant_nom,
                enseignant_photo: slot.enseignant_photo,
                // On ajoute les autres champs pour les badges de statut
                enseignant_statut: slot.enseignant_statut,
                enseignant_affiliation: slot.enseignant_affiliation
            };
        }
        
        return null;
    };

    const isSlotModified = (slot, ecId) => {
        return pendingChanges[`${ecId}_${slot.type_id}`] !== undefined;
    };

    const hasChanges = Object.keys(pendingChanges).length > 0;

    // Composant Filtre (Votre version)
    const FilterItem = ({ label, name, optionsList, disabled }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
            <select 
                className="border border-gray-200 rounded-md p-2 text-sm bg-white disabled:bg-gray-50 shadow-sm"
                value={filters[name]}
                onChange={e => setFilters(prev => ({ ...prev, [name]: e.target.value }))}
                disabled={disabled}
            >
                <option value="">-- Choisir --</option>
                {optionsList.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
        </div>
    );

    return (
        <div className="mt-4 pb-20 relative">
            
            {/* --- BOUTON FLOTTANT DE VALIDATION --- */}
            {hasChanges && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white p-4 rounded-xl shadow-2xl border border-blue-100 animate-bounce-in">
                    <div className="text-sm font-bold text-gray-700">
                        {Object.keys(pendingChanges).length} modification(s) en attente
                    </div>
                    <button 
                        onClick={handleCancelChanges}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-medium text-sm flex items-center gap-2"
                    >
                        <FaUndo size={12} /> Annuler
                    </button>
                    <button 
                        onClick={saveAllChanges}
                        disabled={isSaving}
                        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-2"
                    >
                        {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        Valider
                    </button>
                </div>
            )}

            {/* --- FILTRES --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center gap-2 mb-6 text-blue-800 font-bold border-b pb-2">
                    <FaFilter className="text-blue-500" />
                    <span>Filtres de répartition</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FilterItem label="Année" name="annee" optionsList={options.annees} />
                    <FilterItem label="Institution" name="institution" optionsList={options.institutions} />
                    <FilterItem label="Composante" name="composante" optionsList={options.composantes} disabled={!filters.institution} />
                    <FilterItem label="Mention" name="mention" optionsList={options.mentions} disabled={!filters.composante} />
                    <FilterItem label="Parcours" name="parcours" optionsList={options.parcours} disabled={!filters.mention} />
                    <FilterItem label="Niveau" name="niveau" optionsList={options.niveaux} disabled={!filters.parcours} />
                    <FilterItem label="Semestre" name="semestre" optionsList={options.semestres} disabled={!filters.niveau} />
                </div>
            </div>

            {/* --- CONTENU MATRICE --- */}
            {isLoading ? (
                <div className="text-center py-20"><FaSpinner className="animate-spin text-3xl mx-auto text-blue-600" /></div>
            ) : filters.semestre && matrix.length > 0 ? (
                <div className="space-y-8">
                    {matrix.map(ue => (
                        <div key={ue.ue_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Header UE */}
                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{ue.ue_label}</h3>
                                    <span className="text-xs text-gray-500 font-mono uppercase bg-gray-200 px-2 py-0.5 rounded">{ue.ue_code}</span>
                                </div>
                                <div className="text-sm text-gray-500">UE Crédits: <span className="font-bold text-gray-800">{ue.ue_credits || "?"}</span></div>
                            </div>

                            {/* Liste ECs */}
                            <div className="divide-y divide-gray-100">
                                {ue.ecs.map(ec => (
                                    <div key={ec.ec_id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex flex-col xl:flex-row gap-6">
                                            {/* Info EC */}
                                            <div className="xl:w-1/4 min-w-[250px]">
                                                <div className="font-semibold text-gray-800">{ec.ec_label}</div>
                                                <div className="text-xs text-gray-400 mb-2">{ec.ec_code}</div>
                                                <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                                    <FaClock size={10} />
                                                    <span>Total: {ec.total_heures || 0}h</span>
                                                </div>
                                            </div>

                                            {/* Grille Slots */}
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {ec.slots.map(slot => {
                                                    const displayTeacher = getDisplayTeacher(slot, ec.ec_id);
                                                    const isModified = isSlotModified(slot, ec.ec_id);

                                                    // Récupération des données étendues (depuis le slot API ou le pending change)
                                                    const teacherStatut = displayTeacher?.statut || slot.enseignant_statut;
                                                    const teacherAffiliation = displayTeacher?.affiliation || slot.enseignant_affiliation;
                                                    // Détermination couleur badge
                                                    // "CM" ou "TYEN_CM", on vérifie grossièrement la string
                                                    const typeStr = (slot.type_id || "").toUpperCase();
                                                    let badgeColor = "bg-teal-500"; // Défaut (TP/Autre)
                                                    if (typeStr.includes("CM")) badgeColor = "bg-purple-500";
                                                    else if (typeStr.includes("TD")) badgeColor = "bg-orange-500";

                                                    return (
                                                        <div key={`${ec.ec_id}-${slot.type_id}`} 
                                                             className={`bg-white border rounded-lg p-3 shadow-sm relative transition-all
                                                             ${isModified ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-200'}`}
                                                        >
                                                            {/* Label Modification */}
                                                            {isModified && (
                                                                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm font-bold z-10">
                                                                    Modifié
                                                                </div>
                                                            )}

                                                            <div className="flex justify-between items-center mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap ${badgeColor}`}>
                                                                        {slot.type_label || slot.type_id}
                                                                    </span>
                                                                    {/* BADGE STATUT */}
                                                                    {teacherStatut === 'PERM' ? (
                                                                        teacherAffiliation ? (
                                                                            <div className="text-[10px] text-gray-500 italic flex items-center gap-1 leading-tight animate-fadeIn">
                                                                                <FaUniversity className="shrink-0 text-blue-400/60" size={10} />
                                                                                <span className="truncate" title={teacherAffiliation}>{teacherAffiliation}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[9px] text-gray-400 italic">Affiliation non renseignée</span>
                                                                        )
                                                                    ) : teacherStatut === 'VAC' ? (
                                                                        <div className="text-[10px] text-amber-600/80 flex items-center gap-1 font-medium">
                                                                            <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                                                            Prestataire externe (Vacataire)
                                                                        </div>
                                                                    ) : null}
                                                                    <span className="text-xs text-gray-500 font-medium">{slot.heures}h</span>
                                                                </div>
                                                                {displayTeacher && (
                                                                    <FaChalkboardTeacher className={`${isModified ? 'text-orange-500' : 'text-green-500'} text-xs`} />
                                                                )}
                                                            </div>

                                                            <TeacherSelector 
                                                                teachersList={teachersList}
                                                                selectedTeacher={displayTeacher}
                                                                // On modifie l'état LOCAL (pendingChanges)
                                                                onSelect={(t) => handleLocalAssign(ec.ec_id, slot.type_id, t)}
                                                            />

                                                            {/* AFFICHAGE AFFILIATION */}
                                                            {teacherStatut === 'PERM' && teacherAffiliation && (
                                                                <div className="mt-2 text-[10px] text-gray-500 italic flex items-center gap-1 leading-tight">
                                                                    <FaUniversity className="shrink-0 text-gray-400" size={8} />
                                                                    <span className="truncate">{teacherAffiliation}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {ec.slots.length === 0 && <span className="text-xs text-gray-300 italic">Aucun volume défini.</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FaUniversity className="text-4xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">En attente de sélection</p>
                </div>
            )}
        </div>
    );
}