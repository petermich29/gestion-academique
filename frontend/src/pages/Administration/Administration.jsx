import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaHistory } from "react-icons/fa"; 

import { 
  LibraryIcon, ThIcon, ListIcon, PlusIcon, SpinnerIcon, SortIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";
import YearMultiSelect from "../../components/ui/YearMultiSelect";

// 🆕 Import du composant générique
import EntityHistoryManager from "../../components/ui/EntityHistoryManager"; 

const API_URL = "http://127.0.0.1:8000/api";
const ID_REGEX = /INST_(\d+)/;

const getNextMinimalId = (existingIds) => {
  const usedNumbers = existingIds
    .map((id) => { const match = id.match(ID_REGEX); return match ? parseInt(match[1], 10) : null; })
    .filter((n) => n !== null).sort((a, b) => a - b);
  let nextNum = 1;
  for (const n of usedNumbers) { if (n !== nextNum) break; nextNum++; }
  return `INST_${String(nextNum).padStart(4, "000")}`;
};

const Administration = () => {
  // --- États ---
  const [institutions, setInstitutions] = useState([]);
  const [years, setYears] = useState([]); 
  const [selectedYearsIds, setSelectedYearsIds] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  // 🆕 État History Manager
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editInstitution, setEditInstitution] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const fileInputRef = useRef(null);
  const firstLoadRef = useRef(true);

  const [form, setForm] = useState({ id: "", code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: "" });
  const [errors, setErrors] = useState({});

  const addToast = (msg, type="success") => {
      const id = Date.now(); setToasts(p => [...p, {id, message: msg, type}]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

  // --- Chargement ---
  useEffect(() => {
    if (setBreadcrumb) setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    const fetchYears = async () => {
      try {
        const res = await fetch(`${API_URL}/metadonnees/annees-universitaires`);
        const data = res.ok ? await res.json() : [];
        setYears(data);
        const active = data.find(y => y.AnneeUniversitaire_is_active);
        if (active) setSelectedYearsIds([active.AnneeUniversitaire_id]);
      } catch (e) { console.error(e); }
    };
    fetchYears();
  }, [setBreadcrumb]);

  useEffect(() => {
    if (firstLoadRef.current && selectedYearsIds.length === 0) return;
    const fetchInst = async () => {
      if (firstLoadRef.current) setIsLoading(true); else setIsRefreshing(true);
      try {
        const q = new URLSearchParams();
        selectedYearsIds.forEach(id => q.append("annees", id));
        const res = await fetch(`${API_URL}/institutions?${q.toString()}`);
        setInstitutions(res.ok ? await res.json() : []);
      } catch (e) { addToast("Erreur chargement", "error"); }
      finally { setIsLoading(false); setIsRefreshing(false); firstLoadRef.current = false; }
    };
    fetchInst();
  }, [selectedYearsIds]);

  // --- CRUD ---
  const openModal = (inst=null) => {
    setErrors({});
    if (inst) {
        setEditInstitution(inst);
        setForm({
            id: inst.Institution_id, code: inst.Institution_code, nom: inst.Institution_nom,
            type: inst.Institution_type, abbreviation: inst.Institution_abbreviation||"", 
            description: inst.Institution_description||"", logo: null, logoPath: inst.Institution_logo_path||""
        });
    } else {
        setEditInstitution(null);
        setForm({
            id: getNextMinimalId(institutions.map(i => i.Institution_id)),
            code: "", nom: "", type: "", abbreviation: "", description: "", logo: null, logoPath: ""
        });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditInstitution(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("id_institution", form.id);
    fd.append("code", form.code);
    fd.append("nom", form.nom);
    fd.append("type_institution", form.type);
    if(form.abbreviation) fd.append("abbreviation", form.abbreviation);
    if(form.description) fd.append("description", form.description);
    if(form.logo) fd.append("logo_file", form.logo);

    if (!editInstitution) {
        const active = years.find(y => y.AnneeUniversitaire_is_active);
        if(active) fd.append("annees_universitaires", active.AnneeUniversitaire_id);
    }

    try {
        const method = editInstitution ? "PUT" : "POST";
        const res = await fetch(`${API_URL}/institutions`, { method, body: fd });
        if(!res.ok) throw new Error("Erreur serveur");
        const data = await res.json();
        
        setInstitutions(prev => editInstitution ? prev.map(i => i.Institution_id === data.Institution_id ? data : i) : [...prev, data]);
        addToast(editInstitution ? "Modifié" : "Créé");
        closeModal();
    } catch(err) { addToast("Erreur sauvegarde", "error"); }
  };

  const confirmDelete = async () => {
      if(deleteCodeInput !== institutionToDelete?.Institution_code) return;
      await fetch(`${API_URL}/institutions/${institutionToDelete.Institution_id}`, {method:"DELETE"});
      setInstitutions(p => p.filter(i => i.Institution_id !== institutionToDelete.Institution_id));
      setDeleteModalOpen(false);
  };

  const filtered = institutions
    .filter(i => (i.Institution_nom+i.Institution_code).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortOrder==='asc' ? a.Institution_nom.localeCompare(b.Institution_nom) : b.Institution_nom.localeCompare(a.Institution_nom));

  if(isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl"/></div>;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className={AppStyles.header.container}><h2 className={AppStyles.mainTitle}>Administration</h2></div>
      <hr className={AppStyles.separator} />

      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>Institutions ({filtered.length})</h2>
        <div className={AppStyles.header.controls}>
           <div className="flex items-center gap-2 relative">
             <YearMultiSelect years={years} selectedYearIds={selectedYearsIds} onChange={setSelectedYearsIds} />
             {isRefreshing && <span className="absolute left-full text-xs w-max text-gray-500 ml-2">Mise à jour...</span>}
           </div>
           <input className={AppStyles.input.text} placeholder="Recherche..." value={search} onChange={e=>setSearch(e.target.value)} />
           <button onClick={()=>setView(view==='grid'?'list':'grid')} className={AppStyles.button.icon}>{view==='grid'?<ListIcon/>:<ThIcon/>}</button>
        </div>
      </div>

      <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
         <div onClick={()=>openModal()} className={view==="grid"?AppStyles.addCard.grid:AppStyles.addCard.list}><PlusIcon className="text-2xl"/><span className="text-sm font-bold text-blue-700">Ajouter</span></div>
         <AnimatePresence>
            {filtered.map(inst => (
                <CardItem 
                   key={inst.Institution_id} viewMode={view}
                   title={inst.Institution_nom} subTitle={inst.Institution_code}
                   imageSrc={inst.Institution_logo_path ? `http://127.0.0.1:8000${inst.Institution_logo_path}` : null}
                   PlaceholderIcon={LibraryIcon}
                   onClick={() => navigate(`/institution/${inst.Institution_id}`)}
                   onEdit={() => openModal(inst)}
                   onDelete={() => { setInstitutionToDelete(inst); setDeleteCodeInput(""); setDeleteModalOpen(true); }}
                />
            ))}
         </AnimatePresence>
      </div>

      <DraggableModal isOpen={modalOpen} onClose={closeModal} title={editInstitution ? "Modifier" : "Nouvelle Institution"}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Section Logo et IDs */}
            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                    <div 
                        onClick={() => fileInputRef.current.click()} 
                        className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-300 cursor-pointer overflow-hidden flex items-center justify-center hover:border-blue-500 transition-colors"
                    >
                        {form.logo ? (
                            <img src={URL.createObjectURL(form.logo)} className="w-full h-full object-cover" alt="Nouveau logo" />
                        ) : form.logoPath ? (
                            <img src={`http://127.0.0.1:8000${form.logoPath}`} className="w-full h-full object-cover" alt="Logo actuel" />
                        ) : (
                            <PlusIcon className="text-gray-400 text-2xl" />
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setForm(p => ({ ...p, logo: e.target.files[0] }))} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Logo</span>
                </div>

                <div className="flex-1 space-y-3">
                    <div>
                        <span className={AppStyles.input.label}>Identifiant (Auto)</span>
                        <input value={form.id} disabled className={AppStyles.input.formControlDisabled} />
                    </div>
                    <div>
                        <span className={AppStyles.input.label}>Code Institution <span className="text-red-500">*</span></span>
                        <input 
                            value={form.code} 
                            onChange={e => setForm({ ...form, code: e.target.value })} 
                            className={`${AppStyles.input.formControl} uppercase font-bold`} 
                            placeholder="Ex: UFIV"
                        />
                    </div>
                </div>
            </div>

            {/* Section Informations Générales */}
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <span className={AppStyles.input.label}>Nom de l'Institution <span className="text-red-500">*</span></span>
                    <input 
                        value={form.nom} 
                        onChange={e => setForm({ ...form, nom: e.target.value })} 
                        className={AppStyles.input.formControl} 
                        placeholder="Ex: Université de Fianarantsoa"
                    />
                </div>

                <div>
                    <span className={AppStyles.input.label}>Type <span className="text-red-500">*</span></span>
                    <select 
                        value={form.type} 
                        onChange={e => setForm({ ...form, type: e.target.value })} 
                        className={AppStyles.input.formControl}
                    >
                        <option value="">-- Sélectionner --</option>
                        <option value="PUBLIC">PUBLIC</option>
                        <option value="PRIVE">PRIVE</option>
                    </select>
                </div>

                {/* 🆕 AJOUT DU CHAMP ABRÉVIATION */}
                <div>
                    <span className={AppStyles.input.label}>Abréviation</span>
                    <input 
                        value={form.abbreviation} 
                        onChange={e => setForm({ ...form, abbreviation: e.target.value })} 
                        className={AppStyles.input.formControl} 
                        placeholder="Ex: UNIV-FIANA"
                    />
                </div>
            </div>

            <div>
                <span className={AppStyles.input.label}>Description</span>
                <textarea 
                    rows="2"
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    className={AppStyles.input.formControl} 
                    placeholder="Description optionnelle..."
                />
            </div>

            <div className="flex justify-between items-center mt-4 pt-2 border-t">
                {editInstitution && (
                    <button type="button" onClick={() => setHistoryManagerOpen(true)} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold">
                        <FaHistory /> Gérer Historique
                    </button>
                )}
                <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={closeModal} className={AppStyles.button.secondary}>Annuler</button>
                    <button type="submit" className={AppStyles.button.primary}>Enregistrer</button>
                </div>
            </div>
        </form>
      </DraggableModal>

      {/* 🆕 MODALE MANAGER (Fixe et Centrée) */}
      {editInstitution && (
          <EntityHistoryManager 
            isOpen={historyManagerOpen}
            onClose={() => setHistoryManagerOpen(false)}
            entityId={editInstitution.Institution_id}
            entityType="institutions" // 👈 TYPE : INSTITUTIONS
            title={`Historique : ${editInstitution.Institution_nom}`}
          />
      )}

      <ConfirmModal isOpen={deleteModalOpen} onClose={()=>setDeleteModalOpen(false)} title="Supprimer ?">
          <input value={deleteCodeInput} onChange={e=>setDeleteCodeInput(e.target.value)} className={AppStyles.input.formControl} placeholder={`Tapez ${institutionToDelete?.Institution_code}`}/>
          <div className="flex justify-end gap-2 mt-2"><button onClick={confirmDelete} className={AppStyles.button.danger}>Supprimer</button></div>
      </ConfirmModal>
    </div>
  );
};

export default Administration;