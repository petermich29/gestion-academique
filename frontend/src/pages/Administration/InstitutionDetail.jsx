import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BiSolidInstitution } from "react-icons/bi";
import { FaChevronLeft, FaChevronRight, FaCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";

import { 
  ThIcon, ListIcon, PlusIcon, EditIcon, SpinnerIcon, SortIcon, LibraryIcon
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem"; 
import YearMultiSelect from "../../components/ui/YearMultiSelect";

const API_BASE_URL = "http://127.0.0.1:8000";

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- États Données ---
  const [institution, setInstitution] = useState(null);
  const [composantes, setComposantes] = useState([]);
  const [institutionsList, setInstitutionsList] = useState([]); 
  
  const [years, setYears] = useState([]); 
  const [selectedYearsIds, setSelectedYearsIds] = useState([]);

  // --- États UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Toasts ---
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
  };
  const removeToast = (toastId) => setToasts((prev) => prev.filter((t) => t.id !== toastId));

  // --- Modales ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editComposante, setEditComposante] = useState(null);
  const [composanteToDelete, setComposanteToDelete] = useState(null);
  
  const [form, setForm] = useState({
    id: "", 
    code: "",
    label: "",
    abbreviation: "",
    description: "",
    logo: null,     
    logoPath: "",
    yearsHistory: [] 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null); 
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // 1. CHARGEMENT LISTE GLOBALE (pour nav prev/next)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setInstitutionsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  // 2. CHARGEMENT DÉTAIL + ANNÉES + COMPOSANTES FILTRÉES
  useEffect(() => {
    if (!institution) setIsLoading(true);
    else setIsRefreshing(true);

    setSearch(""); 
    const fetchData = async () => {
      try {
        // A. Charger Institution
        const resInst = await fetch(`${API_BASE_URL}/api/institutions/${id}`);
        if (!resInst.ok) throw new Error("Institution introuvable");
        const dataInst = await resInst.json();
        setInstitution(dataInst);

        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: dataInst.Institution_nom || "Détail", path: `/institution/${id}` },
          ]);
        }

        // B. Charger Années (et définir la sélection par défaut)
        const resYear = await fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`);
        let currentSelectionIds = selectedYearsIds;

        if (resYear.ok) {
            const dataYears = await resYear.json();
            setYears(dataYears);
            
            // Si aucune sélection, on prend l'année active
            if (selectedYearsIds.length === 0 && dataYears.length > 0) {
                const active = dataYears.find(y => y.AnneeUniversitaire_is_active);
                if (active) {
                    currentSelectionIds = [active.AnneeUniversitaire_id];
                    setSelectedYearsIds(currentSelectionIds);
                }
            }
        }

        // C. Charger Composantes filtrées par année(s)
        const queryParams = new URLSearchParams();
        queryParams.append("institution_id", id);
        // Important : On passe les années sélectionnées au backend pour filtrer
        currentSelectionIds.forEach(yearId => queryParams.append("annees", yearId));
        
        const fetchUrl = `${API_BASE_URL}/api/composantes/institution?${queryParams.toString()}`;
        const resComp = await fetch(fetchUrl);
        const dataComp = resComp.ok ? await resComp.json() : [];
        setComposantes(Array.isArray(dataComp) ? dataComp : []);

      } catch (err) {
        addToast(err.message || "Erreur de chargement", "error");
        if(!institution) setInstitution(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchData();
  }, [id, setBreadcrumb, selectedYearsIds]); // Se déclenche quand selectedYearsIds change

  // 3. NAVIGATION PREV/NEXT
  const handleNavigate = (direction) => {
    if (!institutionsList.length || !institution) return;
    const currentIndex = institutionsList.findIndex(i => i.Institution_id === institution.Institution_id);
    if (currentIndex === -1) return;
    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < institutionsList.length) {
      navigate(`/institution/${institutionsList[newIndex].Institution_id}`);
    }
  };
  const isFirst = institutionsList.length > 0 && institution && institutionsList[0].Institution_id === institution.Institution_id;
  const isLast = institutionsList.length > 0 && institution && institutionsList[institutionsList.length - 1].Institution_id === institution.Institution_id;

  // 4. GESTION FORMULAIRE (CRUD)
  const openModal = async (comp = null) => {
    setErrors({});
    setShowAdvanced(false);

    if (comp) {
      // MODE MODIFICATION
      setEditComposante(comp);
      
      // Récupération de l'historique des années pour pré-cocher
      let historyIds = [];
      try {
          const resHist = await fetch(`${API_BASE_URL}/api/composantes/${comp.Composante_id}/annees-historique`);
          if (resHist.ok) {
              historyIds = await resHist.json();
          }
      } catch (e) {
          console.error("Erreur chargement historique composante", e);
      }

      setForm({
        id: comp.Composante_id,
        code: comp.Composante_code,
        label: comp.Composante_label,
        abbreviation: comp.Composante_abbreviation || "",
        description: comp.Composante_description || "",
        logo: null,
        logoPath: comp.Composante_logo_path || "",
        yearsHistory: historyIds // On met à jour avec les années récupérées
      });
      setModalOpen(true);
    } else {
      // MODE CRÉATION
      // Par défaut, on coche l'année active
      const defaultYears = years.filter(y => y.AnneeUniversitaire_is_active).map(y => y.AnneeUniversitaire_id);
      
      setForm({ 
        id: "Chargement...", 
        code: "", 
        label: "", 
        abbreviation: "", 
        description: "",
        logo: null,
        logoPath: "",
        yearsHistory: defaultYears
      });
      setEditComposante(null);
      setModalOpen(true);

      try {
        const res = await fetch(`${API_BASE_URL}/api/composantes/next-id`);
        if(res.ok) {
            const nextId = await res.json();
            setForm(prev => ({ ...prev, id: nextId }));
        } else {
            setForm(prev => ({ ...prev, id: "Erreur ID" }));
        }
      } catch (e) {
          console.error("Erreur fetch ID", e);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditComposante(null);
    setShowAdvanced(false);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "logo" && files) {
      setForm(prev => ({ ...prev, logo: files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    setErrors(prev => ({ ...prev, [name]: undefined }));
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
    setErrors({});

    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "Le code est requis.";
    if (!form.label.trim()) newErrors.label = "Le nom est requis.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("composante_label", form.label);
    formData.append("institution_id", id);
    if (form.abbreviation) formData.append("composante_abbreviation", form.abbreviation);
    if (form.description) formData.append("composante_description", form.description);
    if (form.logo) formData.append("logo_file", form.logo);
    
    // Envoi des années cochées
    if (form.yearsHistory && form.yearsHistory.length > 0) {
        form.yearsHistory.forEach(yId => {
            formData.append("annees_universitaires", yId);
        });
    }
    
    try {
      let url = `${API_BASE_URL}/api/composantes/`;
      let method = "POST";

      if (editComposante) {
        url += `${editComposante.Composante_code}`;
        method = "PUT";
      } else {
        formData.append("composante_code", form.code);
      }

      const res = await fetch(url, { method: method, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors de la sauvegarde.");
      }

      const savedComp = await res.json();
      
      // Mise à jour locale de la liste
      setComposantes(prev => {
        if (editComposante) {
          return prev.map(c => c.Composante_code === editComposante.Composante_code ? savedComp : c);
        } else {
          // On ajoute seulement si l'année affichée correspond à une des années cochées
          const isVisibleInCurrentView = form.yearsHistory.some(y => selectedYearsIds.includes(y));
          if (isVisibleInCurrentView || selectedYearsIds.length === 0) {
              return [...prev, savedComp];
          }
          return prev;
        }
      });
      addToast(editComposante ? "Établissement modifié." : "Établissement créé.");
      closeModal();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (comp) => {
    setComposanteToDelete(comp);
    setDeleteCodeInput("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!composanteToDelete) return;
    if (deleteCodeInput.trim() !== composanteToDelete.Composante_code) {
      setDeleteError("Le code ne correspond pas.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/composantes/${composanteToDelete.Composante_code}`, { method: "DELETE" });
      if (res.ok) {
        setComposantes(prev => prev.filter(c => c.Composante_code !== composanteToDelete.Composante_code));
        addToast("Établissement supprimé.");
        setDeleteModalOpen(false);
      } else {
        const err = await res.json();
        addToast(err.detail || "Impossible de supprimer.", "error");
      }
    } catch (err) {
      addToast("Erreur de connexion.", "error");
    }
  };

  // 5. RENDU
  const safeComposantes = Array.isArray(composantes) ? composantes : [];
  const filteredComposantes = safeComposantes
    .filter(comp => {
      const term = search.toLowerCase();
      const name = (comp.Composante_label || "").toLowerCase();
      const code = (comp.Composante_code || "").toLowerCase();
      const abbr = (comp.Composante_abbreviation || "").toLowerCase();
      return name.includes(term) || code.includes(term) || abbr.includes(term);
    })
    .sort((a, b) => {
      const valA = sortField === 'code' ? a.Composante_code : a.Composante_label;
      const valB = sortField === 'code' ? b.Composante_code : b.Composante_label;
      return sortOrder === 'asc' 
        ? String(valA || "").localeCompare(String(valB || ""))
        : String(valB || "").localeCompare(String(valA || ""));
    });

  if (isLoading) return (
      <div className={AppStyles.pageContainer}>
         <div className={AppStyles.header.container}>
             <h2 className={AppStyles.mainTitle}>Détails de l'Institution</h2>
         </div>
         <hr className={AppStyles.separator} />
         <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl" /></div>
      </div>
  );

  if (!institution) return <div className="p-10 text-center">Institution introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER PRINCIPAL */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.mainTitle}>Détails de l'Institution</h2>
      </div>
      <hr className={AppStyles.separator} />

      {/* HEADER INSTITUTION INFO */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative"
      >
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {institution.Institution_logo_path ? (
            <img src={`${API_BASE_URL}${institution.Institution_logo_path}`} alt="Logo" className="w-24 h-24 object-contain border rounded-lg bg-gray-50 p-2" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><LibraryIcon className="w-10 h-10" /></div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">{institution.Institution_nom}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold">{institution.Institution_code}</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border">{institution.Institution_type}</span>
          </div>
          {institution.Institution_description && <p className="text-gray-500 text-sm max-w-3xl italic">{institution.Institution_description}</p>}
        </div>
        <div className="absolute top-4 right-4 flex gap-1">
          <button onClick={() => handleNavigate('prev')} disabled={isFirst} className={`p-2 rounded-full border transition-colors ${isFirst ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronLeft /></button>
          <button onClick={() => handleNavigate('next')} disabled={isLast} className={`p-2 rounded-full border transition-colors ${isLast ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronRight /></button>
        </div>
      </motion.div>

      {/* CONTROLS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Établissements ({filteredComposantes.length})</h2>
        <div className={AppStyles.header.controls}>
          
          <div className="flex items-center gap-2 relative">
             <YearMultiSelect 
               years={years}
               selectedYearIds={selectedYearsIds}
               onChange={setSelectedYearsIds}
             />
             {isRefreshing && (
               <div className="absolute left-full ml-2 w-max text-xs text-gray-500 whitespace-nowrap">
                  Mise à jour...
               </div>
             )}
          </div>

          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className={AppStyles.input.text} />
          <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white text-sm">
            <span className="font-semibold text-gray-600 text-xs uppercase">Tri:</span>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border-none bg-transparent outline-none cursor-pointer text-gray-700 font-medium">
              <option value="label">Nom</option>
              <option value="code">Code</option>
            </select>
            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          </div>
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* LISTE / GRID */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
        <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}>
            <PlusIcon />
          </div>
          <p className="text-sm font-semibold text-blue-700">Ajouter</p>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredComposantes.map((comp) => {
            const mentionsList = comp.mentions || [];
            const mentionsCount = mentionsList.length;

            return (
              <CardItem
                key={comp.Composante_code}
                viewMode={view}
                title={comp.Composante_abbreviation || comp.Composante_label}
                subTitle={comp.Composante_abbreviation ? comp.Composante_label : comp.Composante_code}
                imageSrc={comp.Composante_logo_path ? `${API_BASE_URL}${comp.Composante_logo_path}` : null}
                PlaceholderIcon={BiSolidInstitution} 
                onClick={() => navigate(`/institution/${id}/etablissement/${comp.Composante_code}`, { state: { composante: comp } })}
                onEdit={() => openModal(comp)}
                onDelete={() => handleDeleteClick(comp)}
              >
                <div className="mt-3 pt-2 border-t border-gray-100 w-full">
                    {view === "grid" && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Mentions</span>
                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                {mentionsCount}
                            </span>
                        </div>
                    )}
                    {view === "list" && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-2">Mentions :</span>
                            {mentionsCount > 0 ? (
                                mentionsList.map((ment, idx) => (
                                    <span key={idx} className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                        <FaCircle className="w-1.5 h-1.5 text-blue-500" />
                                        {ment.Mention_label || ment.label}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-400 italic">Aucune mention</span>
                            )}
                        </div>
                    )}
                </div>
              </CardItem>
            );
          })}
        </AnimatePresence>
      </div>

      {/* MODAL FORMULAIRE */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editComposante ? "Modifier l'Établissement" : "Nouvel Établissement"} widthClass="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer relative group hover:border-blue-400 transition-colors" onClick={() => fileInputRef.current.click()}>
                {form.logo ? (
                  <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="Preview" />
                ) : form.logoPath ? (
                  <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover" alt="Current" />
                ) : (
                  <PlusIcon className="text-gray-400 text-3xl" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <EditIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" name="logo" accept="image/*" />
              <span className="text-xs text-gray-500 font-medium">Logo</span>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-3">
               <label>
                 <span className={AppStyles.input.label}>ID (Automatique)</span>
                 <input type="text" name="id" value={form.id} disabled className={`${AppStyles.input.formControlDisabled} font-mono font-bold text-gray-600`} />
               </label>
               <label>
                 <span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span>
                 <input type="text" name="code" value={form.code} onChange={handleChange} disabled={!!editComposante} className={!!editComposante ? AppStyles.input.formControlDisabled : `${AppStyles.input.formControl} uppercase font-semibold ${errors.code ? "border-red-500" : ""}`} placeholder="Ex: FDS" />
                 {errors.code && <span className={AppStyles.input.errorText}>{errors.code}</span>}
               </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <label className="sm:col-span-2">
               <span className={AppStyles.input.label}>Nom complet <span className="text-red-500">*</span></span>
               <input type="text" name="label" value={form.label} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.label ? "border-red-500" : ""}`} placeholder="Ex: Faculté des Sciences" />
               {errors.label && <span className={AppStyles.input.errorText}>{errors.label}</span>}
             </label>
             <label>
               <span className={AppStyles.input.label}>Abréviation</span>
               <input type="text" name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Ex: Sc. & Tech." />
             </label>
          </div>

          <label>
            <span className={AppStyles.input.label}>Description</span>
            <textarea name="description" rows="3" value={form.description} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Description optionnelle..." />
          </label>

          {/* 🆕 SECTION OPTIONS AVANCÉES (HISTORIQUE) */}
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
                            {editComposante 
                                ? "Ajouter l'établissement à l'historique d'autres années :" 
                                : "Cochez les années pour lesquelles cet établissement doit être actif :"
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

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
              {isSubmitting && <SpinnerIcon className="animate-spin" />} {editComposante ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* MODAL SUPPRESSION */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer l'établissement ?">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Vous allez supprimer définitivement : <br/><b className="text-gray-800 text-base">{composanteToDelete?.Composante_label}</b></p>
          <div className="bg-red-50 p-3 rounded border border-red-100">
            <label className="block text-xs font-bold text-red-800 mb-1">
              Confirmez en tapant : <span className="font-mono bg-white px-1 rounded border border-red-200">{composanteToDelete?.Composante_code}</span>
            </label>
            <input type="text" value={deleteCodeInput} onChange={(e) => { setDeleteCodeInput(e.target.value); setDeleteError(""); }} className="w-full border border-red-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            {deleteError && <p className={AppStyles.input.errorText}>{deleteError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
            <button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default InstitutionDetail;