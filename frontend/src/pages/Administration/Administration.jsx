// frontend/src/pages/Administration/Administration.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FaTh, FaList, FaPlus, FaEdit } from "react-icons/fa";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://127.0.0.1:8000/api";

const Administration = () => {
  const [institutions, setInstitutions] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nom: "",
    type: "",
    sigle: "",
    description: "",
    logo: null,
    logoPath: "",
  });
  const [errors, setErrors] = useState({});
  const [editInstitution, setEditInstitution] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 50, left: 0 });

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  const typesInstitution = ["PRIVE", "PUBLIC"];

  useEffect(() => {
    if (setBreadcrumb)
      setBreadcrumb([{ label: "Administration", path: "/administration" }]);

    fetch(`${API_URL}/institutions`)
      .then((res) => res.json())
      .then((data) => setInstitutions(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [setBreadcrumb]);

  const openModal = (inst = null) => {
    const centerX = window.innerWidth / 2 - 300;
    setModalPos({ top: 50, left: centerX });

    if (inst) {
      setForm({
        id: inst.Institution_id || "",
        nom: inst.Institution_nom || "",
        type: inst.Institution_type || "",
        sigle: inst.Institution_abbreviation || "",
        description: inst.Institution_description || "",
        logo: null,
        logoPath: inst.Institution_logo_path || "",
      });
    } else {
      setForm({
        id: "",
        nom: "",
        type: "",
        sigle: "",
        description: "",
        logo: null,
        logoPath: "",
      });
    }

    setErrors({});
    setEditInstitution(inst);
    setModalOpen(true);
  };

  // Drag modal
  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !modalRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = modalRef.current;
    let left = Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.x));
    let top = Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffset.y));
    setModalPos({ top, left });
  };

  const handleMouseUp = () => setDragging(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.id) newErrors.id = "L'ID est obligatoire.";
    if (!form.nom) newErrors.nom = "Le nom est obligatoire.";
    if (!form.type) newErrors.type = "Le type est obligatoire.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const formData = new FormData();
    Object.entries({
      Institution_id: form.id,
      Institution_nom: form.nom,
      Institution_type: form.type,
      Institution_abbreviation: form.sigle,
      Institution_description: form.description,
    }).forEach(([k, v]) => formData.append(k, v));

    if (form.logo) formData.append("logo_file", form.logo);

    try {
      const res = await fetch(`${API_URL}/institutions`, {
        method: editInstitution ? "PUT" : "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        const errObj = {};
        if (typeof errData.detail === "string") {
          if (errData.detail.includes("ID institution") || errData.detail.includes("Institution_id")) {
            errObj.id = "Cet ID existe déjà.";
          }
          if (errData.detail.includes("nom") || errData.detail.includes("Institution_nom")) {
            errObj.nom = "Ce nom existe déjà.";
          }
        }
        setErrors(errObj);
        return;
      }

      const newInst = await res.json();

      setInstitutions((prev) =>
        editInstitution
          ? prev.map((i) =>
              i.Institution_id === editInstitution.Institution_id ? newInst : i
            )
          : [...prev, newInst]
      );

      setForm({
        id: "",
        nom: "",
        type: "",
        sigle: "",
        description: "",
        logo: null,
        logoPath: "",
      });
      setErrors({});
      setEditInstitution(null);
      setModalOpen(false);
    } catch (err) {
      alert("Erreur serveur : " + err.message);
    }
  };

  const filtered = institutions.filter((inst) =>
    Object.values(inst).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const InstitutionItem = ({ inst, grid = true }) => {
    const handleClick = () =>
      navigate(`/institution/${inst.Institution_id}`);

    const commonClass = "cursor-pointer transition relative";
    const base = grid
      ? "p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:bg-blue-100"
      : "flex items-center gap-4 p-2 bg-white rounded shadow hover:bg-blue-100";

    return (
      <div className={`${commonClass} ${base}`} onClick={handleClick}>
        {inst.Institution_logo_path ? (
          <img
            src={`http://127.0.0.1:8000${inst.Institution_logo_path}`}
            alt="Logo"
            className={grid ? "w-20 h-20 object-cover mb-2 rounded-full" : "w-16 h-16 object-cover rounded-full"}
          />
        ) : (
          <HiOutlineBuildingLibrary className={grid ? "w-20 h-20 text-gray-700" : "w-16 h-16 text-gray-700"} />
        )}
        <div className={grid ? "text-center" : "flex-1"}>
          <p className="text-lg font-semibold">{inst.Institution_nom}</p>
          <p className="text-gray-600 text-sm">{inst.Institution_type}</p>
        </div>
        <FaEdit
          className="absolute top-2 right-2 text-blue-600 hover:text-blue-800 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); openModal(inst); }}
        />
      </div>
    );
  };

  const AddInstitutionButton = ({ grid = true }) => (
    <div
      onClick={() => openModal()}
      className={`cursor-pointer ${
        grid
          ? "p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 text-center"
          : "flex items-center gap-4 p-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
      }`}
    >
      <div className={grid ? "w-20 h-20 flex items-center justify-center rounded-full bg-blue-100" : "w-16 h-16 flex items-center justify-center rounded-full bg-blue-100"}>
        <FaPlus className={grid ? "text-blue-600 text-2xl" : "text-blue-600"} />
      </div>
      <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Liste des institutions</h1>
        <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher une institution"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-1 w-64 focus:outline-none focus:ring focus:border-blue-300"
          />
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} className="btn btn-primary flex items-center gap-2">
            {view === "grid" ? (<><FaList /><span className="hidden sm:inline text-sm">Vue liste</span></>) : (<><FaTh /><span className="hidden sm:inline text-sm">Vue miniatures</span></>)}
          </button>
        </div>
      </div>

      <hr className="border-t border-gray-300 my-1" />

      {/* LISTE / GRID */}
      {filtered.length === 0 ? (
        <div className="flex flex-col gap-3">
          <AddInstitutionButton grid />
          <p className="text-gray-500 mt-2">Aucune institution disponible pour le moment.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AddInstitutionButton grid />
          {filtered.map((inst) => <InstitutionItem key={inst.Institution_id} inst={inst} grid />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AddInstitutionButton grid={false} />
          {filtered.map((inst) => <InstitutionItem key={inst.Institution_id} inst={inst} grid={false} />)}
        </div>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay">
            <motion.div
              ref={modalRef}
              onMouseDown={handleMouseDown}
              className="modal-content"
              style={{ top: modalPos.top, left: modalPos.left, position: "absolute" }}
              initial={{ y: -300, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } }}
              exit={{ y: -300, opacity: 0 }}
            >
              <h2 className="modal-header">{editInstitution ? "Modifier Institution" : "Nouvelle Institution"}</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* LOGO */}
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mb-2 cursor-pointer hover:ring-4 hover:ring-blue-300 transition"
                       onClick={() => fileInputRef.current.click()}>
                    {form.logo ? (
                      <img src={URL.createObjectURL(form.logo)} alt="Logo" className="w-full h-full object-cover"/>
                    ) : form.logoPath ? (
                      <img src={`http://127.0.0.1:8000${form.logoPath}`} alt="Logo" className="w-full h-full object-cover"/>
                    ) : (
                      <FaPlus className="text-gray-400 text-5xl"/>
                    )}
                  </div>
                  <input type="file" accept="image/*" name="logo" ref={fileInputRef} onChange={handleChange} className="hidden"/>
                </div>

                {/* ID */}
                <input type="text" name="id" placeholder="ID" value={form.id} onChange={handleChange} className={`form-input ${errors.id ? "animate-shake border-red-500" : ""}`} disabled={!!editInstitution}/>
                {errors.id && <p className="error-message">{errors.id}</p>}

                {/* Nom */}
                <input type="text" name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} className={`form-input ${errors.nom ? "animate-shake border-red-500" : ""}`}/>
                {errors.nom && <p className="error-message">{errors.nom}</p>}

                {/* Type */}
                <select name="type" value={form.type} onChange={handleChange} className={`form-select ${errors.type ? "animate-shake border-red-500" : ""}`}>
                  <option value="">-- Sélectionner le type --</option>
                  {typesInstitution.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.type && <p className="error-message">{errors.type}</p>}

                {/* Sigle */}
                <input type="text" name="sigle" placeholder="Sigle / Abbréviation" value={form.sigle} onChange={handleChange} className="form-input"/>

                {/* Description */}
                <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="form-textarea"/>

                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Annuler</button>
                  <button type="submit" className="btn btn-primary">{editInstitution ? "Modifier" : "Créer"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Administration;
