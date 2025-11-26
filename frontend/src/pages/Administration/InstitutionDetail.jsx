// frontend/src/pages/Administration/InstitutionDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { BiSolidInstitution } from "react-icons/bi";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { FaTh, FaList, FaPlus, FaChevronLeft, FaChevronRight, FaSpinner, FaSortAlphaDown, FaSortAlphaUp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// L'URL de votre API FastAPI
const API_BASE_URL = "http://127.0.0.1:8000";

// Variantes d'animation pour Framer Motion
const headerVariants = {
  slide: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  },
  fade: { 
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

// ------------------ Composant Principal ------------------

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  // États pour les données et le statut de la requête
  const [institution, setInstitution] = useState(null);
  const [composantes, setComposantes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); 

  // États pour l'interface utilisateur
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label"); // Tri par défaut sur le label
  const [sortOrder, setSortOrder] = useState("asc");

  // États pour la navigation Précédent/Suivant
  const [institutionsList, setInstitutionsList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [animationType, setAnimationType] = useState("fade");

  // ------------------ Fonctions utilitaires ------------------

  /**
   * Récupère la valeur d'un champ en gérant les conventions de nommage (Institution_xxx, Composante_xxx).
   * @param {object} obj L'objet Institution ou Composante.
   * @param {string} field Le nom du champ recherché ('nom', 'code', 'type', 'abbreviation', etc.).
   */
  const getField = useCallback((obj, field) => {
    // Cas spécifiques pour les Composantes
    if (field === 'nom') return obj?.Composante_label ?? obj?.[`Institution_nom`] ?? "";
    if (field === 'code') return obj?.Composante_code ?? "";
    // ✅ Correction: Ajout de l'abréviation des composantes
    if (field === 'abbreviation') return obj?.Composante_abbreviation ?? obj?.Institution_abbreviation ?? ""; 
    if (field === 'description') return obj?.Composante_description ?? obj?.Institution_description ?? "";
    if (field === 'type') return obj?.Institution_type ?? "";
    if (field === 'logo_path') return obj?.Institution_logo_path ?? "";

    // Cas de l'ID (le code est utilisé comme ID public/URL pour les composantes)
    if (field === 'id') return obj?.Composante_code ?? obj?.Institution_id ?? null;

    // Cherche le champ préfixé par 'Institution_' ou directement (pour type_institution)
    if (obj?.[`Institution_${field}`] !== undefined && obj?.[`Institution_${field}`] !== null) return obj[`Institution_${field}`];
    
    return obj?.[field] ?? "";
  }, []);

  // Lecture du type d'animation depuis Paramètres (localStorage)
  useEffect(() => {
    const type = localStorage.getItem("headerAnimation") || "fade";
    setAnimationType(type);
  }, []);

  // ------------------ Chargement des données ------------------

  // 1. Charger toutes les institutions pour Back/Next
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions`)
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setInstitutionsList(arr);
        const idx = arr.findIndex((inst) => {
          const instId = inst?.Institution_id; 
          return String(instId) === String(id);
        });
        setCurrentIndex(idx >= 0 ? idx : null);
      })
      .catch((err) => console.error("Erreur fetch liste institutions:", err));
  }, [id]);

  // 2. Charger l'institution et ses composantes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Fetch de l'institution principale
    const fetchInstitution = fetch(`${API_BASE_URL}/api/institutions/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Institution non trouvée. Vérifiez l'ID.");
        if (!res.ok) throw new Error("Erreur serveur lors du chargement de l'institution.");
        return res.json();
      })
      .then((data) => {
        setInstitution(data);
        
        // Mise à jour du Breadcrumb
        const nomInst = getField(data, "nom");
        const idInst = getField(data, "id");

        if (setBreadcrumb && nomInst) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: nomInst || "Institution", path: `/institution/${idInst}` },
          ]);
        }
      })
      .catch((err) => {
        console.error("Erreur fetch institution:", err);
        setError(err.message);
        setInstitution(null);
      });

    // Fetch des composantes liées (Utilisation du chemin /composantes/institution avec Query param)
    const fetchComposantes = fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${id}`)
      .then((res) => {
        if (!res.ok && res.status !== 404) throw new Error("Erreur de chargement des établissements.");
        if (res.status === 404) return []; 
        return res.json();
      })
      .then((data) => setComposantes(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Erreur fetch composantes:", err);
        setError(prev => prev || `Erreur de chargement des établissements: ${err.message}`);
        return []; 
      });
    
    Promise.allSettled([fetchInstitution, fetchComposantes])
      .finally(() => setIsLoading(false));
      
  }, [id, setBreadcrumb, getField]);

  // ------------------ Gestionnaires d'événements ------------------

  const handleClickComposante = (comp) => {
    // Le code unique est utilisé dans l'URL: /institution/:id/etablissement/:code
    const code = getField(comp, "code"); 
    if (code) {
        navigate(`/institution/${id}/etablissement/${code}`, {
            state: { composante: comp },
        });
    }
  };

  const handleAddComposante = () => {
    navigate(`/institution/${id}/etablissement/nouveau`);
  };

  const handleNavigateInstitution = (direction) => {
    if (currentIndex === null) return;

    const newIndex = currentIndex + (direction === 'prev' ? -1 : 1);

    if (newIndex >= 0 && newIndex < institutionsList.length) {
      const nextInst = institutionsList[newIndex];
      const nextId = nextInst?.Institution_id; 
      if (nextId) navigate(`/institution/${nextId}`);
    }
  };

  // ------------------ Rendu conditionnel des états ------------------
  if (isLoading) {
      return (
          <div className="p-10 flex flex-col items-center justify-center text-gray-500">
              <FaSpinner className="animate-spin text-4xl mb-4" />
              <p>Chargement des données de l'institution...</p>
          </div>
      );
    }
    
  if (error) {
      return (
          <div className="p-10 text-center text-red-600 border border-red-300 bg-red-50 rounded mx-6">
              <h2 className="font-bold text-xl mb-2">Erreur de chargement</h2>
              <p>{error}</p>
              <button 
                  onClick={() => navigate('/administration')}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 transition"
              >
                  Retour à l'Administration
              </button>
          </div>
      );
    }

  if (!institution) {
      return <p className="p-6 text-gray-500">Institution non trouvée.</p>;
  }
  // ------------------------------------------------------------------

  // Récupération des informations de l'institution
  const nomInstitution = getField(institution, "nom");
  const typeInstitution = getField(institution, "type"); 
  const descriptionInstitution = getField(institution, "description");
  const logoPath = getField(institution, "logo_path");
  
  // Fonction pour obtenir la valeur triable
  const getSortableValue = (comp) => {
    let value = "";
    if (sortField === 'label') value = comp?.Composante_label ?? "";
    if (sortField === 'code') value = comp?.Composante_code ?? "";
    return String(value).toLowerCase();
  };

  // Filtre et tri des composantes
  const filteredSortedComposantes = composantes
    .filter((comp) => {
      const nom = comp?.Composante_label?.toLowerCase() || "";
      const codeComp = comp?.Composante_code?.toLowerCase() || "";
      const searchLower = search.toLowerCase();
      return nom.includes(searchLower) || codeComp.includes(searchLower);
    })
    .sort((a, b) => {
      const valA = getSortableValue(a);
      const valB = getSortableValue(b);
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const isFirst = currentIndex === 0 || currentIndex === null;
  const isLast =
    currentIndex === null || currentIndex >= institutionsList.length - 1;

  const SortIcon = sortOrder === 'asc' ? FaSortAlphaDown : FaSortAlphaUp;

  return (
    <div className="p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={id} 
          initial="initial"
          animate="animate"
          exit="exit"
          variants={headerVariants[animationType]}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* Header de l'institution + Navigation */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {logoPath ? (
                    <img 
                        src={`${API_BASE_URL}${logoPath}`} 
                        alt="Logo Institution" 
                        className="w-28 h-28 md:w-36 md:h-36 object-cover rounded-full flex-shrink-0 border p-1 bg-white" 
                    />
                ) : (
                    <HiOutlineBuildingLibrary className="w-28 h-28 md:w-36 md:h-36 text-gray-700 flex-shrink-0" />
                )}
                <div className="flex flex-col gap-2 text-center md:text-left">
                  {/* ✅ Correction: font-extrabold remplacé par font-semibold */}
                  <h1 className="text-3xl font-semibold text-gray-800">{nomInstitution}</h1>
                  <p className="text-gray-600 font-medium">{typeInstitution}</p>
                  {descriptionInstitution && (
                    <p className="mt-2 text-gray-700 max-w-2xl text-sm italic">{descriptionInstitution}</p>
                  )}
                </div>
              </div>

              {/* Boutons Précédent/Suivant */}
              <div className="flex justify-center md:justify-end gap-2">
                <button
                  onClick={() => handleNavigateInstitution('prev')}
                  disabled={isFirst}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
                    isFirst
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <FaChevronLeft />
                  <span>Précédent</span>
                </button>
                <button
                  onClick={() => handleNavigateInstitution('next')}
                  disabled={isLast}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
                    isLast
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span>Suivant</span>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* Section Composantes / Établissements */}
          <div>
            {/* Barres de contrôle (Recherche, Vue, Tri) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
              <h2 className="text-xl font-semibold">Établissements ({filteredSortedComposantes.length})</h2>
              <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Rechercher un établissement (Nom ou Code)"
                  className="border rounded px-3 py-1 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  onClick={() => setView(view === "grid" ? "list" : "grid")}
                  className="p-2 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"
                  title="Changer la vue"
                >
                  {view === "grid" ? (
                    <>
                      <FaList />
                      <span className="hidden sm:inline">Vue liste</span>
                    </>
                  ) : (
                    <>
                      <FaTh />
                      <span className="hidden sm:inline">Vue miniatures</span>
                    </>
                  )}
                </button>

                {/* Contrôle de tri */}
                <div className="flex items-center gap-2 border rounded px-3 py-1 bg-white">
                  <span className="font-semibold text-sm text-gray-600">Tri :</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="border-none bg-transparent px-2 py-1 text-sm focus:outline-none"
                  >
                    <option value="label">Nom (Label)</option>
                    <option value="code">Code (ID)</option>
                  </select>
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="text-gray-700 hover:text-blue-600 transition p-1"
                  >
                    <SortIcon className="text-sm" />
                  </button>
                </div>
              </div>
            </div>

            {/* Rendu des composantes */}
            {filteredSortedComposantes.length === 0 && search === "" ? (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 cursor-pointer hover:bg-blue-100 transition"
                  onClick={handleAddComposante}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                    <FaPlus className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-blue-700">Ajouter un établissement</h3>
                    <p className="text-sm text-blue-600">Créer une nouvelle composante pour cette institution.</p>
                  </div>
                </div>
                <p className="text-gray-500 mt-2">
                  Aucun établissement n'a été créé pour cette institution.
                </p>
              </div>
            ) : view === "list" ? (
              <div className="flex flex-col gap-2">
                {/* Bouton Ajouter en mode liste */}
                <div
                  className="flex items-center gap-4 px-4 py-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 cursor-pointer hover:bg-blue-100 transition" // ✅ Correction padding (py-3)
                  onClick={handleAddComposante}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                    <FaPlus className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-blue-700">Ajouter un établissement</h3>
                    <p className="text-sm text-blue-600">Créer une nouvelle composante pour cette institution.</p>
                  </div>
                </div>
                
                {filteredSortedComposantes.map((comp) => {
                  const code = comp.Composante_code;
                  const label = comp.Composante_label;
                  const description = comp.Composante_description;
                  const abbreviation = getField(comp, "abbreviation"); // ✅ Récupération de l'abréviation

                  return (
                    <div
                      key={code}
                      className="flex items-center gap-4 px-4 py-3 bg-white rounded shadow hover:bg-blue-50 transition cursor-pointer" // ✅ Correction padding (py-3)
                      onClick={() => handleClickComposante(comp)}
                    >
                      <BiSolidInstitution className="w-12 h-12 text-gray-700 flex-shrink-0" />
                      <div>
                        {/* ✅ Affichage Label (Abréviation) */}
                        <h3 className="font-semibold text-lg">
                          {label} {abbreviation && <span className="text-gray-500 font-normal">({abbreviation})</span>}
                        </h3>
                        {description && (
                          <p className="text-gray-600 text-sm mt-1">{description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Bouton Ajouter en mode grille */}
                <div
                  className="p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px]" // ✅ Correction rectangulaire (min-h-[160px])
                  onClick={handleAddComposante}
                >
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 mb-2">
                    <FaPlus className="text-blue-600 text-xl" />
                  </div>
                  <h3 className="font-semibold text-blue-700">Ajouter un établissement</h3>
                  <p className="text-xs text-blue-600 mt-1">Créer une nouvelle composante.</p>
                </div>

                {filteredSortedComposantes.map((comp) => {
                  const code = comp.Composante_code;
                  const abbreviation = comp.Composante_abbreviation; // ✅ Récupération de l'abréviation
                  const label = comp.Composante_label;

                  return (
                    <div
                      key={code}
                      className="p-4 bg-white rounded shadow hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px]" // ✅ Correction rectangulaire (min-h-[160px])
                      onClick={() => handleClickComposante(comp)}
                    >
                      <BiSolidInstitution className="w-16 h-16 text-gray-700 mb-2" />
                      <h3 className="font-semibold text-center">{label}</h3>
                      <p className="text-xs text-gray-500 mt-1">({abbreviation})</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default InstitutionDetail;