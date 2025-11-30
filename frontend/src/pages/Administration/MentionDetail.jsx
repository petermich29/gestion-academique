// frontend/src/pages/Administration/MentionDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaGraduationCap, FaChevronLeft, FaChevronRight, 
  FaBookOpen, FaLayerGroup, FaUniversity // Ajout de FaUniversity
} from "react-icons/fa";

import { 
  ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";

const API_BASE_URL = "http://127.0.0.1:8000";

const MentionDetail = () => {
  const { id: institutionId, etablissementId, mentionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- ÉTATS DONNÉES ---
  const [mention, setMention] = useState(location.state?.mention || null);
  const [etablissement, setEtablissement] = useState(location.state?.etablissement || null);
  const [institution, setInstitution] = useState(location.state?.institution || null);
  const [parcours, setParcours] = useState([]);
  
  const [mentionsList, setMentionsList] = useState([]); // Pour la navigation Prev/Next
  const [typesFormation, setTypesFormation] = useState([]); // Types de Formation Dynamiques

  // --- ÉTATS UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [toasts, setToasts] = useState([]);

  // --- MODALES ET FORMULAIRE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editParcours, setEditParcours] = useState(null);
  const [parcoursToDelete, setParcoursToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  
  const [form, setForm] = useState({ 
      id: "", code: "", label: "", abbreviation: "", description: "", 
      type_formation: "", logo: null, logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // =========================================================
  // 1. CHARGEMENT DES DONNÉES
  // =========================================================
  
  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        // --- 1. CHARGEMENT DES TYPES DE FORMATION ---
        const resTypes = await fetch(`${API_BASE_URL}/api/metadonnees/types-formation`);
        if (resTypes.ok) {
            setTypesFormation(await resTypes.json());
        }

        // --- 2. Chargement Institution, Etablissement, Mention (Si manquants) ---
        let currentInst = institution;
        if(!currentInst) {
             const resInst = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
             if(resInst.ok) {
                 currentInst = await resInst.json();
                 setInstitution(currentInst);
             }
        }
        
        let currentEtab = etablissement;
        if (!currentEtab) {
            const resEtab = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
            if(resEtab.ok) {
                currentEtab = await resEtab.json();
                setEtablissement(currentEtab);
            }
        }

        let currentMention = mention;
        if (!currentMention || currentMention.Mention_id !== mentionId) {
            const res = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
            if (!res.ok) throw new Error("Mention introuvable");
            currentMention = await res.json();
            setMention(currentMention);
        }

        if (currentMention.parcours) {
            setParcours(currentMention.parcours);
        }

        // --- 3. MISE À JOUR DU BREADCRUMB ---
        if (setBreadcrumb) {
            const institutionLabel = currentInst?.Institution_nom || institutionId;
            const etablissementLabel = currentEtab?.Composante_abbreviation || currentEtab?.Composante_label || etablissementId;

            setBreadcrumb([
                { label: "Administration", path: `/administration` },
                { label: institutionLabel, path: `/institution/${institutionId}` },
                { label: etablissementLabel, path: `/institution/${institutionId}/etablissement/${etablissementId}` },
                { label: currentMention.Mention_label, path: "#" },
            ]);
        }

      } catch (err) {
        addToast("Erreur chargement des données: " + err.message, "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [mentionId, etablissementId, institutionId, setBreadcrumb]);

  // Chargement Liste des Mentions pour la Navigation (Prev/Next)
  useEffect(() => {
     const fetchMentionsList = async () => {
         if(!etablissement?.Composante_id) return; 
         try {
             const res = await fetch(`${API_BASE_URL}/api/mentions/composante/${etablissement.Composante_id}`);
             if(res.ok) {
                 const data = await res.json();
                 setMentionsList(data.sort((a,b) => a.Mention_code.localeCompare(b.Mention_code)));
             }
         } catch(e) { console.error(e); }
     };
     fetchMentionsList();
  }, [etablissement]);

  // =========================================================
  // 2. NAVIGATION ET UI
  // =========================================================

  const handleNavigate = (direction) => {
      if (!mentionsList.length || !mention) return;
      const idx = mentionsList.findIndex(m => m.Mention_id === mention.Mention_id);
      if (idx === -1) return;
      
      const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
      
      if (newIdx >= 0 && newIdx < mentionsList.length) {
          const nextM = mentionsList[newIdx];
          navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${nextM.Mention_id}`, {
              state: { mention: nextM, etablissement, institution }
          });
          setMention(nextM);
          if(nextM.parcours) setParcours(nextM.parcours);
      }
  };
  
  const isFirst = mentionsList.length > 0 && mention && mentionsList[0].Mention_id === mention.Mention_id;
  const isLast = mentionsList.length > 0 && mention && mentionsList[mentionsList.length - 1].Mention_id === mention.Mention_id;

  const getTypeFormationLabel = (id) => {
      const type = typesFormation.find(t => t.TypeFormation_id === id);
      return type ? type.TypeFormation_label : id;
  }

  // =========================================================
  // 3. GESTION DU FORMULAIRE (CRUD PARCOURS)
  // =========================================================

  const openModal = async (p = null) => {
    setErrors({});
    if (p) {
      setEditParcours(p);
      setForm({
        id: p.Parcours_id,
        code: p.Parcours_code,
        label: p.Parcours_label || p.nom_parcours,
        abbreviation: p.Parcours_abbreviation || "",
        description: p.Parcours_description || "",
        type_formation: p.Parcours_type_formation_defaut_id_fk || "", 
        logo: null, 
        logoPath: p.Parcours_logo_path || ""
      });
      setModalOpen(true);
    } else {
      setEditParcours(null);
      setForm({ 
        id: "Chargement...", 
        code: "", label: "", abbreviation: "", description: "", 
        type_formation: "", logo: null, logoPath: "" 
      });
      setModalOpen(true);

      try {
        const res = await fetch(`${API_BASE_URL}/api/parcours/next-id`); 
        if (res.ok) {
          const nextId = await res.json();
          setForm(prev => ({ ...prev, id: nextId }));
        }
      } catch (e) { console.error(e); }
    }
  };

  const closeModal = () => { 
    setModalOpen(false); 
    setEditParcours(null); 
    setErrors({}); 
  };
  
  const handleFormChange = (e) => {
      const { name, value, files } = e.target;
      if (name === "logo" && files) setForm(prev => ({ ...prev, logo: files[0] }));
      else setForm(prev => ({ ...prev, [name]: value }));
      setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const newErrors = {};
      if (!form.label.trim()) newErrors.label = "Le libellé est requis.";
      if (!form.code.trim()) newErrors.code = "Le code est requis.";
      if (!form.type_formation) newErrors.type_formation = "Le type de formation est requis.";

      if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setIsSubmitting(false);
          return;
      }

      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("label", form.label);
      formData.append("id_type_formation", form.type_formation);
      if(form.abbreviation) formData.append("abbreviation", form.abbreviation);
      if(form.description) formData.append("description", form.description);
      if(form.logo) formData.append("logo_file", form.logo);

      try {
          let url = `${API_BASE_URL}/api/parcours/`;
          let method = "POST";
          
          if(editParcours) {
              url += `${editParcours.Parcours_id}`;
              method = "PUT";
              formData.append("parcours_id", editParcours.Parcours_id);
          } else {
              formData.append("id_parcours", form.id);
              formData.append("id_mention", mention.Mention_id);
          }

          const res = await fetch(url, { method, body: formData });
          if(!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.detail || "Erreur sauvegarde parcours");
          }
          
          const saved = await res.json();
          setParcours(prev => editParcours ? prev.map(p => p.Parcours_id === saved.Parcours_id ? saved : p) : [...prev, saved]);
          addToast(editParcours ? "Parcours modifié avec succès." : "Parcours créé avec succès.");
          closeModal();
      } catch(e) { 
          addToast(e.message, "error"); 
      } finally { 
          setIsSubmitting(false); 
      }
  };

  // =========================================================
  // 4. SUPPRESSION
  // =========================================================

  const handleDelete = (p) => { 
    setParcoursToDelete(p); 
    setDeleteInput(""); 
    setDeleteError("");
    setDeleteModalOpen(true); 
  };
  
  const confirmDelete = async () => {
      if(!parcoursToDelete) return;
      if(deleteInput !== parcoursToDelete.Parcours_code) {
          setDeleteError("Le code ne correspond pas.");
          return;
      }

      try {
          const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursToDelete.Parcours_id}`, { method: "DELETE" });
          if(res.ok) {
              setParcours(prev => prev.filter(p => p.Parcours_id !== parcoursToDelete.Parcours_id));
              addToast("Parcours supprimé.");
              setDeleteModalOpen(false);
          } else {
              throw new Error("Impossible de supprimer le parcours.");
          }
      } catch(e) { 
          addToast(e.message, "error"); 
      }
  };

  // =========================================================
  // 5. RENDER
  // =========================================================

  const filteredParcours = parcours.filter(p => 
      (p.Parcours_label || p.nom_parcours || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.Parcours_code || "").toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => sortOrder === 'asc' 
      ? (a.Parcours_label||a.nom_parcours||"").localeCompare(b.Parcours_label||b.nom_parcours||"") 
      : (b.Parcours_label||b.nom_parcours||"").localeCompare(a.Parcours_label||a.nom_parcours||""));

  if(isLoading) return (
    <div className={AppStyles.pageContainer}>
        <div className={AppStyles.header.container}>
            <h2 className={AppStyles.mainTitle}>Détails de la Mention</h2>
        </div>
        <hr className={AppStyles.separator} />
        <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600" /></div>
    </div>
  );
  if(!mention) return <div className="p-10 text-center">Mention introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* TITRE ET BANDEAU INFO MENTION */}
      <div className={AppStyles.header.container}>
          <h2 className={AppStyles.mainTitle}>Détails de la Mention</h2>
      </div>
      <hr className={AppStyles.separator} />

      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
          <div className="flex-shrink-0 mx-auto md:mx-0">
             {mention.Mention_logo_path ? (
                 <img src={`${API_BASE_URL}${mention.Mention_logo_path}`} className="w-24 h-24 object-contain rounded-lg border bg-gray-50 p-2" alt="Logo Mention" />
             ) : (
                 <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                     <FaGraduationCap className="w-10 h-10"/>
                 </div>
             )}
          </div>
          
          <div className="flex-1 space-y-2 text-center md:text-left">
              <div 
                  className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" 
                  onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}`)}
              >
                  <FaChevronLeft /> Retour à l'établissement
              </div>

              {/* TITRE MODIFIÉ : Mention + Nom */}
              <h1 className="text-2xl font-bold text-gray-800">
                  Mention {mention.Mention_label}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
                  {/* Code */}
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold border border-blue-200">
                      {mention.Mention_code}
                  </span>

                  {/* AJOUT : Établissement parent (Abréviation) */}
                  {etablissement && (etablissement.Composante_abbreviation || etablissement.Composante_label) && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 flex items-center gap-1 font-medium" title={etablissement.Composante_label}>
                          <FaUniversity className="text-[10px]"/> 
                          {etablissement.Composante_abbreviation || etablissement.Composante_label}
                      </span>
                  )}

                  {/* Domaine */}
                  {(mention.Domaine_label || mention.domaine?.Domaine_label) && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1">
                          <FaLayerGroup className="text-[10px]"/> 
                          {mention.Domaine_label || mention.domaine?.Domaine_label}
                      </span>
                  )}
              </div>
          </div>
          
          {/* BOUTONS DE NAVIGATION PREV/NEXT */}
          <div className="absolute top-4 right-4 flex gap-1">
            <button 
                onClick={() => handleNavigate('prev')} 
                disabled={isFirst} 
                className={`p-2 rounded-full border transition-colors ${isFirst ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white hover:bg-gray-100 text-gray-600'}`}
            >
                <FaChevronLeft />
            </button>
            <button 
                onClick={() => handleNavigate('next')} 
                disabled={isLast} 
                className={`p-2 rounded-full border transition-colors ${isLast ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white hover:bg-gray-100 text-gray-600'}`}
            >
                <FaChevronRight />
            </button>
          </div>
      </motion.div>

      {/* SECTION LISTE PARCOURS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Parcours ({filteredParcours.length})</h2>
        <div className={AppStyles.header.controls}>
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className={AppStyles.input.text} />
          <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>{view === "grid" ? <ListIcon /> : <ThIcon />}</button>
        </div>
      </div>

      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
          <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
              <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12" : "w-8 h-8"}`}><PlusIcon /></div>
              <p className="text-sm font-semibold text-blue-700">Ajouter Parcours</p>
          </div>
          <AnimatePresence>
             {filteredParcours.map(p => (
                 <CardItem 
                    key={p.Parcours_id} 
                    viewMode={view} 
                    title={p.Parcours_label || p.nom_parcours}
                    subTitle={
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {getTypeFormationLabel(p.Parcours_type_formation_defaut_id_fk)}
                        </span>
                    }
                    imageSrc={p.Parcours_logo_path ? `${API_BASE_URL}${p.Parcours_logo_path}` : null}
                    PlaceholderIcon={FaBookOpen}
                    onClick={() => { /* Navigation vers Détail Parcours */ }}
                    onEdit={() => openModal(p)} 
                    onDelete={() => handleDelete(p)}
                 />
             ))}
          </AnimatePresence>
      </div>

      {/* MODAL AJOUT/EDITION PARCOURS */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editParcours ? "Modifier Parcours" : "Nouveau Parcours"}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                       <div className="w-20 h-20 bg-gray-50 border rounded flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden" onClick={() => fileInputRef.current.click()}>
                          {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="Aperçu"/> : 
                           form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover" alt="Logo"/> : 
                           <PlusIcon className="text-gray-400"/>}
                       </div>
                       <input type="file" ref={fileInputRef} onChange={handleFormChange} className="hidden" name="logo" />
                       <span className="text-[10px] uppercase font-bold text-gray-500">Logo</span>
                  </div>
                  <div className="flex-1 space-y-3">
                       <label><span className={AppStyles.input.label}>ID</span><input type="text" value={form.id} disabled className={AppStyles.input.formControlDisabled}/></label>
                       <label><span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span><input name="code" value={form.code} onChange={handleFormChange} className={`${AppStyles.input.formControl} ${errors.code ? "border-red-500" : ""}`} placeholder="Ex: PARCOURS_INFO"/></label>
                       {errors.code && <span className={AppStyles.input.errorText}>{errors.code}</span>}
                  </div>
              </div>

              <label><span className={AppStyles.input.label}>Libellé <span className="text-red-500">*</span></span><input name="label" value={form.label} onChange={handleFormChange} className={`${AppStyles.input.formControl} ${errors.label ? "border-red-500" : ""}`} placeholder="Ex: Parcours Ingénierie Informatique"/></label>
              
              <div className="grid grid-cols-2 gap-4">
                  <label>
                      <span className={AppStyles.input.label}>Abréviation</span>
                      <input name="abbreviation" value={form.abbreviation} onChange={handleFormChange} className={AppStyles.input.formControl} placeholder="Ex: PII"/>
                  </label>
                  
                  <label>
                      <span className={AppStyles.input.label}>Type Formation Défaut <span className="text-red-500">*</span></span>
                      <select 
                          name="type_formation" 
                          value={form.type_formation} 
                          onChange={handleFormChange} 
                          className={`${AppStyles.input.formControl} ${errors.type_formation ? "border-red-500" : ""}`}
                      >
                          <option value="">-- Choisir un type --</option>
                          {typesFormation.map(t => (
                              <option key={t.TypeFormation_id} value={t.TypeFormation_id}>
                                  {t.TypeFormation_label}
                              </option>
                          ))}
                      </select>
                      {errors.type_formation && <span className={AppStyles.input.errorText}>{errors.type_formation}</span>}
                  </label>
              </div>

              <label><span className={AppStyles.input.label}>Description</span><textarea name="description" rows="2" value={form.description} onChange={handleFormChange} className={AppStyles.input.formControl}/></label>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                  <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                      {isSubmitting && <SpinnerIcon className="animate-spin"/>} Enregistrer
                  </button>
              </div>
          </form>
      </DraggableModal>

      {/* MODAL SUPPRESSION PARCOURS */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer le Parcours ?">
          <p className="text-gray-600 mb-4">Cela supprimera définitivement le parcours <b>{parcoursToDelete?.Parcours_label}</b>.</p>
          <p className="text-xs text-gray-500 mb-1">Confirmez en tapant le code : <b className="font-mono">{parcoursToDelete?.Parcours_code}</b></p>
          <input 
              type="text" 
              value={deleteInput} 
              onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }} 
              className={`${AppStyles.input.formControl} ${deleteError ? "border-red-500" : ""}`}
              placeholder={parcoursToDelete?.Parcours_code}
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

export default MentionDetail;