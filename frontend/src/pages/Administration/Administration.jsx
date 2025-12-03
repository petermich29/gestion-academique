import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

import { 
  LibraryIcon, ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";

import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import YearMultiSelect from "../../components/ui/YearMultiSelect";

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
  return `INST_${String(nextNum).padStart(4, "000")}`.replace("000", "000").replace("000", "000");
};

const Administration = () => {
  // --- ÉTATS DONNÉES ---
  const [institutions, setInstitutions] = useState([]);
  const [years, setYears] = useState([]); 
  const [selectedYearsIds, setSelectedYearsIds] = useState([]); 

  // --- ÉTATS UI ---
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- TOASTS ---
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --- MODALS ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editInstitution, setEditInstitution] = useState(null);
  const [form, setForm] = useState({
    id: "", 
    code: "", 
    nom: "", 
    type: "", 
    abbreviation: "", 
    description: "", 
    logo: null, 
    logoPath: "",
    yearsHistory: [] 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const typesInstitution = ["PRIVE", "PUBLIC"];

  const firstLoadRef = useRef(true);

  // --- 1. CHARGEMENT INITIAL (Années uniquement) ---
  useEffect(() => {
    if (setBreadcrumb) setBreadcrumb([{ label: "Administration", path: "/administration" }]);

    const fetchYears = async () => {
      try {
        const resYears = await fetch(`${API_URL}/metadonnees/annees-universitaires`);
        const dataYears = resYears.ok ? await resYears.json() : [];
        setYears(dataYears);

        if (dataYears.length > 0) {
            // Sélection par défaut : Année active
            const activeYear = dataYears.find(y => y.AnneeUniversitaire_is_active);
            if (activeYear) {
                setSelectedYearsIds([activeYear.AnneeUniversitaire_id]);
            }
        }
      } catch (err) {
        console.error("Erreur chargement années", err);
        setIsLoading(false);
      }
    };

    fetchYears();
  }, [setBreadcrumb]);


  // --- 2. FILTRAGE DES INSTITUTIONS ---
  useEffect(() => {
    // Évite le double appel au montage si selectedYearsIds est vide mais va être rempli
    if (firstLoadRef.current && selectedYearsIds.length === 0) return;

    const fetchInstitutions = async () => {
      if (firstLoadRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const queryParams = new URLSearchParams();
        // On envoie les années sélectionnées au backend
        selectedYearsIds.forEach(id => queryParams.append("annees", id));
        const queryString = queryParams.toString();

        const fetchUrl = `${API_URL}/institutions${queryString ? `?${queryString}` : ''}`;
        const resInst = await fetch(fetchUrl);
        const dataInst = resInst.ok ? await resInst.json() : [];
        setInstitutions(Array.isArray(dataInst) ? dataInst : []);
      } catch (err) {
        console.error(err);
        addToast("Erreur lors du chargement des données", "error");
      } finally {
        if (firstLoadRef.current) {
          setIsLoading(false);
          firstLoadRef.current = false;
        } else {
          setIsRefreshing(false);
        }
      }
    };

    fetchInstitutions();
  }, [selectedYearsIds]); 

  const closeModal = () => {
    setModalOpen(false);
    setEditInstitution(null);
    setForm({ id: "", code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: "", yearsHistory: [] });
    setErrors({});
    setShowAdvanced(false);
  };

  const openModal = async (inst = null) => {
    let yearsToPreselect = [];

    if (inst) {
        // Mode modification : Récupération de l'historique
        try {
            // Requête pour obtenir les années cochées
            const res = await fetch(`${API_URL}/institutions/${inst.Institution_id}/annees-historique`);
            if (res.ok) {
                yearsToPreselect = await res.json();
            } else {
                console.error("Erreur chargement historique années", await res.text());
                addToast("Erreur lors du chargement de l'historique des années.", "error");
            }
        } catch (err) {
            console.error(err);
        }

        setForm({
            id: inst.Institution_id || "",
            code: inst.Institution_code || "",
            nom: inst.Institution_nom || "",
            type: inst.Institution_type || "",
            abbreviation: inst.Institution_abbreviation || "",
            description: inst.Institution_description || "",
            logo: null,
            logoPath: inst.Institution_logo_path || "",
            yearsHistory: yearsToPreselect, 
        });
    } else {
        // Mode création : Année active par défaut
        const defaultYears = years.filter(y => y.AnneeUniversitaire_is_active).map(y => y.AnneeUniversitaire_id);
        yearsToPreselect = defaultYears;

        setForm({
            id: getNextMinimalId(institutions.map((i) => i.Institution_id)),
            code: "",
            nom: "",
            type: "",
            abbreviation: "",
            description: "",
            logo: null,
            logoPath: "",
            yearsHistory: yearsToPreselect
        });
    }
    setErrors({});
    setEditInstitution(inst);
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleYearHistoryChange = (yearId, checked) => {
    setForm(prev => {
        const current = prev.yearsHistory || [];
        if (checked) {
            return { ...prev, yearsHistory: [...current, yearId] };
        } else {
            return { ...prev, yearsHistory: current.filter(id => id !== yearId) };
        }
    });
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

    // Envoi des années historiques
    if (form.yearsHistory && form.yearsHistory.length > 0) {
        form.yearsHistory.forEach(yId => {
            formData.append("annees_universitaires", yId);
        });
    }

    try {
      const method = editInstitution ? "PUT" : "POST";
      const res = await fetch(`${API_URL}/institutions`, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.detail || "Erreur de sauvegarde", "error");
        setIsSubmitting(false);
        return;
      }

      const newInst = await res.json();
      setInstitutions((prev) => {
        if (editInstitution) {
           return prev.map((i) => i.Institution_id === editInstitution.Institution_id ? newInst : i);
        }
        // Pour la création, on ajoute si l'institution est visible dans le filtre actuel
        const isVisible = form.yearsHistory.some(y => selectedYearsIds.includes(y)) || selectedYearsIds.length === 0;
        return isVisible ? [...prev, newInst] : prev;
      });
      addToast(editInstitution ? "Modifié avec succès" : "Créé avec succès");
      closeModal();
    } catch {
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
    .filter((inst) =>
      (inst.Institution_nom + " " + inst.Institution_code)
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const vA = sortField === "code" ? a.Institution_code : a.Institution_nom;
      const vB = sortField === "code" ? b.Institution_code : b.Institution_nom;
      return sortOrder === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });

  const AddButton = ({ grid }) => (
    <div
      onClick={() => openModal()}
      className={grid ? AppStyles.addCard.grid : AppStyles.addCard.list}
    >
      <div className={`${AppStyles.addCard.iconContainer} ${grid ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}>
        <PlusIcon />
      </div>
      <p className="text-sm font-semibold text-blue-700">Ajouter</p>
    </div>
  );

  if (isLoading)
    return (
      <div className={AppStyles.pageContainer}>
        <div className={AppStyles.header.container}>
            <h2 className={AppStyles.mainTitle}>Administration</h2>
        </div>
        <hr className={AppStyles.separator} />
        <div className="p-10 flex justify-center">
          <SpinnerIcon className="animate-spin text-4xl" />
        </div>
      </div>
    );

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.mainTitle}>Administration</h2>
      </div>
      <hr className={AppStyles.separator} />


      {/* CONTROLS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>
          Institutions ({filteredSorted.length})
        </h2>

        <div className={AppStyles.header.controls}>
          
          <div className="flex items-center gap-2 relative">
            <YearMultiSelect 
               years={years}
               selectedYearIds={selectedYearsIds}
               onChange={setSelectedYearsIds}
            />
            {isRefreshing && (
              <div className="absolute left-full ml-2 w-max text-xs text-gray-500 whitespace-nowrap">
                Mise à jour…
              </div>
            )}
          </div>
          
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={AppStyles.input.text}
          />

          <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white text-sm">
            <span className="font-semibold text-gray-600 text-xs uppercase">Tri :</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border-none bg-transparent outline-none cursor-pointer text-gray-700 font-medium"
            >
              <option value="nom">Nom</option>
              <option value="code">Code</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="hover:text-blue-600 p-1"
            >
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

      {/* LISTE / GRID */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
        <AddButton grid={view === "grid"} />

        <AnimatePresence {...AppStyles.animation.presenceProps}>
          {filteredSorted.map((inst) => (
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

      {/* MODALES */}
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
                {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="logo preview" /> : 
                 form.logoPath ? <img src={`http://127.0.0.1:8000${form.logoPath}`} className="w-full h-full object-cover" alt="logo" /> : 
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

          {/* SECTION OPTIONS AVANCÉES (Disponible Création + Modification) */}
          <div className="border rounded bg-gray-50/50 mt-2">
                <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    className="w-full flex items-center justify-between p-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                    <span>Options Avancées (Historique)</span>
                    {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                
                {showAdvanced && (
                    <div className="p-3 border-t bg-white">
                        <p className="text-xs text-gray-500 mb-2 italic">
                            {editInstitution 
                                ? "Cochez les années pour lesquelles cette institution est active (l'ajout/la modification est possible, la suppression via cette interface n'est pas supportée) :" 
                                : "Cochez les années pour lesquelles cette institution doit être active (par défaut l'année active) :"
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                            {years.map(y => (
                                <label key={y.AnneeUniversitaire_id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                                        checked={form.yearsHistory?.includes(y.AnneeUniversitaire_id)}
                                        onChange={(e) => handleYearHistoryChange(y.AnneeUniversitaire_id, e.target.checked)}
                                    />
                                    <span className={`text-xs ${y.AnneeUniversitaire_is_active ? "font-bold text-blue-700" : "text-gray-700"}`}>
                                        {y.AnneeUniversitaire_annee} {y.AnneeUniversitaire_is_active && "(Active)"}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
            <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
              {isSubmitting && <SpinnerIcon className="animate-spin" />} {editInstitution ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </DraggableModal>

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