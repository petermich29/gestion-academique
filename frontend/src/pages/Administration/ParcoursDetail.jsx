// frontend/src/pages/Administration/ParcoursDetail.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaLayerGroup, 
  FaTrash, FaEdit, FaPlus
} from "react-icons/fa";

import { SpinnerIcon } from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { CardItem } from "../../components/ui/CardItem"; 

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { id: institutionId, etablissementId, mentionId, parcoursId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useOutletContext() || {};

  // --- STATES DONNÉES ---
  const [parcours, setParcours] = useState(location.state?.parcours || null);
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

  // Formulaire
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // HELPER: Récupérer l'ID ou le Code quelle que soit la source (API vs State)
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // A. Parcours infos
        let currentParcours = parcours;
        // Vérification robuste de l'ID (compatible id_parcours ou Parcours_id)
        const currentId = getVal(currentParcours, "Parcours_id", "id_parcours");

        if (!currentParcours || currentId !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) {
                currentParcours = await res.json();
                setParcours(currentParcours);
            }
        }

        // B. Structure
        await fetchStructure();

        // C. Liste des Semestres (Métadonnées)
        const resSem = await fetch(`${API_BASE_URL}/api/metadonnees/semestres`);
        if(resSem.ok) setSemestresList(await resSem.json());

        // D. Breadcrumb
        if (setBreadcrumb && currentParcours) {
            const label = getVal(currentParcours, "Parcours_label", "nom_parcours");
            setBreadcrumb([
                { label: "Administration", path: "/administration" },
                { label: institutionId, path: `/institution/${institutionId}` },
                { label: etablissementId, path: `/institution/${institutionId}/etablissement/${etablissementId}` },
                { label: "Mention", path: `/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}` },
                { label: label || "Détail Parcours", path: "#" }
            ]);
        }
      } catch (e) {
        addToast("Erreur de chargement", "error");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [parcoursId, institutionId, etablissementId, mentionId, setBreadcrumb, fetchStructure]);

  // ==========================================
  // 2. GESTION DU FORMULAIRE
  // ==========================================
  const openModal = (semestreId = "", ue = null) => {
      setErrors({});
      if(ue) {
          setEditUE(ue);
          setForm({ 
              code: ue.code, 
              intitule: ue.intitule, 
              credit: ue.credit, 
              semestre_id: semestreId 
          });
      } else {
          setEditUE(null);
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
          setErrors({ global: "Veuillez remplir tous les champs obligatoires (Code, Intitulé, Semestre)."});
          setIsSubmitting(false);
          return;
      }

      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("intitule", form.intitule);
      formData.append("credit", form.credit);
      formData.append("parcours_id", parcoursId); 

      if (!editUE) {
         formData.append("semestre_id", form.semestre_id);
      } else {
         formData.append("semestre_id", form.semestre_id || ""); 
      }

      try {
          let url = `${API_BASE_URL}/api/parcours/ue`;
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
          addToast(editUE ? "UE modifiée." : "UE ajoutée et parcours mis à jour.");
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
          const res = await fetch(`${API_BASE_URL}/api/parcours/ue/${ueToDelete.id}`, { method: 'DELETE' });
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
  
  // Utilisation des helpers pour éviter les erreurs si les clés diffèrent
  const parcoursLabel = getVal(parcours, "Parcours_label", "nom_parcours");
  const parcoursCode = getVal(parcours, "Parcours_code", "code");

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className={AppStyles.header.container}>
         <h2 className={AppStyles.mainTitle}>Détail du Parcours</h2>
      </div>
      <hr className={AppStyles.separator} />

      {/* Info Parcours */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-6">
           <div className="flex-1">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 mb-2"
                  onClick={() => navigate(-1)}>
                   <FaChevronLeft /> Retour
               </div>
               <h1 className="text-2xl font-bold text-gray-800">{parcoursLabel}</h1>
               <span className="text-sm bg-blue-50 text-blue-700 px-2 rounded font-mono border border-blue-100">
                   {parcoursCode}
               </span>
           </div>
           
           {/* CORRECTION DU BOUTON QUI FAISAIT CRASHER */}
           <div className="flex items-center">
                <CardItem 
                    title="Ajouter une UE"
                    PlaceholderIcon={FaPlus} // <-- C'est ici la correction majeure (pas de JSX <FaPlus/>)
                    onClick={() => openModal()}
                    className="bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer"
                />
           </div>
      </div>

      {/* Alert vide */}
      {structure.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <div className="flex">
                  <div className="flex-shrink-0"><FaLayerGroup className="h-5 w-5 text-blue-400" /></div>
                  <div className="ml-3">
                      <p className="text-sm text-blue-700">
                          Ce parcours ne contient aucun niveau. Ajoutez une première UE en sélectionnant un semestre (ex: S03) 
                          pour configurer automatiquement le niveau correspondant.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Onglets Niveaux */}
      {structure.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                  {structure.map((niv, idx) => (
                      <button key={niv.niveau_id} onClick={() => setActiveNiveauTab(idx)}
                        className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
                            activeNiveauTab === idx ? "text-blue-600 border-blue-600 bg-blue-50/40" : "text-gray-500 border-transparent hover:bg-gray-50"
                        }`}>
                          {niv.niveau_label}
                      </button>
                  ))}
              </div>

              {/* Contenu Semestres */}
              <div className="p-6 bg-gray-50/30 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <AnimatePresence mode="wait">
                    {currentNiveau && currentNiveau.semestres.map((sem) => (
                        <div key={sem.id} className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <span className="font-bold text-gray-700">Semestre {sem.numero}</span>
                                <button onClick={() => openModal(sem.id)} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-1">
                                    <FaPlus size={10} /> UE
                                </button>
                            </div>
                            <div className="p-2">
                                {sem.ues.length === 0 ? <p className="text-center text-xs text-gray-400 py-4">Aucune UE</p> : (
                                    <table className="w-full text-left text-sm">
                                        <tbody>
                                            {sem.ues.map(ue => (
                                                <tr key={ue.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-mono text-xs font-bold text-blue-600">{ue.code}</td>
                                                    <td className="px-3 py-2 text-gray-700">{ue.intitule}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <FaEdit className="cursor-pointer text-gray-400 hover:text-blue-600" onClick={() => openModal(sem.id, ue)} />
                                                            <FaTrash className="cursor-pointer text-gray-400 hover:text-red-600" onClick={() => { setUeToDelete(ue); setDeleteModalOpen(true); }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ))}
                  </AnimatePresence>
              </div>
          </div>
      )}

      {/* Modal Ajout/Edit */}
      <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUE ? "Modifier UE" : "Nouvelle UE"}>
          <form onSubmit={handleSubmit} className="space-y-4">
              {errors.global && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{errors.global}</div>}
              
              {/* Select Semestre */}
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre <span className="text-red-500">*</span></label>
                  <select 
                      name="semestre_id" 
                      value={form.semestre_id} 
                      onChange={e => setForm({...form, semestre_id: e.target.value})}
                      className={AppStyles.input.formControl}
                      disabled={!!editUE && !form.semestre_id}
                  >
                      <option value="">-- Sélectionner un semestre --</option>
                      {semestresList.map(s => {
                          // Correction : Pydantic renvoie souvent id_semestre au lieu de Semestre_id
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
          <p>Confirmer la suppression de <b>{ueToDelete?.code}</b> ?</p>
          <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
              <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};

export default ParcoursDetail;