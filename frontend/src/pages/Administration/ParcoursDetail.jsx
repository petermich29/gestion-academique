// src/pages/Administration/ParcoursDetail.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaLayerGroup, FaGraduationCap, FaSearch, FaCalendarAlt, FaSync, FaBook } from "react-icons/fa";
import { SpinnerIcon, PlusIcon, ThIcon, ListIcon } from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import { useBreadcrumb } from "../../context/BreadcrumbContext";
import { useAdministration } from "../../context/AdministrationContext";
import { StructureView } from "./components/StructureView";
import { UeFormModal } from "./components/UeFormModal";
import { EcManagerModal } from "./components/EcManagerModal";

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { id: institutionId, etablissementId, mentionId, parcoursId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumb } = useBreadcrumb();
  const { yearsList } = useAdministration();

  const [parcours, setParcours] = useState(location.state?.parcours || null);
  const [mention, setMention] = useState(null); 
  const [etablissement, setEtablissement] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [structure, setStructure] = useState([]); 
  const [semestresList, setSemestresList] = useState([]); 
  
  const [selectedYearId, setSelectedYearId] = useState(""); 
  const [isLoading, setIsLoading] = useState(true);
  const [isStructureLoading, setIsStructureLoading] = useState(false);
  const [activeNiveauId, setActiveNiveauId] = useState(null); 
  const [view, setView] = useState("grid"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState([]);
  const [nextUeId, setNextUeId] = useState("chargement..."); 

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [ueToDelete, setUeToDelete] = useState(null);
  const [form, setForm] = useState({ code: "", intitule: "", credit: 5, semestre_id: "",update_mode: "global" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [ecModalOpen, setEcModalOpen] = useState(false);
  const [selectedUEForEC, setSelectedUEForEC] = useState(null); 
  const [editingEcId, setEditingEcId] = useState(null); 
  const [editEcData, setEditEcData] = useState({ code: "", intitule: "", coefficient: 1.0 });
  const [ecForm, setEcForm] = useState({ code: "", intitule: "", coefficient: 1.0 });
  const [isEcSubmitting, setIsEcSubmitting] = useState(false);
  const [typesEnseignement, setTypesEnseignement] = useState([]);
  const dataFetchedRef = useRef(false);

  const getVal = (obj, k1, k2) => obj ? (obj[k1] || obj[k2] || "") : "";
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (yearsList?.length > 0 && !selectedYearId) {
        const active = yearsList.find(y => y.AnneeUniversitaire_is_active);
        setSelectedYearId(active ? active.AnneeUniversitaire_id : yearsList[0].AnneeUniversitaire_id);
    }
  }, [yearsList, selectedYearId]);

  const fetchStructure = useCallback(async () => {
      if (!selectedYearId || !parcoursId) return;
      setIsStructureLoading(true);
      try {
        const url = `${API_BASE_URL}/api/parcours/${parcoursId}/structure?annee_id=${selectedYearId}&_t=${new Date().getTime()}`;
        const res = await fetch(url, { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache", "Expires": "0" }});
        if(res.ok) {
            const data = await res.json();
            setStructure(data);
            setActiveNiveauId(prev => (data && data.length > 0) ? (data.find(d => d.niveau_id === prev) ? prev : data[0].niveau_id) : null);
        } else setStructure([]);
      } catch(e) { addToast("Erreur chargement structure", "error"); } 
      finally { setIsStructureLoading(false); }
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
          found && JSON.stringify(found) !== JSON.stringify(selectedUEForEC) ? setSelectedUEForEC(found) : (!found && setEcModalOpen(false));
      }
  }, [structure, ecModalOpen, selectedUEForEC]); 

  const fetchNextId = async () => {
    try { const res = await fetch(`${API_BASE_URL}/api/ues/next-id`); return res.ok ? await res.json() : "UE_NEW"; } 
    catch (e) { return "UE_ERR"; }
  };

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    const fetchMeta = async () => {
      setIsLoading(true);
      try {
        let cp = parcours;
        if (!cp || getVal(cp, "Parcours_id", "id_parcours") !== parcoursId) {
            const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
            if(res.ok) { cp = await res.json(); setParcours(cp); }
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
  
  useEffect(() => { if (parcoursId && selectedYearId && !isLoading) fetchStructure(); }, [selectedYearId, isLoading, parcoursId, fetchStructure]); 

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

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/metadonnees/types-enseignement`).then(res => res.json())
    .then(data => setTypesEnseignement(data.map(t => ({ id: t.TypeEnseignement_id, code: t.TypeEnseignement_code, label: t.TypeEnseignement_label }))));
  }, []);

  const sortedStructure = useMemo(() => {
    if (!structure) return [];
    const levelOrder = { "L1": 1, "L2": 2, "L3": 3, "M1": 4, "M2": 5, "D1": 6, "D2": 7, "D3": 8 };
    return [...structure].sort((a, b) => {
        const getWeight = (l) => levelOrder[Object.keys(levelOrder).find(k => l.toUpperCase().includes(k))] || 99;
        const wA = getWeight(a.niveau_label), wB = getWeight(b.niveau_label);
        return wA === wB ? a.niveau_label.localeCompare(b.niveau_label) : wA - wB;
    });
  }, [structure]);

  const handleChangeYear = (dir) => {
      if (!yearsList?.length) return;
      const curIdx = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId);
      if (curIdx === -1) return;
      let newIdx = dir === 'next' ? curIdx - 1 : curIdx + 1;
      if (newIdx >= 0 && newIdx < yearsList.length) setSelectedYearId(yearsList[newIdx].AnneeUniversitaire_id);
  };

  const openModal = async (semestreId = "", ue = null) => {
      setErrors({});
      const pid = await fetchNextId();
      setNextUeId(pid);
      setEditUE(ue);
      setForm(ue ? { code: ue.code, intitule: ue.intitule, credit: ue.credit, semestre_id: semestreId || "", update_mode: "global" } : { code: pid, intitule: "", credit: 5, semestre_id: semestreId || "", update_mode: "global" });
      setModalOpen(true);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true); setErrors({});
      const formData = new FormData();
      Object.keys(form).forEach(k => formData.append(k, form[k]));
      formData.append("parcours_id", parcoursId); 
      formData.append("annee_id", selectedYearId);
      try {
          let url = `${API_BASE_URL}/api/ues` + (editUE ? `/${editUE.id_maquette}` : "");
          const res = await fetch(url, { method: editUE ? "PUT" : "POST", body: formData });
          if(!res.ok) throw new Error((await res.json()).detail || "Erreur sauvegarde UE");
          await fetchStructure();
          addToast(editUE ? "UE Modifiée" : "UE Ajoutée");
          setModalOpen(false);
      } catch(e) { setErrors({ global: e.message }); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if(!ueToDelete) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/ues/${ueToDelete.id_maquette}`, { method: 'DELETE' });
        if(!res.ok) throw new Error("Erreur suppression UE");
        await fetchStructure(); addToast("UE retirée de la maquette."); setDeleteModalOpen(false); 
    } catch(e) { addToast("Erreur suppression", "error"); }
  };

  const openEcModal = (ue) => { setSelectedUEForEC(ue); setEcForm({ code: "", intitule: "", coefficient: 1.0 }); setEditingEcId(null); setEcModalOpen(true); };
  
  const handleAddEC = async (e) => {
      e.preventDefault();
      if (!selectedUEForEC) return;
      setIsEcSubmitting(true); setErrors({});
      const formData = new FormData();
      formData.append("maquette_ue_id", selectedUEForEC.id_maquette);
      Object.keys(ecForm).forEach(k => formData.append(k, ecForm[k]));
      try {
          const res = await fetch(`${API_BASE_URL}/api/ecs/`, { method: "POST", body: formData });
          if (!res.ok) throw new Error((await res.json()).detail || "Erreur ajout EC");
          addToast("EC ajouté"); await fetchStructure(); setEcForm({ code: "", intitule: "", coefficient: 1.0 }); 
      } catch (err) { addToast(err.message, "error"); setErrors({ ec_form: err.message }); } finally { setIsEcSubmitting(false); }
  };

  const handleDeleteEC = async (ecId) => {
    if (!window.confirm("Supprimer ce module ?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/ecs/${ecId}`, { method: "DELETE" });
        if (!response.ok) console.error("Erreur suppression:", response.status);
    } catch (error) { console.error("Erreur réseau:", error); }
  };

  const startEditEC = (ec) => { setEditingEcId(ec.id); setEditEcData({ code: ec.code, intitule: ec.intitule, coefficient: parseFloat(ec.coefficient) || 0 }); };
  const cancelEditEC = () => { setEditingEcId(null); setEditEcData({ code: "", intitule: "", coefficient: 1.0 }); };
  
  const handleUpdateEC = async () => {
      if(!editingEcId) return;
      const formData = new FormData();
      formData.append("maquette_ec_id", editingEcId);
      Object.keys(editEcData).forEach(k => formData.append(k, editEcData[k]));
      try {
          const res = await fetch(`${API_BASE_URL}/api/ecs/${editingEcId}`, { method: "PUT", body: formData });
          if(!res.ok) throw new Error((await res.json()).detail || "Erreur modification");
          addToast("EC modifié"); setEditingEcId(null); await fetchStructure(); 
      } catch(e) { addToast(e.message, "error"); }
  };

  const maxCreditsAllowed = useMemo(() => {
    if (!form.semestre_id) return 30; 
    let targetSemestre = null;
    for (const niv of structure) {
        const s = niv.semestres.find(sem => sem.id === form.semestre_id);
        if (s) { targetSemestre = s; break; }
    }
    if (!targetSemestre) return 30;
    let used = targetSemestre.ues.reduce((acc, ue) => (editUE && editUE.id === ue.id) ? acc : acc + (parseFloat(ue.credit) || 0), 0);
    return Math.max(0, 30 - used);
  }, [form.semestre_id, structure, editUE]);

  useEffect(() => {
     if (form.credit > maxCreditsAllowed && maxCreditsAllowed > 0) setForm(p => ({ ...p, credit: maxCreditsAllowed }));
     if (form.credit === 0 && maxCreditsAllowed > 0) setForm(p => ({ ...p, credit: 1 }));
  }, [maxCreditsAllowed, form.credit]);

  if (isLoading) return <div className="p-10 text-center"><SpinnerIcon className="animate-spin text-4xl text-blue-600 inline" /></div>;
  if (!parcours) return <div className="p-10 text-center text-red-500">Parcours introuvable</div>;

  const currentNiveau = activeNiveauId ? sortedStructure.find(niv => niv.niveau_id === activeNiveauId) : sortedStructure[0];
  const parcoursLabel = getVal(parcours, "Parcours_label", "nom_parcours");
  const selectedYearLabel = yearsList.find(y => y.AnneeUniversitaire_id === selectedYearId)?.AnneeUniversitaire_annee || "Année inconnue";
  const isFirstYear = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId) === yearsList.length - 1;
  const isLastYear = yearsList.findIndex(y => y.AnneeUniversitaire_id === selectedYearId) === 0;

  return (
    <div className={AppStyles.pageContainer}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className={AppStyles.header.container}>
         <div className="flex flex-col">
            <h2 className={AppStyles.mainTitle}>Détail du Parcours</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
               <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-mono font-bold text-gray-600">{getVal(parcours, "Parcours_code", "code")}</span>
               <span>{parcoursLabel}</span>
            </div>
         </div>
         <button onClick={fetchStructure} title="Rafraîchir les données" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition-colors shadow-sm">
            <FaSync className={isStructureLoading ? "animate-spin text-blue-600" : ""} />
         </button>
      </div>
      <hr className={AppStyles.separator} />
      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 mb-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-6 text-[100px] font-black text-gray-50 opacity-10 pointer-events-none select-none">{selectedYearLabel.split('-')[0]}</div>
          <div className="flex-shrink-0 mx-auto md:mx-0 z-10">
             {getVal(parcours, "Parcours_logo_path", "logo_path") ? (
                 <img src={`${API_BASE_URL}${getVal(parcours, "Parcours_logo_path", "logo_path")}`} className="w-20 h-20 object-contain rounded-lg border bg-gray-50 p-1" alt="Logo" />
             ) : (
                 <div className="w-20 h-20 bg-blue-50 flex items-center justify-center text-blue-200 rounded-lg border border-blue-100"><FaLayerGroup className="w-8 h-8"/></div>
             )}
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left z-10">
              <div className="text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-1 justify-center md:justify-start" onClick={() => navigate(`/institution/${institutionId}/etablissement/${etablissementId}/mention/${mentionId}`)}>
                  <FaChevronLeft /> Retour à la Mention
              </div>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight">{parcoursLabel}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm">
                  <span className="text-gray-600 flex items-center gap-1"><FaGraduationCap className="text-gray-400"/> Mention {mention ? getVal(mention, "Mention_label", "label") : mentionId}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="text-gray-600">{etablissement?.Composante_label}</span>
              </div>
          </div>
      </motion.div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col relative">
          {isStructureLoading && <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px] rounded-xl"><SpinnerIcon className="animate-spin text-3xl text-blue-600" /></div>}
          <div className="flex border-b border-gray-100 overflow-x-auto">
              {sortedStructure.length > 0 ? (
                  sortedStructure.map((niv) => (
                      <button key={niv.niveau_id} onClick={() => setActiveNiveauId(niv.niveau_id)} 
                        className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap relative ${activeNiveauId === niv.niveau_id ? "text-blue-600 border-blue-600 bg-blue-50/50" : "text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700"}`}>
                          {niv.niveau_label}
                          {activeNiveauId === niv.niveau_id && <motion.span layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
                      </button>
                  ))
              ) : (
                  <div className="p-4 text-sm text-gray-400 italic">Maquette vide</div>
              )}
          </div>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-3 w-full lg:w-auto">
                   <div className="relative flex-1 lg:w-64">
                       <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                       <input type="text" placeholder="Filtrer les UE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-shadow" />
                   </div>
                   <div className="flex bg-gray-200 p-1 rounded-lg flex-shrink-0">
                       <button onClick={() => setView("grid")} title="Vue Grille" className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><ThIcon /></button>
                       <button onClick={() => setView("list")} title="Vue Liste" className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><ListIcon /></button>
                   </div>
               </div>
               <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                    <button onClick={() => handleChangeYear('prev')} disabled={isFirstYear} className={`p-2 rounded-md transition-colors ${isFirstYear ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"}`}><FaChevronLeft size={12} /></button>
                    <div className="px-4 flex flex-col items-center min-w-[140px]">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Année Univ.</span>
                        <span className="text-sm font-bold text-blue-700 flex items-center gap-2"><FaCalendarAlt className="mb-0.5"/> {selectedYearLabel}</span>
                    </div>
                    <button onClick={() => handleChangeYear('next')} disabled={isLastYear} className={`p-2 rounded-md transition-colors ${isLastYear ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"}`}><FaChevronRight size={12} /></button>
               </div>
          </div>
          <div className="p-6 bg-gray-50/30 space-y-8 flex-1">
              <AnimatePresence mode="wait">
                {sortedStructure.length > 0 && currentNiveau ? (
                    <motion.div key={`${currentNiveau.niveau_id}-${selectedYearId}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8 relative w-full">
                        <StructureView view={view} semestres={currentNiveau.semestres} searchTerm={searchTerm} openModal={openModal} openEcModal={openEcModal} setUeToDelete={setUeToDelete} setDeleteModalOpen={setDeleteModalOpen} typesEnseignement={typesEnseignement} />
                    </motion.div>
                ) : (
                    !isStructureLoading && (
                        <div className="text-center py-16 flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-200 mb-4"><FaBook className="text-3xl" /></div>
                            <h3 className="text-lg font-bold text-gray-700">Aucune structure définie</h3>
                            <p className="text-sm text-gray-500 mt-1 mb-6">Pour l'année universitaire <strong>{selectedYearLabel}</strong></p>
                            <button onClick={() => openModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 flex items-center gap-2 transition-transform active:scale-95"><PlusIcon /> Initialiser la maquette</button>
                        </div>
                    )
                )}
              </AnimatePresence>
          </div>
      </div>
      <UeFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editUE={editUE} form={form} setForm={setForm} errors={errors} isSubmitting={isSubmitting} handleSubmit={handleSubmit} semestresList={semestresList} selectedYearLabel={selectedYearLabel} nextUeId={nextUeId} maxCreditsAllowed={maxCreditsAllowed} />
      <EcManagerModal isOpen={ecModalOpen} onClose={() => setEcModalOpen(false)} ue={selectedUEForEC} editingEcId={editingEcId} editEcData={editEcData} setEditEcData={setEditEcData} ecForm={ecForm} setEcForm={setEcForm} handleAddEC={handleAddEC} handleUpdateEC={handleUpdateEC} handleDeleteEC={handleDeleteEC} startEditEC={startEditEC} cancelEditEC={cancelEditEC} isEcSubmitting={isEcSubmitting} errors={errors} onSaveSuccess={fetchStructure} />
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer UE">
          <p>Confirmer la suppression de l'UE <b>{ueToDelete?.code}</b> pour l'année {selectedYearLabel} ?</p>
          <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
              <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
          </div>
      </ConfirmModal>
    </div>
  );
};
export default ParcoursDetail;