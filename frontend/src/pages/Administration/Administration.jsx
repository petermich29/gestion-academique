// gestion-academique/frontend/src/pages/Administration/Administration.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { 
  LibraryIcon, ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem"; // ✅ Import du nouveau composant

const API_URL = "http://127.0.0.1:8000/api";
const ID_REGEX = /INST_(\d+)/;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  // --- Gestion des Toasts ---
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --- Gestion du formulaire ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editInstitution, setEditInstitution] = useState(null);
  const [form, setForm] = useState({ id: "", code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: "" });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // --- Gestion suppression ---
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const typesInstitution = ["PRIVE", "PUBLIC"];

  useEffect(() => {
    if (setBreadcrumb) setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    setIsLoading(true);
    fetch(`${API_URL}/institutions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setInstitutions(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [setBreadcrumb]);

  const closeModal = () => {
    setModalOpen(false);
    setEditInstitution(null);
    setForm({ id: "", code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: "" });
    setErrors({});
  };

  const openModal = (inst = null) => {
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
      setForm({
        id: getNextMinimalId(institutions.map((i) => i.Institution_id)),
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
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "Obligatoire";
    if (!form.nom.trim()) newErrors.nom = "Obligatoire";
    if (!form.type.trim()) newErrors.type = "Obligatoire";
    
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("id_institution", form.id);
    formData.append("code", form.code);
    formData.append("nom", form.nom);
    formData.append("type_institution", form.type);
    formData.append("abbreviation", form.abbreviation);
    formData.append("description", form.description);
    if (form.logo) formData.append("logo_file", form.logo);

    try {
      const method = editInstitution ? "PUT" : "POST";
      const res = await fetch(`${API_URL}/institutions`, { method, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.detail || "Erreur de sauvegarde", "error");
        setIsSubmitting(false);
        return;
      }
      const newInst = await res.json();
      setInstitutions((prev) =>
        editInstitution
          ? prev.map((i) => (i.Institution_id === editInstitution.Institution_id ? newInst : i))
          : [...prev, newInst]
      );
      addToast(editInstitution ? "Modifié avec succès" : "Créé avec succès");
      closeModal();
    } catch (err) {
      addToast("Erreur serveur", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!institutionToDelete) return;
    if (deleteCodeInput.trim() !== (institutionToDelete.Institution_code || "").trim()) {
      setDeleteError("Code incorrect.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionToDelete.Institution_id}`, { method: "DELETE" });
      if (res.ok) {
        setInstitutions((prev) => prev.filter((i) => i.Institution_id !== institutionToDelete.Institution_id));
        addToast("Supprimé avec succès");
        setDeleteModalOpen(false);
      } else {
        addToast("Erreur suppression", "error");
      }
    } catch (e) {
      addToast("Erreur connexion", "error");
    }
  };

  const filteredSorted = institutions
    .filter((inst) => (inst.Institution_nom + " " + inst.Institution_code).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const vA = sortField === "code" ? a.Institution_code : a.Institution_nom;
      const vB = sortField === "code" ? b.Institution_code : b.Institution_nom;
      return sortOrder === "asc" ? vA.localeCompare(vB) : vB.localeCompare(a.Institution_nom);
    });

  // Bouton Ajouter personnalisé
  const AddButton = ({ grid }) => (
    <div onClick={() => openModal()} className={grid ? AppStyles.addCard.grid : AppStyles.addCard.list}>
      <div className={`${AppStyles.addCard.iconContainer} ${grid ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}>
        <PlusIcon />
      </div>
      <p className="text-sm font-semibold text-blue-700">Ajouter</p>
    </div>
  );

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl" /></div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Institutions ({filteredSorted.length})</h2>
        <div className={AppStyles.header.controls}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={AppStyles.input.text}
          />
          <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white text-sm">
            <span className="font-semibold text-gray-600 text-xs uppercase">Tri :</span>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border-none bg-transparent outline-none cursor-pointer text-gray-700 font-medium">
              <option value="nom">Nom</option>
              <option value="code">Code</option>
            </select>
            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          </div>
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* LIST/GRID */}
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
        <AddButton grid={view === "grid"} />
        
        {/* ✅ Utilisation de AnimatePresence pour gérer les sorties */}
        <AnimatePresence {...AppStyles.animation.presenceProps}>
          {filteredSorted.map((inst) => (
            // ✅ Utilisation du CardItem pour éviter le blink et uniformiser le style
            <CardItem
              key={inst.Institution_id}
              viewMode={view}
              title={inst.Institution_nom}
              subTitle={`${inst.Institution_type} • ${inst.Institution_code}`}
              imageSrc={inst.Institution_logo_path ? `http://127.0.0.1:8000${inst.Institution_logo_path}` : null}
              PlaceholderIcon={LibraryIcon}
              onClick={() => navigate(`/institution/${inst.Institution_id}`)}
              onEdit={() => openModal(inst)}
              onDelete={() => {
                setInstitutionToDelete(inst);
                setDeleteCodeInput("");
                setDeleteModalOpen(true);
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL FORM */}
      <DraggableModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editInstitution ? "Modifier Institution" : "Nouvelle Institution"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div 
                className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center cursor-pointer ring-1 hover:ring-blue-400"
                onClick={() => fileInputRef.current.click()}
              >
                {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="Preview"/> : 
                 form.logoPath ? <img src={`http://127.0.0.1:8000${form.logoPath}`} className="w-full h-full object-cover" alt="Logo"/> : 
                 <PlusIcon className="text-gray-400 text-2xl" />}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" name="logo" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5">
                <span className={AppStyles.input.label}>ID</span>
                <input type="text" value={form.id} disabled className={AppStyles.input.formControlDisabled} />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className={AppStyles.input.label}>Code</span>
                <input name="code" value={form.code} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.code ? "border-red-500" : ""}`} />
                {errors.code && <p className={AppStyles.input.errorText}>{errors.code}</p>}
              </label>
              <label className="flex flex-col gap-0.5 sm:col-span-2">
                <span className={AppStyles.input.label}>Nom</span>
                <input name="nom" value={form.nom} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.nom ? "border-red-500" : ""}`} />
                {errors.nom && <p className={AppStyles.input.errorText}>{errors.nom}</p>}
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">
                <span className={AppStyles.input.label}>Type</span>
                <select name="type" value={form.type} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.type ? "border-red-500" : ""}`}>
                  <option value="">--</option>
                  {typesInstitution.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.type && <p className={AppStyles.input.errorText}>{errors.type}</p>}
            </label>
            <label className="flex flex-col gap-0.5">
                <span className={AppStyles.input.label}>Abréviation</span>
                <input name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl} />
            </label>
          </div>

          <label className="flex flex-col gap-0.5">
            <span className={AppStyles.input.label}>Description</span>
            <textarea name="description" value={form.description} onChange={handleChange} className={AppStyles.input.formControl} />
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
              {isSubmitting && <SpinnerIcon className="animate-spin" />} {editInstitution ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* MODAL SUPPRESSION */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmer la suppression">
         <p className="text-gray-700 mb-2">Vous allez supprimer : <b>{institutionToDelete?.Institution_nom}</b></p>
         <p className="text-sm text-gray-700 mt-3">Taper le code <span className="font-mono font-bold">{institutionToDelete?.Institution_code}</span> pour confirmer :</p>
         <input 
            type="text" 
            value={deleteCodeInput} 
            onChange={(e) => { setDeleteCodeInput(e.target.value); setDeleteError(""); }}
            className={`mt-2 w-full ${AppStyles.input.formControl} ${deleteError ? "border-red-500" : ""}`}
         />
         {deleteError && <p className={AppStyles.input.errorText}>{deleteError}</p>}
         <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
            <button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button>
         </div>
      </ConfirmModal>
    </div>
  );
};

export default Administration;