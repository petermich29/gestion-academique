// frontend/src/pages/Administration/EtablissementDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft, FaChevronRight, FaCircle, FaLayerGroup } from "react-icons/fa";

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
  const [institution, setInstitution] = useState(null); // Pour le nom dans le breadcrumb
  const [mentions, setMentions] = useState([]);
  const [domaines, setDomaines] = useState([]); 
  const [etablissementsList, setEtablissementsList] = useState([]); 
  
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
  
  // A. Liste pour navigation (Next/Prev)
  useEffect(() => {
    const fetchEtablissementsList = async () => {
        try {
            const resComp = await fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${institutionId}`);
            if (resComp.ok) {
                const dataComp = await resComp.json();
                const sortedComposantes = Array.isArray(dataComp) 
                    ? dataComp.sort((a, b) => (a.Composante_code || "").localeCompare(b.Composante_code || ""))
                    : [];
                setEtablissementsList(sortedComposantes);
            }
        } catch (err) {
            console.error("Erreur chargement liste établissements", err);
        }
    };
    fetchEtablissementsList();
  }, [institutionId]);

  // B. Chargement Principal (Institution, Etab, Domaines, Mentions)
  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        // 1. Institution (pour Breadcrumb)
        let currentInst = institution;
        if (!currentInst) {
            const resInst = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(resInst.ok) {
                currentInst = await resInst.json();
                setInstitution(currentInst);
            }
        }

        // 2. Établissement
        let currentEtab = etablissement;
        if (!currentEtab || currentEtab.Composante_code !== etablissementId) {
          const res = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
          if (!res.ok) throw new Error("Établissement introuvable.");
          currentEtab = await res.json();
          setEtablissement(currentEtab);
        }

        // 3. Breadcrumb (Mis à jour avec le nom de l'institution)
        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: currentInst?.Institution_nom || institutionId, path: `/institution/${institutionId}` },
            { label: currentEtab.Composante_abbreviation || currentEtab.Composante_label, path: `#` },
          ]);
        }
        
        // 4. Domaines (depuis la base pour la liste déroulante)
        // On essaie /api/domaines/ ou /api/metadonnees/domaines selon votre routage.
        // Ici on suppose que domaines_routes.py est monté sur /api/domaines
        const resDomaines = await fetch(`${API_BASE_URL}/api/domaines/`); 
        if (resDomaines.ok) {
            setDomaines(await resDomaines.json());
        } else {
             // Fallback si route différente
             const resMeta = await fetch(`${API_BASE_URL}/api/metadonnees/domaines`);
             if(resMeta.ok) setDomaines(await resMeta.json());
        }

        // 5. Mentions
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

  // --- 2. NAVIGATION ---
  const handleNavigate = (direction) => {
    if (!etablissementsList.length || !etablissement) return;
    const currentIndex = etablissementsList.findIndex(i => i.Composante_code === etablissement.Composante_code);
    if (currentIndex === -1) return;
    
    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < etablissementsList.length) {
      const newEtablissement = etablissementsList[newIndex];
      navigate(`/institution/${institutionId}/etablissement/${newEtablissement.Composante_code}`, { 
          state: { composante: newEtablissement } 
      });
      setEtablissement(newEtablissement);
      setMentions([]); 
    }
  };
  
  const isFirst = etablissementsList.length > 0 && etablissement && etablissementsList[0].Composante_code === etablissement.Composante_code;
  const isLast = etablissementsList.length > 0 && etablissement && etablissementsList[etablissementsList.length - 1].Composante_code === etablissement.Composante_code;
  
  const getDomaineLabel = (id) => {
    if (!id || domaines.length === 0) return id;
    const dom = domaines.find(d => d.Domaine_id === id);
    return dom ? dom.Domaine_label : id;
  };

  // --- 3. GESTION FORMULAIRE ---
  const openModal = async (ment = null) => {
    setErrors({});
    if (ment) {
      setEditMention(ment);
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
    } else {
      setEditMention(null);
      setForm({ 
          id: "Chargement...", nom: "", code: "", domaine_id: "", 
          abbreviation: "", description: "", logo: null, logoPath: "" 
      });
      try {
        const res = await fetch(`${API_BASE_URL}/api/mentions/next-id`);
        if (res.ok) {
            const nextId = await res.json();
            setForm(prev => ({ ...prev, id: nextId }));
        }
      } catch (e) { console.error(e); }
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditMention(null); };
  
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
    } catch (e) { addToast("Erreur suppression", "error"); }
  };

  // --- RENDER ---
  const filteredMentions = mentions
    .filter(m => {
        const label = m.Mention_label || m.label || "";
        const code = m.Mention_code || m.code || "";
        return (label + code).toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const vA = sortField === 'label' ? (a.Mention_label || a.label) : (a.Mention_code || a.code);
      const vB = sortField === 'label' ? (b.Mention_label || b.label) : (b.Mention_code || b.code);
      return sortOrder === 'asc' ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });

  if (isLoading) return (
     <div className={AppStyles.pageContainer}>
        <div className={AppStyles.header.container}><h2 className={AppStyles.mainTitle}>Détails de l'Établissement</h2></div>
        <hr className={AppStyles.separator} />
        <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600" /></div>
     </div>
  );
  if (!etablissement) return <div className="p-10 text-center">Établissement introuvable.</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className={AppStyles.header.container}><h2 className={AppStyles.mainTitle}>Détails de l'Établissement</h2></div>
      <hr className={AppStyles.separator} />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {etablissement.Composante_logo_path ? (
            <img src={`${API_BASE_URL}${etablissement.Composante_logo_path}`} alt="Logo" className="w-24 h-24 object-contain border rounded-lg bg-gray-50 p-2" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><FaGraduationCap className="w-10 h-10" /></div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start"
             onClick={() => navigate(`/institution/${institutionId}`)}>
             <FaChevronLeft /> Retour à l'institution
           </div>
          <h1 className="text-2xl font-bold text-gray-800">{etablissement.Composante_label}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono font-bold">{etablissement.Composante_code}</span>
            {etablissement.Composante_abbreviation && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border">{etablissement.Composante_abbreviation}</span>}
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-1">
          <button onClick={() => handleNavigate('prev')} disabled={isFirst} className={`p-2 rounded-full border ${isFirst ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronLeft /></button>
          <button onClick={() => handleNavigate('next')} disabled={isLast} className={`p-2 rounded-full border ${isLast ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronRight /></button>
        </div>
      </motion.div>

      {/* LISTE MENTIONS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Mentions ({filteredMentions.length})</h2>
        <div className={AppStyles.header.controls}>
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className={AppStyles.input.text} />
          <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="hover:text-blue-600 p-1"><SortIcon order={sortOrder} /></button>
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>{view === "grid" ? <ListIcon /> : <ThIcon />}</button>
        </div>
      </div>

      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
        <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
          <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}><PlusIcon /></div>
          <p className="text-sm font-semibold text-blue-700">Ajouter</p>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredMentions.map((ment) => (
              <CardItem
                key={ment.id_mention || ment.Mention_id}
                viewMode={view}
                title={ment.Mention_label || ment.label}
                subTitle={<span className="flex items-center gap-1"><FaLayerGroup className="text-[10px]"/> {getDomaineLabel(ment.id_domaine || ment.Domaine_id_fk)}</span>}
                imageSrc={(ment.Mention_logo_path || ment.logo_path) ? `${API_BASE_URL}${ment.Mention_logo_path || ment.logo_path}` : null} 
                PlaceholderIcon={FaGraduationCap} 
                onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${ment.id_mention || ment.Mention_id}`, { state: { mention: ment, etablissement, institution } })}
                onEdit={() => openModal(ment)}
                onDelete={() => handleDeleteClick(ment)}
              >
                  {/* ... Mentions Count ... */}
              </CardItem>
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL AJOUT MENTION AVEC DOMAINES DYNAMIQUES */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editMention ? "Modifier la Mention" : "Nouvelle Mention"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => fileInputRef.current.click()}>
                      {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" /> :
                       form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover" /> :
                       <PlusIcon className="text-gray-400 text-2xl"/>}
                   </div>
                   <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" name="logo" />
                </div>
                <div className="flex-1 space-y-3">
                    <label className="block">
                        <span className={AppStyles.input.label}>ID</span>
                        <input type="text" value={form.id} disabled className={AppStyles.input.formControlDisabled} />
                    </label>
                    <label className="block">
                        <span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span>
                        <input type="text" name="code" value={form.code} onChange={handleChange} className={`${AppStyles.input.formControl} uppercase font-bold`} />
                    </label>
                </div>
            </div>
            <label>
                <span className={AppStyles.input.label}>Nom <span className="text-red-500">*</span></span>
                <input type="text" name="nom" value={form.nom} onChange={handleChange} className={AppStyles.input.formControl} />
            </label>
            <div className="grid grid-cols-2 gap-4">
                <label>
                    <span className={AppStyles.input.label}>Domaine <span className="text-red-500">*</span></span>
                    <select name="domaine_id" value={form.domaine_id} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.domaine_id ? "border-red-500" : ""}`}>
                        <option value="">-- Sélectionner --</option>
                        {/* 2. Affichage dynamique des domaines */}
                        {domaines.map(d => (
                            <option key={d.Domaine_id} value={d.Domaine_id}>
                                {d.Domaine_label} ({d.Domaine_code})
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span className={AppStyles.input.label}>Abréviation</span>
                    <input type="text" name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl} />
                </label>
            </div>
            <label>
                <span className={AppStyles.input.label}>Description</span>
                <textarea name="description" rows="2" value={form.description} onChange={handleChange} className={AppStyles.input.formControl} />
            </label>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                  {isSubmitting && <SpinnerIcon className="animate-spin" />} Enregistrer
                </button>
            </div>
        </form>
      </DraggableModal>

      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer la mention ?">
          <p className="text-gray-600 mb-2">Cela supprimera la mention : <b>{mentionToDelete?.Mention_label}</b>.</p>
          <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} className={AppStyles.input.formControl} placeholder={mentionToDelete?.Mention_label} />
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