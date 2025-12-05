// src/pages/Administration/InstitutionDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useOutletContext, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { FaUniversity, FaChevronLeft, FaHistory } from "react-icons/fa";

import {
  LibraryIcon, ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import EntityHistoryManager from "../../components/ui/EntityHistoryManager";
import YearMultiSelect from "../../components/ui/YearMultiSelect";

import { useAdministration } from "../../context/AdministrationContext";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

const API_BASE_URL = "http://127.0.0.1:8000";

const InstitutionDetail = () => {
  const { id: institutionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();              // <-- AJOUT IMPORTANT
  const { setBreadcrumb } = useBreadcrumb();

  const { selectedYearsIds, setSelectedYearsIds, yearsList } = useAdministration();

  const [institution, setInstitution] = useState(null);
  const [composantes, setComposantes] = useState([]);
  const [typesComposante, setTypesComposante] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const firstLoadRef = useRef(true);

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");

  const [modalOpen, setModalOpen] = useState(false);
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editComposante, setEditComposante] = useState(null);
  const [composanteToDelete, setComposanteToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  const [form, setForm] = useState({
    id: "", code: "", label: "",
    type_id: "", abbreviation: "", description: "",
    logo: null, logoPath: ""
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --------------------------
  // CHARGEMENT DES RÉFÉRENCES
  // --------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const resTypes = await fetch(`${API_BASE_URL}/api/metadonnees/types-composante`);
        if (resTypes.ok) setTypesComposante(await resTypes.json());
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // --------------------------
  // CHARGEMENT DES DONNÉES
  // --------------------------
  useEffect(() => {
    const fetchData = async () => {
      if (firstLoadRef.current) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        // Institution
        const resInst = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
        if (!resInst.ok) throw new Error("Institution introuvable");
        setInstitution(await resInst.json());

        // Composantes
        const params = new URLSearchParams();
        params.append("institution_id", institutionId);
        selectedYearsIds.forEach(id => params.append("annees", id));

        const resComp = await fetch(`${API_BASE_URL}/api/composantes/institution?${params}`);
        if (resComp.ok) setComposantes(await resComp.json());

      } catch (err) {
        addToast(err.message, "error");
      }

      setIsLoading(false);
      setIsRefreshing(false);
      firstLoadRef.current = false;
    };

    fetchData();
  }, [institutionId, selectedYearsIds]);

  // --------------------------
  // BREADCRUMB CORRIGÉ
  // --------------------------
  useEffect(() => {
    if (institution && setBreadcrumb) {
      setBreadcrumb([
        { label: "Administration", path: "/administration" },
        { label: institution.Institution_nom, path: `/institution/${institutionId}` },
      ]);
    }
  }, [institution, setBreadcrumb, institutionId]);

  // --------------------------
  // FORMULAIRE
  // --------------------------
  const fetchNextComposanteId = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/composantes/next-id`);
      if (!res.ok) throw new Error("Erreur ID");
      return await res.json();
    } catch (e) {
      addToast("Erreur ID : " + e.message, "error");
      return "";
    }
  };

  const openModal = async (comp = null) => {
    setErrors({});
    if (comp) {
      setEditComposante(comp);
      setForm({
        id: comp.Composante_id,
        code: comp.Composante_code,
        label: comp.Composante_label,
        type_id: comp.Composante_type || "",
        abbreviation: comp.Composante_abbreviation || "",
        description: comp.Composante_description || "",
        logo: null,
        logoPath: comp.Composante_logo_path || ""
      });
    } else {
      setEditComposante(null);
      setForm({
        id: "Chargement...",
        code: "",
        label: "",
        type_id: "",
        abbreviation: "",
        description: "",
        logo: null,
        logoPath: ""
      });

      const nextId = await fetchNextComposanteId();
      setForm(prev => ({ ...prev, id: nextId }));
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditComposante(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "Requis";
    if (!form.label.trim()) newErrors.label = "Requis";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const fd = new FormData();
    let url = `${API_BASE_URL}/api/composantes/`;
    let method = "POST";

    if (editComposante) {
      url += editComposante.Composante_id;
      method = "PUT";
    } else {
      fd.append("id_composante", form.id);
      const active = yearsList.find(y => y.AnneeUniversitaire_is_active);
      if (active) fd.append("annees_universitaires", active.AnneeUniversitaire_id);
    }

    fd.append("institution_id_fk", institutionId);
    fd.append("code", form.code);
    fd.append("Composante_label", form.label);
    fd.append("Composante_type", form.type_id || "");

    if (form.abbreviation) fd.append("Composante_abbreviation", form.abbreviation);
    if (form.description) fd.append("Composante_description", form.description);
    if (form.logo) fd.append("logo", form.logo);

    try {
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur serveur");
      }

      const saved = await res.json();

      saved.Composante_type = form.type_id || null;
      if (form.type_id) {
        const selectedType = typesComposante.find(t => t.TypeComposante_id === form.type_id);
        if (selectedType) saved.type_composante = selectedType;
      }

      setComposantes(prev =>
        editComposante
          ? prev.map(c => c.Composante_id === saved.Composante_id ? saved : c)
          : [...prev, saved]
      );

      addToast(editComposante ? "Établissement modifié" : "Établissement créé");
      closeModal();

    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== composanteToDelete?.Composante_code) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/composantes/${composanteToDelete.Composante_id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setComposantes(prev => prev.filter(c => c.Composante_id !== composanteToDelete.Composante_id));
        addToast("Supprimé avec succès");
        setDeleteModalOpen(false);
      } else {
        addToast("Impossible de supprimer", "error");
      }

    } catch (e) {
      addToast("Erreur connexion", "error");
    }
  };

  const filtered = composantes
    .filter(c => (c.Composante_label + c.Composante_code + (c.Composante_abbreviation || "")).toLowerCase()
      .includes(search.toLowerCase()))
    .sort((a, b) => {
      const valA = sortField === "label" ? a.Composante_label : a.Composante_code;
      const valB = sortField === "label" ? b.Composante_label : b.Composante_code;
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  if (isLoading)
    return (
      <div className="p-10 flex justify-center">
        <SpinnerIcon className="animate-spin text-4xl text-blue-600" />
      </div>
    );

  if (!institution) return <div className="p-10">Institution introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6 mb-6">
        <div>
          {institution.Institution_logo_path ? (
            <img
              src={`${API_BASE_URL}${institution.Institution_logo_path}`}
              className="w-20 h-20 object-contain"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              <FaUniversity size={35} />
            </div>
          )}
        </div>

        <div>
          <div
            className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1"
            onClick={() => navigate("/administration")}
          >
            <FaChevronLeft /> Retour Liste
          </div>

          <h1 className="text-2xl font-bold mt-1">{institution.Institution_nom}</h1>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold font-mono">
            {institution.Institution_code}
          </span>
        </div>
      </div>

      {/* COMPOSANTES */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>
          Établissements / Composantes ({filtered.length})
        </h2>

        <div className={AppStyles.header.controls}>
          <div className="flex items-center gap-2 relative">
            <YearMultiSelect
              years={yearsList}
              selectedYearIds={selectedYearsIds}
              onChange={setSelectedYearsIds}
            />
            {isRefreshing && (
              <span className="absolute left-full ml-2 text-xs text-gray-500">MAJ…</span>
            )}
          </div>

          <input
            className={AppStyles.input.text}
            placeholder="Rechercher…"
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
              <option value="label">Nom</option>
              <option value="code">Code</option>
            </select>
            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
              <SortIcon order={sortOrder} />
            </button>
          </div>

          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className={AppStyles.button.icon}
          >
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
        <div
          onClick={() => openModal()}
          className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}
        >
          <PlusIcon /> <span className="font-bold text-blue-700 text-sm">Ajouter</span>
        </div>

        <AnimatePresence>
          {filtered.map((comp) => {
            const typeLabel =
              comp.type_composante?.TypeComposante_label ||
              typesComposante.find((t) => t.TypeComposante_id === comp.Composante_type)
                ?.TypeComposante_label ||
              "Non défini";

            return (
              <CardItem
                key={comp.Composante_id}
                viewMode={view}
                title={comp.Composante_abbreviation || comp.Composante_label}
                subTitle={comp.Composante_label}
                imageSrc={
                  comp.Composante_logo_path
                    ? `${API_BASE_URL}${comp.Composante_logo_path}`
                    : null
                }
                PlaceholderIcon={LibraryIcon}
                onClick={() =>
                  navigate(`/institution/${institutionId}/etablissement/${comp.Composante_code}`, {
                    state: { composante: comp, institution },
                  })
                }
                onEdit={() => openModal(comp)}
                onDelete={() => {
                  setComposanteToDelete(comp);
                  setDeleteInput("");
                  setDeleteModalOpen(true);
                }}
              >
                <div className="mt-2 text-xs text-gray-400 flex justify-between w-full">
                  <span
                    className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[100px]"
                    title={typeLabel}
                  >
                    {typeLabel}
                  </span>
                  <span className="font-bold">
                    {comp.mentions ? comp.mentions.length : 0} Mentions
                  </span>
                </div>
              </CardItem>
            );
          })}
        </AnimatePresence>
      </div>

      {/* FORM MODAL */}
      <DraggableModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editComposante ? "Modifier Établissement" : "Nouvel Établissement"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Logo */}
            <div className="flex flex-col items-center gap-1">
              <div
                onClick={() => fileInputRef.current.click()}
                className="w-20 h-20 bg-gray-50 border rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden relative group"
              >
                {form.logo ? (
                  <img src={URL.createObjectURL(form.logo)} className="w-full h-full" />
                ) : form.logoPath ? (
                  <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full" />
                ) : (
                  <PlusIcon className="text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white text-xs">
                  Changer
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => setForm({ ...form, logo: e.target.files[0] })}
              />

              <span className="text-[10px] uppercase font-bold text-gray-500">Logo</span>
            </div>

            {/* ID + Code */}
            <div className="flex-1 space-y-3">
              <div>
                <span className={AppStyles.input.label}>ID (Auto)</span>
                <input value={form.id} disabled className={AppStyles.input.formControlDisabled} />
              </div>

              <div>
                <span className={AppStyles.input.label}>Code *</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className={`${AppStyles.input.formControl} uppercase font-bold ${
                    errors.code ? "border-red-500" : ""
                  }`}
                  placeholder="Ex: ENI"
                />
              </div>
            </div>
          </div>

          {/* Label / Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <span className={AppStyles.input.label}>Nom *</span>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className={`${AppStyles.input.formControl} ${errors.label ? "border-red-500" : ""}`}
              />
            </div>

            <div className="md:col-span-2">
              <span className={AppStyles.input.label}>Type d'établissement</span>
              <select
                value={form.type_id}
                onChange={(e) => setForm({ ...form, type_id: e.target.value })}
                className={AppStyles.input.formControl}
              >
                <option value="">-- Sélectionner --</option>
                {typesComposante.map((t) => (
                  <option key={t.TypeComposante_id} value={t.TypeComposante_id}>
                    {t.TypeComposante_label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <span className={AppStyles.input.label}>Abréviation</span>
              <input
                value={form.abbreviation}
                onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
                className={AppStyles.input.formControl}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <span className={AppStyles.input.label}>Description</span>
            <textarea
              rows="2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={AppStyles.input.formControl}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t mt-2">
            {editComposante ? (
              <button
                type="button"
                onClick={() => setHistoryManagerOpen(true)}
                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                <FaHistory /> Gérer Historique
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>
                Annuler
              </button>
              <button type="submit" className={AppStyles.button.primary}>
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </DraggableModal>

      {/* HISTORIQUE */}
      {editComposante && (
        <EntityHistoryManager
          isOpen={historyManagerOpen}
          onClose={() => setHistoryManagerOpen(false)}
          entityId={editComposante.Composante_id}
          entityType="composantes"
          title={`Historique : ${editComposante.Composante_label}`}
        />
      )}

      {/* DELETE */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer l'établissement ?"
      >
        <p className="text-gray-600 mb-2 text-sm">
          Tapez <b>{composanteToDelete?.Composante_code}</b> pour confirmer.
        </p>

        <input
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
          className={AppStyles.input.formControl}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>
            Annuler
          </button>
          <button onClick={handleDelete} className={AppStyles.button.danger}>
            Supprimer
          </button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default InstitutionDetail;
