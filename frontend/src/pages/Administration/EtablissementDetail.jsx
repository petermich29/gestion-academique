// frontend/src/pages/Administration/EtablissementDetail.jsx - FICHIER COMPLET MIS À JOUR

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft, FaChevronRight, FaLayerGroup, FaHistory } from "react-icons/fa"; // Ajout FaHistory

import { 
  ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import YearMultiSelect from "../../components/ui/YearMultiSelect"; // 🆕
import EntityHistoryManager from "../../components/ui/EntityHistoryManager"; // 🆕
import { useAdministration } from "../../context/AdministrationContext"; // 🆕

const API_BASE_URL = "http://127.0.0.1:8000";

const EtablissementDetail = () => {
  const { etablissementId, id: institutionId } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // 🆕 UTILISATION DU CONTEXTE GLOBAL
  const { selectedYearsIds, setSelectedYearsIds, yearsList } = useAdministration();

  // --- ÉTATS ---
  const [etablissement, setEtablissement] = useState(location.state?.composante || null);
  const [institution, setInstitution] = useState(location.state?.institution || null);
  const [mentions, setMentions] = useState([]);
  const [domaines, setDomaines] = useState([]); // 🆕 État pour les domaines
  const [etablissementsList, setEtablissementsList] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Pour le rechargement lors du changement d'année
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label"); 
  const [sortOrder, setSortOrder] = useState("asc");

  const [toasts, setToasts] = useState([]);
  
  // États Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false); // 🆕
  
  const [editMention, setEditMention] = useState(null);
  const [mentionToDelete, setMentionToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  const [form, setForm] = useState({ 
      id: "", nom: "", code: "", domaine_id: "", // domaine_id est le champ du formulaire
      abbreviation: "", description: "", logo: null, logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const firstLoadRef = useRef(true); // Pour éviter double loading

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --- UTILS : DOMAINE LABEL ---
  const getDomaineLabel = (id) => {
    if (!id) return "Non défini";
    const d = domaines.find(x => x.Domaine_id === id);
    // 🆕 Afficher le label s'il est trouvé, sinon afficher l'ID (fallback)
    return d ? d.Domaine_label : id; 
  };
  // -----------------------------


  // --- CHARGEMENT ---
  
  // 1. Liste pour navigation (Sidebar ou Next/Prev)
  useEffect(() => {
    const fetchList = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/composantes/institution?institution_id=${institutionId}`);
            if (res.ok) {
                const data = await res.json();
                setEtablissementsList(data.sort((a,b)=>(a.Composante_code||"").localeCompare(b.Composante_code||"")));
            }
        } catch(e) { console.error(e); }
    };
    if (institutionId) fetchList();
  }, [institutionId]);

  // 2. Main Fetch (Dépendant des années sélectionnées)
  useEffect(() => {
    // Si premier chargement ou changement d'année
    const fetchData = async () => {
      if (firstLoadRef.current) setIsLoading(true); else setIsRefreshing(true);
      
      try {
        // Institution (si pas dans le state)
        let curInst = institution;
        if (!curInst) {
            const rI = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(rI.ok) { curInst = await rI.json(); setInstitution(curInst); }
        }

        // Etablissement
        let curEtab = etablissement;
        // On recharge l'établissement si l'ID change ou pour rafraîchir
        if (!curEtab || curEtab.Composante_code !== etablissementId) {
          const rE = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
          if (!rE.ok) throw new Error("Établissement introuvable");
          curEtab = await rE.json();
          setEtablissement(curEtab);
        }

        // Domaines (Référence statique) - 🆕 CORRECTION DE L'URL
        if (domaines.length === 0) {
            // Utilisation de la route dans metadonnees_routes
            const rD = await fetch(`${API_BASE_URL}/api/metadonnees/domaines`); 
            if (rD.ok) setDomaines(await rD.json());
        }

        // Mentions (Avec filtre années)
        if (curEtab.Composante_id) {
            const q = new URLSearchParams();
            selectedYearsIds.forEach(id => q.append("annees", id));
            
            const rM = await fetch(`${API_BASE_URL}/api/mentions/composante/${curEtab.Composante_id}?${q.toString()}`);
            if (rM.ok) setMentions(await rM.json());
        }

        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: curInst?.Institution_nom || institutionId, path: `/institution/${institutionId}` },
            { label: curEtab.Composante_abbreviation || curEtab.Composante_label, path: `#` },
          ]);
        }
      } catch (err) {
        addToast("Erreur chargement: " + err.message, "error");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        firstLoadRef.current = false;
      }
    };
    
    // On lance le fetch seulement si on a l'ID et (idéalement) les années chargées du context
    if (etablissementId) fetchData();

  }, [etablissementId, institutionId, setBreadcrumb, selectedYearsIds, domaines.length]); 
  // Ajout de domaines.length dans les dépendances pour recharger les mentions si les domaines sont enfin chargés

  // --- NAVIGATION ---
  const handleNavigate = (dir) => {
    if (!etablissementsList.length || !etablissement) return;
    const idx = etablissementsList.findIndex(i => i.Composante_code === etablissement.Composante_code);
    const newIdx = dir === 'prev' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < etablissementsList.length) {
      const target = etablissementsList[newIdx];
      navigate(`/institution/${institutionId}/etablissement/${target.Composante_code}`, { state: { composante: target, institution }});
      setEtablissement(target);
      // Reset partiel
      setMentions([]); 
      firstLoadRef.current = false; // Permettre le re-fetch immédiat via useEffect
    }
  };
  const isFirst = etablissementsList.length > 0 && etablissement && etablissementsList[0].Composante_code === etablissement.Composante_code;
  const isLast = etablissementsList.length > 0 && etablissement && etablissementsList[etablissementsList.length - 1].Composante_code === etablissement.Composante_code;

  // --- FORMULAIRE ---
  const openModal = async (mentionToEdit = null) => {
      setErrors({});
      if (mentionToEdit) {
          setEditMention(mentionToEdit);
          setForm({
              id: mentionToEdit.Mention_id,
              nom: mentionToEdit.Mention_label, 
              code: mentionToEdit.Mention_code,
              domaine_id: mentionToEdit.Domaine_id_fk || "", // Utilisation de Domaine_id_fk pour la modification
              abbreviation: mentionToEdit.Mention_abbreviation || "",
              description: mentionToEdit.Mention_description || "",
              logo: null, logoPath: mentionToEdit.Mention_logo_path || ""
          });
      } else {
          setEditMention(null);
          let initialForm = { 
              id: "Chargement...", 
              nom: "", code: "", domaine_id: "", 
              abbreviation: "", description: "", logo: null, logoPath: "" 
          };
          setForm(initialForm);
          try {
              const res = await fetch(`${API_BASE_URL}/api/mentions/next-id`);
              if (res.ok) {
                  const newId = await res.json();
                  setForm(p => ({ ...p, id: newId }));
              }
          } catch (e) {
              setForm(p => ({ ...p, id: "Erreur" }));
          }
      }
      setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditMention(null); };
  
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "logo" && files) setForm(p => ({ ...p, logo: files[0] }));
    else setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const newErrors = {};
    if (!form.nom.trim()) newErrors.nom = "Requis";
    if (!form.code.trim()) newErrors.code = "Requis";
    if (!form.domaine_id) newErrors.domaine_id = "Le domaine est requis";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setIsSubmitting(false); return; }

    const formData = new FormData();
    formData.append("nom", form.nom);
    formData.append("code", form.code);
    formData.append("domaine_id", form.domaine_id); // 🆗 domaine_id est le champ envoyé
    if (form.abbreviation) formData.append("abbreviation", form.abbreviation);
    if (form.description) formData.append("description", form.description);
    if (form.logo) formData.append("logo_file", form.logo); 

    // 🆕 Si création, on lie à l'année active par défaut
    if (!editMention) {
          const activeYear = yearsList.find(y => y.AnneeUniversitaire_is_active);
          if (activeYear) formData.append("annees_universitaires", activeYear.AnneeUniversitaire_id);
    }

    try {
      let url = `${API_BASE_URL}/api/mentions/`;
      let method = "POST";

      if (editMention) {
        url += `${editMention.Mention_id}`; 
        method = "PUT";
      } else {
          formData.append("composante_id", etablissement.Composante_id); 
      }

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur sauvegarde");
      }
      
      const saved = await res.json();
      setMentions(prev => editMention ? prev.map(m => m.Mention_id === saved.Mention_id ? saved : m) : [...prev, saved]);
      addToast(editMention ? "Mention modifiée" : "Mention créée");
      closeModal();
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
      if(!mentionToDelete) return;
      if(deleteInput !== mentionToDelete.Mention_label) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/mentions/${mentionToDelete.Mention_id}`, { method: "DELETE" });
        if(res.ok) {
            setMentions(p => p.filter(m => m.Mention_id !== mentionToDelete.Mention_id));
            addToast("Supprimé");
            setDeleteModalOpen(false);
        }
      } catch(e) { addToast("Erreur", "error"); }
  };

  // --- RENDER ---
  const filtered = mentions
    .filter(m => (m.Mention_label+m.Mention_code).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
        const vA = sortField==='label'?a.Mention_label:a.Mention_code;
        const vB = sortField==='label'?b.Mention_label:b.Mention_code;
        return sortOrder==='asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600"/></div>;
  if (!etablissement) return <div className="p-10 text-center">Introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* HEADER ETAB */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.mainTitle}>Détails Établissement</h2>
      </div>
      <hr className={AppStyles.separator} />

      <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
           <div className="flex-shrink-0 mx-auto md:mx-0">
             {etablissement.Composante_logo_path ? 
              <img src={`${API_BASE_URL}${etablissement.Composante_logo_path}`} className="w-24 h-24 object-contain border rounded-lg p-2"/> : 
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><FaGraduationCap size={40}/></div>
             }
           </div>
           <div className="flex-1 space-y-2 text-center md:text-left">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" onClick={()=>navigate(`/institution/${institutionId}`)}>
                 <FaChevronLeft/> Retour Institution
             </div>
             <h1 className="text-2xl font-bold">{etablissement.Composante_label}</h1>
             <div className="flex gap-2 justify-center md:justify-start">
                 <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono font-bold text-sm">{etablissement.Composante_code}</span>
             </div>
           </div>
           <div className="absolute top-4 right-4 flex gap-1">
               <button onClick={()=>handleNavigate('prev')} disabled={isFirst} className={`p-2 rounded-full border ${isFirst?'bg-gray-50 text-gray-300':'hover:bg-gray-100'}`}><FaChevronLeft/></button>
               <button onClick={()=>handleNavigate('next')} disabled={isLast} className={`p-2 rounded-full border ${isLast?'bg-gray-50 text-gray-300':'hover:bg-gray-100'}`}><FaChevronRight/></button>
           </div>
      </motion.div>

      {/* LISTE MENTIONS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Mentions ({filtered.length})</h2>
        <div className={AppStyles.header.controls}>
            
            {/* 🆕 SELECTEUR D'ANNÉES GLOBAL */}
            <div className="flex items-center gap-2 relative">
              <YearMultiSelect years={yearsList} selectedYearIds={selectedYearsIds} onChange={setSelectedYearsIds} />
              {isRefreshing && <span className="absolute left-full text-xs w-max text-gray-500 ml-2">MAJ...</span>}
            </div>

            <input className={AppStyles.input.text} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} />
            <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white text-sm">
              <span className="text-xs font-bold uppercase text-gray-500">Tri:</span>
              <select value={sortField} onChange={e=>setSortField(e.target.value)} className="bg-transparent outline-none cursor-pointer"><option value="label">Nom</option><option value="code">Code</option></select>
              <button onClick={()=>setSortOrder(sortOrder==='asc'?'desc':'asc')}><SortIcon order={sortOrder}/></button>
            </div>
            <button onClick={()=>setView(view==='grid'?'list':'grid')} className={AppStyles.button.icon}>{view==='grid'?<ListIcon/>:<ThIcon/>}</button>
        </div>
      </div>

      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
          <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
              <PlusIcon className={view==='grid'?"text-2xl":"text-lg"}/> <span className="font-bold text-blue-700 text-sm">Ajouter</span>
          </div>
          <AnimatePresence>
            {filtered.map(m => (
                <CardItem 
                    key={m.Mention_id} viewMode={view}
                    title={m.Mention_label} 
                    // 🆕 AFFICHAGE DU LABEL DU DOMAINE
                    subTitle={<span className="flex items-center gap-1"><FaLayerGroup size={10}/> {getDomaineLabel(m.Domaine_id_fk)}</span>}
                    imageSrc={m.Mention_logo_path ? `${API_BASE_URL}${m.Mention_logo_path}` : null}
                    PlaceholderIcon={FaGraduationCap}
                    onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${m.Mention_id}`, {state:{mention:m, etablissement, institution}})}
                    onEdit={() => openModal(m)}
                    onDelete={() => {setMentionToDelete(m); setDeleteInput(""); setDeleteModalOpen(true);}}
                    // 🚨 NOTE: handleHistory n'est plus nécessaire car le bouton est dans le modal d'édition
                >
                    <div className="mt-3 pt-2 border-t border-gray-100 w-full flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-400 uppercase">Parcours</span>
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{m.parcours ? m.parcours.length : 0}</span>
                    </div>
                </CardItem>
            ))}
          </AnimatePresence>
      </div>

      {/* MODAL EDIT */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editMention ? "Modifier Mention" : "Nouvelle Mention"}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
              <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                     <div onClick={()=>fileInputRef.current.click()} className="w-20 h-20 bg-gray-50 border rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden">
                        {form.logo ? <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover"/> : form.logoPath ? <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover"/> : <PlusIcon className="text-gray-400"/>}
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" name="logo" onChange={handleChange}/>
                     <span className="text-[10px] uppercase font-bold text-gray-500">Logo</span>
                  </div>
                  <div className="flex-1 space-y-3">
                      <div>
                          <span className={AppStyles.input.label}>ID</span>
                          <input value={form.id} disabled className={AppStyles.input.formControlDisabled}/>
                      </div>
                      <div>
                          <span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span>
                          <input name="code" value={form.code} onChange={handleChange} className={`${AppStyles.input.formControl} uppercase font-bold ${errors.code?"border-red-500":""}`}/>
                      </div>
                  </div>
              </div>
            
              <div>
                  <span className={AppStyles.input.label}>Nom de la mention <span className="text-red-500">*</span></span>
                  <input name="nom" value={form.nom} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.nom?"border-red-500":""}`}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <span className={AppStyles.input.label}>Domaine <span className="text-red-500">*</span></span>
                      {/* 🆕 LISTE DÉROULANTE DES DOMAINES POPULÉE */}
                      <select 
                        name="domaine_id" 
                        value={form.domaine_id} 
                        onChange={handleChange} 
                        className={`${AppStyles.input.formControl} ${errors.domaine_id?"border-red-500":""}`}
                        disabled={domaines.length === 0}
                      >
                          <option value="">-- Choix --</option>
                          {domaines.map(d => 
                            <option key={d.Domaine_id} value={d.Domaine_id}>
                                {d.Domaine_label}
                            </option>
                          )}
                      </select>
                      {errors.domaine_id && <p className="text-red-500 text-xs mt-1">{errors.domaine_id}</p>}
                  </div>
                  <div>
                      <span className={AppStyles.input.label}>Abréviation</span>
                      <input name="abbreviation" value={form.abbreviation} onChange={handleChange} className={AppStyles.input.formControl}/>
                  </div>
              </div>

              <div>
                  <span className={AppStyles.input.label}>Description</span>
                  <textarea name="description" rows="2" value={form.description} onChange={handleChange} className={AppStyles.input.formControl}/>
              </div>

              <div className="flex justify-between items-center pt-2 border-t mt-2">
                  {/* BOUTON HISTORIQUE */}
                  {editMention ? (
                      <button type="button" onClick={() => setHistoryManagerOpen(true)} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                          <FaHistory /> Gérer Historique
                      </button>
                  ) : <div></div>}

                  <div className="flex gap-2">
                      <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                      <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                          {isSubmitting && <SpinnerIcon className="animate-spin"/>} Enregistrer
                      </button>
                  </div>
              </div>
          </form>
      </DraggableModal>

      {/* MODALE HISTOIRE MANAGER */}
      {editMention && (
        <EntityHistoryManager
            isOpen={historyManagerOpen}
            onClose={() => setHistoryManagerOpen(false)}
            entityId={editMention.Mention_id}
            entityType="mentions" 
            title={`Historique : ${editMention.Mention_label}`}
        />
      )}

      {/* MODAL DELETE */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={()=>setDeleteModalOpen(false)} title="Supprimer Mention ?">
          <p className="text-gray-600 mb-2">Tapez <b>{mentionToDelete?.Mention_label}</b> pour confirmer.</p>
          <input value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} className={AppStyles.input.formControl}/>
          <div className="flex justify-end gap-2 mt-4">
             <button onClick={()=>setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
             <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};

export default EtablissementDetail;