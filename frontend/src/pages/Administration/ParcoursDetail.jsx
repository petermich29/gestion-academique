import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaLayerGroup, FaGraduationCap,
  FaTrash, FaEdit, FaBook, FaCube, FaPlus, FaSearch
} from "react-icons/fa";

import { 
  SpinnerIcon, PlusIcon, ThIcon, ListIcon 
} from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";
import { useBreadcrumb } from "../../context/BreadcrumbContext"

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { id: institutionId, etablissementId, mentionId, parcoursId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Récupération de setBreadcrumb depuis le Layout
  const { setBreadcrumb } = useBreadcrumb();

  // --- STATES DONNÉES ---
  const [parcours, setParcours] = useState(location.state?.parcours || null);
  const [mention, setMention] = useState(null); 
  const [etablissement, setEtablissement] = useState(null);
  // 🟢 AJOUT : State pour l'institution
  const [institution, setInstitution] = useState(null);
  
  const [structure, setStructure] = useState([]); 
  const [semestresList, setSemestresList] = useState([]); 
  
  // --- STATES UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [activeNiveauId, setActiveNiveauId] = useState(null); 
  const [view, setView] = useState("grid"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState([]);

  // --- STATES CRUD UE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [ueToDelete, setUeToDelete] = useState(null);
  
  const [generatedId, setGeneratedId] = useState(""); 
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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
        if(resStruct.ok) {
            const data = await resStruct.json();
            setStructure(data);
            return data;
        }
        return [];
      } catch(e) { 
          console.error(e); 
          return [];
      }
  }, [parcoursId]); 

  const fetchNextId = async () => {
    try {
      setGeneratedId("Chargement...");
      const res = await fetch(`${API_BASE_URL}/api/ues/next-id`);
      if (res.ok) {
        const id = await res.json();
        setGeneratedId(id);
      } else {
         setGeneratedId("Erreur");
      }
    } catch (e) {
      console.error("Erreur next ID", e);
      setGeneratedId("Erreur");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Charger Parcours
        let currentParcours = parcours;
        const currentId = getVal(currentParcours, "Parcours_id", "id_parcours");

        if (!currentParcours || currentId !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) {
                currentParcours = await res.json();
                setParcours(currentParcours);
            }
        }

        // 2. Charger Mention & Etablissement (si manquants)
        if (mentionId) {
            const resMention = await fetch(`${API_BASE_URL}/api/mentions/${mentionId}`);
            if (resMention.ok) {
                const mData = await resMention.json();
                setMention(mData);
                // Si la mention contient l'objet composante, on l'utilise
                if (mData.composante) {
                    setEtablissement(mData.composante);
                } 
                // Sinon on le fetch via l'ID de l'URL
                else if (etablissementId) {
                    const resEtab = await fetch(`${API_BASE_URL}/api/composantes/${etablissementId}`);
                    if(resEtab.ok) setEtablissement(await resEtab.json());
                }
            }
        }

        // 3. 🟢 CHARGER L'INSTITUTION (Manquant dans le code original)
        if (institutionId) {
            const resInst = await fetch(`${API_BASE_URL}/api/institutions/${institutionId}`);
            if(resInst.ok) {
                setInstitution(await resInst.json());
            }
        }

        // 4. Charger Structure et Semestres
        const structureData = await fetchStructure();
        if (structureData.length > 0 && activeNiveauId === null) {
            setActiveNiveauId(structureData[0].niveau_id);
        }

        const resSem = await fetch(`${API_BASE_URL}/api/metadonnees/semestres`);
        if(resSem.ok) setSemestresList(await resSem.json());

      } catch (e) {
        addToast("Erreur de chargement initial", "error");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [parcoursId, mentionId, etablissementId, institutionId, fetchStructure]); 

  useEffect(() => {
        if (isLoading) return;
        if (!institution || !etablissement || !mention || !parcours) return;

        setBreadcrumb([
            { label: "Administration", path: "/administration" },
            {
                label: institution.Institution_nom,
                path: `/institution/${institutionId}`,
                state: { institution },
                type: "institution" 
            },
            {
                label: etablissement.Composante_abbreviation || etablissement.Composante_label,
                path: `/institution/${institutionId}/etablissement/${etablissementId}`,
                state: { institution, composante: etablissement },
                type: "etablissement" 
            },
            {
                label: mention.Mention_label,
                path: `/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`,
                state: { institution, etablissement, mention },
                type: "mention" 
            },
            {
                label: parcours.Parcours_label,
                path: "#",
                type: "parcours"
            }
        ]);
    }, [institution, etablissement, mention, parcours, isLoading]);


  // ==========================================
  // 2. GESTION DU FORMULAIRE ET CRUD
  // ==========================================

  const openModal = async (semestreId = "", ue = null) => {
      setErrors({});
      if(ue) {
          setEditUE(ue);
          setGeneratedId(ue.id); 
          setForm({ 
              code: ue.code, 
              intitule: ue.intitule, 
              credit: ue.credit, 
              semestre_id: semestreId || "" 
          });
      } else {
          setEditUE(null);
          await fetchNextId(); 
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

      if(!form.code || !form.intitule || !form.semestre_id) {
          setErrors({ global: "Code, Intitulé et Semestre sont requis."});
          setIsSubmitting(false);
          return;
      }

      const formData = new FormData();
      formData.append("code", form.code);
      formData.append("intitule", form.intitule);
      formData.append("credit", form.credit);
      formData.append("parcours_id", parcoursId); 
      formData.append("semestre_id", form.semestre_id);

      try {
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
    const currentParcoursId = parcoursId; 
    
    try {
        const url = `${API_BASE_URL}/api/ues/${ueToDelete.id}?parcours_id=${currentParcoursId}`;
        const res = await fetch(url, { method: 'DELETE' });
        
        if(!res.ok) {
            const errorData = await res.json().catch(() => ({ detail: "Erreur suppression" }));
            throw new Error(errorData.detail || "Erreur lors de la suppression");
        }
        
        await fetchStructure(); 
        addToast("UE supprimée.");
        setDeleteModalOpen(false); 
        setUeToDelete(null); 
    } catch(e) {
        addToast(e.message || "Erreur inconnue", "error");
    }
  };

  // ==========================================
  // 3. RENDER
  // ==========================================
  if (isLoading) return <div className="p-10 text-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600 inline" /></div>;
  if (!parcours) return <div className="p-10 text-center text-red-500">Parcours introuvable</div>;

  const currentNiveau = activeNiveauId 
    ? structure.find(niv => niv.niveau_id === activeNiveauId) 
    : structure[0];
  
  const parcoursLabel = getVal(parcours, "Parcours_label", "nom_parcours");
  const parcoursCode = getVal(parcours, "Parcours_code", "code");
  const logoPath = getVal(parcours, "Parcours_logo_path", "logo_path");
  const mentionLabel = mention ? getVal(mention, "Mention_label", "label") : mentionId;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* HEADER PAGE */}
      <div className={AppStyles.header.container}>
         <h2 className={AppStyles.mainTitle}>Détail du Parcours</h2>
      </div>
      <hr className={AppStyles.separator} />

      {/* BANDEAU INFO PARCOURS */}
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-shrink-0 mx-auto md:mx-0">
             {logoPath ? (
                 <img src={`${API_BASE_URL}${logoPath}`} className="w-24 h-24 object-contain rounded-lg border bg-gray-50 p-2" alt="Logo" />
             ) : (
                 <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                     <FaLayerGroup className="w-10 h-10"/>
                 </div>
             )}
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left">
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

      {/* TABS NIVEAUX */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
          
          {/* Onglets */}
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
                  <div className="p-4 text-sm text-gray-400 italic">Aucun niveau défini. Ajoutez une UE pour commencer.</div>
              )}
          </div>

          {/* BARRE D'OUTILS : RECHERCHE + TOGGLE VIEW */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
               {/* Recherche */}
               <div className="relative w-full sm:w-72">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <FaSearch className="text-gray-400 text-xs" />
                   </div>
                   <input 
                        type="text" 
                        placeholder="Rechercher une UE (code, nom)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                   />
               </div>

               {/* Toggle View */}
               <div className="flex bg-gray-200 p-1 rounded-lg">
                   <button 
                       onClick={() => setView("grid")} 
                       className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                   >
                       <ThIcon /> Grille
                   </button>
                   <button 
                       onClick={() => setView("list")} 
                       className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                   >
                       <ListIcon /> Liste
                   </button>
               </div>
          </div>

          {/* CONTENU SEMESTRES */}
          <div className="p-6 bg-gray-50/30 space-y-8 flex-1">
              <AnimatePresence mode="wait">
                {currentNiveau ? (
                    <motion.div 
                        key={currentNiveau.niveau_id} 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }} 
                        transition={{ duration: 0.2 }}
                        className="space-y-8 relative w-full"
                    >
                        {currentNiveau.semestres.map((sem) => {
                            // Filtrage des UEs
                            const filteredUEs = sem.ues.filter(ue => 
                                ue.intitule.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                ue.code.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            // Si filtre actif et aucune UE trouvée, ne pas afficher le semestre sauf si c'est pour ajouter
                            if (searchTerm && filteredUEs.length === 0) return null;

                            return (
                                <div key={sem.id} className="space-y-4">
                                    {/* 🟢 HEADER SEMESTRE + BOUTON AJOUT UNIQUE */}
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">
                                                Semestre {sem.numero}
                                            </span>
                                            <span className="text-gray-400 text-sm hidden sm:block">| {filteredUEs.length} Unité(s)</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => openModal(sem.id)} 
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <FaPlus className="text-[10px]" /> Ajouter UE
                                        </button>
                                    </div>
                                    
                                    {/* VUE CONTENU */}
                                    {filteredUEs.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                            <p className="text-gray-400 text-sm">Aucune unité d'enseignement {searchTerm ? "trouvée" : "dans ce semestre"}.</p>
                                        </div>
                                    ) : view === "grid" ? (
                                        // --- 🟢 VUE GRILLE ---
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                                            {filteredUEs.map(ue => (
                                                <div key={ue.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all relative group flex flex-col h-full min-h-[160px]">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 inline-block mb-1 w-fit">
                                                                {ue.code}
                                                            </span>
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                                                                <FaBook className="text-lg"/>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100 absolute top-3 right-3 z-10">
                                                            <button onClick={() => openModal(sem.id, ue)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Modifier"><FaEdit /></button>
                                                            <button onClick={() => {setUeToDelete(ue); setDeleteModalOpen(true);}} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer"><FaTrash /></button>
                                                        </div>
                                                    </div>

                                                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-2 flex-grow" title={ue.intitule}>
                                                        {ue.intitule}
                                                    </h3>
                                                    
                                                    <div className="flex items-end justify-between mt-auto border-t border-gray-50 pt-3">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                            <FaCube className="text-gray-300" /> 
                                                            <span>{ue.ec_count} EC</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-2xl font-extrabold text-blue-600 leading-none">
                                                                {ue.credit}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Crédits</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // --- VUE LISTE ---
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 w-24">Code</th>
                                                        <th className="px-4 py-3">Intitulé de l'UE</th>
                                                        <th className="px-4 py-3 text-center w-20">Crédits</th>
                                                        <th className="px-4 py-3 text-center w-20">EC</th>
                                                        <th className="px-4 py-3 text-right w-24">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredUEs.map(ue => (
                                                        <tr key={ue.id} className="hover:bg-blue-50/30 transition-colors group">
                                                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{ue.code}</td>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{ue.intitule}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md min-w-[30px]">
                                                                    {ue.credit}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-gray-500 text-xs">{ue.ec_count}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                    <button className="text-gray-400 hover:text-blue-600 p-1" onClick={() => openModal(sem.id, ue)}><FaEdit /></button>
                                                                    <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => {setUeToDelete(ue); setDeleteModalOpen(true);}}><FaTrash /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <div className="text-center py-10">
                        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 mx-auto">
                            <PlusIcon /> Ajouter une première UE
                        </button>
                        <p className="text-sm text-gray-400 mt-2">Cela initialisera le premier niveau (L1/M1).</p>
                    </div>
                )}
              </AnimatePresence>
          </div>
      </div>

      {/* MODAL FORMULAIRE */}
      <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUE ? "Modifier UE" : "Nouvelle UE"}>
          <form onSubmit={handleSubmit} className="space-y-4">
              {errors.global && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">{errors.global}</div>}
              
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Identifiant (Auto)</label>
                  <input type="text" value={generatedId} disabled className="w-full bg-gray-100 text-gray-500 border border-gray-300 rounded px-3 py-2 text-sm font-mono cursor-not-allowed"/>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre <span className="text-red-500">*</span></label>
                  <select name="semestre_id" value={form.semestre_id} onChange={e => setForm({...form, semestre_id: e.target.value})} className={AppStyles.input.formControl}>
                      <option value="">-- Sélectionner --</option>
                      {semestresList.map(s => (
                          <option key={s.Semestre_id} value={s.Semestre_id}>{s.Semestre_numero}</option>
                      ))}
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
                  <div className="flex justify-between mb-1"><label className="text-sm font-semibold text-gray-700">Crédits</label><span className="text-sm font-bold text-blue-600">{form.credit}</span></div>
                  <input type="range" min="1" max="30" value={form.credit} onChange={e => setForm({...form, credit: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>1</span><span>15</span><span>30</span></div>
              </div>

              <button type="submit" disabled={isSubmitting} className={`w-full ${AppStyles.button.primary} mt-2 justify-center`}>
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