// frontend/src/pages/Administration/EtablissementDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft } from "react-icons/fa";

import { 
  ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";

const API_BASE_URL = "http://127.0.0.1:8000";

const EtablissementDetail = () => {
  const { etablissementId, id: institutionId } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // Données
  const [etablissement, setEtablissement] = useState(location.state?.composante || null);
  const [mentions, setMentions] = useState([]);
  // NOUVEL ÉTAT POUR LES DOMAINES
  const [domaines, setDomaines] = useState([]); 
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label"); 
  const [sortOrder, setSortOrder] = useState("asc");

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editMention, setEditMention] = useState(null);
  const [mentionToDelete, setMentionToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Formulaire
  const [form, setForm] = useState({ 
      id: "", 
      nom: "", 
      code: "", 
      domaine_id: "", // Correspond au select
      abbreviation: "", 
      description: "", 
      logo: null, 
      logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // --- 1. CHARGEMENT DES DONNÉES (MODIFIÉ) ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let currentEtab = etablissement;
        
        // 1. Charger l'Établissement (Composante) si non présent
        if (!currentEtab) {
          const res = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
          if (!res.ok) {
              const errDetail = await res.json().catch(() => ({ detail: "Inconnue" }));
              throw new Error("Établissement introuvable. Detail: " + errDetail.detail);
          }
          currentEtab = await res.json();
          setEtablissement(currentEtab);
        }

        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: "Institution", path: `/institution/${institutionId}` },
            { label: currentEtab.Composante_abbreviation || currentEtab.Composante_label, path: "#" },
          ]);
        }
        
        // VÉRIFICATION CRITIQUE : Avoir l'ID avant de chercher les mentions
        if (!currentEtab.Composante_id) {
            throw new Error("ID de composante manquant. Impossible de charger les mentions.");
        }
        
        // 2. Récupérer la liste des DOMAINES (POUR LE SELECT)
        const resDomaines = await fetch(`${API_BASE_URL}/api/domaines/`);
        const dataDomaines = resDomaines.ok ? await resDomaines.json() : [];
        setDomaines(Array.isArray(dataDomaines) ? dataDomaines : []);

        // 3. Récupérer les Mentions via l'ID de la composante (CORRECTIF POUR LE CHARGEMENT)
        const resMentions = await fetch(`${API_BASE_URL}/api/mentions/composante/${currentEtab.Composante_id}`);
        const dataMentions = resMentions.ok ? await resMentions.json() : [];
        setMentions(Array.isArray(dataMentions) ? dataMentions : []);

      } catch (err) {
        addToast("Erreur chargement: " + err.message, "error");
        console.error("Erreur de chargement:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [etablissementId, institutionId, setBreadcrumb]); 

  // --- 2. GESTION DU FORMULAIRE (CRUD) ---
  const openModal = async (ment = null) => {
    setErrors({});
    if (ment) {
      setEditMention(ment);
      // MAPPING : Les clés viennent de schemas.py (MentionSchema)
      setForm({
        id: ment.id_mention,
        nom: ment.label, 
        code: ment.code,
        domaine_id: ment.id_domaine || "", // Utiliser l'ID du domaine
        abbreviation: ment.abbreviation || "",
        description: ment.description || "",
        logo: null,
        logoPath: ment.logo_path || ""
      });
      setModalOpen(true);
    } else {
      setEditMention(null);
      setForm({ 
          id: "Chargement...", 
          nom: "", 
          code: "", 
          domaine_id: "", // Valeur initiale vide pour le select
          abbreviation: "", 
          description: "", 
          logo: null, 
          logoPath: "" 
      });
      setModalOpen(true);
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/mentions/next-id`);
        if (res.ok) {
            const nextId = await res.json();
            setForm(prev => ({ ...prev, id: nextId }));
        }
      } catch (e) { console.error(e); }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditMention(null);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "logo" && files) setForm(prev => ({ ...prev, logo: files[0] }));
    else setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validation
    const newErrors = {};
    if (!form.nom.trim()) newErrors.nom = "Le nom est requis.";
    if (!form.code.trim()) newErrors.code = "Le code est requis.";
    // Validation du Domaine ID
    if (!form.domaine_id.trim()) newErrors.domaine_id = "Veuillez sélectionner un domaine.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("nom", form.nom);
    formData.append("code", form.code);
    formData.append("composante_id", etablissement.Composante_id); 
    formData.append("domaine_id", form.domaine_id); 
    
    if (form.abbreviation) formData.append("abbreviation", form.abbreviation);
    if (form.description) formData.append("description", form.description);
    if (form.logo) formData.append("logo_file", form.logo);

    try {
      let url = `${API_BASE_URL}/api/mentions/`;
      let method = "POST";

      if (editMention) {
        url += `${editMention.id_mention}`; // Utilise id_mention (schema)
        method = "PUT";
      }

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur sauvegarde");
      }
      
      const savedMention = await res.json();
      
      setMentions(prev => editMention 
        ? prev.map(m => m.id_mention === savedMention.id_mention ? savedMention : m) 
        : [...prev, savedMention]
      );
      addToast(editMention ? "Mention modifiée" : "Mention créée");
      closeModal();
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. SUPPRESSION ---
  const handleDeleteClick = (ment) => {
    setMentionToDelete(ment);
    setDeleteInput("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!mentionToDelete) return;
    if (deleteInput.trim().toLowerCase() !== mentionToDelete.label.toLowerCase()) {
      setDeleteError("Le nom ne correspond pas.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/mentions/${mentionToDelete.id_mention}`, { method: "DELETE" });
      if (res.ok) {
        setMentions(prev => prev.filter(m => m.id_mention !== mentionToDelete.id_mention));
        addToast("Mention supprimée");
        setDeleteModalOpen(false);
      } else {
        throw new Error("Impossible de supprimer");
      }
    } catch (e) {
      addToast("Erreur lors de la suppression", "error");
    }
  };

  // --- 4. FILTRES ET TRI ---
  const filteredMentions = mentions
    .filter(m => ( (m.label || "") + (m.abbreviation || "") + (m.code || "")).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const vA = sortField === 'label' ? (a.label || "") : (a.abbreviation || "");
      const vB = sortField === 'label' ? (b.label || "") : (b.abbreviation || "");
      return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600" />;</div>;
  if (!etablissement) return <div className="p-10 text-center">Établissement introuvable.</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER DE L'ÉTABLISSEMENT */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative"
      >
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {etablissement.Composante_logo_path ? (
            <img src={`${API_BASE_URL}${etablissement.Composante_logo_path}`} alt="Logo" className="w-24 h-24 object-contain border rounded-lg bg-gray-50 p-2" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><FaGraduationCap className="w-10 h-10" /></div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
           <div 
             className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start"
             onClick={() => navigate(`/institution/${institutionId}`)}
           >
             <FaChevronLeft /> Retour à l'institution
           </div>

          <h1 className="text-2xl font-bold text-gray-800">{etablissement.Composante_label}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono font-bold">{etablissement.Composante_code}</span>
            {etablissement.Composante_abbreviation && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border">{etablissement.Composante_abbreviation}</span>}
          </div>
          {etablissement.Composante_description && <p className="text-gray-500 text-sm max-w-3xl italic">{etablissement.Composante_description}</p>}
        </div>
      </motion.div>

      {/* BARRE D'OUTILS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Mentions ({filteredMentions.length})</h2>
        <div className={AppStyles.header.controls}>
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className={AppStyles.input.text} />
          
          <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white text-sm">
             <span className="font-semibold text-gray-600 text-xs uppercase">Tri:</span>
             <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border-none bg-transparent outline-none cursor-pointer text-gray-700 font-medium">
                <option value="label">Nom</option>
                <option value="abbreviation">Abréviation</option>
             </select>
             <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          </div>
          
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* CONTENU (GRILLE / LISTE) */}
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
        {/* Bouton Ajouter */}
        <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}>
            <PlusIcon />
          </div>
          <p className="text-sm font-semibold text-blue-700">Ajouter</p>
        </div>

        {/* Liste des Mentions */}
        <AnimatePresence mode="popLayout">
          {filteredMentions.map((ment) => (
            <CardItem
              key={ment.id_mention} // id_mention via Schema
              viewMode={view}
              title={ment.label}    // label via Schema
              subTitle={ment.code}  // code via Schema
              imageSrc={ment.logo_path ? `${API_BASE_URL}${ment.logo_path}` : null} // logo_path via Schema
              PlaceholderIcon={FaGraduationCap} 
              onClick={() => { /* Navigation future */ }}
              onEdit={() => openModal(ment)}
              onDelete={() => handleDeleteClick(ment)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL AJOUT/EDITION */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editMention ? "Modifier la Mention" : "Nouvelle Mention"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden" onClick={() => fileInputRef.current.click()}>
                      {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="Aperçu logo" /> :
                       form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover" alt="Logo existant" /> :
                       <PlusIcon className="text-gray-400 text-2xl"/>}
                   </div>
                   <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" name="logo" />
                   <span className="text-[10px] uppercase font-bold text-gray-500">Logo</span>
                </div>
                
                <div className="flex-1 space-y-3">
                    <label className="block">
                        <span className={AppStyles.input.label}>ID</span>
                        <input type="text" value={form.id} disabled className={AppStyles.input.formControlDisabled} />
                    </label>
                    
                    <label className="block">
                        <span className={AppStyles.input.label}>Code Mention <span className="text-red-500">*</span></span>
                        <input type="text" name="code" value={form.code} onChange={handleChange} className={`${AppStyles.input.formControl} uppercase font-bold ${errors.code ? "border-red-500" : ""}`} placeholder="Ex: MEN_INFO" />
                        {errors.code && <span className={AppStyles.input.errorText}>{errors.code}</span>}
                    </label>
                </div>
            </div>

            <label className="block">
                <span className={AppStyles.input.label}>Nom de la mention <span className="text-red-500">*</span></span>
                <input type="text" name="nom" value={form.nom} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.nom ? "border-red-500" : ""}`} placeholder="Ex: Informatique" />
                {errors.nom && <span className={AppStyles.input.errorText}>{errors.nom}</span>}
            </label>
            
            <div className="grid grid-cols-2 gap-4">
                <label className="block">
                    {/* CHAMP SÉLECTEUR DOMAINE (MODIFIÉ) */}
                    <span className={AppStyles.input.label}>Domaine <span className="text-red-500">*</span></span>
                    <select 
                        name="domaine_id" 
                        value={form.domaine_id} 
                        onChange={handleChange} 
                        className={`${AppStyles.input.formControl} ${errors.domaine_id ? "border-red-500" : ""}`}
                    >
                        <option value="" disabled>Sélectionnez un domaine</option>
                        {domaines.map(d => (
                            // Utilise id_domaine, label, code du DomaineSchema
                            <option key={d.id_domaine} value={d.id_domaine}>
                                {d.label} ({d.code})
                            </option>
                        ))}
                    </select>
                    {errors.domaine_id && <span className={AppStyles.input.errorText}>{errors.domaine_id}</span>}
                </label>

                <label className="block">
                    <span className={AppStyles.input.label}>Abréviation</span>
                    <input type="text" name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl} placeholder="Ex: INFO" />
                </label>
            </div>
            
            <label className="block">
                <span className={AppStyles.input.label}>Description</span>
                <textarea name="description" rows="2" value={form.description} onChange={handleChange} className={AppStyles.input.formControl} />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                  {isSubmitting && <SpinnerIcon className="animate-spin" />} Enregistrer
                </button>
            </div>
        </form>
      </DraggableModal>

      {/* MODAL SUPPRESSION */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer la mention ?">
          <p className="text-gray-600 mb-2">Cela supprimera la mention : <b>{mentionToDelete?.label}</b></p>
          <p className="text-xs text-gray-500 mb-2">Veuillez taper le nom complet pour confirmer :</p>
          <input 
            type="text" 
            value={deleteInput} 
            onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(""); }} 
            className={`w-full ${AppStyles.input.formControl} ${deleteError ? "border-red-500" : ""}`}
            placeholder={mentionToDelete?.label}
          />
          {deleteError && <span className={AppStyles.input.errorText}>{deleteError}</span>}
          <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
              <button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};

export default EtablissementDetail;