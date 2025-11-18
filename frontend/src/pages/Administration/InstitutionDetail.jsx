// src/pages/Administration/InstitutionDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { BiSolidInstitution } from "react-icons/bi";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { FaTh, FaList, FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = "http://127.0.0.1:8000";

// Variantes d'animation pour le header
const headerVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  },
};

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  const [institution, setInstitution] = useState(null);
  const [composantes, setComposantes] = useState([]);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");

  const [institutionsList, setInstitutionsList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  // lecture du type d'animation depuis la page Paramètres
  const [animationType, setAnimationType] = useState("fade");
  useEffect(() => {
    const type = localStorage.getItem("headerAnimation") || "fade";
    setAnimationType(type);
  }, []);

  const getField = (obj, field) =>
    obj?.[field] ??
    obj?.[`composantes_${field}`] ??
    obj?.[`institutions_${field}`] ??
    "";

  // Charger toutes les institutions pour Back/Next
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions`)
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setInstitutionsList(arr);
        const idx = arr.findIndex((inst) => {
          const instId =
            inst.id_institution ??
            inst.institutions_id_institution ??
            inst.id;
          return String(instId) === String(id);
        });
        setCurrentIndex(idx >= 0 ? idx : null);
      })
      .catch((err) => console.error("Erreur fetch liste institutions:", err));
  }, [id]);

  // Charger l'institution et ses composantes
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setInstitution(data);
        if (setBreadcrumb && (data?.nom || data?.institutions_nom)) {
          const nomInst = getField(data, "nom");
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: nomInst || "Institution", path: `/institution/${id}` },
          ]);
        }
      })
      .catch((err) => console.error("Erreur fetch institution:", err));

    fetch(`${API_BASE_URL}/api/composantes?institution_id=${id}`)
      .then((res) => res.json())
      .then((data) => setComposantes(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erreur fetch composantes:", err));
  }, [id, setBreadcrumb]);

  const handleClickComposante = (comp) => {
  const code =
    comp.code || comp.composantes_code || comp.id || comp.code_composante || "unknown";
  
  navigate(`/institution/${id}/etablissement/${code}`, {
    state: { composante: comp }, // <-- passage du composant dans le state
  });
};

  const handleAddComposante = () => {
    console.log("Ajouter un nouvel établissement pour l'institution", id);
    // navigate(`/institution/${id}/etablissement/nouveau`);
  };

  // Navigation Back / Next
  const handlePrevInstitution = () => {
    if (currentIndex === null || currentIndex <= 0) return;
    const prevInst = institutionsList[currentIndex - 1];
    const prevId =
      prevInst.id_institution ?? prevInst.institutions_id_institution ?? prevInst.id;
    if (prevId) navigate(`/institution/${prevId}`);
  };

  const handleNextInstitution = () => {
    if (currentIndex === null || currentIndex >= institutionsList.length - 1) return;
    const nextInst = institutionsList[currentIndex + 1];
    const nextId =
      nextInst.id_institution ?? nextInst.institutions_id_institution ?? nextInst.id;
    if (nextId) navigate(`/institution/${nextId}`);
  };

  if (!institution) return <p>Chargement...</p>;

  const nomInstitution = getField(institution, "nom");
  const typeInstitution = getField(institution, "type_institution");
  const descriptionInstitution = getField(institution, "description");

  // Filtre + tri des composantes
  const filteredSortedComposantes = composantes
    .filter((comp) =>
      Object.values(comp).join(" ").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const valA = (getField(a, sortField) || "").toLowerCase();
      const valB = (getField(b, sortField) || "").toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const isFirst = currentIndex === 0 || currentIndex === null;
  const isLast = currentIndex === null || currentIndex >= institutionsList.length - 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header + Back/Next */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={id} // clé dynamique pour relancer l'animation
              initial="initial"
              animate="animate"
              exit="exit"
              variants={headerVariants[animationType]}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row items-center gap-6"
            >
              <HiOutlineBuildingLibrary className="w-28 h-28 md:w-36 md:h-36 text-gray-700" />
              <div className="flex flex-col gap-2 text-center md:text-left">
                <h1 className="text-2xl font-bold">{nomInstitution}</h1>
                <p className="text-gray-600">{typeInstitution}</p>
                {descriptionInstitution && (
                  <p className="mt-2 text-gray-700">{descriptionInstitution}</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center md:justify-end gap-2">
            <button
              onClick={handlePrevInstitution}
              disabled={isFirst}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                isFirst
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100 text-gray-700"
              }`}
            >
              <FaChevronLeft />
              <span>Précédent</span>
            </button>
            <button
              onClick={handleNextInstitution}
              disabled={isLast}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
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

      {/* Section composantes / établissements */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold">Établissements</h2>
          <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Rechercher un établissement"
              className="border rounded px-3 py-1 w-64 focus:outline-none focus:ring focus:border-blue-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              className="p-2 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center gap-2"
              title="Changer la vue"
            >
              {view === "grid" ? (
                <>
                  <FaList />
                  <span className="hidden sm:inline text-sm">Vue liste</span>
                </>
              ) : (
                <>
                  <FaTh />
                  <span className="hidden sm:inline text-sm">Vue miniatures</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 border rounded px-3 py-1 bg-white">
              <span className="font-semibold text-sm">Tri :</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="border rounded px-2 py-1 text-sm focus:outline-none"
              >
                <option value="label">Nom</option>
                <option value="abbreviation">Abréviation</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border rounded px-2 py-1 text-sm focus:outline-none"
              >
                <option value="asc">Ascendant</option>
                <option value="desc">Descendant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contenu des composantes */}
        {filteredSortedComposantes.length === 0 ? (
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 cursor-pointer hover:bg-blue-100 transition"
              onClick={handleAddComposante}
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
                <FaPlus className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-blue-700">
                  Ajouter un établissement
                </h3>
                <p className="text-sm text-blue-600">
                  Créer une nouvelle composante pour cette institution.
                </p>
              </div>
            </div>
            <p className="text-gray-500 mt-2">Aucun établissement disponible pour le moment.</p>
          </div>
        ) : view === "list" ? (
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 cursor-pointer hover:bg-blue-100 transition"
              onClick={handleAddComposante}
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
                <FaPlus className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-blue-700">
                  Ajouter un établissement
                </h3>
                <p className="text-sm text-blue-600">
                  Créer une nouvelle composante pour cette institution.
                </p>
              </div>
            </div>

            {filteredSortedComposantes.map((comp) => {
              const code =
                comp.code || comp.composantes_code || comp.id || comp.code_composante;
              const label = comp.label || comp.nom || comp.intitule || comp.composantes_label;
              const description = comp.description || comp.composantes_description;

              return (
                <div
                  key={code}
                  className="flex items-center gap-4 p-4 bg-white rounded shadow hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => handleClickComposante(comp)}
                >
                  <BiSolidInstitution className="w-16 h-16 text-gray-700" />
                  <div>
                    <h3 className="font-semibold text-lg">{label}</h3>
                    {description && (
                      <p className="text-gray-600 text-sm mt-1">{description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div
              className="p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition cursor-pointer flex flex-col items-center justify-center text-center"
              onClick={handleAddComposante}
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 mb-2">
                <FaPlus className="text-blue-600 text-xl" />
              </div>
              <h3 className="font-semibold text-blue-700">Ajouter un établissement</h3>
              <p className="text-xs text-blue-600 mt-1">Créer une nouvelle composante.</p>
            </div>

            {filteredSortedComposantes.map((comp) => {
              const code =
                comp.code || comp.composantes_code || comp.id || comp.code_composante;
              const label = comp.label || comp.nom || comp.intitule || comp.composantes_label;

              return (
                <div
                  key={code}
                  className="p-4 bg-white rounded shadow hover:bg-blue-50 transition cursor-pointer flex flex-col items-center"
                  onClick={() => handleClickComposante(comp)}
                >
                  <BiSolidInstitution className="w-16 h-16 text-gray-700 mb-2" />
                  <h3 className="font-semibold text-center">{label}</h3>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionDetail;
