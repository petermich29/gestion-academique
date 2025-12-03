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

// 🆕 Import du composant générique
import EntityHistoryManager from "../../components/ui/EntityHistoryManager";

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
  
  // 🆕 État pour le gestionnaire d'historique
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false);

  // --- Toasts & Modales ---
  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editComposante, setEditComposante] = useState(null);
  const [composanteToDelete, setComposanteToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const addToast = (message, type = "success") => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
  };
  const removeToast = (toastId) => setToasts((prev) => prev.filter((t) => t.id !== toastId));

  const [form, setForm] = useState({
    id: "", code: "", label: "", abbreviation: "", description: "", logo: null, logoPath: "", yearsHistory: [] 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null); 

  // --- 1. CHARGEMENT DONNÉES ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setInstitutionsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!institution) setIsLoading(true);
    else setIsRefreshing(true);

    setSearch(""); 
    const fetchData = async () => {
      try {
        // Institution
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

        // Années
        const resYear = await fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`);
        let currentSelectionIds = selectedYearsIds;
        if (resYear.ok) {
            const dataYears = await resYear.json();
            setYears(dataYears);
            if (selectedYearsIds.length === 0 && dataYears.length > 0) {
                const active = dataYears.find(y => y.AnneeUniversitaire_is_active);
                if (active) {
                    currentSelectionIds = [active.AnneeUniversitaire_id];
                    setSelectedYearsIds(currentSelectionIds);
                }
            }
        }

        // Composantes filtrées
        const queryParams = new URLSearchParams();
        queryParams.append("institution_id", id);
        currentSelectionIds.forEach(yearId => queryParams.append("annees", yearId));
        
        const resComp = await fetch(`${API_BASE_URL}/api/composantes/institution?${queryParams.toString()}`);
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
  }, [id, setBreadcrumb, selectedYearsIds]); 

  // --- 2. LOGIQUE NAVIGATION & FORMULAIRE ---
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

  const openModal = async (comp = null) => {
    setErrors({});
    setShowAdvanced(false);

    if (comp) {
        // --- MODE EDIT ---
        setEditComposante(comp);
        let historyIds = [];
        try {
            const resHist = await fetch(`${API_BASE_URL}/api/composantes/${comp.Composante_id}/annees-historique`);
            if (resHist.ok) historyIds = await resHist.json();
        } catch (e) { 
            console.error(e); 
        }

        setForm({
            id: comp.Composante_id,
            code: comp.Composante_code,
            label: comp.Composante_label,
            abbreviation: comp.Composante_abbreviation || "",
            description: comp.Composante_description || "",
            logo: null,
            logoPath: comp.Composante_logo_path || "",
            yearsHistory: historyIds
        });
        setModalOpen(true);

    } else {
        // --- MODE CREATE ---
        const defaultYears = years.filter(y => y.AnneeUniversitaire_is_active).map(y => y.AnneeUniversitaire_id);
        
        // Initialisation immédiate
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

        // Récupération asynchrone de l'ID
        try {
            const res = await fetch(`${API_BASE_URL}/api/composantes/next-id`);
            if (res.ok) {
                // CORRECTION ICI : On attend la réponse d'abord
                const nextId = await res.json(); 
                
                // Ensuite on met à jour le state (sans await à l'intérieur)
                setForm(prev => ({ ...prev, id: nextId }));
            } else {
                setForm(prev => ({ ...prev, id: "Erreur ID" }));
            }
        } catch (e) {
            console.error(e);
            setForm(prev => ({ ...prev, id: "Erreur" }));
        }
    }
};

  const closeModal = () => {
    setModalOpen(false);
    setEditComposante(null);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "logo" && files) setForm(prev => ({ ...prev, logo: files[0] }));
    else setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleYearHistoryChange = (yearId, checked) => {
    setForm(prev => {
        const current = prev.yearsHistory || [];
        return checked ? { ...prev, yearsHistory: [...current, yearId] } : { ...prev, yearsHistory: current.filter(id => id !== yearId) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!form.code.trim()) { setErrors({code: "Requis"}); setIsSubmitting(false); return; }
    if (!form.label.trim()) { setErrors({label: "Requis"}); setIsSubmitting(false); return; }

    const formData = new FormData();
    formData.append("composante_label", form.label);
    formData.append("institution_id", id);
    if (form.abbreviation) formData.append("composante_abbreviation", form.abbreviation);
    if (form.description) formData.append("composante_description", form.description);
    if (form.logo) formData.append("logo_file", form.logo);
    
    // Années sélectionnées (uniquement si création ou si le back gère la synchro massive lors de l'update)
    if (form.yearsHistory && form.yearsHistory.length > 0) {
        form.yearsHistory.forEach(yId => formData.append("annees_universitaires", yId));
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

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur sauvegarde.");
      }

      const savedComp = await res.json();
      setComposantes(prev => {
        if (editComposante) return prev.map(c => c.Composante_code === editComposante.Composante_code ? savedComp : c);
        // Ajout seulement si visible dans l'année active sélectionnée
        const isVisible = form.yearsHistory.some(y => selectedYearsIds.includes(y));
        return (isVisible || selectedYearsIds.length === 0) ? [...prev, savedComp] : prev;
      });
      addToast(editComposante ? "Modifié." : "Créé.");
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
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!composanteToDelete || deleteCodeInput.trim() !== composanteToDelete.Composante_code) {
      setDeleteError("Code incorrect.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/composantes/${composanteToDelete.Composante_code}`, { method: "DELETE" });
      if (res.ok) {
        setComposantes(prev => prev.filter(c => c.Composante_code !== composanteToDelete.Composante_code));
        addToast("Supprimé.");
        setDeleteModalOpen(false);
      } else {
        addToast("Impossible de supprimer.", "error");
      }
    } catch (err) { addToast("Erreur connexion.", "error"); }
  };

  // --- 3. RENDU ---
  const filteredComposantes = composantes
    .filter(comp => {
      const term = search.toLowerCase();
      return (comp.Composante_label||"").toLowerCase().includes(term) || (comp.Composante_code||"").toLowerCase().includes(term);
    })
    .sort((a, b) => {
      const valA = sortField === 'code' ? a.Composante_code : a.Composante_label;
      const valB = sortField === 'code' ? b.Composante_code : b.Composante_label;
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl" /></div>;
  if (!institution) return <div className="p-10 text-center">Introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* TITRE ET INFO INSTITUTION */}
      <div className={AppStyles.header.container}><h2 className={AppStyles.mainTitle}>Détails de l'Institution</h2></div>
      <hr className={AppStyles.separator} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
        <div className="flex-shrink-0">
          {institution.Institution_logo_path 
            ? <img src={`${API_BASE_URL}${institution.Institution_logo_path}`} className="w-24 h-24 object-contain border rounded-lg p-2" />
            : <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><LibraryIcon className="w-10 h-10" /></div>
          }
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold">{institution.Institution_nom}</h1>
          <div className="flex gap-2 text-sm"><span className="bg-blue-100 text-blue-800 px-2 rounded font-mono font-bold">{institution.Institution_code}</span></div>
          {institution.Institution_description && <p className="text-gray-500 text-sm italic">{institution.Institution_description}</p>}
        </div>
        <div className="absolute top-4 right-4 flex gap-1">
          <button onClick={() => handleNavigate('prev')} disabled={isFirst} className="p-2 border rounded-full hover:bg-gray-100"><FaChevronLeft /></button>
          <button onClick={() => handleNavigate('next')} disabled={isLast} className="p-2 border rounded-full hover:bg-gray-100"><FaChevronRight /></button>
        </div>
      </motion.div>

      {/* CONTROLS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Établissements ({filteredComposantes.length})</h2>
        <div className={AppStyles.header.controls}>
          <div className="flex items-center gap-2 relative">
             <YearMultiSelect years={years} selectedYearIds={selectedYearsIds} onChange={setSelectedYearsIds} />
             {isRefreshing && <span className="text-xs text-gray-500 absolute left-full ml-2 w-max">Mise à jour...</span>}
          </div>
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className={AppStyles.input.text} />
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>{view === "grid" ? <ListIcon /> : <ThIcon />}</button>
        </div>
      </div>

      {/* LISTE */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
        <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <PlusIcon className="text-2xl text-blue-500 mb-2" /><span className="text-sm font-bold text-blue-700">Ajouter</span>
        </div>
        <AnimatePresence>
          {filteredComposantes.map((comp) => (
              <CardItem
                key={comp.Composante_code}
                viewMode={view}
                title={comp.Composante_abbreviation || comp.Composante_label}
                subTitle={comp.Composante_code}
                imageSrc={comp.Composante_logo_path ? `${API_BASE_URL}${comp.Composante_logo_path}` : null}
                PlaceholderIcon={BiSolidInstitution} 
                onClick={() => navigate(`/institution/${id}/etablissement/${comp.Composante_code}`, { state: { composante: comp } })}
                onEdit={() => openModal(comp)}
                onDelete={() => handleDeleteClick(comp)}
              />
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL EDIT/CREATE */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editComposante ? "Modifier l'Établissement" : "Nouveau"} widthClass="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Logo & ID */}
          <div className="flex gap-4">
             <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => fileInputRef.current.click()}>
                <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden border flex items-center justify-center">
                    {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover"/> : form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover"/> : <PlusIcon className="text-gray-400"/>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" />
             </div>
             <div className="flex-1 space-y-2">
                <input value={form.id} disabled className={AppStyles.input.formControlDisabled} />
                <input name="code" value={form.code} onChange={handleChange} disabled={!!editComposante} className={`${AppStyles.input.formControl} uppercase font-bold`} placeholder="Code (ex: FDS)" />
             </div>
          </div>
          
          <input name="label" value={form.label} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Nom complet" />
          <input name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Abréviation" />
          <textarea name="description" value={form.description} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Description" />

          {/* HISTORIQUE */}
          <div className="border rounded bg-gray-50/50 mt-2">
             <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex justify-between p-2 text-xs font-bold text-gray-600">
                <span>Historique & Années</span> {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
             </button>
             {showAdvanced && (
                <div className="p-3 border-t bg-white">
                    {editComposante && (
                        <div className="mb-3 flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="text-xs text-blue-800 font-medium">Gérer les renommages par année</span>
                            <button type="button" onClick={() => setHistoryManagerOpen(true)} className="px-3 py-1 bg-white border border-blue-200 text-blue-600 text-xs rounded hover:bg-blue-600 hover:text-white transition-colors">
                                Ouvrir le gestionnaire
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mb-2">Cocher pour activer rapidement :</p>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {years.map(y => (
                            <label key={y.AnneeUniversitaire_id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                <input type="checkbox" checked={form.yearsHistory?.includes(y.AnneeUniversitaire_id)} onChange={(e) => handleYearHistoryChange(y.AnneeUniversitaire_id, e.target.checked)} className="text-blue-600 rounded" />
                                <span className="text-xs">{y.AnneeUniversitaire_annee}</span>
                            </label>
                        ))}
                    </div>
                </div>
             )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
               {isSubmitting && <SpinnerIcon className="animate-spin" />} {editComposante ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* 🆕 MODAL MANAGER HISTORIQUE */}
      {editComposante && (
        <EntityHistoryManager 
           isOpen={historyManagerOpen}
           onClose={() => setHistoryManagerOpen(false)}
           entityId={editComposante.Composante_id}
           entityType="composantes" // 👈 TYPE : COMPOSANTES
           title={`Historique : ${editComposante.Composante_label}`}
        />
      )}

      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer ?">
         <p className="mb-2">Confirmer en tapant <b>{composanteToDelete?.Composante_code}</b> :</p>
         <input value={deleteCodeInput} onChange={(e) => setDeleteCodeInput(e.target.value)} className={AppStyles.input.formControl} />
         <div className="flex justify-end gap-2 mt-3">
             <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
             <button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button>
         </div>
      </ConfirmModal>
    </div>
  );
};

export default InstitutionDetail;