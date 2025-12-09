// src/pages/Administration/ParcoursDetail.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaLayerGroup, FaGraduationCap,
  FaTrash, FaEdit, FaPlus, FaSearch, FaCalendarAlt,
  FaListUl, FaSave, FaMinus, FaTimes, FaCheck, FaCog, 
  FaSync 
} from "react-icons/fa";

import { 
  SpinnerIcon, PlusIcon, ThIcon, ListIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { useBreadcrumb } from "../../context/BreadcrumbContext";
import { useAdministration } from "../../context/AdministrationContext";

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { id: institutionId, etablissementId, mentionId, parcoursId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Contextes
  const { setBreadcrumb } = useBreadcrumb();
  const { yearsList } = useAdministration();

  // --- STATES DONNÉES ---
  const [parcours, setParcours] = useState(location.state?.parcours || null);
  const [mention, setMention] = useState(null); 
  const [etablissement, setEtablissement] = useState(null);
  const [institution, setInstitution] = useState(null);
  
  const [structure, setStructure] = useState([]); 
  const [semestresList, setSemestresList] = useState([]); 
  
  // --- STATES UI & FILTRES ---
  const [selectedYearId, setSelectedYearId] = useState(""); 
  const [isLoading, setIsLoading] = useState(true);
  const [isStructureLoading, setIsStructureLoading] = useState(false);
  const [activeNiveauId, setActiveNiveauId] = useState(null); 
  const [view, setView] = useState("grid"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState([]);

  // --- STATES CRUD UE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [ueToDelete, setUeToDelete] = useState(null);
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // --- STATES GESTION EC ---
  const [ecModalOpen, setEcModalOpen] = useState(false);
  const [selectedUEForEC, setSelectedUEForEC] = useState(null); 
  
  // Édition en ligne des EC
  const [editingEcId, setEditingEcId] = useState(null); 
  const [editEcData, setEditEcData] = useState({ code: "", intitule: "", coefficient: 1.0 });
  
  // Formulaire ajout EC
  const [ecForm, setEcForm] = useState({ code: "", intitule: "", coefficient: 1.0 });
  const [isEcSubmitting, setIsEcSubmitting] = useState(false);

  // Refs
  const dataFetchedRef = useRef(false);

  // Helpers
  const getVal = (obj, keyAlias, keyName) => obj ? (obj[keyAlias] || obj[keyName] || "") : "";
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ==========================================
  // 1. INITIALISATION & CHARGEMENT STRUCTURE
  // ==========================================

  useEffect(() => {
    // Sélectionner l'année active par défaut si aucune sélectionnée
    if (yearsList && yearsList.length > 0 && !selectedYearId) {
        const active = yearsList.find(y => y.AnneeUniversitaire_is_active);
        if (active) setSelectedYearId(active.AnneeUniversitaire_id);
        else setSelectedYearId(yearsList[0].AnneeUniversitaire_id);
    }
  }, [yearsList, selectedYearId]);

  // Fonction de chargement de la structure (UEs, Semestres)
  const fetchStructure = useCallback(async () => {
      if (!selectedYearId || !parcoursId) return;
      setIsStructureLoading(true);
      try {
        // CORRECTION MAJEURE ICI :
        // Ajout d'un timestamp (_t) pour forcer l'URL à être unique à chaque appel.
        // Cela empêche le navigateur de renvoyer une version cachée "vide" après duplication.
        const timestamp = new Date().getTime();
        const url = `${API_BASE_URL}/api/parcours/${parcoursId}/structure?annee_id=${selectedYearId}&_t=${timestamp}`;

        const resStruct = await fetch(url, {
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });

        if(resStruct.ok) {
            const data = await resStruct.json();
            setStructure(data);
            
            // Logique pour conserver l'onglet actif si possible, sinon prendre le premier
            setActiveNiveauId(prev => {
                if (!data || data.length === 0) return null;
                // Si l'onglet précédent existe toujours dans la nouvelle structure, on le garde
                const exists = data.find(d => d.niveau_id === prev);
                return exists ? prev : data[0].niveau_id;
            });
        } else {
            console.error("Erreur API structure");
            setStructure([]);
        }
      } catch(e) { 
          console.error("Erreur réseau/parsing:", e); 
          addToast("Erreur chargement structure", "error");
      } finally {
          setIsStructureLoading(false);
      }
  }, [parcoursId, selectedYearId]); 

  // Synchronisation de la modale EC quand la structure change
  useEffect(() => {
      if (ecModalOpen && selectedUEForEC && structure.length > 0) {
          let found = null;
          // On cherche l'UE mise à jour dans la nouvelle structure
          for (const niv of structure) {
              for (const sem of niv.semestres) {
                  const match = sem.ues.find(u => u.id === selectedUEForEC.id);
                  if (match) { found = match; break; }
              }
              if (found) break;
          }
          // Si trouvée, on met à jour les données de la modale
          if (found) {
              // Vérification simple pour éviter boucle infinie
              if (JSON.stringify(found) !== JSON.stringify(selectedUEForEC)) {
                  setSelectedUEForEC(found);
              }
          } else {
              // Si l'UE n'existe plus, on ferme la modale
              setEcModalOpen(false);
          }
      }
  }, [structure, ecModalOpen, selectedUEForEC]); 

  const fetchNextId = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ues/next-id`);
      if (res.ok) return await res.json();
      return "UE_NEW";
    } catch (e) {
      return "UE_ERR";
    }
  };

  // Chargement initial des métadonnées (Parcours, Mention, Semestres...)
  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    
    const fetchMeta = async () => {
      setIsLoading(true);
      try {
        let currentParcours = parcours;
        // Charger Parcours si non présent
        if (!currentParcours || getVal(currentParcours, "Parcours_id", "id_parcours") !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) {
                currentParcours = await res.json();
                setParcours(currentParcours);
            }
        }
        // Charger Mention et Établissement
        if (mentionId) {
            const resM = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
            if (resM.ok) {
                const mData = await resM.json();
                setMention(mData);
                if (mData.composante) setEtablissement(mData.composante);
                else if (etablissementId) {
                    const resE = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
                    if(resE.ok) setEtablissement(await resE.json());
                }
            }
        }
        // Charger Institution
        if (institutionId && !institution) {
            const resI = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(resI.ok) setInstitution(await resI.json());
        }
        // Charger liste semestres (S1, S2...)
        const resSem = await fetch(`${API_BASE_URL}/api/metadonnees/semestres`);
        if(resSem.ok) setSemestresList(await resSem.json());

      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchMeta();
  }, [parcoursId, mentionId, etablissementId, institutionId, parcours, institution]);
  
  // Déclencheur chargement structure
  useEffect(() => {
      if (parcoursId && selectedYearId && !isLoading) {
        fetchStructure();
      }
  }, [selectedYearId, isLoading, parcoursId, fetchStructure]); 

  // Breadcrumb
  useEffect(() => {
      if (isLoading || !institution || !etablissement || !mention || !parcours) return;
      setBreadcrumb([
          { label: "Administration", path: "/administration" },
          { label: institution.Institution_nom, path: `/institution/${institutionId}`, state: { institution }, type: "institution" },
          { label: etablissement.Composante_abbreviation || etablissement.Composante_label, path: `/institution/${institutionId}/etablissement/${etablissementId}`, state: { institution, composante: etablissement }, type: "etablissement" },
          { label: mention.Mention_label, path: `/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`, state: { institution, etablissement, mention }, type: "mention" },
          { label: parcours.Parcours_label, path: "#", type: "parcours" }
      ]);
  }, [institution, etablissement, mention, parcours, isLoading, institutionId, etablissementId, mentionId, setBreadcrumb]);


  // ==========================================
  // 2. GESTION UE
  // ==========================================

  const openModal = async (semestreId = "", ue = null) => {
      setErrors({});
      if(ue) {
          setEditUE(ue);
          setForm({ code: ue.code, intitule: ue.intitule, credit: ue.credit, semestre_id: semestreId || "" });
      } else {
          setEditUE(null);
          setForm({ code: await fetchNextId(), intitule: "", credit: 5, semestre_id: semestreId || "" });
      }
      setModalOpen(true);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setErrors({});
      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("intitule", form.intitule);
      formData.append("credit", form.credit);
      formData.append("semestre_id", form.semestre_id);
      formData.append("parcours_id", parcoursId); 
      formData.append("annee_id", selectedYearId);

      try {
          let url = `${API_BASE_URL}/api/ues`;
          let method = "POST";
          if(editUE) {
              url += `/${editUE.id_maquette}`; 
              method = "PUT";
          }
          const res = await fetch(url, { method, body: formData });
          if(!res.ok) {
             const errorData = await res.json();
             throw new Error(errorData.detail || "Erreur sauvegarde UE");
          }
          await fetchStructure();
          addToast(editUE ? "UE Modifiée" : "UE Ajoutée");
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
        const url = `${API_BASE_URL}/api/ues/${ueToDelete.id_maquette}`; 
        const res = await fetch(url, { method: 'DELETE' });
        if(!res.ok) throw new Error("Erreur suppression UE");
        await fetchStructure(); 
        addToast("UE retirée de la maquette.");
        setDeleteModalOpen(false); 
    } catch(e) {
        addToast("Erreur lors de la suppression", "error");
    }
  };

  // ==========================================
  // 3. GESTION EC 
  // ==========================================

  const openEcModal = (ue) => {
      setSelectedUEForEC(ue);
      setEcForm({ code: "", intitule: "", coefficient: 1.0 });
      setEditingEcId(null); 
      setEcModalOpen(true);
  };

  const handleAddEC = async (e) => {
      e.preventDefault();
      if (!selectedUEForEC) return;
      setIsEcSubmitting(true);
      setErrors({});

      const formData = new FormData();
      formData.append("maquette_ue_id", selectedUEForEC.id_maquette);
      formData.append("code", ecForm.code);
      formData.append("intitule", ecForm.intitule);
      formData.append("coefficient", ecForm.coefficient);

      try {
          const res = await fetch(`${API_BASE_URL}/api/ecs/`, { method: "POST", body: formData });
          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.detail || "Erreur ajout EC");
          }
          addToast("EC ajouté");
          // Recharger la structure mettra à jour l'UE sélectionnée via le useEffect de synchro
          await fetchStructure(); 
          setEcForm({ code: "", intitule: "", coefficient: 1.0 }); 
      } catch (error) {
          addToast(error.message, "error");
          setErrors({ ec_form: error.message });
      } finally {
          setIsEcSubmitting(false);
      }
  };

  const handleDeleteEC = async (maquetteEcId) => {
      if (!window.confirm("Supprimer cet élément ?")) return;
      try {
          const res = await fetch(`${API_BASE_URL}/api/ecs/${maquetteEcId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Erreur suppression EC");
          addToast("EC supprimé");
          await fetchStructure();
      } catch (e) {
          addToast("Erreur lors de la suppression", "error");
      }
  };

  const startEditEC = (ec) => {
      setEditingEcId(ec.id);
      setEditEcData({ 
          code: ec.code, 
          intitule: ec.intitule, 
          coefficient: parseFloat(ec.coefficient) || 0
      });
  };

  const cancelEditEC = () => {
      setEditingEcId(null);
      setEditEcData({ code: "", intitule: "", coefficient: 1.0 });
  };

  const handleUpdateEC = async () => {
      if(!editingEcId) return;
      
      const formData = new FormData();
      formData.append("maquette_ec_id", editingEcId);
      formData.append("code", editEcData.code);
      formData.append("intitule", editEcData.intitule);
      formData.append("coefficient", editEcData.coefficient);

      try {
          const res = await fetch(`${API_BASE_URL}/api/ecs/${editingEcId}`, { 
              method: "PUT", 
              body: formData 
          });
          
          if(!res.ok) {
              const data = await res.json();
              throw new Error(data.detail || "Erreur lors de la modification");
          }
          
          addToast("EC modifié avec succès");
          setEditingEcId(null); 
          await fetchStructure(); 
      } catch(e) {
          addToast(e.message, "error");
      }
  };

  // ==========================================
  // 4. LOGIQUE CREDITS
  // ==========================================

  const maxCreditsAllowed = useMemo(() => {
    if (!form.semestre_id) return 30; 

    let targetSemestre = null;
    for (const niv of structure) {
        const s = niv.semestres.find(sem => sem.id === form.semestre_id);
        if (s) { targetSemestre = s; break; }
    }
    if (!targetSemestre) return 30;

    let usedCreditsExcludingCurrentUE = targetSemestre.ues.reduce((acc, ue) => {
        if (editUE && editUE.id === ue.id) {
            return acc; 
        }
        return acc + (parseFloat(ue.credit) || 0);
    }, 0);

    return Math.max(0, 30 - usedCreditsExcludingCurrentUE);
  }, [form.semestre_id, structure, editUE]);

  useEffect(() => {
     if (form.credit > maxCreditsAllowed && maxCreditsAllowed > 0) {
         setForm(prev => ({ ...prev, credit: maxCreditsAllowed }));
     }
     if (form.credit === 0 && maxCreditsAllowed > 0) {
        setForm(prev => ({ ...prev, credit: 1 }));
     }
  }, [maxCreditsAllowed, form.credit]);


  // ==========================================
  // 5. RENDU
  // ==========================================

  if (isLoading) return <div className="p-10 text-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600 inline" /></div>;
  if (!parcours) return <div className="p-10 text-center text-red-500">Parcours introuvable</div>;

  const currentNiveau = activeNiveauId ? structure.find(niv => niv.niveau_id === activeNiveauId) : structure[0];
  const parcoursLabel = getVal(parcours, "Parcours_label", "nom_parcours");
  const parcoursCode = getVal(parcours, "Parcours_code", "code");
  const logoPath = getVal(parcours, "Parcours_logo_path", "logo_path");
  const mentionLabel = mention ? getVal(mention, "Mention_label", "label") : mentionId;
  const selectedYearObj = yearsList.find(y => y.AnneeUniversitaire_id === selectedYearId);
  const selectedYearLabel = selectedYearObj ? selectedYearObj.AnneeUniversitaire_annee : "Année inconnue";
  
  const maxRangeValue = Math.max(1, maxCreditsAllowed);

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* HEADER */}
      <div className={AppStyles.header.container}>
         <div className="flex flex-col">
            <h2 className={AppStyles.mainTitle}>Détail du Parcours</h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
               <FaCalendarAlt /> Année affichée : <strong>{selectedYearLabel}</strong>
            </p>
         </div>
         <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            {/* BOUTON RAFRAICHISSEMENT */}
            <button 
                onClick={fetchStructure} 
                title="Rafraîchir les données (Force)" 
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            >
                <FaSync className={isStructureLoading ? "animate-spin text-blue-600" : ""} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <select 
                value={selectedYearId} 
                onChange={(e) => setSelectedYearId(e.target.value)} 
                className="bg-transparent text-sm font-bold text-blue-700 outline-none cursor-pointer py-1 pr-2"
            >
                {yearsList.map(y => (
                    <option key={y.AnneeUniversitaire_id} value={y.AnneeUniversitaire_id}>
                        {y.AnneeUniversitaire_annee} {y.AnneeUniversitaire_is_active ? " (Active)" : ""}
                    </option>
                ))}
            </select>
         </div>
      </div>
      <hr className={AppStyles.separator} />

      {/* FICHE INFO */}
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-6 text-[100px] font-black text-gray-50 opacity-5 pointer-events-none select-none">
              {selectedYearLabel.split('-')[0]}
          </div>
          <div className="flex-shrink-0 mx-auto md:mx-0 z-10">
             {logoPath ? (
                 <img src={`${API_BASE_URL}${logoPath}`} className="w-24 h-24 object-contain rounded-lg border bg-gray-50 p-2" alt="Logo" />
             ) : (
                 <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                     <FaLayerGroup className="w-10 h-10"/>
                 </div>
             )}
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left z-10">
              <div className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" 
                  onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`)}>
                  <FaChevronLeft /> Retour à la Mention
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{parcoursLabel}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold border border-blue-200">{parcoursCode}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1 font-medium">
                      <FaGraduationCap className="text-[10px]"/> Mention {mentionLabel}
                  </span>
              </div>
          </div>
      </motion.div>

      {/* STRUCTURE PÉDAGOGIQUE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col relative">
          
          {isStructureLoading && (
              <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
                  <SpinnerIcon className="animate-spin text-3xl text-blue-600" />
              </div>
          )}

          {/* Onglets Niveaux */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
              {structure.length > 0 ? (
                  structure.map((niv) => (
                      <button key={niv.niveau_id} onClick={() => setActiveNiveauId(niv.niveau_id)} 
                        className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                            activeNiveauId === niv.niveau_id ? "text-blue-600 border-blue-600 bg-blue-50/40" : "text-gray-500 border-transparent hover:bg-gray-50"
                        }`}>
                          {niv.niveau_label}
                      </button>
                  ))
              ) : (
                  <div className="p-4 text-sm text-gray-400 italic">Maquette vide</div>
              )}
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="relative w-full sm:w-72">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <FaSearch className="text-gray-400 text-xs" />
                   </div>
                   <input 
                        type="text" 
                        placeholder="Rechercher une UE..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                   />
               </div>
               <div className="flex bg-gray-200 p-1 rounded-lg">
                   <button onClick={() => setView("grid")} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                       <ThIcon />
                   </button>
                   <button onClick={() => setView("list")} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                       <ListIcon />
                   </button>
               </div>
          </div>

          {/* Contenu */}
          <div className="p-6 bg-gray-50/30 space-y-8 flex-1">
              <AnimatePresence mode="wait">
                {structure.length > 0 && currentNiveau ? (
                    <motion.div 
                        key={`${currentNiveau.niveau_id}-${selectedYearId}`} 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} 
                        className="space-y-8 relative w-full"
                    >
                        {currentNiveau.semestres.map((sem) => {
                            const filteredUEs = sem.ues.filter(ue => 
                                ue.intitule.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                ue.code.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (searchTerm && filteredUEs.length === 0) return null;

                            const totalCreditsSemestre = sem.ues.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);

                            return (
                                <div key={sem.id} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">
                                                Semestre {sem.numero}
                                            </span>
                                            <div className="flex items-center gap-3 text-gray-400 text-sm hidden sm:flex">
                                                <span className="flex items-center gap-1">
                                                    <FaLayerGroup className="text-xs"/> {sem.ues.length} Unité(s)
                                                </span>
                                                <span className="w-px h-4 bg-gray-300 mx-1"></span>
                                                <span className="flex items-center gap-1 font-medium text-blue-600">
                                                    <FaGraduationCap className="text-xs"/> {totalCreditsSemestre} Crédits
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => openModal(sem.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-2 transition-colors">
                                            <FaPlus className="text-[10px]" /> Ajouter UE
                                        </button>
                                    </div>
                                    
                                    {filteredUEs.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                            <p className="text-gray-400 text-sm">Aucune UE pour ce semestre en {selectedYearLabel}.</p>
                                        </div>
                                    ) : view === "grid" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                                            {filteredUEs.map(ue => (
                                                <div key={ue.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all relative group flex flex-col h-full min-h-[180px]">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                            {ue.code}
                                                        </span>
                                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100 absolute top-3 right-3 z-10">
                                                            <button onClick={() => openModal(sem.id, ue)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Modifier UE"><FaEdit /></button>
                                                            <button onClick={() => {setUeToDelete(ue); setDeleteModalOpen(true);}} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer UE"><FaTrash /></button>
                                                        </div>
                                                    </div>

                                                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-3" title={ue.intitule}>
                                                        {ue.intitule}
                                                    </h3>
                                                    
                                                    <div className="flex-grow mb-3">
                                                        {ue.ecs && ue.ecs.length > 0 ? (
                                                            <div className="bg-gray-50 rounded border border-gray-100 p-2 space-y-1">
                                                                {ue.ecs.slice(0, 3).map(ec => (
                                                                    <div key={ec.id} className="flex justify-between items-center text-[10px] text-gray-600">
                                                                        <span className="truncate max-w-[120px] font-medium" title={ec.intitule}>• {ec.intitule}</span>
                                                                        <span className="text-gray-400 font-mono text-[9px]">x{parseFloat(ec.coefficient).toFixed(2).replace(/\.?0+$/, '')}</span>
                                                                    </div>
                                                                ))}
                                                                {ue.ecs.length > 3 && (
                                                                    <div className="text-[9px] text-blue-500 font-bold text-center pt-1 cursor-pointer" onClick={() => openEcModal(ue)}>
                                                                        + {ue.ecs.length - 3} autres...
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-gray-400 italic pl-1 flex items-center gap-1">
                                                                <FaMinus className="text-[8px]"/> Aucun module associé
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-auto border-t border-gray-50 pt-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1" title="Nombre d'éléments constitutifs">
                                                                <FaLayerGroup /> {ue.ecs?.length || 0}
                                                            </span>
                                                            <button 
                                                                onClick={() => openEcModal(ue)}
                                                                className="text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 p-1.5 rounded-md transition-all shadow-sm"
                                                                title="Gérer les modules (EC)"
                                                            >
                                                                <FaCog className="text-xs" />
                                                            </button>
                                                        </div>

                                                        <div className="text-right">
                                                            <span className="block text-xl font-extrabold text-gray-700 leading-none">
                                                                {ue.credit}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Crédits</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm p-4">
                                            <p className="text-center text-sm text-gray-500">Vue liste non implémentée (exemple)</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                ) : (
                    !isStructureLoading && (
                        <div className="text-center py-16 flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-200 mb-4">
                                <FaLayerGroup className="text-3xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700">Aucune structure définie</h3>
                            <p className="text-sm text-gray-500 mt-1 mb-6">
                                Pour l'année universitaire <strong>{selectedYearLabel}</strong>
                            </p>
                            <button onClick={() => openModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 flex items-center gap-2">
                                <PlusIcon /> Initialiser la maquette
                            </button>
                        </div>
                    )
                )}
              </AnimatePresence>
          </div>
      </div>

      {/* --- MODALES --- */}

      {/* 1. MODALE UE */}
      <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUE ? "Modifier UE" : "Nouvelle UE"}>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100 mb-2">
                 Rattachée à l'année : <strong>{selectedYearLabel}</strong>
              </div>
              {errors.global && <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-100 rounded">{errors.global}</div>}
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre <span className="text-red-500">*</span></label>
                  <select name="semestre_id" value={form.semestre_id} onChange={e => setForm({...form, semestre_id: e.target.value})} className={AppStyles.input.formControl} required>
                      <option value="">-- Sélectionner --</option>
                      {semestresList.map(s => <option key={s.Semestre_id} value={s.Semestre_id}>{s.Semestre_numero}</option>)}
                  </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
                      <input name="code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className={AppStyles.input.formControl} placeholder="UE_..." required/>
                  </div>
                  <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Intitulé <span className="text-red-500">*</span></label>
                      <input name="intitule" value={form.intitule} onChange={e => setForm({...form, intitule: e.target.value})} className={AppStyles.input.formControl} required/>
                  </div>
              </div>
              
              <div>
                  <div className="flex justify-between mb-1">
                      <label className="text-sm font-semibold text-gray-700">
                          Crédits <span className="text-xs font-normal text-gray-500">(Max pour cette UE: {maxRangeValue})</span>
                      </label>
                      <span className={`text-sm font-bold ${maxCreditsAllowed === 0 ? "text-red-500" : form.credit === maxCreditsAllowed ? "text-orange-500" : "text-blue-600"}`}>
                          {form.credit} / 30
                      </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="1" 
                        max={maxRangeValue} 
                        value={form.credit} 
                        disabled={maxCreditsAllowed === 0}
                        onChange={e => setForm({...form, credit: parseInt(e.target.value)})} 
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${maxCreditsAllowed === 0 ? "bg-gray-200" : "bg-gray-200 accent-blue-600"}`} 
                      />
                  </div>
                  
                  {maxCreditsAllowed === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                          Ce semestre a atteint 30 crédits.
                      </p>
                  )}
              </div>

              <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} mt-2 justify-center`}>
                  {isSubmitting ? <SpinnerIcon className="animate-spin inline mr-2"/> : <FaSave className="inline mr-2"/>} Enregistrer
              </button>
          </form>
      </DraggableModal>

      {/* 2. MODALE CONFIRMATION SUPPRESSION UE */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer UE">
          <p>Confirmer la suppression de l'UE <b>{ueToDelete?.code}</b> pour l'année {selectedYearLabel} ?</p>
          <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
              <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>

      {/* 3. MODALE : GESTION DES EC */}
      <DraggableModal 
          isOpen={ecModalOpen} 
          onClose={() => setEcModalOpen(false)} 
          title={selectedUEForEC ? `Modules de ${selectedUEForEC.code}` : "Gestion Modules"}
          width="max-w-4xl" 
      >
          <div className="flex flex-col md:flex-row gap-6 h-[500px]">
              
              {/* Colonne Gauche : Liste des ECs */}
              <div className="flex-1 flex flex-col border-r border-gray-100 pr-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                      <span><FaListUl className="text-blue-500 inline mr-2"/> Éléments Constitutifs</span>
                      <span className="text-xs font-normal text-gray-500">Coeff Total: <span className="text-blue-600 font-bold ml-1">{selectedUEForEC?.ecs?.reduce((acc, curr) => acc + (parseFloat(curr.coefficient) || 0), 0).toFixed(2).replace(/\.?0+$/, '') || 0}</span></span>
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                      {selectedUEForEC?.ecs && selectedUEForEC.ecs.length > 0 ? (
                          selectedUEForEC.ecs.map((ec) => (
                              <div key={ec.id} className={`bg-white border rounded-lg p-2 shadow-sm transition-all ${editingEcId === ec.id ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300 group"}`}>
                                  {editingEcId === ec.id ? (
                                      <div className="flex flex-col gap-2">
                                          <div className="flex gap-2">
                                              <input 
                                                className="w-24 text-xs border border-gray-300 rounded px-2 py-1 font-mono focus:border-blue-500 outline-none" 
                                                value={editEcData.code}
                                                onChange={(e) => setEditEcData({...editEcData, code: e.target.value})}
                                                placeholder="Code"
                                              />
                                              <input 
                                                type="number" min="0" step="0.01" 
                                                className="w-16 text-xs border border-gray-300 rounded px-2 py-1 text-center font-bold text-blue-600 focus:border-blue-500 outline-none"
                                                value={editEcData.coefficient}
                                                onChange={(e) => setEditEcData({...editEcData, coefficient: parseFloat(e.target.value) || 0})}
                                                title="Coefficient"
                                              />
                                          </div>
                                          <textarea 
                                              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 outline-none resize-none"
                                              rows="2"
                                              value={editEcData.intitule}
                                              onChange={(e) => setEditEcData({...editEcData, intitule: e.target.value})}
                                              placeholder="Intitulé"
                                          />
                                          <div className="flex justify-end gap-2 mt-1">
                                              <button onClick={cancelEditEC} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"><FaTimes className="inline mr-1"/>Annuler</button>
                                              <button onClick={handleUpdateEC} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold"><FaCheck className="inline mr-1"/>Sauvegarder</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-[10px] font-mono bg-gray-100 px-1 rounded text-gray-600 font-bold">{ec.code}</span>
                                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">Coef. {parseFloat(ec.coefficient).toFixed(2).replace(/\.?0+$/, '')}</span>
                                              </div>
                                              <p className="text-sm font-medium text-gray-800 line-clamp-2">{ec.intitule}</p>
                                          </div>
                                          
                                          <div className="flex flex-col gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={() => startEditEC(ec)}
                                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                  title="Modifier"
                                              >
                                                  <FaEdit size={12}/>
                                              </button>
                                              <button 
                                                  onClick={() => handleDeleteEC(ec.id)}
                                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                  title="Supprimer"
                                              >
                                                  <FaTrash size={12}/>
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              <p className="text-gray-400 text-xs italic">Aucun module.</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Colonne Droite : Formulaire Ajout EC */}
              <div className={`w-full md:w-64 flex flex-col bg-gray-50 p-4 rounded-lg border border-gray-100 flex-shrink-0 ${editingEcId ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <FaPlus className="text-green-600"/> Nouveau Module
                  </h4>
                  
                  <form onSubmit={handleAddEC} className="space-y-3 flex-1 flex flex-col">
                       {errors.ec_form && <div className="text-red-600 text-xs p-2 bg-red-100 border border-red-200 rounded">{errors.ec_form}</div>}
                       <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Code EC <span className="text-red-500">*</span></label>
                           <input 
                                required
                                className={AppStyles.input.formControl} 
                                value={ecForm.code}
                                onChange={e => setEcForm({...ecForm, code: e.target.value})}
                                placeholder="ex: MATH101"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Intitulé <span className="text-red-500">*</span></label>
                           <textarea 
                                required
                                className={`${AppStyles.input.formControl} min-h-[80px]`} 
                                value={ecForm.intitule}
                                onChange={e => setEcForm({...ecForm, intitule: e.target.value})}
                                placeholder="Nom du module..."
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1">Coefficient</label>
                           <input 
                                type="number" min="0" step="0.01" 
                                className={AppStyles.input.formControl} 
                                value={ecForm.coefficient}
                                onChange={e => setEcForm({...ecForm, coefficient: parseFloat(e.target.value) || 0})}
                           />
                       </div>

                       <div className="mt-auto pt-4">
                           <button 
                                type="submit" 
                                disabled={isEcSubmitting}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex justify-center items-center gap-2"
                           >
                               {isEcSubmitting ? <SpinnerIcon className="animate-spin"/> : <FaPlus />} Ajouter
                           </button>
                       </div>
                  </form>
              </div>
          </div>
      </DraggableModal>

    </div>
  );
};

export default ParcoursDetail;