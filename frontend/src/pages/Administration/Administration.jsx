// ... imports identiques
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://127.0.0.1:8000/api";

// --- Icônes existantes ---
const LibraryIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
    <line x1="6" y1="7" x2="18" y2="7"></line>
    <line x1="6" y1="12" x2="18" y2="12"></line>
    <line x1="6" y1="17" x2="18" y2="17"></line>
  </svg>
);

const ThIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 11H2V9h2v2zm0-4H2V5h2v2zm0-4H2V1h2v2zm4 8H6V9h2v2zm0-4H6V5h2v2zm0-4H6V1h2v2zm4 8h-2V9h2v2zm0-4h-2V5h2v2zm0-4h-2V1h2v2zm4 8h-2V9h2v2zm0-4h-2V5h2v2zm0-4h-2V1h2v2z" />
  </svg>
);

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

const PlusIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

const SpinnerIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

const TrashIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const SortIcon = ({ order, ...props }) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ transform: order === "asc" ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
  >
    <path
      fillRule="evenodd"
      d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
    />
  </svg>
);

// --- NOUVELLES ICÔNES POUR LES TOASTS ---
const CheckCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

// Regex ID institution
const ID_REGEX = /INST_(\d+)/;

// Fonction ID minimal
const getNextMinimalId = (existingIds) => {
  const usedNumbers = existingIds
    .map((id) => {
      const match = id.match(ID_REGEX);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  let nextNum = 1;
  for (const n of usedNumbers) {
    if (n !== nextNum) break;
    nextNum++;
  }
  return `INST_${String(nextNum).padStart(4, "0")}`;
};

const Administration = () => {
  const [institutions, setInstitutions] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  // --- Toasts ---
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [form, setForm] = useState({
    id: "",
    code: "",
    nom: "",
    type: "",
    abbreviation: "",
    description: "",
    logo: null,
    logoPath: "",
  });

  const [errors, setErrors] = useState({});
  const [editInstitution, setEditInstitution] = useState(null);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 40, left: 0 });

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  const typesInstitution = ["PRIVE", "PUBLIC"];

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (setBreadcrumb) setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    setIsLoading(true);

    const fetchInstitutions = async () => {
      try {
        const res = await fetch(`${API_URL}/institutions`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Erreur HTTP institutions:", res.status, err.detail);
          setInstitutions([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // On initialise un cacheBust pour chaque institution existante
        const listWithCache = list.map((inst) => ({ ...inst, _cacheBust: Date.now() }));
        setInstitutions(listWithCache);
      } catch (err) {
        console.error("Erreur de connexion/réseau:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitutions();
  }, [setBreadcrumb]);

  const closeModal = () => {
    setModalOpen(false);
    setEditInstitution(null);
    setForm({
      id: "",
      code: "",
      nom: "",
      type: "",
      abbreviation: "",
      description: "",
      logo: null,
      logoPath: "",
    });
    setErrors({});
  };

  const openModal = (inst = null) => {
    const centerX = window.innerWidth / 2 - 260;
    setModalPos({ top: 40, left: centerX > 0 ? centerX : 16 });

    if (inst) {
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
      const newId = getNextMinimalId(institutions.map((i) => i.Institution_id));
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
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !modalRef.current) return;
      const { offsetWidth: w, offsetHeight: h } = modalRef.current;

      let left = e.clientX - dragOffset.x;
      let top = e.clientY - dragOffset.y;

      left = Math.max(0, Math.min(window.innerWidth - w, left));
      top = Math.max(0, Math.min(window.innerHeight - h, top));

      setModalPos({ top, left });
    },
    [dragging, dragOffset.x, dragOffset.y]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    const isHeaderClick = e.target.closest(".modal-drag-handle");
    if (!isHeaderClick) return;

    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "Le code est obligatoire.";
    if (!form.nom.trim()) newErrors.nom = "Le nom est obligatoire.";
    if (!form.type.trim()) newErrors.type = "Le type est obligatoire.";
    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    Object.entries({
      id_institution: form.id,
      code: form.code,
      nom: form.nom,
      type_institution: form.type,
      abbreviation: form.abbreviation,
      description: form.description,
    }).forEach(([k, v]) => {
      formData.append(k, (typeof v === "string" ? v.trim() : v) || "");
    });

    if (form.logo) formData.append("logo_file", form.logo);

    try {
      const method = editInstitution ? "PUT" : "POST";
      const res = await fetch(`${API_URL}/institutions`, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errObj = {};
        const msg = errData.detail || "";

        if (typeof msg === "string") {
          if (msg.includes("L'ID institution")) {
            errObj.id = "L'ID généré est déjà utilisé. Veuillez recharger la page.";
          } else if (msg.includes("Le nom")) {
            errObj.nom = "Ce nom d'institution existe déjà.";
          } else if (msg.includes("Le code")) {
            errObj.code = "Ce code d'institution est déjà utilisé.";
          } else {
            addToast(`Erreur : ${msg}`, "error");
          }
        } else {
          addToast("Erreur de validation : vérifier les champs.", "error");
        }
        setErrors(errObj);
        setIsSubmitting(false);
        return;
      }

      const newInst = await res.json();
      const cacheBust = Date.now();

      setInstitutions((prev) =>
        editInstitution
          ? prev.map((i) =>
              i.Institution_id === editInstitution.Institution_id
                ? { ...newInst, _cacheBust: cacheBust }
                : i
            )
          : [...prev, { ...newInst, _cacheBust: cacheBust }]
      );

      addToast(
        editInstitution
          ? `Institution "${newInst.Institution_nom}" mise à jour avec succès.`
          : `Institution "${newInst.Institution_nom}" créée avec succès.`
      );

      closeModal();
    } catch (err) {
      console.error("Erreur serveur:", err);
      addToast("Erreur de connexion au serveur", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (institutionId) => {
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addToast(`Erreur lors de la suppression: ${errData.detail || res.status}`, "error");
        return false;
      }
      setInstitutions((prev) => prev.filter((i) => i.Institution_id !== institutionId));
      return true;
    } catch (err) {
      console.error("Erreur suppression:", err);
      addToast("Erreur de connexion au serveur lors de la suppression.", "error");
      return false;
    }
  };

  const openDeleteModal = (inst) => {
    setInstitutionToDelete(inst);
    setDeleteCodeInput("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setInstitutionToDelete(null);
    setDeleteCodeInput("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!institutionToDelete) return;
    if (deleteCodeInput.trim() !== (institutionToDelete.Institution_code || "").trim()) {
      setDeleteError("Le code saisi ne correspond pas au code de l'institution.");
      return;
    }
    const success = await handleDelete(institutionToDelete.Institution_id);
    if (success) {
      addToast("Institution supprimée avec succès.", "success");
      closeDeleteModal();
    }
  };

  const sortInstitutions = (data) =>
    [...data].sort((a, b) => {
      let fieldA = sortField === "code" ? a.Institution_code || "" : a.Institution_nom || "";
      let fieldB = sortField === "code" ? b.Institution_code || "" : b.Institution_nom || "";
      const cmp = fieldA.localeCompare(fieldB, "fr", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });

  const filtered = institutions.filter((inst) =>
    (inst.Institution_nom + " " + (inst.Institution_code || "") + " " + (inst.Institution_abbreviation || ""))
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const filteredSorted = sortInstitutions(filtered);

  if (isLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-gray-500">
        <SpinnerIcon className="animate-spin text-4xl mb-4" />
        <p className="text-lg">Chargement des institutions...</p>
      </div>
    );
  }

  const InstitutionItem = ({ inst, grid = true }) => {
    const handleClick = () => navigate(`/institution/${inst.Institution_id}`);
    const baseGrid =
      "p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:shadow-lg hover:bg-blue-50 duration-200 min-h-52";
    const baseList =
      "flex items-center gap-3 p-2 bg-white rounded shadow hover:shadow-md hover:bg-blue-50 duration-200";

    const logoSrc =
      inst.Institution_logo_path
        ? `http://127.0.0.1:8000${inst.Institution_logo_path}${inst._cacheBust ? `?t=${inst._cacheBust}` : ""}`
        : null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`cursor-pointer transition relative ${grid ? baseGrid : baseList}`}
      >
        <div
          onClick={handleClick}
          className={`flex w-full ${grid ? "flex-col items-center" : "flex-row items-center gap-3"}`}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`Logo de ${inst.Institution_nom}`}
              className={
                grid
                  ? "w-20 h-20 object-cover mb-1 rounded-full border border-gray-200"
                  : "w-10 h-10 object-cover rounded-full border border-gray-200 flex-shrink-0"
              }
            />
          ) : (
            <LibraryIcon
              className={
                grid
                  ? "w-16 h-16 text-gray-700 mb-1"
                  : "w-8 h-8 text-gray-700 flex-shrink-0"
              }
            />
          )}

          <div className={grid ? "text-center w-full" : "flex-1 min-w-0"}>
            <p className={`font-semibold text-gray-800 break-words ${grid ? "text-base" : "text-sm truncate"}`}>
              {inst.Institution_nom}
            </p>
            <p className="text-gray-600 text-sm truncate">
              {inst.Institution_type}{" "}
              {inst.Institution_abbreviation && `(${inst.Institution_abbreviation})`}
            </p>
            <p className="text-gray-500 text-xs">Code: {inst.Institution_code}</p>
          </div>
        </div>

        <div className={`flex gap-1 absolute ${grid ? "top-2 right-2" : "right-2"}`}>
          <EditIcon
            className="text-blue-600 hover:text-blue-800 cursor-pointer p-1 rounded hover:bg-white z-10"
            onClick={(e) => {
              e.stopPropagation();
              openModal(inst);
            }}
          />
          <TrashIcon
            className="text-red-600 hover:text-red-800 cursor-pointer p-1 rounded hover:bg-white z-10"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(inst);
            }}
          />
        </div>
      </motion.div>
    );
  };

  const AddInstitutionButton = ({ grid = true }) => (
    <div
      onClick={() => openModal()}
      className={`cursor-pointer ${
        grid
          ? "p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-center min-h-40"
          : "flex items-center gap-4 p-2 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
      }`}
    >
      <div
        className={
          grid
            ? "w-12 h-12 flex items-center justify-center rounded-full bg-blue-100"
            : "w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 flex-shrink-0"
        }
      >
        <PlusIcon className="text-blue-600" />
      </div>
      <p className="text-base font-semibold text-blue-700">Ajouter une institution</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 relative">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[60] pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              layout
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded shadow-lg text-white text-sm font-medium min-w-[300px] ${
                toast.type === "error" ? "bg-red-500" : "bg-green-600"
              }`}
            >
              <div className="flex-shrink-0 text-lg">
                {toast.type === "error" ? <XCircleIcon /> : <CheckCircleIcon />}
              </div>
              <div className="flex-1">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 ml-2"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-3">
        <h2 className="text-xl font-semibold">Institutions ({filteredSorted.length})</h2>
        <div className="flex flex-col md:flex-row items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher (Nom, Code, Abréviation)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
          />

          <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white text-sm">
            <span className="font-semibold text-gray-600">Tri :</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border-none bg-transparent px-1 py-0.5 text-sm focus:outline-none"
            >
              <option value="nom">Nom</option>
              <option value="code">Code</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="text-gray-700 hover:text-blue-600 transition p-0.5"
              title={sortOrder === "asc" ? "Trier par ordre décroissant" : "Trier par ordre croissant"}
            >
              <SortIcon className="text-sm" order={sortOrder} />
            </button>
          </div>

          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className="p-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center transition-colors text-sm"
            title={view === "grid" ? "Passer à la vue liste" : "Passer à la vue miniatures"}
          >
            {view === "grid" ? <ListIcon className="text-base" /> : <ThIcon className="text-base" />}
          </button>
        </div>
      </div>

      <hr className="border-t border-gray-200" />

      {/* LISTE / GRID */}
      {filteredSorted.length === 0 && search.length === 0 ? (
        <div className="flex flex-col gap-2">
          <AddInstitutionButton grid />
          <p className="text-gray-500 text-sm">Aucune institution disponible pour le moment.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AddInstitutionButton grid />
          {filteredSorted.map((inst) => (
            <InstitutionItem key={inst.Institution_id} inst={inst} grid />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AddInstitutionButton grid={false} />
          {filteredSorted.map((inst) => (
            <InstitutionItem key={inst.Institution_id} inst={inst} grid={false} />
          ))}
        </div>
      )}

      {/* MODAL FORM */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            onClick={(e) => e.target.classList.contains("fixed") && closeModal()}
            className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-start justify-center pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={modalRef}
              className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-3 z-50 overflow-hidden"
              style={{
                top: modalPos.top,
                left: modalPos.left,
                position: "absolute",
                cursor: dragging ? "grabbing" : "grab",
              }}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 130 } }}
              exit={{ y: -30, opacity: 0 }}
            >
              <div
                className="modal-drag-handle flex items-center justify-between text-base font-semibold p-3 border-b bg-gray-50 text-gray-800 cursor-grab"
                onMouseDown={handleMouseDown}
              >
                <span>{editInstitution ? "Modifier Institution" : "Nouvelle Institution"}</span>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-500 hover:text-red-500 text-sm px-2 py-0.5"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 text-sm">
                {/* Logo + id + code + nom */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center cursor-pointer ring-1 ring-gray-300 hover:ring-blue-400 transition"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      {form.logo ? (
                        <img src={URL.createObjectURL(form.logo)} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : form.logoPath ? (
                        <img
                          src={`http://127.0.0.1:8000${form.logoPath}?t=${Date.now()}`}
                          alt="Existing Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlusIcon className="text-gray-400 text-2xl" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      name="logo"
                      ref={fileInputRef}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <p className="text-[11px] text-gray-500 text-center">Cliquer pour choisir le logo</p>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-700">ID (généré)</span>
                      <input
                        type="text"
                        name="id"
                        value={form.id}
                        className={`px-2 py-1.5 border rounded bg-gray-100 text-gray-600 text-sm ${
                          errors.id ? "border-red-500" : ""
                        }`}
                        disabled
                      />
                      {errors.id && <p className="text-red-500 text-[11px]">{errors.id}</p>}
                    </label>

                    <label className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-700">Code</span>
                      <input
                        type="text"
                        name="code"
                        placeholder="ex: UNIFIV"
                        value={form.code}
                        onChange={handleChange}
                        className={`px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm ${
                          errors.code ? "border-red-500" : ""
                        }`}
                      />
                      {errors.code && <p className="text-red-500 text-[11px]">{errors.code}</p>}
                    </label>

                    <label className="flex flex-col gap-0.5 sm:col-span-2">
                      <span className="text-sm text-gray-700">Nom</span>
                      <input
                        type="text"
                        name="nom"
                        placeholder="Nom complet"
                        value={form.nom}
                        onChange={handleChange}
                        className={`px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm ${
                          errors.nom ? "border-red-500" : ""
                        }`}
                      />
                      {errors.nom && <p className="text-red-500 text-[11px]">{errors.nom}</p>}
                    </label>
                  </div>
                </div>

                {/* Type / abréviation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-sm text-gray-700">Type</span>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className={`px-2 py-1.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm ${
                        errors.type ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">-- Sélectionner --</option>
                      {typesInstitution.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {errors.type && <p className="text-red-500 text-[11px]">{errors.type}</p>}
                  </label>

                  <label className="flex flex-col gap-0.5">
                    <span className="text-sm text-gray-700">Abréviation (optionnel)</span>
                    <input
                      type="text"
                      name="abbreviation"
                      placeholder="ex: FS"
                      value={form.abbreviation}
                      onChange={handleChange}
                      className="px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm"
                    />
                  </label>
                </div>

                {/* Description */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-sm text-gray-700">Description (courte, optionnel)</span>
                  <textarea
                    name="description"
                    placeholder="Quelques mots sur l'institution..."
                    value={form.description}
                    onChange={handleChange}
                    className="px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm min-h-[60px] max-h-[90px]"
                  />
                </label>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    disabled={isSubmitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <SpinnerIcon className="animate-spin w-4 h-4" />}
                    {editInstitution ? "Modifier" : "Créer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRM DELETE */}
      <AnimatePresence>
        {deleteModalOpen && institutionToDelete && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target.classList.contains("fixed") && closeDeleteModal()}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-4 text-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-lg font-bold text-red-600 mb-1">Confirmer la suppression</h2>
              <p className="text-sm text-gray-700 mb-2">Vous allez supprimer l'institution :</p>
              <p className="font-semibold text-gray-900 text-base">
                {institutionToDelete.Institution_nom} ({institutionToDelete.Institution_code})
              </p>
              <p className="text-sm text-gray-700 mt-3">
                Pour confirmer, veuillez taper le code :
                <span className="font-mono font-semibold ml-1">
                  {institutionToDelete.Institution_code}
                </span>
              </p>

              <input
                type="text"
                value={deleteCodeInput}
                onChange={(e) => {
                  setDeleteCodeInput(e.target.value);
                  setDeleteError("");
                }}
                className={`mt-2 w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-300 ${
                  deleteError ? "border-red-500" : ""
                }`}
                placeholder="Saisir le code de l'institution"
              />
              {deleteError && <p className="text-red-500 text-[11px] mt-1">{deleteError}</p>}

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Administration;
