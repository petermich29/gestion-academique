// src/pages/Administration/ParcoursDetail.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaChevronRight, FaLayerGroup, FaGraduationCap,
  FaTrash, FaEdit, FaPlus, FaSearch, FaCalendarAlt,
  FaListUl, FaSave, FaMinus, FaTimes, FaCheck, FaCog, 
  FaSync, FaBook, FaExclamationTriangle
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
  const [nextUeId, setNextUeId] = useState("chargement..."); // Pour stocker le futur ID potentiel

  // --- STATES CRUD UE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [ueToDelete, setUeToDelete] = useState(null);
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "",update_mode: "global" // Valeur par défaut
});
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
    if (yearsList && yearsList.length > 0 && !selectedYearId) {
        const active = yearsList.find(y => y.AnneeUniversitaire_is_active);
        if (active) setSelectedYearId(active.AnneeUniversitaire_id);
        else setSelectedYearId(yearsList[0].AnneeUniversitaire_id);
    }
  }, [yearsList, selectedYearId]);

  const fetchStructure = useCallback(async () => {
      if (!selectedYearId || !parcoursId) return;
      setIsStructureLoading(true);
      try {
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
            
            setActiveNiveauId(prev => {
                if (!data || data.length === 0) return null;
                const exists = data.find(d => d.niveau_id === prev);
                return exists ? prev : data[0].niveau_id;
            });
        } else {
            setStructure([]);
        }
      } catch(e) { 
          console.error("Erreur réseau/parsing:", e); 
          addToast("Erreur chargement structure", "error");
      } finally {
          setIsStructureLoading(false);
      }
  }, [parcoursId, selectedYearId]); 

  useEffect(() => {
      if (ecModalOpen && selectedUEForEC && structure.length > 0) {
          let found = null;
          for (const niv of structure) {
              for (const sem of niv.semestres) {
                  const match = sem.ues.find(u => u.id === selectedUEForEC.id);
                  if (match) { found = match; break; }
              }
              if (found) break;
          }
          if (found) {
              if (JSON.stringify(found) !== JSON.stringify(selectedUEForEC)) {
                  setSelectedUEForEC(found);
              }
          } else {
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

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    
    const fetchMeta = async () => {
      setIsLoading(true);
      try {
        let currentParcours = parcours;
        if (!currentParcours || getVal(currentParcours, "Parcours_id", "id_parcours") !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) {
                currentParcours = await res.json();
                setParcours(currentParcours);
            }
        }
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
        if (institutionId && !institution) {
            const resI = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(resI.ok) setInstitution(await resI.json());
        }
        const resSem = await fetch(`${API_BASE_URL}/api/metadonnees/semestres`);
        if(resSem.ok) setSemestresList(await resSem.json());

      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchMeta();
  }, [parcoursId, mentionId, etablissementId, institutionId, parcours, institution]);
  
  useEffect(() => {
      if (parcoursId && selectedYearId && !isLoading) {
        fetchStructure();
      }
  }, [selectedYearId, isLoading, parcoursId, fetchStructure]); 

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
  // 2. LOGIQUES SUPP (SORTING & PAGINATION)
  // ==========================================

  const sortedStructure = useMemo(() => {
    if (!structure) return [];
    
    const levelOrder = {
        "L1": 1, "L2": 2, "L3": 3, 
        "M1": 4, "M2": 5, 
        "D1": 6, "D2": 7, "D3": 8
    };

    return [...structure].sort((a, b) => {
        const getWeight = (label) => {
            const foundKey = Object.keys(levelOrder).find(key => label.toUpperCase().includes(key));
            return foundKey ? levelOrder[foundKey] : 99;
        };
        const wA = getWeight(a.niveau_label);
        const wB = getWeight(b.niveau_label);
        if (wA === wB) return a.niveau_label.localeCompare(b.niveau_label);
        return wA - wB;
    });
  }, [structure]);

  const handleChangeYear = (direction) => {
      if (!yearsList || yearsList.length === 0) return;
      const currentIndex = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId);
      if (currentIndex === -1) return;

      let newIndex = direction === 'next' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex >= 0 && newIndex < yearsList.length) {
          setSelectedYearId(yearsList[newIndex].AnneeUniversitaire_id);
      }
  };

  const isFirstYear = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId) === yearsList.length - 1;
  const isLastYear = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId) === 0;

  // ==========================================
  // 3. GESTION UE & EC (CRUD)
  // ==========================================
  
  const openModal = async (semestreId = "", ue = null) => {
      setErrors({});
      
      // On récupère le prochain ID disponible (pour l'affichage en cas de Fork ou Création)
      const potentialId = await fetchNextId();
      setNextUeId(potentialId);

      if(ue) {
          setEditUE(ue);
          setForm({ 
            code: ue.code, 
            intitule: ue.intitule, 
            credit: ue.credit, 
            semestre_id: semestreId || "",
            update_mode: "global" // Par défaut, on suppose une correction globale
          });
      } else {
          setEditUE(null);
          setForm({ 
            code: potentialId, // Pré-remplissage pour nouvelle UE
            intitule: "", 
            credit: 5, 
            semestre_id: semestreId || "",
            update_mode: "global" 
          });
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
      formData.append("update_mode", form.update_mode); // Transmission du choix Fork/Global

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
          const res = await fetch(`${API_BASE_URL}/api/ecs/${editingEcId}`, { method: "PUT", body: formData });
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

  const maxCreditsAllowed = useMemo(() => {
    if (!form.semestre_id) return 30; 
    let targetSemestre = null;
    for (const niv of structure) {
        const s = niv.semestres.find(sem => sem.id === form.semestre_id);
        if (s) { targetSemestre = s; break; }
    }
    if (!targetSemestre) return 30;
    let usedCreditsExcludingCurrentUE = targetSemestre.ues.reduce((acc, ue) => {
        if (editUE && editUE.id === ue.id) return acc; 
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

  const currentNiveau = activeNiveauId ? sortedStructure.find(niv => niv.niveau_id === activeNiveauId) : sortedStructure[0];
  
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
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
               <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-mono font-bold text-gray-600">{parcoursCode}</span>
               <span>{parcoursLabel}</span>
            </div>
         </div>
         <button 
            onClick={fetchStructure} 
            title="Rafraîchir les données" 
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition-colors shadow-sm"
        >
            <FaSync className={isStructureLoading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>
      <hr className={AppStyles.separator} />

      {/* FICHE INFO */}
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-6 text-[100px] font-black text-gray-50 opacity-10 pointer-events-none select-none">
              {selectedYearLabel.split('-')[0]}
          </div>

          <div className="flex-shrink-0 mx-auto md:mx-0 z-10">
             {logoPath ? (
                 <img src={`${API_BASE_URL}${logoPath}`} className="w-20 h-20 object-contain rounded-lg border bg-gray-50 p-1" alt="Logo" />
             ) : (
                 <div className="w-20 h-20 bg-blue-50 flex items-center justify-center text-blue-200 rounded-lg border border-blue-100">
                     <FaLayerGroup className="w-8 h-8"/>
                 </div>
             )}
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left z-10">
              <div className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" 
                  onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`)}>
                  <FaChevronLeft /> Retour à la Mention
              </div>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight">{parcoursLabel}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                      <FaGraduationCap className="text-gray-400"/> Mention {mentionLabel}
                  </span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="text-gray-600">
                      {etablissement?.Composante_label}
                  </span>
              </div>
          </div>
      </motion.div>

      {/* STRUCTURE PÉDAGOGIQUE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col relative">
          
          {isStructureLoading && (
              <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
                  <SpinnerIcon className="animate-spin text-3xl text-blue-600" />
              </div>
          )}

          {/* ONGLETS NIVEAUX */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
              {sortedStructure.length > 0 ? (
                  sortedStructure.map((niv) => (
                      <button key={niv.niveau_id} onClick={() => setActiveNiveauId(niv.niveau_id)} 
                        className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap relative ${
                            activeNiveauId === niv.niveau_id 
                            ? "text-blue-600 border-blue-600 bg-blue-50/50" 
                            : "text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700"
                        }`}>
                          {niv.niveau_label}
                          {activeNiveauId === niv.niveau_id && (
                             <motion.span layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                          )}
                      </button>
                  ))
              ) : (
                  <div className="p-4 text-sm text-gray-400 italic">Maquette vide</div>
              )}
          </div>

          {/* TOOLBAR */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between items-center gap-4">
               
               <div className="flex items-center gap-3 w-full lg:w-auto">
                   <div className="relative flex-1 lg:w-64">
                       <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                       <input 
                            type="text" 
                            placeholder="Filtrer les UE..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-shadow"
                       />
                   </div>
                   <div className="flex bg-gray-200 p-1 rounded-lg flex-shrink-0">
                       <button onClick={() => setView("grid")} title="Vue Grille" className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                           <ThIcon />
                       </button>
                       <button onClick={() => setView("list")} title="Vue Liste" className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                           <ListIcon />
                       </button>
                   </div>
               </div>

               <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                    <button 
                        onClick={() => handleChangeYear('prev')} 
                        disabled={isFirstYear}
                        className={`p-2 rounded-md transition-colors ${isFirstYear ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"}`}
                    >
                        <FaChevronLeft size={12} />
                    </button>
                    
                    <div className="px-4 flex flex-col items-center min-w-[140px]">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Année Univ.</span>
                        <span className="text-sm font-bold text-blue-700 flex items-center gap-2">
                             <FaCalendarAlt className="mb-0.5"/> {selectedYearLabel}
                        </span>
                    </div>

                    <button 
                        onClick={() => handleChangeYear('next')} 
                        disabled={isLastYear}
                        className={`p-2 rounded-md transition-colors ${isLastYear ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"}`}
                    >
                        <FaChevronRight size={12} />
                    </button>
               </div>
          </div>

          {/* CONTENU PRINCIPAL */}
          <div className="p-6 bg-gray-50/30 space-y-8 flex-1">
              <AnimatePresence mode="wait">
                {sortedStructure.length > 0 && currentNiveau ? (
                    <motion.div 
                        key={`${currentNiveau.niveau_id}-${selectedYearId}`} 
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} 
                        className="space-y-8 relative w-full"
                    >
                        {currentNiveau.semestres.map((sem) => {
                            const filteredUEs = sem.ues.filter(ue => 
                                ue.intitule.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                ue.code.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (searchTerm && filteredUEs.length === 0) return null;

                            const totalCreditsSemestre = sem.ues.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);
                            const totalCreditsFiltered = filteredUEs.reduce((acc, curr) => acc + (parseFloat(curr.credit) || 0), 0);

                            return (
                                <div key={sem.id} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-gray-800">Semestre {sem.numero}</span>
                                                <span className="text-xs text-gray-500">
                                                    {sem.ues.length} Unité(s) • Total {totalCreditsSemestre} Crédits
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => openModal(sem.id)} className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-2 transition-colors">
                                            <FaPlus className="text-[10px]" /> Ajouter une UE
                                        </button>
                                    </div>
                                    
                                    {filteredUEs.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                            <p className="text-gray-400 text-sm">Aucune UE trouvée pour ce semestre.</p>
                                        </div>
                                    ) : view === "grid" ? (
                                        // === VUE GRILLE MODIFIÉE ===
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5">
                                            {filteredUEs.map(ue => (
                                                <div key={ue.id} className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:border-blue-300 transition-all duration-200 flex flex-col h-full group relative overflow-hidden">
                                                    
                                                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                                                    <div className="p-4 flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                                                {ue.code}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => openModal(sem.id, ue)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors" title="Modifier"><FaEdit size={12} /></button>
                                                                <button onClick={() => {setUeToDelete(ue); setDeleteModalOpen(true);}} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Supprimer"><FaTrash size={12} /></button>
                                                            </div>
                                                        </div>

                                                        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-3 line-clamp-2 min-h-[2.5em]" title={ue.intitule}>
                                                            {ue.intitule}
                                                        </h3>
                                                        
                                                        {/* MODIFICATION ICI : Liste complète + Police Agrandie */}
                                                        <div className="flex-grow mb-3">
                                                            {ue.ecs && ue.ecs.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    {ue.ecs.map(ec => (
                                                                        <div key={ec.id} className="flex items-start gap-2 text-[13px] text-gray-600">
                                                                            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0 mt-1.5"></div>
                                                                            <span className="leading-tight">{ec.intitule}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-gray-400 italic pl-1 flex items-center gap-1">
                                                                    <FaMinus className="text-[8px]"/> Pas de modules
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between mt-auto border-t border-gray-50 pt-3">
                                                            <button 
                                                                onClick={() => openEcModal(ue)}
                                                                className="text-xs text-gray-500 hover:text-blue-700 font-medium flex items-center gap-1 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                                            >
                                                                <FaListUl className="text-[10px]"/> Modules ({ue.ecs?.length || 0})
                                                            </button>

                                                            <div className="flex flex-col items-end">
                                                                <span className="text-lg font-bold text-gray-800 leading-none">{ue.credit}</span>
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Crédits</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // === VUE LISTE MODIFIÉE ===
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="p-4 w-24">Code</th>
                                                        <th className="p-4 w-1/4">Intitulé de l'UE</th>
                                                        <th className="p-4 w-32 text-center">Crédits</th>
                                                        <th className="p-4">Modules (EC)</th>
                                                        <th className="p-4 w-24 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm divide-y divide-gray-100">
                                                    {filteredUEs.map(ue => (
                                                        <tr key={ue.id} className="hover:bg-blue-50/30 transition-colors group">
                                                            <td className="p-4 font-mono font-bold text-gray-600 text-xs align-top pt-5">{ue.code}</td>
                                                            <td className="p-4 font-medium text-gray-800 align-top pt-5">
                                                                {ue.intitule}
                                                            </td>
                                                            <td className="p-4 text-center align-top pt-5">
                                                                <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                                                    {ue.credit} pts
                                                                </span>
                                                            </td>
                                                            
                                                            {/* MODIFICATION ICI : Liste en ligne avec Coefficients */}
                                                            <td className="p-4 align-top">
                                                                {ue.ecs && ue.ecs.length > 0 ? (
                                                                    <div 
                                                                        className="text-xs text-gray-700 leading-relaxed cursor-pointer p-2 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
                                                                        onClick={() => openEcModal(ue)}
                                                                        title="Cliquez pour gérer les modules"
                                                                    >
                                                                        {ue.ecs.map((ec, idx) => (
                                                                            <span key={ec.id}>
                                                                                <span className="font-medium">{ec.intitule}</span>
                                                                                <span className="text-gray-500 font-mono ml-0.5">({parseFloat(ec.coefficient || 0).toFixed(1) * 1})</span>
                                                                                {idx < ue.ecs.length - 1 && <span className="mr-1 text-gray-400">,</span>}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => openEcModal(ue)}
                                                                        className="text-gray-400 italic text-xs hover:text-blue-600 hover:underline p-2"
                                                                    >
                                                                        Aucun module (Ajouter)
                                                                    </button>
                                                                )}
                                                            </td>

                                                            <td className="p-4 text-right align-top pt-4">
                                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openModal(sem.id, ue)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded" title="Modifier"><FaEdit/></button>
                                                                    <button onClick={() => {setUeToDelete(ue); setDeleteModalOpen(true);}} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded" title="Supprimer"><FaTrash/></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                                    <tr>
                                                        <td colSpan="2" className="p-3 text-right text-xs font-bold text-gray-500">TOTAL SEMESTRE</td>
                                                        <td className="p-3 text-center text-xs font-bold text-gray-800">{totalCreditsFiltered} / 30</td>
                                                        <td colSpan="2"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
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
                                <FaBook className="text-3xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700">Aucune structure définie</h3>
                            <p className="text-sm text-gray-500 mt-1 mb-6">
                                Pour l'année universitaire <strong>{selectedYearLabel}</strong>
                            </p>
                            <button onClick={() => openModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 flex items-center gap-2 transition-transform active:scale-95">
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
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100 mb-2 flex items-center gap-2">
                 <FaCalendarAlt /> Rattachée à l'année : <strong>{selectedYearLabel}</strong>
              </div>

              {/* --- BLOC DE DÉTECTION ET CHOIX DE MODE --- */}     
              {editUE && (form.code !== editUE.code || form.intitule !== editUE.intitule) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3 mb-3">
                        <FaExclamationTriangle className="text-orange-500 mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-orange-800">Modification de référence détectée</h4>
                            <p className="text-xs text-orange-700 mt-1">
                                Vous avez modifié le Code ou l'Intitulé. Comment souhaitez-vous appliquer ce changement ?
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pl-2">
                        {/* OPTION 1 : GLOBAL */}
                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${form.update_mode === 'global' ? 'bg-white border-orange-400 shadow-sm' : 'border-transparent hover:bg-orange-100/50'}`}>
                            <input 
                                type="radio" 
                                name="update_mode" 
                                value="global" 
                                checked={form.update_mode === 'global'} 
                                onChange={(e) => setForm({...form, update_mode: e.target.value})}
                                className="mt-1 text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <span className="block text-sm font-bold text-gray-800">Correction Globale</span>
                                <span className="block text-xs text-gray-500">Renomme l'UE existante. Impacte toutes les années et parcours liés.</span>
                                <div className="mt-2 text-xs bg-gray-100 inline-block px-2 py-1 rounded text-gray-600 font-mono">
                                    ID Catalogue : <strong>{editUE.id_catalog}</strong> (Inchangé)
                                </div>
                            </div>
                        </label>

                        {/* OPTION 2 : FORK */}
                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${form.update_mode === 'fork' ? 'bg-white border-blue-400 shadow-sm' : 'border-transparent hover:bg-blue-50'}`}>
                            <input 
                                type="radio" 
                                name="update_mode" 
                                value="fork" 
                                checked={form.update_mode === 'fork'} 
                                onChange={(e) => setForm({...form, update_mode: e.target.value})}
                                className="mt-1 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="block text-sm font-bold text-gray-800">Créer une nouvelle version (Fork)</span>
                                <span className="block text-xs text-gray-500">Détache cette maquette de l'ancienne UE et crée une nouvelle entrée catalogue.</span>
                                <div className="mt-2 text-xs bg-blue-100 inline-block px-2 py-1 rounded text-blue-700 font-mono border border-blue-200">
                                    Nouvel ID prévu : <strong>{nextUeId}</strong>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
              )}

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
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                          Crédits <span className="text-xs font-normal text-gray-500">(Restant: {maxCreditsAllowed})</span>
                      </label>
                      <span className={`text-sm font-bold ${maxCreditsAllowed === 0 ? "text-red-500" : form.credit === maxCreditsAllowed ? "text-orange-500" : "text-blue-600"}`}>
                          {form.credit} / 30
                      </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400">1</span>
                      <input 
                        type="range" 
                        min="1" 
                        max={maxRangeValue} 
                        value={form.credit} 
                        disabled={maxCreditsAllowed === 0}
                        onChange={e => setForm({...form, credit: parseInt(e.target.value)})} 
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${maxCreditsAllowed === 0 ? "bg-gray-200" : "bg-gray-200 accent-blue-600"}`} 
                      />
                      <span className="text-xs font-bold text-gray-400">{maxRangeValue}</span>
                  </div>
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
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
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
                                                  <span className="text-[10px] font-mono bg-gray-100 px-1 rounded text-gray-600 font-bold border border-gray-200">{ec.code}</span>
                                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">Coef. {parseFloat(ec.coefficient).toFixed(2).replace(/\.?0+$/, '')}</span>
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