import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaChevronLeft, FaBookOpen, FaCalendarAlt } from "react-icons/fa";
import { PlusIcon, SpinnerIcon, ThIcon, ListIcon } from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem";

const API_BASE_URL = "http://127.0.0.1:8000";

const MentionDetail = () => {
  const { institutionId, etablissementId, mentionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- États ---
  const [mention, setMention] = useState(location.state?.mention || null);
  const [parcours, setParcours] = useState([]);
  const [typesFormation, setTypesFormation] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("grid");
  
  // --- Modales ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editParcours, setEditParcours] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // --- Formulaire ---
  const [form, setForm] = useState({ id: "", code: "", label: "", type_formation_id: "", date_creation: "", date_fin: "" });

  const addToast = (msg, type="success") => {
      const id = Date.now();
      setToasts(prev => [...prev, {id, message: msg, type}]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        try {
            let currentMention = mention;
            if(!currentMention) {
                const res = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
                if(res.ok) {
                    currentMention = await res.json();
                    setMention(currentMention);
                }
            }

            const resParcours = await fetch(`${API_BASE_URL}/api/parcours/mention/${mentionId}`);
            if(resParcours.ok) setParcours(await resParcours.json());
            
            const resTypes = await fetch(`${API_BASE_URL}/api/types-formation/`); 
            if(resTypes.ok) setTypesFormation(await resTypes.json());

        } catch(e) { console.error(e); addToast("Erreur connexion", "error"); }
        finally { setIsLoading(false); }
    };
    init();
  }, [mentionId]);

  const openModal = async (p = null) => {
    if(p) {
        setEditParcours(p);
        setForm({
            id: p.Parcours_id,
            code: p.Parcours_code,
            label: p.Parcours_label, 
            type_formation_id: p.Parcours_type_formation_defaut_id_fk || "",
            date_creation: p.Parcours_date_creation || "",
            date_fin: p.Parcours_date_fin || ""
        });
        setModalOpen(true);
    } else {
        setEditParcours(null);
        setForm({ id: "Chargement...", code: "", label: "", type_formation_id: "", date_creation: "", date_fin: "" });
        setModalOpen(true);
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/parcours/next-id`);
            if(res.ok) {
                // ✅ Correction ici
                const newId = await res.json();
                setForm(prev => ({...prev, id: newId}));
            }
        } catch(e){ console.error(e); }
    }
};

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const payload = {
          Parcours_code: form.code,
          Parcours_label: form.label,
          Mention_id_fk: mentionId,
          Parcours_type_formation_defaut_id_fk: form.type_formation_id || "TYPE_01",
          Parcours_date_creation: form.date_creation || null,
          Parcours_date_fin: form.date_fin || null,
          Parcours_id: form.id
      };

      try {
          const method = editParcours ? "PUT" : "POST";
          const url = editParcours ? `${API_BASE_URL}/api/parcours/${form.id}` : `${API_BASE_URL}/api/parcours/`;

          const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload) 
          });

          if(!res.ok) throw new Error("Erreur");
          
          const saved = await res.json();
          setParcours(prev => editParcours ? prev.map(p => p.Parcours_id === saved.Parcours_id ? saved : p) : [...prev, saved]);
          addToast("Parcours enregistré");
          setModalOpen(false);
      } catch(e) { addToast(e.message, "error"); }
      finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
      if(!itemToDelete) return;
      try {
          const res = await fetch(`${API_BASE_URL}/api/parcours/${itemToDelete.Parcours_id}`, { method: "DELETE" });
          if(res.ok) {
              setParcours(prev => prev.filter(p => p.Parcours_id !== itemToDelete.Parcours_id));
              addToast("Parcours supprimé");
              setDeleteModalOpen(false);
          }
      } catch(e) { addToast("Erreur suppression", "error"); }
  };
  
  if(isLoading) return <div className="p-10 flex justify-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600"/></div>;

  return (
    <div className={AppStyles.pageContainer}>
        <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        
        {/* 🔥 TITRE COMMUN STANDARDISE */}
        <div className={AppStyles.commonTitle.container}>
            <h1 className={AppStyles.commonTitle.text}>
                <span className={AppStyles.commonTitle.accent}></span>
                Gestion Administrative
            </h1>
        </div>
        
        {/* Header Carte Mention */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className={AppStyles.detailCard.container}>
            <div className="flex-1">
                 <div className={AppStyles.detailCard.backLink} onClick={() => navigate(-1)}>
                     <FaChevronLeft /> Retour aux mentions
                 </div>
                 <h1 className={AppStyles.detailCard.title}>{mention?.Mention_label}</h1>
                 <span className={AppStyles.detailCard.badgeCode}>{mention?.Mention_code}</span>
                 {mention?.Mention_description && <p className="text-gray-500 text-sm mt-2">{mention.Mention_description}</p>}
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-20 h-20 rounded-full text-blue-500 text-3xl border border-blue-100">
                <FaBookOpen />
            </div>
        </motion.div>

        {/* Controls */}
        <div className={AppStyles.header.container}>
            <h2 className={AppStyles.header.title}>Parcours ({parcours.length})</h2>
            <div className={AppStyles.header.controls}>
                <button onClick={() => setView(view === "grid" ? "list" : "grid")} className={AppStyles.button.icon}>
                    {view === "grid" ? <ListIcon /> : <ThIcon />}
                </button>
            </div>
        </div>

        {/* GRILLE */}
        <div className={view === "grid" ? AppStyles.gridContainer : "flex flex-col gap-2"}>
            <div onClick={() => openModal()} className={view === "grid" ? AppStyles.addCard.grid : AppStyles.addCard.list}>
                <div className={AppStyles.addCard.iconContainer + " w-12 h-12 text-xl"}><PlusIcon /></div>
                <span className="font-bold text-blue-600">Nouveau Parcours</span>
            </div>

            <AnimatePresence mode="popLayout">
                {parcours.map(p => (
                    <CardItem
                        key={p.Parcours_id}
                        viewMode={view}
                        title={p.Parcours_label || p.nom_parcours}
                        subTitle={p.Parcours_code}
                        PlaceholderIcon={FaGraduationCap}
                        onClick={() => {}}
                        onEdit={() => openModal(p)}
                        onDelete={() => { setItemToDelete(p); setDeleteModalOpen(true); }}
                    >
                        <div className="mt-3 text-xs text-gray-500 border-t pt-2 w-full flex flex-col gap-1">
                            <div className="flex justify-between">
                                <span>Type:</span> <span className="font-bold text-gray-700">{p.type_formation_defaut?.TypeFormation_code || "N/A"}</span>
                            </div>
                            {p.Parcours_date_creation && (
                                <div className="flex items-center gap-1">
                                    <FaCalendarAlt /> Créé: {p.Parcours_date_creation}
                                </div>
                            )}
                        </div>
                    </CardItem>
                ))}
            </AnimatePresence>
        </div>

        {/* MODALES */}
        <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editParcours ? "Modifier Parcours" : "Nouveau Parcours"}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <label>
                        <span className={AppStyles.input.label}>ID</span>
                        <input value={form.id} disabled className={AppStyles.input.formControlDisabled} />
                    </label>
                    <label>
                        <span className={AppStyles.input.label}>Code *</span>
                        <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className={AppStyles.input.formControl} required placeholder="Ex: PAR_GL" />
                    </label>
                </div>
                <label>
                    <span className={AppStyles.input.label}>Nom du parcours *</span>
                    <input value={form.label} onChange={e => setForm({...form, label: e.target.value})} className={AppStyles.input.formControl} required placeholder="Ex: Génie Logiciel" />
                </label>
                <label>
                    <span className={AppStyles.input.label}>Type de formation</span>
                    <select value={form.type_formation_id} onChange={e => setForm({...form, type_formation_id: e.target.value})} className={AppStyles.input.formControl}>
                        <option value="">Sélectionner...</option>
                        {typesFormation.map(t => (
                            <option key={t.TypeFormation_id} value={t.TypeFormation_id}>{t.TypeFormation_label} ({t.TypeFormation_code})</option>
                        ))}
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <label>
                        <span className={AppStyles.input.label}>Date création</span>
                        <input type="date" value={form.date_creation} onChange={e => setForm({...form, date_creation: e.target.value})} className={AppStyles.input.formControl} />
                    </label>
                     <label>
                        <span className={AppStyles.input.label}>Date fin (optionnel)</span>
                        <input type="date" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} className={AppStyles.input.formControl} />
                    </label>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                    <button type="button" onClick={() => setModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
                    <button type="submit" disabled={isSubmitting} className={AppStyles.button.primary}>Enregistrer</button>
                </div>
            </form>
        </DraggableModal>

        <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer ?">
            <p className="text-gray-600">Confirmez-vous la suppression de <b>{itemToDelete?.Parcours_label}</b> ?</p>
            <div className="flex justify-end gap-2 mt-4">
                 <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Non</button>
                 <button onClick={handleDelete} className={AppStyles.button.danger}>Oui, supprimer</button>
            </div>
        </ConfirmModal>
    </div>
  );
};

export default MentionDetail;