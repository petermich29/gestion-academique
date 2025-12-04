// frontend/src/pages/Administration/InstitutionDetail.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaUniversity, FaChevronLeft, FaHistory } from "react-icons/fa";

import { 
  LibraryIcon, ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import EntityHistoryManager from "../../components/ui/EntityHistoryManager"; 
import YearMultiSelect from "../../components/ui/YearMultiSelect"; 

const API_BASE_URL = "http://127.0.0.1:8000";
// 🚨 RETIRÉ : ID_REGEX et getNextMinimalId ne sont plus nécessaires car l'ID est généré par le backend.
// const ID_REGEX = /COMP_(\d+)/;
// const getNextMinimalId = (existingIds) => { /* ... */ };

const InstitutionDetail = () => {
  const { id: institutionId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- ÉTATS ---
  const [institution, setInstitution] = useState(null);
  const [composantes, setComposantes] = useState([]);
  // ... (autres états)
  const [typesComposante, setTypesComposante] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYearsIds, setSelectedYearsIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const firstLoadRef = useRef(true);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editComposante, setEditComposante] = useState(null);
  const [composanteToDelete, setComposanteToDelete] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  const [form, setForm] = useState({ 
    id: "", code: "", label: "", 
    type_id: "", // Champ pour le select
    abbreviation: "", description: "", logo: null, logoPath: "" 
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --- CHARGEMENT DES RÉFÉRENCES (unchanged) ---
  useEffect(() => {
    const fetchReferences = async () => {
        // ... (unchanged)
        try {
            // 1. Fetch Années
            const resYears = await fetch(`${API_BASE_URL}/api/metadonnees/annees-universitaires`);
            const dataYears = resYears.ok ? await resYears.json() : [];
            setYears(dataYears);
            const active = dataYears.find(y => y.AnneeUniversitaire_is_active);
            if (active) setSelectedYearsIds([active.AnneeUniversitaire_id]);

            // 2. Fetch Types Composante 
            const resTypes = await fetch(`${API_BASE_URL}/api/metadonnees/types-composante`);
            if (resTypes.ok) {
                setTypesComposante(await resTypes.json());
            } else {
                console.error("Erreur chargement types composante:", resTypes.status);
            }

        } catch (e) { console.error(e); }
    };
    fetchReferences();
  }, []);

  // --- CHARGEMENT DES DONNÉES (unchanged) ---
  useEffect(() => {
    if (firstLoadRef.current && selectedYearsIds.length === 0) return;

    const fetchData = async () => {
      // ... (unchanged)
      if (firstLoadRef.current) setIsLoading(true); else setIsRefreshing(true);
      
      try {
        const resInst = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
        if (!resInst.ok) throw new Error("Institution introuvable");
        const instData = await resInst.json();
        setInstitution(instData);

        const q = new URLSearchParams();
        q.append("institution_id", institutionId);
        selectedYearsIds.forEach(id => q.append("annees", id)); 

        const resComp = await fetch(`${API_BASE_URL}/api/composantes/institution?${q.toString()}`);
        if (resComp.ok) {
            setComposantes(await resComp.json());
        }

        if (setBreadcrumb) {
          setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: instData.Institution_nom, path: `/institution/${institutionId}` },
          ]);
        }
      } catch (err) {
        addToast(err.message, "error");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        firstLoadRef.current = false;
      }
    };
    fetchData();
  }, [institutionId, selectedYearsIds, setBreadcrumb]);

  
  // 🆕 NOUVELLE FONCTION : Récupérer l'ID minimal du backend (qui connaît toutes les composantes)
  const fetchNextComposanteId = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/composantes/next-id`);
        if (!res.ok) throw new Error("Erreur lors de la récupération du prochain ID.");
        // Le backend retourne l'ID directement en tant que chaîne
        return await res.json(); 
    } catch (e) {
        console.error(e);
        addToast("Erreur ID: " + e.message, "error");
        return ""; // Retourne une chaîne vide en cas d'échec
    }
  };


  // --- GESTION FORMULAIRE ---
  const openModal = async (comp = null) => { // 🚨 openModal devient ASYNC
    setErrors({});
    if (comp) {
        setEditComposante(comp);
        setForm({
            id: comp.Composante_id,
            code: comp.Composante_code,
            label: comp.Composante_label,
            // Note: l'ID stocké dans la DB est dans le champ 'Composante_type'
            type_id: comp.Composante_type || (comp.type_composante ? comp.type_composante.TypeComposante_id : ""), 
            abbreviation: comp.Composante_abbreviation || "",
            description: comp.Composante_description || "",
            logo: null,
            logoPath: comp.Composante_logo_path || ""
        });
    } else {
        setEditComposante(null);
        // 🚨 FIX : Appel au backend pour l'ID global
        const nextId = await fetchNextComposanteId();
        setForm({
            id: nextId,
            code: "", label: "", 
            type_id: "", // Par défaut vide
            abbreviation: "", description: "", logo: null, logoPath: ""
        });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditComposante(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = "Requis";
    if (!form.label.trim()) newErrors.label = "Requis";
    
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const fd = new FormData();
    let url = `${API_BASE_URL}/api/composantes/`;
    let method = "POST";

    if (editComposante) {
        // --- PUT OPERATION (Modification) --- (unchanged)
        url += editComposante.Composante_id;
        method = "PUT";
        
        fd.append("institution_id_fk", institutionId);
        
        fd.append("code", form.code);
        fd.append("Composante_label", form.label);
        fd.append("Composante_type", form.type_id || ""); 

        if (form.abbreviation) fd.append("Composante_abbreviation", form.abbreviation);
        if (form.description) fd.append("Composante_description", form.description);
        if (form.logo) fd.append("logo", form.logo);

    } else {
        // --- POST OPERATION (Création) --- (unchanged, sauf que form.id est maintenant fiable)
        fd.append("id_composante", form.id);
        fd.append("code", form.code);
        fd.append("Composante_label", form.label);
        
        fd.append("Composante_type", form.type_id || ""); 
        
        fd.append("institution_id_fk", institutionId);

        if (form.abbreviation) fd.append("Composante_abbreviation", form.abbreviation);
        if (form.description) fd.append("Composante_description", form.description);
        if (form.logo) fd.append("logo", form.logo);

        const active = years.find(y => y.AnneeUniversitaire_is_active);
        if (active) fd.append("annees_universitaires", active.AnneeUniversitaire_id);
    }

    try {
        const res = await fetch(url, { method, body: fd });
        if (!res.ok) {
            const errDetail = await res.json();
            throw new Error(errDetail.detail || `Erreur serveur: ${res.status}`);
        }

        const savedComp = await res.json();
        
        // Mise à jour optimiste du state local sans recharger
        savedComp.Composante_type = form.type_id || null; 
        
        if (form.type_id) {
            const selectedType = typesComposante.find(t => t.TypeComposante_id === form.type_id);
            if (selectedType) savedComp.type_composante = selectedType;
        }

        setComposantes(prev => 
            editComposante 
            ? prev.map(c => c.Composante_id === savedComp.Composante_id ? savedComp : c)
            : [...prev, savedComp]
        );

        addToast(editComposante ? "Établissement modifié" : "Établissement créé");
        closeModal();

    } catch (error) {
        addToast(error.message, "error");
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== composanteToDelete?.Composante_code) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/composantes/${composanteToDelete.Composante_id}`, { method: "DELETE" });
        if (res.ok) {
            setComposantes(p => p.filter(c => c.Composante_id !== composanteToDelete.Composante_id));
            addToast("Supprimé avec succès");
            setDeleteModalOpen(false);
        } else {
            addToast("Impossible de supprimer", "error");
        }
    } catch (e) { addToast("Erreur connexion", "error"); }
  };

  // --- RENDER (unchanged) ---
  const filtered = composantes
    .filter(c => (c.Composante_label + c.Composante_code + (c.Composante_abbreviation||"")).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
        const valA = sortField === 'label' ? a.Composante_label : a.Composante_code;
        const valB = sortField === 'label' ? b.Composante_label : b.Composante_code;
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  if (isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600"/></div>;
  if (!institution) return <div className="p-10 text-center">Institution introuvable</div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* HEADER */}
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6 mb-6">
         {/* ... (unchanged) */}
         <div className="flex-shrink-0">
            {institution.Institution_logo_path ? 
             <img src={`${API_BASE_URL}${institution.Institution_logo_path}`} className="w-20 h-20 object-contain"/> : 
             <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><FaUniversity size={35}/></div>
            }
         </div>
         <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={()=>navigate(`/administration`)}>
                <FaChevronLeft/> Retour Liste
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">{institution.Institution_nom}</h1>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold font-mono">{institution.Institution_code}</span>
         </div>
      </motion.div>

      {/* CONTROLS */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Établissements / Composantes ({filtered.length})</h2>
        <div className={AppStyles.header.controls}>
           <div className="flex items-center gap-2 relative">
             <YearMultiSelect years={years} selectedYearIds={selectedYearsIds} onChange={setSelectedYearsIds} />
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

      {/* LIST / GRID */}
      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
         <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
             <PlusIcon className={view==='grid'?"text-2xl":"text-lg"}/> <span className="font-bold text-blue-700 text-sm">Ajouter</span>
         </div>
         <AnimatePresence>
            {filtered.map(comp => {
                // Récupération du label du type pour affichage
                const typeLabel = comp.type_composante?.TypeComposante_label || 
                                  typesComposante.find(t => t.TypeComposante_id === comp.Composante_type)?.TypeComposante_label || 
                                  "Non défini";
                return (
                    <CardItem 
                    key={comp.Composante_id} viewMode={view}
                    title={comp.Composante_abbreviation || comp.Composante_label} 
                    subTitle={comp.Composante_label}
                    imageSrc={comp.Composante_logo_path ? `${API_BASE_URL}${comp.Composante_logo_path}` : null}
                    PlaceholderIcon={LibraryIcon}
                    onClick={() => navigate(`/institution/${institutionId}/etablissement/${comp.Composante_code}`, { state: { composante: comp, institution } })}
                    onEdit={() => openModal(comp)}
                    onDelete={() => {setComposanteToDelete(comp); setDeleteInput(""); setDeleteModalOpen(true);}}
                    >
                        <div className="mt-2 text-xs text-gray-400 flex justify-between w-full">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-600 truncate max-w-[100px]" title={typeLabel}>
                                {typeLabel}
                            </span>
                            <span className="font-bold">{comp.mentions ? comp.mentions.length : 0} Mentions</span>
                        </div>
                    </CardItem>
                );
            })}
         </AnimatePresence>
      </div>

      {/* MODAL FORM */}
      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editComposante ? "Modifier Établissement" : "Nouvel Établissement"}>
         <form onSubmit={handleSubmit} className="flex flex-col gap-4">
             <div className="flex gap-4">
                 <div className="flex flex-col items-center gap-1">
                    {/* ... (unchanged) */}
                    <div onClick={()=>fileInputRef.current.click()} className="w-20 h-20 bg-gray-50 border rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden relative group">
                        {form.logo ? (
                            <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover"/>
                        ) : form.logoPath ? (
                            <img src={`${API_BASE_URL}${form.logoPath}`} className="w-full h-full object-cover"/>
                        ) : (
                            <PlusIcon className="text-gray-400"/>
                        )}
                        <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white text-xs">Changer</div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" name="logo" onChange={(e) => setForm(p => ({ ...p, logo: e.target.files[0] }))} accept="image/*"/>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Logo</span>
                 </div>

                 <div className="flex-1 space-y-3">
                     <div>
                         <span className={AppStyles.input.label}>ID (Auto)</span>
                         <input value={form.id} disabled className={AppStyles.input.formControlDisabled}/>
                     </div>
                     <div>
                         <span className={AppStyles.input.label}>Code <span className="text-red-500">*</span></span>
                         <input name="code" value={form.code} onChange={e=>setForm({...form, code: e.target.value})} className={`${AppStyles.input.formControl} uppercase font-bold ${errors.code?"border-red-500":""}`} placeholder="Ex: ENI"/>
                     </div>
                 </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <span className={AppStyles.input.label}>Nom <span className="text-red-500">*</span></span>
                    <input name="label" value={form.label} onChange={e=>setForm({...form, label: e.target.value})} className={`${AppStyles.input.formControl} ${errors.label?"border-red-500":""}`}/>
                </div>
                
                {/* LISTE DÉROULANTE TYPES */}
                <div className="md:col-span-2">
                    <span className={AppStyles.input.label}>Type d'établissement</span>
                    <select 
                        name="type_id" 
                        value={form.type_id} 
                        onChange={e=>setForm({...form, type_id: e.target.value})} 
                        className={`${AppStyles.input.formControl} ${errors.type_id?"border-red-500":""}`}
                    >
                         <option value="">-- Sélectionner un type --</option>
                         {typesComposante.map(t => (
                            <option key={t.TypeComposante_id} value={t.TypeComposante_id}>
                                {t.TypeComposante_label}
                            </option>
                         ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                     <span className={AppStyles.input.label}>Abréviation</span>
                     <input name="abbreviation" value={form.abbreviation} onChange={e=>setForm({...form, abbreviation: e.target.value})} className={AppStyles.input.formControl}/>
                </div>
             </div>

             <div>
                 <span className={AppStyles.input.label}>Description</span>
                 <textarea name="description" rows="2" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className={AppStyles.input.formControl}/>
             </div>

             <div className="flex justify-between items-center pt-2 border-t mt-2">
                 {editComposante ? (
                    <button type="button" onClick={() => setHistoryManagerOpen(true)} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        <FaHistory /> Gérer Historique
                    </button>
                 ) : <div></div>}

                 <div className="flex gap-2">
                    <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                    <button type="submit" className={AppStyles.button.primary}>Enregistrer</button>
                 </div>
             </div>
         </form>
      </DraggableModal>

      {editComposante && (
        <EntityHistoryManager
            isOpen={historyManagerOpen}
            onClose={() => setHistoryManagerOpen(false)}
            entityId={editComposante.Composante_id}
            entityType="composantes"
            title={`Historique : ${editComposante.Composante_label}`}
        />
      )}

      <ConfirmModal isOpen={deleteModalOpen} onClose={()=>setDeleteModalOpen(false)} title="Supprimer l'établissement ?">
          <p className="text-gray-600 mb-2 text-sm">Tapez <b>{composanteToDelete?.Composante_code}</b> pour confirmer.</p>
          <input value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} className={AppStyles.input.formControl}/>
          <div className="flex justify-end gap-2 mt-4">
             <button onClick={()=>setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
             <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};

export default InstitutionDetail;