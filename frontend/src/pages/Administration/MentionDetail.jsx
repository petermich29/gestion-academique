// frontend/src/pages/Administration/MentionDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft, FaChevronRight, FaBookOpen, FaLayerGroup } from "react-icons/fa";

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

  // --- ÉTATS ---
  const [mention, setMention] = useState(location.state?.mention || null);
  const [etablissement, setEtablissement] = useState(location.state?.etablissement || null);
  const [parcours, setParcours] = useState([]);
  
  // Listes de référence pour les formulaires / Navigation
  const [mentionsList, setMentionsList] = useState([]); // Pour la navigation prev/next
  const [typesFormation, setTypesFormation] = useState([]); // Pour le select du form

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
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
  const [editParcours, setEditParcours] = useState(null);
  const [parcoursToDelete, setParcoursToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");
  
  // Formulaire
  const [form, setForm] = useState({ 
      id: "", code: "", label: "", abbreviation: "", description: "", 
      type_formation: "TYPE_01", logo: null, logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // --- 1. CHARGEMENT DES DONNÉES ---
  
  // A. Charger la liste des mentions pour la navigation (Next/Prev)
  useEffect(() => {
     const fetchMentionsList = async () => {
         try {
             const res = await fetch(`${API_BASE_URL}/api/mentions/composante/${etablissementId}`);
             if(res.ok) {
                 const data = await res.json();
                 setMentionsList(data.sort((a,b) => a.Mention_code.localeCompare(b.Mention_code)));
             }
         } catch(e) { console.error("Err navigation mentions", e); }
     };
     if(etablissementId) fetchMentionsList();
  }, [etablissementId]);

  // B. Charger Types de Formation (Reference)
  useEffect(() => {
      // Supposons une route pour récupérer les types (sinon on hardcode pour l'exemple)
      // Simulé ici ou fetch réel si route existe
      const fetchTypes = async () => {
          // const res = await fetch(`${API_BASE_URL}/api/types_formation/`);
          // if(res.ok) setTypesFormation(await res.json());
          // MOCK pour l'exemple si la route n'est pas dans le context fourni:
          setTypesFormation([
              { id: 'TYPE_01', label: 'Formation Initiale (FI)' },
              { id: 'TYPE_02', label: 'Formation Continue (FC)' },
              { id: 'TYPE_03', label: 'Formation à Distance (FAD)' },
          ]);
      };
      fetchTypes();
  }, []);

  // C. Charger Mention & Parcours
  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        // Récupérer Mention si pas en state ou si ID a changé
        let currentMention = mention;
        if (!currentMention || currentMention.Mention_id !== mentionId) {
            const res = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
            if (!res.ok) throw new Error("Mention introuvable");
            currentMention = await res.json();
            setMention(currentMention);
        }

        // Récupérer Etablissement pour le breadcrumb (si manquant)
        if (!etablissement) {
            const resEtab = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
            if(resEtab.ok) setEtablissement(await resEtab.json());
        }

        // Les parcours sont inclus dans la réponse MentionSchema (voir schemas.py updated)
        // Sinon, on pourrait fetcher /api/parcours/mention/{id}
        if (currentMention.parcours) {
            setParcours(currentMention.parcours);
        }

        // Mise à jour Breadcrumb
        if (setBreadcrumb) {
            setBreadcrumb([
                { label: "Institution", path: `/institution/${institutionId}` },
                { label: etablissement?.Composante_abbreviation || "Etab.", path: `/institution/${institutionId}/etablissement/${etablissementId}` },
                { label: currentMention.Mention_abbreviation || currentMention.Mention_label, path: "#" },
            ]);
        }

      } catch (err) {
        addToast("Erreur chargement: " + err.message, "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [mentionId, etablissementId, institutionId, setBreadcrumb]);

  // --- 2. NAVIGATION ENTRE MENTIONS ---
  const handleNavigate = (direction) => {
      if (!mentionsList.length || !mention) return;
      const idx = mentionsList.findIndex(m => m.Mention_id === mention.Mention_id);
      if (idx === -1) return;
      
      const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
      if (newIdx >= 0 && newIdx < mentionsList.length) {
          const nextM = mentionsList[newIdx];
          navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${nextM.Mention_id}`, {
              state: { mention: nextM, etablissement }
          });
      }
  };

  const isFirst = mentionsList.length > 0 && mention && mentionsList[0].Mention_id === mention.Mention_id;
  const isLast = mentionsList.length > 0 && mention && mentionsList[mentionsList.length - 1].Mention_id === mention.Mention_id;

  // --- 3. CRUD PARCOURS ---

  const openModal = async (p = null) => {
    setErrors({});
    
    // --- 1. Initialisation des données du formulaire ---
    if (p) {
        // Mode ÉDITION
        setEditParcours(p);
        setForm({
            id: p.Parcours_id,
            code: p.Parcours_code,
            label: p.Parcours_label || p.nom_parcours,
            abbreviation: p.Parcours_abbreviation || "",
            description: p.Parcours_description || "",
            type_formation: p.Parcours_type_formation_defaut_id_fk || "TYPE_01",
            logo: null,
            logoPath: p.Parcours_logo_path || ""
        });
    } else {
        // Mode CRÉATION
        setEditParcours(null);
        // Initialiser avec des valeurs vides (ID temporaire "...")
        setForm({ 
            id: "...", 
            code: "", 
            label: "", 
            abbreviation: "", 
            description: "", 
            type_formation: "TYPE_01", 
            logo: null, 
            logoPath: "" 
        });

        // Utilisation de la fonction utilitaire pour l'appel async
        const nextId = await fetchNextParcoursId();
        
        // Mettre à jour l'ID du formulaire une fois l'appel terminé
        // On utilise setForm avec un callback pour s'assurer qu'on utilise le state le plus récent
        setForm(prev => ({ ...prev, id: nextId }));
    }
    
    // --- 2. Ouverture de la modale ---
    setModalOpen(true);
};

  const closeModal = () => { setModalOpen(false); setEditParcours(null); };

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
      if(!form.code) newErrors.code = "Code requis";
      if(!form.label) newErrors.label = "Libellé requis";
      if(Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setIsSubmitting(false);
          return;
      }

      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("label", form.label);
      formData.append("id_type_formation", form.type_formation);
      formData.append("abbreviation", form.abbreviation);
      formData.append("description", form.description);
      if(form.logo) formData.append("logo_file", form.logo);

      try {
          let url = `${API_BASE_URL}/api/mentions/parcours/`;
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
          if(!res.ok) throw new Error("Erreur sauvegarde parcours");
          
          const saved = await res.json();
          setParcours(prev => editParcours 
            ? prev.map(p => p.Parcours_id === saved.Parcours_id ? saved : p)
            : [...prev, saved]
          );
          
          addToast(editParcours ? "Parcours modifié" : "Parcours créé");
          closeModal();
      } catch(e) {
          addToast(e.message, "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDelete = (p) => {
      setParcoursToDelete(p);
      setDeleteInput("");
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if(!parcoursToDelete) return;
      if(deleteInput !== parcoursToDelete.Parcours_code) {
          addToast("Le code ne correspond pas", "error");
          return;
      }
      try {
          const res = await fetch(`${API_BASE_URL}/api/mentions/parcours/${parcoursToDelete.Parcours_id}`, { method: "DELETE" });
          if(res.ok) {
              setParcours(prev => prev.filter(p => p.Parcours_id !== parcoursToDelete.Parcours_id));
              addToast("Parcours supprimé");
              setDeleteModalOpen(false);
          }
      } catch(e) { addToast("Erreur suppression", "error"); }
  };

  // --- 4. RENDER ---

  const filteredParcours = parcours.filter(p => 
      (p.Parcours_label || "").toLowerCase().includes(search.toLowerCase()) || 
      (p.Parcours_code || "").toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => {
      const vA = a.Parcours_label || "";
      const vB = b.Parcours_label || "";
      return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
  });

  if(isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600" /></div>;
  if(!mention) return <div className="p-10 text-center">Mention introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER PAGE */}
      <div className={AppStyles.header.container}>
         <h2 className={AppStyles.mainTitle}>Détails de la Mention</h2>
      </div>
      <hr className={AppStyles.separator} />

      {/* INFO MENTION (NAVIGABLE) */}
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
          <div className="flex-shrink-0 mx-auto md:mx-0">
             {mention.Mention_logo_path ? (
                 <img src={`${API_BASE_URL}${mention.Mention_logo_path}`} className="w-24 h-24 object-contain border rounded-lg bg-gray-50 p-2" alt="Logo"/>
             ) : (
                 <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><FaGraduationCap className="w-10 h-10"/></div>
             )}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
              <div 
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start"
                  onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}`)}
              >
                  <FaChevronLeft /> Retour à l'établissement
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{mention.Mention_label}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold">{mention.Mention_code}</span>
                  {mention.Mention_abbreviation && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border">{mention.Mention_abbreviation}</span>}
              </div>
              <p className="text-sm text-gray-500 max-w-2xl">{mention.Mention_description}</p>
          </div>

          {/* Navigation Précédent / Suivant */}
          <div className="absolute top-4 right-4 flex gap-1">
             <button onClick={() => handleNavigate('prev')} disabled={isFirst} className={`p-2 rounded-full border ${isFirst ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronLeft/></button>
             <button onClick={() => handleNavigate('next')} disabled={isLast} className={`p-2 rounded-full border ${isLast ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}><FaChevronRight/></button>
          </div>
      </motion.div>

      {/* CONTROLS PARCOURS */}
      <div className={AppStyles.header.container}>
          <h2 className={AppStyles.header.title}>Parcours ({filteredParcours.length})</h2>
          <div className={AppStyles.header.controls}>
              <input type="text" placeholder="Rechercher parcours..." value={search} onChange={e => setSearch(e.target.value)} className={AppStyles.input.text} />
              <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-2 bg-white border rounded hover:text-blue-600"><SortIcon order={sortOrder}/></button>
              <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>{view === "grid" ? <ListIcon /> : <ThIcon />}</button>
          </div>
      </div>

      {/* LISTE PARCOURS */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
          {/* Add Card */}
          <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
              <div className={`${AppStyles.addCard.iconContainer} ${view === "grid" ? "w-12 h-12 text-2xl" : "w-8 h-8 text-lg"}`}><PlusIcon /></div>
              <p className="text-sm font-semibold text-blue-700">Ajouter un Parcours</p>
          </div>

          <AnimatePresence mode="popLayout">
              {filteredParcours.map(p => (
                  <CardItem
                     key={p.Parcours_id}
                     viewMode={view}
                     title={p.Parcours_label || p.nom_parcours}
                     subTitle={
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded">{p.Parcours_code}</span>
                        </span>
                     }
                     imageSrc={p.Parcours_logo_path ? `${API_BASE_URL}${p.Parcours_logo_path}` : null}
                     PlaceholderIcon={FaBookOpen}
                     onEdit={() => openModal(p)}
                     onDelete={() => handleDelete(p)}
                     onClick={() => {/* Potentielle navigation vers le détail du parcours (UE, EC...) */}}
                  >
                      {/* Détail Type Formation */}
                      <div className="mt-2 pt-2 border-t border-gray-50 w-full text-xs text-gray-500">
                          {typesFormation.find(t => t.id === p.Parcours_type_formation_defaut_id_fk)?.label || p.Parcours_type_formation_defaut_id_fk}
                      </div>
                  </CardItem>
              ))}
          </AnimatePresence>
      </div>

      {/* MODAL EDIT/CREATE */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editParcours ? "Modifier Parcours" : "Nouveau Parcours"}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400" onClick={() => fileInputRef.current.click()}>
                          {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover"/> : 
                           form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover"/> :
                           <PlusIcon className="text-gray-400"/>}
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFormChange} className="hidden" name="logo" />
                      <span className="text-[10px] font-bold text-gray-500">LOGO</span>
                  </div>
                  <div className="flex-1 space-y-3">
                      <div>
                          <span className={AppStyles.input.label}>ID</span>
                          <input type="text" value={form.id} disabled className={AppStyles.input.formControlDisabled}/>
                      </div>
                      <div>
                          <span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span>
                          <input type="text" name="code" value={form.code} onChange={handleFormChange} className={`${AppStyles.input.formControl} uppercase font-bold ${errors.code ? 'border-red-500':''}`}/>
                      </div>
                  </div>
              </div>

              <div>
                  <span className={AppStyles.input.label}>Intitulé Parcours <span className="text-red-500">*</span></span>
                  <input type="text" name="label" value={form.label} onChange={handleFormChange} className={AppStyles.input.formControl} placeholder="Ex: Génie Logiciel"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <span className={AppStyles.input.label}>Abréviation</span>
                      <input type="text" name="abbreviation" value={form.abbreviation} onChange={handleFormChange} className={AppStyles.input.formControl} placeholder="Ex: GL"/>
                  </div>
                  <div>
                      <span className={AppStyles.input.label}>Type Formation</span>
                      <select name="type_formation" value={form.type_formation} onChange={handleFormChange} className={AppStyles.input.formControl}>
                          {typesFormation.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                  </div>
              </div>

              <div>
                  <span className={AppStyles.input.label}>Description</span>
                  <textarea name="description" rows="2" value={form.description} onChange={handleFormChange} className={AppStyles.input.formControl}/>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                  <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                      {isSubmitting && <SpinnerIcon className="animate-spin"/>} Enregistrer
                  </button>
              </div>
          </form>
      </DraggableModal>

      {/* MODAL DELETE */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer le Parcours ?">
          <p className="text-gray-600 mb-4">Cela supprimera définitivement le parcours <b>{parcoursToDelete?.Parcours_label}</b>.</p>
          <p className="text-xs text-gray-500 mb-1">Confirmez en tapant le code : <b>{parcoursToDelete?.Parcours_code}</b></p>
          <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} className={AppStyles.input.formControl} placeholder={parcoursToDelete?.Parcours_code}/>
          <div className="flex justify-end gap-2 mt-4">
               <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
               <button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>

    </div>
  );
};

export default MentionDetail;