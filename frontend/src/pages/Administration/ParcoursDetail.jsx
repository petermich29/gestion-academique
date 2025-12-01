// frontend/src/pages/Administration/ParcoursDetail.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaLayerGroup, FaUniversity, FaGraduationCap,
  FaTrash, FaEdit, FaPlus
} from "react-icons/fa";

import { SpinnerIcon, PlusIcon } from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { id: institutionId, etablissementId, mentionId, parcoursId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- STATES DONNÉES ---
  const [parcours, setParcours] = useState(location.state?.parcours || null);
  const [mention, setMention] = useState(null); 
  const [etablissement, setEtablissement] = useState(null);
  
  const [structure, setStructure] = useState([]); 
  const [semestresList, setSemestresList] = useState([]); 
  
  // --- STATES UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [activeNiveauTab, setActiveNiveauTab] = useState(0); 
  const [toasts, setToasts] = useState([]);

  // --- STATES CRUD UE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [ueToDelete, setUeToDelete] = useState(null);
  
  // NOUVEAU : State pour l'ID généré automatiquement
  const [generatedId, setGeneratedId] = useState(""); 

  // Formulaire UE
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // HELPER: Sécuriser l'accès aux champs (alias vs nom DB)
  const getVal = (obj, keyAlias, keyName) => obj ? (obj[keyAlias] || obj[keyName] || "") : "";

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ==========================================
  // 1. CHARGEMENT DES DONNÉES
  // ==========================================
  const fetchStructure = useCallback(async () => {
      try {
        const resStruct = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}/structure`);
        if(resStruct.ok) setStructure(await resStruct.json());
      } catch(e) { console.error(e); }
  }, [parcoursId]);

  // NOUVEAU : Récupérer le prochain ID disponible
  const fetchNextId = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ues/next-id`);
      if (res.ok) {
        const id = await res.json();
        setGeneratedId(id);
      }
    } catch (e) {
      console.error("Erreur next ID", e);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // A. Parcours Infos
        let currentParcours = parcours;
        const currentId = getVal(currentParcours, "Parcours_id", "id_parcours");

        if (!currentParcours || currentId !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) {
                currentParcours = await res.json();
                setParcours(currentParcours);
            }
        }

        // B. Infos Parents (Mention, Etablissement)
        if (mentionId) {
            const resMention = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
            if (resMention.ok) {
                const mData = await resMention.json();
                setMention(mData);
                
                if (mData.composante) {
                    setEtablissement(mData.composante);
                } else if (etablissementId) {
                    const resEtab = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
                    if(resEtab.ok) setEtablissement(await resEtab.json());
                }
            }
        }

        // C. Structure Académique
        await fetchStructure();

        // D. Liste des Semestres (Métadonnées)
        const resSem = await fetch(`${API_BASE_URL}/api/metadonnees/semestres`);
        if(resSem.ok) setSemestresList(await resSem.json());

      } catch (e) {
        addToast("Erreur de chargement", "error");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [parcoursId, mentionId, etablissementId, fetchStructure]);

  // E. Breadcrumb
  useEffect(() => {
     if(setBreadcrumb && parcours && mention) {
        const pLabel = getVal(parcours, "Parcours_label", "nom_parcours");
        const mLabel = getVal(mention, "Mention_label", "label");
        
        setBreadcrumb([
            { label: "Administration", path: "/administration" },
            { label: institutionId, path: `/institution/${institutionId}` },
            { label: etablissementId, path: `/institution/${institutionId}/etablissement/${etablissementId}` },
            { label: `Mention ${mLabel}`, path: `/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}` },
            { label: `Parcours ${pLabel}`, path: "#" }
        ]);
     }
  }, [parcours, mention, setBreadcrumb, institutionId, etablissementId, mentionId]);


  // ==========================================
  // 2. GESTION DU FORMULAIRE
  // ==========================================
  const openModal = async (semestreId = "", ue = null) => {
      setErrors({});
      if(ue) {
          setEditUE(ue);
          setGeneratedId(ue.id); // Si édition, on prend l'ID existant
          setForm({ 
              code: ue.code, 
              intitule: ue.intitule, 
              credit: ue.credit, 
              semestre_id: semestreId 
          });
      } else {
          setEditUE(null);
          setGeneratedId("Chargement..."); // Placeholder visuel
          await fetchNextId(); // Appel API pour le nouvel ID
          setForm({ 
              code: "", 
              intitule: "", 
              credit: 5, 
              semestre_id: semestreId || "" 
          });
      }
      setModalOpen(true);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setErrors({});

      if(!form.code || !form.intitule || (!editUE && !form.semestre_id)) {
          setErrors({ global: "Veuillez remplir tous les champs obligatoires."});
          setIsSubmitting(false);
          return;
      }

      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("intitule", form.intitule);
      formData.append("credit", form.credit);
      formData.append("parcours_id", parcoursId); // Indispensable pour lier le parcours au niveau

      if (!editUE) {
         formData.append("semestre_id", form.semestre_id);
      } else {
         formData.append("semestre_id", form.semestre_id || ""); 
      }

      try {
          // CORRECTION : Utilisation de la nouvelle route /api/ues
          let url = `${API_BASE_URL}/api/ues`;
          let method = "POST";

          if(editUE) {
              url += `/${editUE.id}`;
              method = "PUT";
          }

          const res = await fetch(url, { method, body: formData });
          if(!res.ok) {
              const err = await res.json();
              throw new Error(err.detail || "Erreur lors de l'enregistrement");
          }

          await fetchStructure(); 
          addToast(editUE ? "UE modifiée." : "UE ajoutée.");
          setModalOpen(false);
      } catch(e) {
          setErrors({ global: e.message });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDelete = async () => {
      if(!ueToDelete) return;
      try {
          // CORRECTION : Utilisation de la nouvelle route /api/ues
          const res = await fetch(`${API_BASE_URL}/api/ues/${ueToDelete.id}`, { method: 'DELETE' });
          if(!res.ok) throw new Error("Erreur suppression");
          
          await fetchStructure();
          addToast("UE supprimée.");
          setDeleteModalOpen(false);
      } catch(e) {
          addToast(e.message, "error");
      }
  };

  // ==========================================
  // 3. RENDU
  // ==========================================
  if (isLoading) return <div className="p-10 text-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600 inline" /></div>;
  if (!parcours) return <div className="p-10 text-center text-red-500">Parcours introuvable</div>;

  const currentNiveau = structure[activeNiveauTab];
  
  // -- Données pour l'affichage --
  const parcoursLabel = getVal(parcours, "Parcours_label", "nom_parcours");
  const parcoursCode = getVal(parcours, "Parcours_code", "code");
  const logoPath = getVal(parcours, "Parcours_logo_path", "logo_path");

  // Infos Parentes
  const mentionLabel = mention ? getVal(mention, "Mention_label", "label") : mentionId;
  const etabLabel = etablissement ? getVal(etablissement, "Composante_label", "label") : (mention?.composante ? getVal(mention.composante, "Composante_label", "label") : etablissementId);
  const etabAbbr = etablissement ? getVal(etablissement, "Composante_abbreviation", "abbreviation") : (mention?.composante ? getVal(mention.composante, "Composante_abbreviation", "abbreviation") : "");
  
  // Domaine
  let domaineLabel = "Domaine inconnu";
  if (mention) {
      if (mention.Domaine_label) domaineLabel = mention.Domaine_label;
      else if (mention.domaine) domaineLabel = getVal(mention.domaine, "Domaine_label", "label");
  }

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* 1. HEADER */}
      <div className={AppStyles.header.container}>
         <h2 className={AppStyles.mainTitle}>Détail du Parcours</h2>
      </div>
      <hr className={AppStyles.separator} />

      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
          
          {/* Logo Parcours */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
             {logoPath ? (
                 <img src={`${API_BASE_URL}${logoPath}`} className="w-24 h-24 object-contain rounded-lg border bg-gray-50 p-2" alt="Logo Parcours" />
             ) : (
                 <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                     <FaLayerGroup className="w-10 h-10"/>
                 </div>
             )}
          </div>
          
          {/* Informations Textuelles */}
          <div className="flex-1 space-y-2 text-center md:text-left">
              <div 
                  className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" 
                  onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`)}
              >
                  <FaChevronLeft /> Retour à la Mention
              </div>

              <h1 className="text-2xl font-bold text-gray-800">
                  Parcours {parcoursLabel}
              </h1>

              {/* Badges de Contexte */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm mt-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold border border-blue-200">
                      {parcoursCode}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1 font-medium">
                      <FaGraduationCap className="text-[10px]"/> 
                      Mention {mentionLabel}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 flex items-center gap-1 font-medium">
                      <FaUniversity className="text-[10px]"/> 
                      {etabAbbr || etabLabel}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1">
                      <FaLayerGroup className="text-[10px]"/> 
                      {domaineLabel}
                  </span>
              </div>
          </div>
      </motion.div>

      {/* 2. CONTENU STRUCTURE (Niveaux & Semestres) */}
      
      {structure.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <div className="flex">
                  <div className="flex-shrink-0"><FaLayerGroup className="h-5 w-5 text-blue-400" /></div>
                  <div className="ml-3">
                      <p className="text-sm text-blue-700 font-bold mb-1">Aucune structure détectée</p>
                      <p className="text-sm text-blue-600">
                          Utilisez le bouton "Ajouter une UE" dans un semestre pour initialiser la structure.
                      </p>
                      <button onClick={() => openModal()} className="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                          <FaPlus /> Ajouter une première UE
                      </button>
                  </div>
              </div>
          </div>
      )}

      {structure.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col mt-4">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                  {structure.map((niv, idx) => (
                      <button key={niv.niveau_id} onClick={() => setActiveNiveauTab(idx)}
                        className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                            activeNiveauTab === idx ? "text-blue-600 border-blue-600 bg-blue-50/40" : "text-gray-500 border-transparent hover:bg-gray-50"
                        }`}>
                          {niv.niveau_label}
                      </button>
                  ))}
              </div>

              <div className="p-6 bg-gray-50/30 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <AnimatePresence mode="wait">
                    {currentNiveau && currentNiveau.semestres.map((sem) => (
                        <div key={sem.id} className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                            
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <span className="font-bold text-gray-700">Semestre {sem.numero}</span>
                            </div>
                            
                            <div className="p-3 space-y-3">
                                {/* BOUTON D'AJOUT D'UE */}
                                <div 
                                    onClick={() => openModal(sem.id)} 
                                    className={AppStyles.addCard.list}
                                >
                                    <div className={`${AppStyles.addCard.iconContainer} w-8 h-8`}>
                                        <PlusIcon />
                                    </div>
                                    <p className="text-sm font-semibold text-blue-700">Ajouter une UE</p>
                                </div>

                                {/* Liste des UEs */}
                                {sem.ues.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-2 italic">Aucune UE</p> 
                                ) : (
                                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <tbody>
                                                {sem.ues.map(ue => (
                                                    <tr key={ue.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors bg-white">
                                                        <td className="px-3 py-2 font-mono text-xs font-bold text-blue-600 w-20 border-r border-gray-50">{ue.code}</td>
                                                        <td className="px-3 py-2 text-gray-700">
                                                            {ue.intitule}
                                                            <div className="text-[10px] text-gray-400">{ue.credit} Crédits</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-right w-20">
                                                            <div className="flex justify-end gap-2">
                                                                <button title="Modifier" className="text-gray-400 hover:text-blue-600 transition" onClick={() => openModal(sem.id, ue)}>
                                                                    <FaEdit />
                                                                </button>
                                                                <button title="Supprimer" className="text-gray-400 hover:text-red-600 transition" onClick={() => { setUeToDelete(ue); setDeleteModalOpen(true); }}>
                                                                    <FaTrash />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                  </AnimatePresence>
              </div>
          </div>
      )}

      {/* Modale d'ajout/édition */}
      <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUE ? "Modifier UE" : "Nouvelle UE"}>
          <form onSubmit={handleSubmit} className="space-y-4">
              {errors.global && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">{errors.global}</div>}
              
              {/* NOUVEAU : Champ ID en lecture seule */}
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Identifiant (Auto)</label>
                  <input 
                      type="text" 
                      value={generatedId} 
                      disabled 
                      className="w-full bg-gray-100 text-gray-500 border border-gray-300 rounded px-3 py-2 text-sm font-mono cursor-not-allowed"
                  />
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre <span className="text-red-500">*</span></label>
                  <select 
                      name="semestre_id" 
                      value={form.semestre_id} 
                      onChange={e => setForm({...form, semestre_id: e.target.value})}
                      className={AppStyles.input.formControl}
                      disabled={!!editUE && !form.semestre_id}
                  >
                      <option value="">-- Sélectionner --</option>
                      {semestresList.map(s => {
                          const sId = s.id_semestre || s.Semestre_id;
                          return <option key={sId} value={sId}>{s.numero || s.Semestre_numero}</option>
                      })}
                  </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Code</label>
                      <input name="code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className={AppStyles.input.formControl} placeholder="UE_..." />
                  </div>
                  <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Intitulé</label>
                      <input name="intitule" value={form.intitule} onChange={e => setForm({...form, intitule: e.target.value})} className={AppStyles.input.formControl} />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Crédits: {form.credit}</label>
                  <input type="range" min="1" max="30" value={form.credit} onChange={e => setForm({...form, credit: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>

              <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} mt-2`}>
                  {isSubmitting ? <SpinnerIcon className="animate-spin inline mr-2"/> : <FaPlus className="inline mr-2"/>} Enregistrer
              </button>
          </form>
      </DraggableModal>

      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer UE">
          <p>Confirmer la suppression de l'UE <b>{ueToDelete?.code}</b> ?</p>
          <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
              <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};

export default ParcoursDetail;