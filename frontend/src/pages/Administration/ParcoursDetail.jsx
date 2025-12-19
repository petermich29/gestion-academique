import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronLeft, FaChevronRight, FaLayerGroup, FaGraduationCap,
  FaSearch, FaCalendarAlt, FaSync, FaBook
} from "react-icons/fa";

import { SpinnerIcon, PlusIcon, ThIcon, ListIcon } from "../../components/ui/Icons";
import { AppStyles } from "../../components/ui/AppStyles";
import { ToastContainer, toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import { useBreadcrumb } from "../../context/BreadcrumbContext";
import { useAdministration } from "../../context/AdministrationContext";

import { StructureView } from "./components/StructureView";
import { UeFormModal } from "./components/UeFormModal";
import { EcManagerModal } from "./components/EcManagerModal";

const API_BASE_URL = "http://127.0.0.1:8000";

const ParcoursDetail = () => {
  const { parcoursId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumb } = useBreadcrumb();
  const { currentAnneeId, anneesUniversitaires } = useAdministration();

  // --- ÉTATS ---
  const [parcours, setParcours] = useState(null);
  const [structure, setStructure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal UE
  const [modalOpen, setModalOpen] = useState(false);
  const [editUE, setEditUE] = useState(null);
  const [form, setForm] = useState({ code: "", intitule: "", credit: "", id_semestre: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Modal EC
  const [ecModalOpen, setEcModalOpen] = useState(false);
  const [selectedUEForEC, setSelectedUEForEC] = useState(null);

  // Suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ueToDelete, setUeToDelete] = useState(null);

  // --- DATA FETCHING ---
  const fetchStructure = useCallback(async () => {
    if (!parcoursId || !currentAnneeId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}/structure?annee_id=${currentAnneeId}`);
      if (res.ok) setStructure(await res.json());
    } catch (err) { toast.error("Erreur de chargement de la structure"); }
  }, [parcoursId, currentAnneeId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resP = await fetch(`${API_BASE_URL}/api/parcours/${parcoursId}`);
        if (resP.ok) {
          const data = await resP.json();
          setParcours(data);
          setBreadcrumb([
            { label: "Administration", path: "/admin" },
            { label: data.Parcours_abbreviation || "Parcours", path: "" }
          ]);
        }
        await fetchStructure();
      } catch (err) { toast.error("Erreur réseau"); }
      setLoading(false);
    };
    fetchData();
  }, [parcoursId, fetchStructure, setBreadcrumb]);

  // --- HANDLERS UE ---
  const handleAddUE = (semestreId) => {
    setEditUE(null);
    setForm({ code: "", intitule: "", credit: "", id_semestre: semestreId });
    setErrors({});
    setModalOpen(true);
  };

  const handleEditUE = (ue) => {
    setEditUE(ue);
    setForm({ code: ue.code, intitule: ue.intitule, credit: ue.credit, id_semestre: ue.id_semestre });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmitUE = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editUE 
      ? `${API_BASE_URL}/api/parcours/ues/${editUE.id}`
      : `${API_BASE_URL}/api/parcours/${parcoursId}/ues?annee_id=${currentAnneeId}`;
    
    try {
      const res = await fetch(url, {
        method: editUE ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editUE ? "UE mise à jour" : "UE ajoutée");
        setModalOpen(false);
        fetchStructure();
      } else {
        const errData = await res.json();
        setErrors(errData.detail || { global: "Erreur lors de l'enregistrement" });
      }
    } catch (err) { toast.error("Erreur de connexion"); }
    setIsSubmitting(false);
  };

  const confirmDeleteUE = (ue) => {
    setUeToDelete(ue);
    setDeleteModalOpen(true);
  };

  const handleDeleteUE = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/parcours/ues/${ueToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("UE supprimée");
        fetchStructure();
      } else toast.error("Erreur lors de la suppression");
    } catch (err) { toast.error("Erreur réseau"); }
    setDeleteModalOpen(false);
  };

  // --- HANDLERS EC ---
  const handleManageECs = (ue) => {
    setSelectedUEForEC(ue);
    setEcModalOpen(true);
  };

  // --- MEMOS ---
  const selectedYearLabel = useMemo(() => 
    anneesUniversitaires.find(a => a.AnneeUniversitaire_id === currentAnneeId)?.AnneeUniversitaire_label || "...",
    [anneesUniversitaires, currentAnneeId]
  );

  const semestresList = useMemo(() => 
    structure.flatMap(n => n.semestres).map(s => ({ id: s.id, label: `Semestre ${s.numero}` })),
    [structure]
  );

  if (loading) return <div className="flex justify-center items-center h-64"><SpinnerIcon className="animate-spin h-10 w-10 text-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <ToastContainer />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><FaChevronLeft className="text-gray-500"/></button>
          <div>
            <div className="flex items-center gap-2 text-blue-600 text-sm font-bold mb-1"><FaGraduationCap/> {parcours?.Mention_abbreviation}</div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{parcours?.Parcours_intitule}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-400"}`}><ThIcon/></button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-400"}`}><ListIcon/></button>
            </div>
            <button onClick={fetchStructure} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><FaSync className={loading ? "animate-spin" : ""}/></button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" placeholder="Rechercher une UE ou un code..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-sm"><FaCalendarAlt/> Année : {selectedYearLabel}</div>
      </div>

      {/* STRUCTURE CONTENT */}
      <StructureView 
        structure={structure} viewMode={viewMode} searchTerm={searchTerm}
        onAddUE={handleAddUE} onEditUE={handleEditUE} onDeleteUE={confirmDeleteUE} onManageECs={handleManageECs}
      />

      {/* MODALS */}
      <UeFormModal 
          isOpen={modalOpen} onClose={() => setModalOpen(false)}
          editUE={editUE} form={form} setForm={setForm} errors={errors}
          isSubmitting={isSubmitting} handleSubmit={handleSubmitUE}
          semestresList={semestresList} selectedYearLabel={selectedYearLabel}
      />

      <EcManagerModal 
          isOpen={ecModalOpen} onClose={() => setEcModalOpen(false)}
          ue={selectedUEForEC} onSaveSuccess={fetchStructure}
      />

      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer UE">
          <div className="p-1">
            <p className="text-gray-600">Confirmer la suppression de l'UE <span className="font-bold text-gray-800">{ueToDelete?.code}</span> ?</p>
            <p className="text-xs text-red-500 mt-2 font-medium italic">Attention: Cela supprimera également tous les modules (EC) et volumes rattachés.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-gray-500 font-medium">Annuler</button>
              <button onClick={handleDeleteUE} className="px-5 py-2 bg-red-600 text-white rounded-lg font-bold shadow-sm hover:bg-red-700">Supprimer définitivement</button>
          </div>
      </ConfirmModal>

    </div>
  );
};

export default ParcoursDetail;