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
  const [institution, setInstitution] = useState(location.state?.institution || null);
  const [mentions, setMentions] = useState([]);
  const [domaines, setDomaines] = useState([]);
  const [etablissementsList, setEtablissementsList] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label"); 
  const [sortOrder, setSortOrder] = useState("asc");

  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editMention, setEditMention] = useState(null);
  const [mentionToDelete, setMentionToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  const [form, setForm] = useState({ 
      id: "", nom: "", code: "", domaine_id: "", 
      abbreviation: "", description: "", logo: null, logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // --- CHARGEMENT ---
  
  // 1. Liste pour nav
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

  // 2. Main Fetch
  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        // Institution
        let curInst = institution;
        if (!curInst) {
            const rI = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(rI.ok) { curInst = await rI.json(); setInstitution(curInst); }
        }

        // Etablissement
        let curEtab = etablissement;
        if (!curEtab || curEtab.Composante_code !== etablissementId) {
          const rE = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
          if (!rE.ok) throw new Error("Établissement introuvable");
          curEtab = await rE.json();
          setEtablissement(curEtab);
        }

        // Domaines
        const rD = await fetch(`${API_BASE_URL}/api/domaines/`);
        if (rD.ok) setDomaines(await rD.json());

        // Mentions
        if (curEtab.Composante_id) {
            const rM = await fetch(`${API_BASE_URL}/api/mentions/composante/${curEtab.Composante_id}`);
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
      }
    };
    fetchData();
  }, [etablissementId, institutionId, setBreadcrumb]);

  // --- NAVIGATION ---
  const handleNavigate = (dir) => {
    if (!etablissementsList.length || !etablissement) return;
    const idx = etablissementsList.findIndex(i => i.Composante_code === etablissement.Composante_code);
    const newIdx = dir === 'prev' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < etablissementsList.length) {
      const target = etablissementsList[newIdx];
      navigate(`/institution/${institutionId}/etablissement/${target.Composante_code}`, { state: { composante: target, institution }});
      setEtablissement(target);
      setMentions([]); 
    }
  };
  const isFirst = etablissementsList.length > 0 && etablissement && etablissementsList[0].Composante_code === etablissement.Composante_code;
  const isLast = etablissementsList.length > 0 && etablissement && etablissementsList[etablissementsList.length - 1].Composante_code === etablissement.Composante_code;

  const getDomaineLabel = (id) => {
    const d = domaines.find(x => x.Domaine_id === id);
    return d ? d.Domaine_label : id;
  };

  // --- FORMULAIRE ---
  const openModal = async (mentionToEdit = null) => {
      // 1. Réinitialiser les erreurs
      setErrors({});
      
      // 2. Initialiser le formulaire et déterminer le mode (Création ou Modification)
      if (mentionToEdit) {
          // Mode Modification (Edit)
          setEditMention(mentionToEdit);
          setForm({
              id: mentionToEdit.Mention_id,
              nom: mentionToEdit.Mention_label, 
              code: mentionToEdit.Mention_code,
              domaine_id: mentionToEdit.Domaine_id_fk || "", 
              abbreviation: mentionToEdit.Mention_abbreviation || "",
              description: mentionToEdit.Mention_description || "",
              logo: null, // Le nouveau fichier logo n'est jamais pré-chargé
              logoPath: mentionToEdit.Mention_logo_path || ""
          });

      } else {
          // Mode Création (Add)
          setEditMention(null);
          
          // Formulaire initial (ID temporaire)
          let initialForm = { 
              id: "Chargement...", // Indique que l'ID est en cours de récupération
              nom: "", code: "", domaine_id: "", 
              abbreviation: "", description: "", logo: null, logoPath: "" 
          };
          setForm(initialForm);
          
          // Récupération asynchrone de l'ID disponible (sans bloquer l'interface si l'API est lente)
          try {
              const res = await fetch(`${API_BASE_URL}/api/mentions/next-id`);
              if (res.ok) {
                  const newId = await res.json();
                  setForm(p => ({ ...p, id: newId })); // Mise à jour de l'ID dans le formulaire
              } else {
                  setForm(p => ({ ...p, id: "Erreur ID" })); // Afficher une erreur si la requête échoue
              }
          } catch (e) {
              setForm(p => ({ ...p, id: "Erreur Connexion" }));
          }
      }
      
      // 3. Ouvrir la modale (ouvert immédiatement, car les étapes ci-dessus ne sont pas bloquantes)
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
    if (!form.domaine_id) newErrors.domaine_id = "Requis";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setIsSubmitting(false); return; }

    const formData = new FormData();
    formData.append("nom", form.nom);
    formData.append("code", form.code);
    formData.append("domaine_id", form.domaine_id); 
    
    // IMPORTANT : Champs optionnels et fichiers
    if (form.abbreviation) formData.append("abbreviation", form.abbreviation);
    if (form.description) formData.append("description", form.description);
    
    // ⚠️ LA CLÉ DU PROBLÈME ÉTAIT ICI (Nom du champ = logo_file)
    if (form.logo) formData.append("logo_file", form.logo); 

    try {
      let url = `${API_BASE_URL}/api/mentions/`;
      let method = "POST";

      if (editMention) {
        url += `${editMention.Mention_id}`; 
        method = "PUT";
      } else {
         // Pour la création, on ajoute l'ID de la composante parente
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
                   title={m.Mention_label} subTitle={<span className="flex items-center gap-1"><FaLayerGroup size={10}/> {getDomaineLabel(m.Domaine_id_fk)}</span>}
                   imageSrc={m.Mention_logo_path ? `${API_BASE_URL}${m.Mention_logo_path}` : null}
                   PlaceholderIcon={FaGraduationCap}
                   onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${m.Mention_id}`, {state:{mention:m, etablissement, institution}})}
                   onEdit={() => openModal(m)}
                   onDelete={() => {setMentionToDelete(m); setDeleteInput(""); setDeleteModalOpen(true);}}
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
                     <select name="domaine_id" value={form.domaine_id} onChange={handleChange} className={`${AppStyles.input.formControl} ${errors.domaine_id?"border-red-500":""}`}>
                         <option value="">-- Choix --</option>
                         {domaines.map(d => <option key={d.Domaine_id} value={d.Domaine_id}>{d.Domaine_label}</option>)}
                     </select>
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

             <div className="flex justify-end gap-2 pt-2 border-t">
                 <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                 <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>
                     {isSubmitting && <SpinnerIcon className="animate-spin"/>} Enregistrer
                 </button>
             </div>
         </form>
      </DraggableModal>

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