import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// L'URL de base de votre API FastAPI.
const API_URL = "http://127.0.0.1:8000/api";

// --- Définitions des icônes SVG internes ---

const LibraryIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
    <line x1="6" y1="7" x2="18" y2="7"></line>
    <line x1="6" y1="12" x2="18" y2="12"></line>
    <line x1="6" y1="17" x2="18" y2="17"></line>
  </svg>
);

const ThIcon = (props) => ( // Grid (Vue Miniature)
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 11H2V9h2v2zm0-4H2V5h2v2zm0-4H2V1h2v2zm4 8H6V9h2v2zm0-4H6V5h2v2zm0-4H6V1h2v2zm4 8h-2V9h2v2zm0-4h-2V5h2v2zm0-4h-2V1h2v2zm4 8h-2V9h2v2zm0-4h-2V5h2v2zm0-4h-2V1h2v2z"/>
    </svg>
);

// NOUVELLE ICÔNE DE LISTE (Plus standard et jolie)
const ListIcon = (props) => ( 
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
);

const PlusIcon = (props) => ( // Plus
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const EditIcon = (props) => ( // Edit
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
);

const SpinnerIcon = (props) => ( // Spinner
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
);

const TrashIcon = (props) => ( // Trash
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

// Icône de tri qui tourne selon l'ordre
const SortIcon = ({ order, ...props }) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" 
        style={{ transform: order === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
        <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
    </svg>
);

// --- Fin des définitions des icônes SVG internes ---

// Regex pour extraire le numéro : INST_0002 -> 0002
const ID_REGEX = /INST_(\d+)/;

/**
 * Calcule le prochain ID séquentiel basé sur le dernier ID trouvé.
 */
const getNextId = (lastId) => {
    if (!lastId) return "INST_0001";
    
    const match = lastId.match(ID_REGEX);
    if (!match) return "INST_0001"; 

    const lastNumber = parseInt(match[1], 10);
    const nextNumber = lastNumber + 1;
    const nextNumberFormatted = String(nextNumber).padStart(4, '0');
    
    return `INST_${nextNumberFormatted}`;
};


const Administration = () => {
    // État pour la liste des institutions
    const [institutions, setInstitutions] = useState([]);
    // État pour garder une trace du dernier ID pour la création séquentielle
    const [lastInstitutionId, setLastInstitutionId] = useState(""); 
    // État pour le champ de recherche
    const [search, setSearch] = useState("");
    // État pour basculer entre 'grid' (miniatures) et 'list'
    const [view, setView] = useState("grid");
    // État pour l'ouverture et la fermeture du modal de formulaire
    const [modalOpen, setModalOpen] = useState(false);
    // État pour le chargement initial des données
    const [isLoading, setIsLoading] = useState(true);
    // État pour indiquer une soumission en cours (pour désactiver les boutons)
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // États pour le tri: champ et ordre
    const [sortField, setSortField] = useState("nom"); // nom (Institution_nom) ou code (Institution_code)
    const [sortOrder, setSortOrder] = useState("asc"); // asc ou desc
    
    // ÉTAT DU FORMULAIRE (pour création ou édition)
    const [form, setForm] = useState({
        id: "", // Institution_id
        code: "", // Institution_code
        nom: "", // Institution_nom
        type: "", // Institution_type
        abbreviation: "", // Institution_abbreviation
        description: "", // Institution_description
        logo: null, // Fichier logo pour l'upload
        logoPath: "", // Chemin du logo existant
    });
    
    // État pour les erreurs de validation
    const [errors, setErrors] = useState({});
    // L'institution en cours d'édition (null si c'est une création)
    const [editInstitution, setEditInstitution] = useState(null);
    
    // États pour la fonctionnalité de glisser-déposer (drag) du modal
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [modalPos, setModalPos] = useState({ top: 50, left: 0 });

    const navigate = useNavigate();
    // Contexte pour mettre à jour le fil d'Ariane
    const { setBreadcrumb } = useOutletContext() || {}; 
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    const typesInstitution = ["PRIVE", "PUBLIC"];
    
    // ------------------ Chargement des données et dernier ID ------------------

    useEffect(() => {
        // Mise à jour du fil d'Ariane
        if (setBreadcrumb)
            setBreadcrumb([{ label: "Administration", path: "/administration" }]);

        setIsLoading(true);
        
        const fetchInstitutions = async () => {
            try {
                const res = await fetch(`${API_URL}/institutions`);
                if (!res.ok) {
                    const errorDetails = await res.json().catch(() => ({ detail: `Erreur serveur ${res.status}` }));
                    console.error("Erreur HTTP:", res.status, errorDetails.detail);
                    setInstitutions([]); 
                    return; 
                }

                const data = await res.json();
                const list = Array.isArray(data) ? data : [];
                setInstitutions(list);
                
                // Trouver l'ID le plus grand pour la séquence
                if (list.length > 0) {
                    const maxId = list.reduce((max, current) => {
                        if (current.Institution_id && ID_REGEX.test(current.Institution_id)) {
                            const currentNum = parseInt(current.Institution_id.match(ID_REGEX)[1], 10);
                            const maxNum = max ? parseInt(max.match(ID_REGEX)[1], 10) : 0;
                            return currentNum > maxNum ? current.Institution_id : max;
                        }
                        return max;
                    }, "");
                    setLastInstitutionId(maxId);
                }
            } catch (err) {
                console.error("Erreur de connexion/réseau:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInstitutions();
    }, [setBreadcrumb]);

    // ------------------ Fonctions du Modal ------------------

    const closeModal = () => {
        setModalOpen(false);
        setEditInstitution(null);
        // Réinitialisation complète du formulaire après fermeture
        setForm({ id: "", code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: "" }); 
        setErrors({});
    };

    const openModal = (inst = null) => {
        // Calculer une position centrale par défaut pour le modal
        const centerX = window.innerWidth / 2 - 250; 
        setModalPos({ top: 50, left: centerX > 0 ? centerX : 20 });

        if (inst) {
            // Mode Édition
            setForm({
                id: inst.Institution_id || "",
                code: inst.Institution_code || "", 
                nom: inst.Institution_nom || "",
                type: inst.Institution_type || "",
                abbreviation: inst.Institution_abbreviation || "",
                description: inst.Institution_description || "",
                logo: null,
                logoPath: inst.Institution_logo_path || "",
            });
        } else {
            // Mode Création : génération du nouvel ID
            const newId = getNextId(lastInstitutionId);

            setForm({
                id: newId, 
                code: "", 
                nom: "",
                type: "",
                abbreviation: "",
                description: "",
                logo: null,
                logoPath: "",
            });
        }

        setErrors({});
        setEditInstitution(inst);
        setModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
        // Effacer l'erreur de validation pour le champ modifié
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };
    
    // ------------------ Logique du Drag du Modal ------------------

    const handleMouseMove = useCallback((e) => {
        if (!dragging || !modalRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = modalRef.current;
        
        let left = e.clientX - dragOffset.x;
        let top = e.clientY - dragOffset.y;

        // Limiter le mouvement à l'intérieur de la fenêtre
        left = Math.max(0, Math.min(window.innerWidth - w, left));
        top = Math.max(0, Math.min(window.innerHeight - h, top));
        
        setModalPos({ top, left });
    }, [dragging, dragOffset.x, dragOffset.y]);

    const handleMouseUp = useCallback(() => setDragging(false), []);

    const handleMouseDown = (e) => {
        if (!modalRef.current) return;
        // Vérifier si le clic vient bien de la poignée de glissement
        const isHeaderClick = e.target.closest('.modal-drag-handle');
        if (!isHeaderClick) return;

        const rect = modalRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setDragging(true);
    };

    // Ajout et suppression des écouteurs d'événements pour le glisser-déposer
    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, handleMouseMove, handleMouseUp]);

    // ------------------ Soumission du Formulaire (CRUD) ------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validation côté client
        const newErrors = {};
        if (!form.code.trim()) newErrors.code = "Le code est obligatoire.";
        if (!form.nom.trim()) newErrors.nom = "Le nom est obligatoire.";
        if (!form.type.trim()) newErrors.type = "Le type est obligatoire.";
        
        setErrors(newErrors);
        if (Object.keys(newErrors).length) {
            setIsSubmitting(false);
            return;
        }

        // Construction du FormData pour gérer l'upload de fichiers
        const formData = new FormData();
        
        // Mappage des champs React vers les arguments attendus par FastAPI
        Object.entries({
            id_institution: form.id,
            code: form.code,
            nom: form.nom,
            type_institution: form.type,
            abbreviation: form.abbreviation, 
            description: form.description,
        }).forEach(([k, v]) => {
            if (v !== undefined) {
                // S'assurer d'envoyer une chaîne, même pour les champs optionnels vides
                formData.append(k, (typeof v === 'string' ? v.trim() : v) || ""); 
            }
        });

        // Ajouter le fichier logo s'il a été sélectionné
        if (form.logo) formData.append("logo_file", form.logo);

        try {
            const method = editInstitution ? "PUT" : "POST";
            const res = await fetch(`${API_URL}/institutions`, {
                method: method,
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                const errObj = {};
                
                // Gestion des erreurs spécifiques du backend (ex: nom/code déjà utilisé)
                if (typeof errData.detail === "string") {
                    if (errData.detail.includes("L'ID institution")) {
                        errObj.id = "L'ID généré est déjà utilisé. Veuillez recharger la page.";
                    } else if (errData.detail.includes("Le nom")) {
                        errObj.nom = "Ce nom d'institution existe déjà.";
                    } else if (errData.detail.includes("Le code")) {
                        errObj.code = "Ce code d'institution est déjà utilisé.";
                    } else {
                        // Utiliser une boîte de dialogue personnalisée au lieu d'alert()
                        console.error(`Erreur ${method === 'POST' ? 'création' : 'modification'} : ${errData.detail}`);
                        // Fallback simple:
                        window.alert(`Erreur lors de la ${method === 'POST' ? 'création' : 'modification'} : ${errData.detail}`);
                    }
                } else {
                    // Erreur de validation Pydantic (si non gérée ci-dessus)
                    console.error("Erreur de validation", errData.detail);
                    window.alert("Erreur de validation: Veuillez vérifier tous les champs.");
                }
                setErrors(errObj);
                setIsSubmitting(false);
                return;
            }

            const newInst = await res.json();

            // Mise à jour de l'état local des institutions
            setInstitutions((prev) =>
                editInstitution
                    ? prev.map((i) =>
                        i.Institution_id === editInstitution.Institution_id ? newInst : i
                      )
                    : [...prev, newInst]
            );
            
            // Mise à jour du dernier ID après insertion réussie
            if (!editInstitution) {
                setLastInstitutionId(newInst.Institution_id);
            }

            closeModal(); 
        } catch (err) {
            console.error("Erreur de connexion au serveur", err);
            // Utiliser une boîte de dialogue personnalisée au lieu d'alert()
            window.alert("Erreur de connexion au serveur : " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Fonction de suppression
    const handleDelete = async (institutionId) => {
        // Utiliser un modal personnalisé au lieu de window.confirm()
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette institution ? Cette action est irréversible.")) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/institutions/${institutionId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errData = await res.json();
                // Utiliser un modal personnalisé au lieu d'alert()
                window.alert(`Erreur lors de la suppression: ${errData.detail}`);
                return;
            }

            // Supprimer l'institution de l'état local
            setInstitutions((prev) => 
                prev.filter((i) => i.Institution_id !== institutionId)
            );
            
        } catch (err) {
            console.error("Erreur de connexion au serveur", err);
            // Utiliser un modal personnalisé au lieu d'alert()
            window.alert("Erreur de connexion au serveur lors de la suppression.");
        }
    };

    // ------------------ Logique de Tri ------------------
    const sortInstitutions = (data) => {
        return [...data].sort((a, b) => {
            let fieldA, fieldB;

            // Déterminer les champs de comparaison
            if (sortField === 'code') {
                fieldA = a.Institution_code || "";
                fieldB = b.Institution_code || "";
            } else { // 'nom'
                fieldA = a.Institution_nom || "";
                fieldB = b.Institution_nom || "";
            }

            // Tri alphabétique sensible à la locale pour le français
            const comparison = fieldA.localeCompare(fieldB, 'fr', { sensitivity: 'base' });

            // Appliquer l'ordre (ascendant ou descendant)
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    };


    // ------------------ Rendu ------------------

    // 1. Filtrage (recherche)
    const filtered = institutions.filter((inst) =>
        (inst.Institution_nom + ' ' + (inst.Institution_code || '') + ' ' + (inst.Institution_abbreviation || '')).toLowerCase().includes(search.toLowerCase())
    );
    
    // 2. Tri
    const filteredSorted = sortInstitutions(filtered);


    if (isLoading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-gray-500">
                <SpinnerIcon className="animate-spin text-4xl mb-4" />
                <p>Chargement des institutions...</p>
            </div>
        );
    }

    /**
     * Composant individuel pour l'affichage d'une institution (Grille ou Liste)
     */
    const InstitutionItem = ({ inst, grid = true }) => {
        // Redirection vers la page de détails (si elle existe)
        const handleClick = () =>
            navigate(`/institution/${inst.Institution_id}`);

        const commonClass = "cursor-pointer transition relative";
        
        // Styles spécifiques à la vue Grille
        const baseGrid = "p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:shadow-lg hover:bg-blue-50 duration-200 min-h-52";
        // Styles spécifiques à la vue Liste
        const baseList = "flex items-center gap-3 p-2 bg-white rounded shadow hover:shadow-md hover:bg-blue-50 duration-200"; 

        return (
            <motion.div 
                layout // Permet l'animation de transition lors du changement de vue
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`${commonClass} ${grid ? baseGrid : baseList}`}
            >
                {/* Conteneur pour le clic sur la carte, ajusté selon la vue */}
                <div onClick={handleClick} className={`flex w-full ${grid ? 'flex-col items-center' : 'flex-row items-center gap-3'}`}>
                    
                    {/* LOGO */}
                    {inst.Institution_logo_path ? (
                        <img
                            src={`http://127.0.0.1:8000${inst.Institution_logo_path}`}
                            alt={`Logo de ${inst.Institution_nom}`}
                            className={grid ? "w-20 h-20 object-cover mb-2 rounded-full border border-gray-200" : "w-12 h-12 object-cover rounded-full border border-gray-200 flex-shrink-0"}
                        />
                    ) : (
                        <LibraryIcon 
                            className={grid ? "w-20 h-20 text-gray-700 mb-2" : "w-12 h-12 text-gray-700 flex-shrink-0"} />
                    )}
                    
                    {/* TEXT CONTENT */}
                    <div className={grid ? "text-center w-full" : "flex-1 min-w-0"}> 
                        <p className={`text-base font-semibold text-gray-800 break-words ${grid ? '' : 'truncate'}`}>{inst.Institution_nom}</p>
                        
                        <p className="text-gray-600 text-sm truncate">
                            {inst.Institution_type} {inst.Institution_abbreviation && `(${inst.Institution_abbreviation})`}
                        </p>
                        <p className="text-gray-500 text-xs">Code: {inst.Institution_code}</p>
                    </div>
                </div>
                {/* Boutons Éditer et Supprimer */}
                <div className={`flex gap-1 absolute ${grid ? 'top-2 right-2' : 'right-2'}`}>
                    <EditIcon
                        className="text-blue-600 hover:text-blue-800 cursor-pointer p-1 rounded hover:bg-white z-10"
                        onClick={(e) => { e.stopPropagation(); openModal(inst); }}
                    />
                    <TrashIcon
                        className="text-red-600 hover:text-red-800 cursor-pointer p-1 rounded hover:bg-white z-10"
                        onClick={(e) => { e.stopPropagation(); handleDelete(inst.Institution_id); }}
                    />
                </div>
            </motion.div>
        );
    };

    /**
     * Composant de bouton "Ajouter une institution" (pour Grille ou Liste)
     */
    const AddInstitutionButton = ({ grid = true }) => (
        <div
            onClick={() => openModal()}
            className={`cursor-pointer h-full ${
                grid
                    // Vue Grille: Aligné sur la hauteur de la carte (min-h-52)
                    ? "p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-center min-h-52"
                    // Vue Liste: Compacte
                    : "flex items-center gap-4 p-2 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
            }`}
        >
            <div className={grid ? "w-20 h-20 flex items-center justify-center rounded-full bg-blue-100" : "w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 flex-shrink-0"}>
                <PlusIcon className={grid ? "text-blue-600 text-2xl" : "text-blue-600"} />
            </div>
            <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <h2 className="text-xl font-semibold">Institutions ({filteredSorted.length})</h2>
                <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
                    
                    {/* Barre de recherche */}
                    <input
                        type="text"
                        placeholder="Rechercher (Nom, Code, Abréviation)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border rounded px-3 py-1 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    
                    {/* Contrôle de tri */}
                    <div className="flex items-center gap-2 border rounded px-3 py-1 bg-white">
                        <span className="font-semibold text-sm text-gray-600">Tri :</span>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value)}
                            className="border-none bg-transparent px-2 py-1 text-sm focus:outline-none"
                        >
                            <option value="nom">Nom</option>
                            <option value="code">Code</option>
                        </select>
                        <button 
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="text-gray-700 hover:text-blue-600 transition p-1"
                            title={sortOrder === 'asc' ? "Trier par ordre décroissant" : "Trier par ordre croissant"}
                        >
                            <SortIcon className="text-sm" order={sortOrder} />
                        </button>
                    </div>

                    {/* BOUTON BASCULE VUE (Icône seule) */}
                    <button
                        onClick={() => setView(view === "grid" ? "list" : "grid")}
                        className="p-2 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center transition-colors text-sm"
                        title={view === "grid" ? "Passer à la vue liste" : "Passer à la vue miniatures"}
                    >
                        {view === "grid" ? (
                            <ListIcon className="text-base" />
                        ) : (
                            <ThIcon className="text-base" />
                        )}
                    </button>
                    
                </div>
            </div>

            <hr className="border-t border-gray-300" />

            {/* LISTE / GRID AFFICHAGE */}
            {filteredSorted.length === 0 && search.length === 0 ? (
                // Pas d'institutions
                <div className="flex flex-col gap-3">
                    <AddInstitutionButton grid />
                    <p className="text-gray-500 mt-2">Aucune institution disponible pour le moment.</p>
                </div>
            ) : view === "grid" ? (
                // Vue Grille
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AddInstitutionButton grid />
                    {/* Utilisation de motion.div pour l'animation de layout (tri/changement de vue) */}
                    {filteredSorted.map((inst) => (
                        <InstitutionItem key={inst.Institution_id} inst={inst} grid />
                    ))}
                </div>
            ) : (
                // Vue Liste
                <div className="flex flex-col gap-2">
                    <AddInstitutionButton grid={false} />
                    {filteredSorted.map((inst) => (
                        <InstitutionItem key={inst.Institution_id} inst={inst} grid={false} />
                    ))}
                </div>
            )}

            {/* MODAL de Formulaire (Création/Édition) */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div 
                        // Fermer le modal si on clique en dehors du contenu
                        onClick={(e) => e.target.classList.contains('fixed') && closeModal()} 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-start justify-center pt-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 z-50 overflow-hidden"
                            // Styles pour rendre le modal déplacable
                            style={{ top: modalPos.top, left: modalPos.left, position: "absolute", cursor: dragging ? "grabbing" : "grab" }}
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } }}
                            exit={{ y: -50, opacity: 0 }}
                        >
                            {/* Poignée de glissement */}
                            <h2 
                                className="modal-drag-handle text-xl font-bold p-4 border-b bg-gray-50 text-gray-800 cursor-grab" 
                                onMouseDown={handleMouseDown}
                            >
                                {editInstitution ? "Modifier Institution" : "Nouvelle Institution"}
                            </h2>
                            
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                                {/* LOGO/IMAGE PREVIEW */}
                                <div className="flex flex-col items-center">
                                    <div className="w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mb-2 cursor-pointer ring-2 ring-gray-300 hover:ring-blue-400 transition duration-150"
                                        onClick={() => fileInputRef.current.click()}>
                                        {form.logo ? (
                                            // Aperçu du nouveau fichier sélectionné
                                            <img src={URL.createObjectURL(form.logo)} alt="Logo Preview" className="w-full h-full object-cover"/>
                                        ) : form.logoPath ? (
                                            // Affichage du logo existant
                                            <img src={`http://127.0.0.1:8000${form.logoPath}`} alt="Existing Logo" className="w-full h-full object-cover"/>
                                        ) : (
                                            // Placeholder si aucun logo
                                            <PlusIcon className="text-gray-400 text-5xl"/>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" name="logo" ref={fileInputRef} onChange={handleChange} className="hidden"/>
                                    <p className="text-xs text-gray-500">Cliquer pour changer le logo</p>
                                </div>

                                {/* ID - NON ÉDITABLE */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">ID Institution (généré)</span>
                                    <input type="text" name="id" placeholder="ID (identifiant unique)" value={form.id} 
                                        className={`p-2 border rounded focus:outline-none bg-gray-100 text-gray-600 ${errors.id ? "border-red-500" : ""}`} 
                                        disabled={true}/> 
                                    {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
                                </label>
                                
                                {/* CODE */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">Code (ex: UNIFIV)</span>
                                    <input type="text" name="code" placeholder="Code (ex: UNIFIV)" value={form.code} onChange={handleChange} 
                                        className={`p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.code ? "border-red-500" : ""}`}/>
                                    {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                                </label>


                                {/* Nom */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">Nom</span>
                                    <input type="text" name="nom" placeholder="Nom complet de l'Institution" value={form.nom} onChange={handleChange} 
                                        className={`p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.nom ? "border-red-500" : ""}`}/>
                                    {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
                                </label>

                                {/* Type */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">Type</span>
                                    <select name="type" value={form.type} onChange={handleChange} 
                                        className={`p-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.type ? "border-red-500" : ""}`}>
                                        <option value="">-- Sélectionner le type --</option>
                                        {typesInstitution.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
                                </label>

                                {/* Abbréviation */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">Abbréviation (Optionnel)</span>
                                    <input type="text" name="abbreviation" placeholder="Sigle / Abbréviation (ex: FS)" value={form.abbreviation} onChange={handleChange} 
                                        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                                </label>

                                {/* Description */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-700">Description (Optionnel)</span>
                                    <textarea name="description" placeholder="Description de l'institution" value={form.description} onChange={handleChange} 
                                        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-24"/>
                                </label>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={closeModal} 
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-150"
                                        disabled={isSubmitting}>Annuler</button>
                                    <button type="submit" 
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 flex items-center justify-center gap-2"
                                        disabled={isSubmitting}>
                                        {isSubmitting ? <SpinnerIcon className="animate-spin" /> : null}
                                        {editInstitution ? "Modifier" : "Créer"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Administration;