// frontend/src/pages/Administration/EtablissementDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft, FaCircle, FaLayerGroup } from "react-icons/fa"; 

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

  // --- ÉTATS ---
  const [etablissement, setEtablissement] = useState(location.state?.composante || null);
  const [mentions, setMentions] = useState([]);
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
      domaine_id: "", 
      abbreviation: "", 
      description: "", 
      logo: null, 
      logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // --- 1. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let currentEtab = etablissement;
        
        // A. Charger l'Établissement si manquant
        if (!currentEtab) {
          const res = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
          if (!res.ok) throw new Error("Établissement introuvable.");
          currentEtab = await res.json();
          setEtablissement(currentEtab);
        }

        // B. Breadcrumb
        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: "Institution", path: `/institution/${institutionId}` },
            { label: currentEtab.Composante_abbreviation || currentEtab.Composante_label, path: "#" },
          ]);
        }
        
        // C. Récupérer les DOMAINES
        const resDomaines = await fetch(`${API_BASE_URL}/api/domaines/`); 
        if (resDomaines.ok) {
            setDomaines(await resDomaines.json());
        }

        // D. Récupérer les Mentions (avec Parcours inclus)
        if (currentEtab.Composante_id) {
            const resMentions = await fetch(`${API_BASE_URL}/api/mentions/composante/${currentEtab.Composante_id}`);
            if (resMentions.ok) {
                setMentions(await resMentions.json());
            }
        }

      } catch (err) {
        addToast("Erreur chargement: " + err.message, "error");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [etablissementId, institutionId, setBreadcrumb]); 

  // --- HELPER : Trouver le nom du domaine ---
  const getDomaineLabel = (id) => {
    if (!id || domaines.length === 0) return "Domaine inconnu";
    const dom = domaines.find(d => d.Domaine_id === id);
    return dom ? dom.Domaine_label : id;
  };

  // --- 2. GESTION DU FORMULAIRE ---
  const openModal = async (ment = null) => {
    setErrors({});
    if (ment) {
      setEditMention(ment);
      // Correction : Utilisation des clés API correctes (Mention_label, etc.)
      setForm({
        id: ment.id_mention || ment.Mention_id,
        nom: ment.Mention_label || ment.label || "", 
        code: ment.Mention_code || ment.code || "",
        domaine_id: ment.id_domaine || ment.Domaine_id_fk || "", 
        abbreviation: ment.Mention_abbreviation || ment.abbreviation || "",
        description: ment.Mention_description || ment.description || "",
        logo: null,
        logoPath: ment.Mention_logo_path || ment.logo_path || ""
      });
      setModalOpen(true);
    } else {
      setEditMention(null);
      setForm({ 
          id: "Chargement...", 
          nom: "", 
          code: "", 
          domaine_id: "", 
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
    
    const newErrors = {};
    if (!form.nom.trim()) newErrors.nom = "Le nom est requis.";
    if (!form.code.trim()) newErrors.code = "Le code est requis.";
    if (!form.domaine_id) newErrors.domaine_id = "Le domaine est requis.";
    
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
        // Utiliser l'ID correct
        const idToUpdate = editMention.id_mention || editMention.Mention_id;
        url += `${idToUpdate}`; 
        method = "PUT";
      }

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur sauvegarde");
      }
      
      const savedMention = await res.json();
      
      setMentions(prev => {
         const savedId = savedMention.id_mention || savedMention.Mention_id;
         if (editMention) {
            return prev.map(m => (m.id_mention === savedId || m.Mention_id === savedId) ? savedMention : m);
         }
         return [...prev, savedMention];
      });

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
    const nameToCheck = mentionToDelete.Mention_label || mentionToDelete.label;
    
    if (deleteInput.trim().toLowerCase() !== nameToCheck.toLowerCase()) {
      setDeleteError("Le nom ne correspond pas.");
      return;
    }

    try {
      const idToDelete = mentionToDelete.id_mention || mentionToDelete.Mention_id;
      const res = await fetch(`${API_BASE_URL}/api/mentions/${idToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setMentions(prev => prev.filter(m => (m.id_mention || m.Mention_id) !== idToDelete));
        addToast("Mention supprimée");
        setDeleteModalOpen(false);
      } else {
        throw new Error("Impossible de supprimer");
      }
    } catch (e) {
      addToast("Erreur lors de la suppression", "error");
    }
  };

  // --- 4. RENDER ---
  
  // Fonction de tri et filtre
  const filteredMentions = mentions
    .filter(m => {
        const label = m.Mention_label || m.label || "";
        const abbr = m.Mention_abbreviation || m.abbreviation || "";
        const code = m.Mention_code || m.code || "";
        return (label + abbr + code).toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const labelA = a.Mention_label || a.label || "";
      const labelB = b.Mention_label || b.label || "";
      const codeA = a.Mention_code || a.code || "";
      const codeB = b.Mention_code || b.code || "";
      
      const vA = sortField === 'label' ? labelA : codeA;
      const vB = sortField === 'label' ? labelB : codeB;
      return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600" /></div>;
  if (!etablissement) return <div className="p-10 text-center">Établissement introuvable.</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER ÉTABLISSEMENT */}
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
                <option value="abbreviation">Code</option>
             </select>
             <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          </div>
          
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>
            {view === "grid" ? <ListIcon /> : <ThIcon />}
          </button>
        </div>
      </div>

      {/* LISTE / GRILLE */}
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
        {/* Bouton Ajouter */}
        <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}>
            <PlusIcon />
          </div>
          <p className="text-sm font-semibold text-blue-700">Ajouter</p>
        </div>

        {/* Cartes Mentions */}
        <AnimatePresence mode="popLayout">
          {filteredMentions.map((ment) => {
             // 1. Récupération sécurisée du nom de la Mention
             const mentionName = ment.Mention_label || ment.label || "Nom inconnu";
             const mentionCode = ment.Mention_code || ment.code;
             const logoPath = ment.Mention_logo_path || ment.logo_path;
             const mentionId = ment.id_mention || ment.Mention_id;

             // 2. Récupération du Nom du Domaine
             const domaineId = ment.id_domaine || ment.Domaine_id_fk;
             const domaineLabel = getDomaineLabel(domaineId);

             // 3. Gestion des Parcours
             const parcoursList = ment.parcours || [];
             const parcoursCount = parcoursList.length;

             return (
              <CardItem
                key={mentionId}
                viewMode={view}
                // Modification ici : Afficher le NOM de la mention, et le DOMAINE en sous-titre
                title={mentionName}
                subTitle={<span className="flex items-center gap-1"><FaLayerGroup className="text-[10px]"/> {domaineLabel}</span>}
                imageSrc={logoPath ? `${API_BASE_URL}${logoPath}` : null} 
                PlaceholderIcon={FaGraduationCap} 
                onClick={() => { /* Navigation future */ }}
                onEdit={() => openModal(ment)}
                onDelete={() => handleDeleteClick(ment)}
              >
                  {/* LOGIQUE D'AFFICHAGE PARCOURS (GRILLE vs LISTE) */}
                  <div className="mt-3 pt-2 border-t border-gray-100 w-full">
                      
                      {/* CAS GRILLE : AFFICHER LE NOMBRE DE PARCOURS */}
                      {view === "grid" && (
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Parcours</span>
                             <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                {parcoursCount}
                             </span>
                          </div>
                      )}

                      {/* CAS LISTE : AFFICHER LES NOMS DES PARCOURS */}
                      {view === "list" && (
                          <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 uppercase mr-2">Parcours :</span>
                              {parcoursCount > 0 ? (
                                  parcoursList.map((parcours, idx) => (
                                      <span key={idx} className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                          <FaCircle className="w-1.5 h-1.5 text-green-500" />
                                          {parcours.nom_parcours || parcours.Parcours_label || parcours.label}
                                      </span>
                                  ))
                              ) : (
                                  <span className="text-xs text-gray-400 italic">Aucun parcours</span>
                              )}
                          </div>
                      )}
                  </div>
              </CardItem>
            );
          })}
        </AnimatePresence>
      </div>

      {/* MODAL AJOUT/EDITION */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editMention ? "Modifier la Mention" : "Nouvelle Mention"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* ... Le reste du formulaire reste identique, attention juste aux valeurs 'value={...}' qui doivent utiliser form.x ... */}
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
                    </label>
                </div>
            </div>

            <label className="block">
                <span className={AppStyles.input.label}>Nom de la mention <span className="text-red-500">*</span></span>
                <input type="text" name="nom" value={form.nom} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.nom ? "border-red-500" : ""}`} placeholder="Ex: Informatique" />
            </label>
            
            <div className="grid grid-cols-2 gap-4">
                <label className="block">
                    <span className={AppStyles.input.label}>Domaine <span className="text-red-500">*</span></span>
                    <select 
                        name="domaine_id" 
                        value={form.domaine_id} 
                        onChange={handleChange} 
                        className={`${AppStyles.input.formControl} ${errors.domaine_id ? "border-red-500" : ""}`}
                    >
                        <option value="" disabled>Sélectionnez un domaine</option>
                        {domaines.map(d => (
                            <option key={d.Domaine_id} value={d.Domaine_id}>
                                {d.Domaine_label} ({d.Domaine_code})
                            </option>
                        ))}
                    </select>
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
          <p className="text-gray-600 mb-2">Cela supprimera la mention : <b>{mentionToDelete?.Mention_label || mentionToDelete?.label}</b> et tous ses parcours associés.</p>
          <p className="text-xs text-gray-500 mb-2">Tapez le nom complet pour confirmer :</p>
          <input 
            type="text" 
            value={deleteInput} 
            onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(""); }} 
            className={`w-full ${AppStyles.input.formControl} ${deleteError ? "border-red-500" : ""}`}
            placeholder={mentionToDelete?.Mention_label || mentionToDelete?.label}
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