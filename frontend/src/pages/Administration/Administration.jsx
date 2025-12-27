// src/pages/Administration/Administration.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaHistory } from "react-icons/fa";

import {
  LibraryIcon,
  ThIcon,
  ListIcon,
  PlusIcon,
  SpinnerIcon,
  SortIcon
} from "../../components/ui/Icons";

import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import YearMultiSelect from "../../components/ui/YearMultiSelect";
import EntityHistoryManager from "../../components/ui/EntityHistoryManager";

import { useAdministration } from "../../context/AdministrationContext";
import { useAuth } from "../../context/AuthContext"; // Import du AuthContext

const API_URL = "http://127.0.0.1:8000/api";
const ID_REGEX = /INST_(\d+)/;

// Fallback local ID generator if API doesn't provide one
const getNextMinimalId = (existingIds = []) => {
  const usedNumbers = existingIds
    .map((id) => {
      const match = String(id).match(ID_REGEX);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  let nextNum = 1;
  for (const n of usedNumbers) {
    if (n !== nextNum) break;
    nextNum++;
  }
  return `INST_${String(nextNum).padStart(4, "000")}`;
};

// Client-side validation helpers
const isValidCode = (code) => typeof code === "string" && /^[A-Z0-9_\-]{2,20}$/.test(code);
const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

const Administration = () => {
  // AdministrationContext (global years)
  const { selectedYearsIds, setSelectedYearsIds, yearsList } = useAdministration();

  // Outlet context (Layout passes setBreadcrumb)
  const { setBreadcrumb } = useOutletContext() || {};

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const firstLoadRef = useRef(true);

  // Data + UI state
  const [institutions, setInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  // Modal states
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editInstitution, setEditInstitution] = useState(null);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");

  // Toasts + errors
  const [toasts, setToasts] = useState([]);
  const [errors, setErrors] = useState({});

  // Form
  const [form, setForm] = useState({
    id: "",
    code: "",
    nom: "",
    type: "",
    abbreviation: "",
    description: "",
    logo: null,
    logoPath: ""
  });

  // UX flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast helpers
  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 3000);
  };
  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  // --- NOUVEAU : GESTION PERMISSION ---
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'SECRETAIRE') {
        // Logique : Le secrétaire ne doit pas voir la liste des institutions.
        // On cherche sa permission principale.
        const perm = user.permissions.find(p => p.entity_type === 'MENTION' || p.entity_type === 'COMPOSANTE');
        
        if (perm && perm.entity_type === 'MENTION') {
            // NOTE : Idéalement, le backend envoie aussi l'ID de l'institution et de la composante parente dans l'objet permission
            // Supposons que permissions ressemble à { entity_type: 'MENTION', entity_id: 'MEN_01', parent_composante_id: 'COMP_01', parent_institution_id: 'INST_01' }
            if (perm.parent_institution_id && perm.parent_composante_id) {
                navigate(`/institution/${perm.parent_institution_id}/etablissement/${perm.parent_composante_id}`, { replace: true });
            }
        }
    }
  }, [user, navigate]);

  // Breadcrumb on mount
  useEffect(() => {
    if (setBreadcrumb) {
      setBreadcrumb([{ label: "Administration", path: "/administration", type: "institution" }]);
    }
  }, [setBreadcrumb]);

  // Fetch institutions whenever selectedYearsIds changes
  useEffect(() => {
    const fetchInst = async () => {
      if (firstLoadRef.current) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const q = new URLSearchParams();
        (selectedYearsIds || []).forEach((id) => q.append("annees", id));

        const res = await fetch(`${API_URL}/institutions?${q.toString()}`);
        if (!res.ok) throw new Error("Erreur chargement institutions");
        const data = await res.json();
        setInstitutions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        addToast("Erreur de chargement des institutions", "error");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        firstLoadRef.current = false;
      }
    };

    fetchInst();
  }, [selectedYearsIds]);

  // Open modal (create or edit)
  const openModal = (inst = null) => {
    setErrors({});
    if (inst) {
      setEditInstitution(inst);
      setForm({
        id: inst.Institution_id,
        code: inst.Institution_code,
        nom: inst.Institution_nom,
        type: inst.Institution_type || "",
        abbreviation: inst.Institution_abbreviation || "",
        description: inst.Institution_description || "",
        logo: null,
        logoPath: inst.Institution_logo_path || ""
      });
    } else {
      setEditInstitution(null);
      // propose a predictable id (fallback)
      const next = getNextMinimalId(institutions.map((i) => i.Institution_id));
      setForm({
        id: next,
        code: "",
        nom: "",
        type: "",
        abbreviation: "",
        description: "",
        logo: null,
        logoPath: ""
      });
    }
    setModalOpen(true);
  };

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
      logoPath: ""
    });
    setErrors({});
  };

  // Client-side validation
  const validateForm = () => {
    const e = {};
    if (!isNonEmpty(form.nom)) e.nom = "Le nom est requis";
    if (!isNonEmpty(form.code)) e.code = "Le code est requis";
    else if (!isValidCode(form.code)) e.code = "Code invalide (lettres MAJ, chiffres, - ou _)";
    if (!isNonEmpty(form.type)) e.type = "Le type est requis";
    return e;
  };

  // Submit (create or update)
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const validation = validateForm();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      addToast("Corrigez les erreurs du formulaire", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      // append normalized fields
      fd.append("id_institution", form.id);
      fd.append("code", String(form.code).toUpperCase());
      fd.append("nom", form.nom.trim());
      fd.append("type_institution", form.type);
      if (form.abbreviation) fd.append("abbreviation", form.abbreviation);
      if (form.description) fd.append("description", form.description);
      if (form.logo) fd.append("logo_file", form.logo);

      // attach active year on create
      if (!editInstitution) {
        const active = yearsList.find((y) => y.AnneeUniversitaire_is_active);
        if (active) fd.append("annees_universitaires", active.AnneeUniversitaire_id);
      }

      const method = editInstitution ? "PUT" : "POST";
      const url = editInstitution
        ? `${API_URL}/institutions/${editInstitution.Institution_id}`
        : `${API_URL}/institutions`;

      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur serveur lors de la sauvegarde");
      }
      const saved = await res.json();

      // Update list optimistically
      setInstitutions((prev) =>
        editInstitution ? prev.map((p) => (p.Institution_id === saved.Institution_id ? saved : p)) : [saved, ...prev]
      );

      addToast(editInstitution ? "Institution modifiée" : "Institution créée");
      closeModal();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Erreur sauvegarde", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete confirm
  const confirmDelete = async () => {
    if (!institutionToDelete) return;
    if (deleteCodeInput !== institutionToDelete.Institution_code) {
      addToast("Code incorrect", "error");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/institutions/${institutionToDelete.Institution_id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Erreur suppression");

      setInstitutions((p) => p.filter((i) => i.Institution_id !== institutionToDelete.Institution_id));
      addToast("Institution supprimée");
      setDeleteModalOpen(false);
      setInstitutionToDelete(null);
      setDeleteCodeInput("");
    } catch (e) {
      console.error(e);
      addToast(e.message || "Erreur suppression", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered + sorted list
  const filtered = institutions
    .filter((i) => {
      const nom = (i.Institution_nom || "").toLowerCase();
      const code = (i.Institution_code || "").toLowerCase();
      return (nom + code).includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aKey = sortField === "nom" ? (a.Institution_nom || "") : (a.Institution_code || "");
      const bKey = sortField === "nom" ? (b.Institution_nom || "") : (b.Institution_code || "");
      return sortOrder === "asc" ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
    });

  if (isLoading) {
    return (
      <div className="p-10 flex justify-center">
        <SpinnerIcon className="text-4xl animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className={AppStyles.header.container}>
        <h1 className={AppStyles.header.title}>Institutions ({filtered.length})</h1>

        <div className={AppStyles.header.controls}>
          <div className="flex items-center gap-2 relative">
            <YearMultiSelect years={yearsList} selectedYearIds={selectedYearsIds} onChange={setSelectedYearsIds} />
            {isRefreshing && <span className="absolute left-full ml-2 text-xs text-gray-500">Mise à jour…</span>}
          </div>

          <input
            className={AppStyles.input.text}
            placeholder="Rechercher… (nom ou code)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white text-sm">
            <span className="text-xs font-bold uppercase text-gray-500">Tri :</span>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="nom">Nom</option>
              <option value="code">Code</option>
            </select>

            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
              <SortIcon order={sortOrder} />
            </button>
          </div>

          <button className={AppStyles.button.icon} onClick={() => setView(view === "grid" ? "list" : "grid")}>
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* Add card + List */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-3"}>
        <div onClick={() => openModal(null)} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <PlusIcon />
          <span className="font-bold text-blue-700 text-sm">Créer institution</span>
        </div>

        <AnimatePresence>
          {filtered.map((inst) => (
            <motion.div
              key={inst.Institution_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <CardItem
                viewMode={view}
                title={inst.Institution_nom}
                subTitle={inst.Institution_code}
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MODALE FORMULAIRE — VERSION PREMIUM AVEC ID TOUJOURS AFFICHÉ */}
      <DraggableModal
            isOpen={modalOpen}
            onClose={closeModal}
            title={editInstitution ? "Modifier Institution" : "Nouvelle Institution"}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* --- LOGO + ID + CODE --- */}
              <div className="flex gap-4">
                
                {/* LOGO */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-300 
                              cursor-pointer overflow-hidden flex items-center justify-center
                              hover:border-blue-500 transition-colors relative group"
                  >
                    {form.logo ? (
                      <img
                        src={URL.createObjectURL(form.logo)}
                        className="w-full h-full object-cover"
                        alt="Nouveau logo"
                      />
                    ) : form.logoPath ? (
                      <img
                        src={`http://127.0.0.1:8000${form.logoPath}`}
                        className="w-full h-full object-cover"
                        alt="Logo actuel"
                      />
                    ) : (
                      <PlusIcon className="text-gray-400 text-2xl" />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/15 hidden group-hover:flex 
                                    items-center justify-center text-white text-xs">
                      Changer
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, logo: e.target.files[0] }))}
                  />

                  <span className="text-[10px] font-bold text-gray-500 uppercase">Logo</span>
                </div>

                {/* ID + CODE */}
                <div className="flex-1 space-y-3">

                  {/* ID — TOUJOURS AFFICHÉ */}
                  <div>
                    <span className={AppStyles.input.label}>Identifiant (Auto)</span>
                    <input
                      value={form.id}
                      disabled
                      className={AppStyles.input.formControlDisabled}
                    />
                  </div>

                  {/* Code institution */}
                  <div>
                    <span className={AppStyles.input.label}>
                      Code Institution <span className="text-red-500">*</span>
                    </span>
                    <input
                      value={form.code}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                      }
                      className={`${AppStyles.input.formControl} uppercase font-bold ${
                        errors.code ? "border-red-500" : ""
                      }`}
                      placeholder="Ex: UFIV"
                    />
                    {errors.code && (
                      <p className="text-xs text-red-500 mt-1">{errors.code}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* --- NOM / TYPE / ABBRÉVIATION --- */}
              <div className="grid grid-cols-2 gap-4">

                {/* NOM */}
                <div className="col-span-2">
                  <span className={AppStyles.input.label}>
                    Nom de l'Institution <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                    className={`${AppStyles.input.formControl} ${
                      errors.nom ? "border-red-500" : ""
                    }`}
                    placeholder="Ex: Université de Fianarantsoa"
                  />
                  {errors.nom && (
                    <p className="text-xs text-red-500 mt-1">{errors.nom}</p>
                  )}
                </div>

                {/* TYPE */}
                <div>
                  <span className={AppStyles.input.label}>
                    Type <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value }))
                    }
                    className={`${AppStyles.input.formControl} ${
                      errors.type ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="PRIVE">PRIVE</option>
                  </select>
                  {errors.type && (
                    <p className="text-xs text-red-500 mt-1">{errors.type}</p>
                  )}
                </div>

                {/* ABBRÉVIATION */}
                <div>
                  <span className={AppStyles.input.label}>Abréviation</span>
                  <input
                    value={form.abbreviation}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, abbreviation: e.target.value }))
                    }
                    className={AppStyles.input.formControl}
                  />
                </div>
              </div>

              {/* --- DESCRIPTION --- */}
              <div>
                <span className={AppStyles.input.label}>Description</span>
                <textarea
                  rows="2"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={AppStyles.input.formControl}
                />
              </div>

              {/* --- FOOTER --- */}
              <div className="flex justify-between items-center mt-4 pt-2 border-t">

                {/* Bouton historique uniquement en édition */}
                {editInstitution && (
                  <button
                    type="button"
                    onClick={() => setHistoryManagerOpen(true)}
                    className="flex items-center gap-2 text-blue-600 hover:bg-blue-50
                              px-2 py-1 rounded text-xs font-bold"
                  >
                    <FaHistory /> Gérer Historique
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className={AppStyles.button.secondary}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={AppStyles.button.primary}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </DraggableModal>

      {/* Entity history manager */}
      {editInstitution && (
        <EntityHistoryManager
          isOpen={historyManagerOpen}
          onClose={() => setHistoryManagerOpen(false)}
          entityId={editInstitution.Institution_id}
          entityType="institutions"
          title={`Historique : ${editInstitution.Institution_nom}`}
        />
      )}

      {/* Delete confirm */}
      {/* Delete confirm */}
      <ConfirmModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        title="⚠️ Suppression définitive"
      >
        <div className="bg-red-50 text-red-800 p-3 rounded mb-4 text-sm border border-red-200">
          <strong>Attention :</strong> Cette action est irréversible.
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>L'institution <b>{institutionToDelete?.Institution_nom}</b> sera supprimée.</li>
            <li>Toutes les données d'<strong>historique associées</strong> seront effacées.</li>
            <li>Les liens avec les composantes ou enseignants pourraient être brisés.</li>
          </ul>
        </div>

        <p className="text-gray-700 mb-2 text-sm">
          Pour confirmer la suppression, veuillez saisir le code exact : 
          <span className="font-mono font-bold ml-1 select-all">{institutionToDelete?.Institution_code}</span>
        </p>

        <input 
          value={deleteCodeInput} 
          onChange={(e) => setDeleteCodeInput(e.target.value)} 
          className={`${AppStyles.input.formControl} border-red-300 focus:border-red-500`}
          placeholder="Saisissez le code ici..."
        />

        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={() => setDeleteModalOpen(false)} 
            className={AppStyles.button.secondary} 
            disabled={isDeleting}
          >
            Annuler
          </button>
          <button 
            onClick={confirmDelete} 
            className={AppStyles.button.danger} 
            disabled={isDeleting || deleteCodeInput !== institutionToDelete?.Institution_code}
          >
            {isDeleting ? <SpinnerIcon className="animate-spin inline text-sm" /> : "Supprimer définitivement"}
          </button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default Administration;
