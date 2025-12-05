// src/pages/Administration/Administration.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import {
  PlusIcon, ListIcon, ThIcon, SortIcon, SpinnerIcon, LibraryIcon
} from "../../components/ui/Icons";

import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { ToastContainer } from "../../components/ui/Toast";
import { CardItem } from "../../components/ui/CardItem";
import { AppStyles } from "../../components/ui/AppStyles";

import { useBreadcrumb } from "../../context/BreadcrumbContext";   // <<--- IMPORTANT

const API_BASE_URL = "http://127.0.0.1:8000";

const Administration = () => {
  const navigate = useNavigate();
  const { setBreadcrumb } = useBreadcrumb();   // <<--- UTILISE LE CONTEXT GLOBAL

  const [institutions, setInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  const [form, setForm] = useState({
    id: "",
    label: "",
    code: "",
    description: "",
    logo: null,
    logoPath: ""
  });

  const [editInst, setEditInst] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  // =========================================
  // 🟦 BREADCRUMB FIXÉ ICI AVEC CONTEXT GLOBAL
  // =========================================
  useEffect(() => {
    setBreadcrumb([
      { label: "Administration", path: "/administration" }
    ]);
  }, [setBreadcrumb]);

  // =========================================
  // 🔵 Toast utils
  // =========================================
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  };

  const removeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // =========================================
  // 🔵 Fetch institutions
  // =========================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/institutions`);

        if (!res.ok) throw new Error("Impossible de charger les institutions");

        setInstitutions(await res.json());
      } catch (err) {
        addToast(err.message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // =========================================
  // 🔵 Ouvrir/fermer modal
  // =========================================
  const openModal = (inst = null) => {
    setErrors({});

    if (inst) {
      setEditInst(inst);
      setForm({
        id: inst.Institution_id,
        label: inst.Institution_nom,
        code: inst.Institution_code,
        description: inst.Institution_description || "",
        logo: null,
        logoPath: inst.Institution_logo_path || ""
      });
    } else {
      setEditInst(null);
      setForm({
        id: "",
        label: "",
        code: "",
        description: "",
        logo: null,
        logoPath: ""
      });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditInst(null);
  };

  // =========================================
  // 🔵 Submit form
  // =========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.label.trim()) newErrors.label = "Requis";
    if (!form.code.trim()) newErrors.code = "Requis";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let url = `${API_BASE_URL}/api/institutions/`;
    let method = "POST";

    if (editInst) {
      url += editInst.Institution_id;
      method = "PUT";
    }

    const fd = new FormData();
    fd.append("Institution_nom", form.label);
    fd.append("Institution_code", form.code);
    if (form.description) fd.append("Institution_description", form.description);
    if (form.logo) fd.append("logo", form.logo);

    try {
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur serveur");
      }

      const saved = await res.json();

      if (editInst) {
        setInstitutions((prev) =>
          prev.map((i) =>
            i.Institution_id === saved.Institution_id ? saved : i
          )
        );
        addToast("Institution modifiée");
      } else {
        setInstitutions((prev) => [...prev, saved]);
        addToast("Institution créée");
      }

      closeModal();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // =========================================
  // 🔵 Delete institution
  // =========================================
  const confirmDelete = async () => {
    if (deleteInput !== institutionToDelete?.Institution_code) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/institutions/${institutionToDelete.Institution_id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Impossible de supprimer");

      setInstitutions((prev) =>
        prev.filter((i) => i.Institution_id !== institutionToDelete.Institution_id)
      );

      addToast("Institution supprimée");
      setDeleteModalOpen(false);
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // =========================================
  // 🔵 Filtrage + tri
  // =========================================
  const filtered = institutions
    .filter((i) =>
      (i.Institution_nom + i.Institution_code)
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const vA = sortField === "label" ? a.Institution_nom : a.Institution_code;
      const vB = sortField === "label" ? b.Institution_nom : b.Institution_code;
      return sortOrder === "asc"
        ? vA.localeCompare(vB)
        : vB.localeCompare(vA);
    });

  // =========================================
  // 🔵 Render
  // =========================================
  if (isLoading)
    return (
      <div className="p-10 flex justify-center">
        <SpinnerIcon className="text-4xl animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER */}
      <div className={AppStyles.header.container}>
        <h1 className={AppStyles.header.title}>
          Institutions ({filtered.length})
        </h1>

        <div className={AppStyles.header.controls}>
          <input
            className={AppStyles.input.text}
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white text-sm">
            <span className="text-xs font-bold uppercase text-gray-500">
              Tri :
            </span>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="label">Nom</option>
              <option value="code">Code</option>
            </select>

            <button
              onClick={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
            >
              <SortIcon order={sortOrder} />
            </button>
          </div>

          <button
            className={AppStyles.button.icon}
            onClick={() => setView(view === "grid" ? "list" : "grid")}
          >
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div
        className={
          view === "grid"
            ? AppStyles.gridContainer
            : "flex flex-col gap-3"
        }
      >
        <div
          onClick={() => openModal()}
          className={
            view === "grid"
              ? AppStyles.addCard.grid
              : AppStyles.addCard.list
          }
        >
          <PlusIcon />
          <span className="font-bold text-blue-700 text-sm">
            Créer institution
          </span>
        </div>

        <AnimatePresence>
          {filtered.map((inst) => (
            <CardItem
              key={inst.Institution_id}
              viewMode={view}
              title={inst.Institution_nom}
              subTitle={inst.Institution_code}
              imageSrc={
                inst.Institution_logo_path
                  ? `${API_BASE_URL}${inst.Institution_logo_path}`
                  : null
              }
              PlaceholderIcon={LibraryIcon}
              onClick={() =>
                navigate(`/institution/${inst.Institution_id}`)
              }
              onEdit={() => openModal(inst)}
              onDelete={() => {
                setInstitutionToDelete(inst);
                setDeleteInput("");
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
        title={
          editInst ? "Modifier Institution" : "Nouvelle Institution"
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Logo + code */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div
                onClick={() => fileInputRef.current.click()}
                className="w-20 h-20 bg-gray-50 border rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden relative group"
              >
                {form.logo ? (
                  <img
                    src={URL.createObjectURL(form.logo)}
                    className="w-full h-full"
                  />
                ) : form.logoPath ? (
                  <img
                    src={`${API_BASE_URL}${form.logoPath}`}
                    className="w-full h-full"
                  />
                ) : (
                  <PlusIcon className="text-gray-400" />
                )}

                <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white text-xs">
                  Changer
                </div>
              </div>

              <input
                type="file"
                className="hidden"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) =>
                  setForm({
                    ...form,
                    logo: e.target.files[0]
                  })
                }
              />

              <span className="text-[10px] uppercase font-bold text-gray-500">
                Logo
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <span className={AppStyles.input.label}>Code *</span>
                <input
                  className={`${AppStyles.input.formControl} uppercase font-bold ${
                    errors.code ? "border-red-500" : ""
                  }`}
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <span className={AppStyles.input.label}>Nom *</span>
            <input
              className={`${AppStyles.input.formControl} ${
                errors.label ? "border-red-500" : ""
              }`}
              value={form.label}
              onChange={(e) =>
                setForm({
                  ...form,
                  label: e.target.value
                })
              }
            />
          </div>

          <div>
            <span className={AppStyles.input.label}>Description</span>
            <textarea
              className={AppStyles.input.formControl}
              rows="2"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value
                })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className={AppStyles.button.secondary}
            >
              Annuler
            </button>
            <button type="submit" className={AppStyles.button.primary}>
              Enregistrer
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer l'institution ?"
      >
        <p className="text-gray-600 mb-2 text-sm">
          Tapez <b>{institutionToDelete?.Institution_code}</b> pour
          confirmer.
        </p>
        <input
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
          className={AppStyles.input.formControl}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className={AppStyles.button.secondary}
          >
            Annuler
          </button>
          <button
            onClick={confirmDelete}
            className={AppStyles.button.danger}
          >
            Supprimer
          </button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default Administration;
