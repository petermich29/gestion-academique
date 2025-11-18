// frontend/src/pages/Administration/Administration.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FaTh, FaList, FaPlus } from "react-icons/fa";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";

const Administration = () => {
  const [institutions, setInstitutions] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nom: "",
    type: "",
    sigle: "",
    description: "",
    logo: null,
  });

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 50, left: 0 });

  useEffect(() => {
    if (setBreadcrumb) {
      setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    }

    fetch("http://127.0.0.1:8000/api/institutions")
      .then((res) => res.json())
      .then((data) => setInstitutions(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [setBreadcrumb]);

  const getField = (obj, field1, field2) => obj[field1] || obj[field2] || "";

  const handleClick = (inst) => {
    const id = getField(inst, "id_institution", "institutions_id_institution");
    navigate(`/institution/${id}`);
  };

  const handleAddInstitution = () => {
    const centerX = window.innerWidth / 2 - 300; // modal width approx 600px
    setModalPos({ top: 50, left: centerX });
    setModalOpen(true);
  };

  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !modalRef.current) return;

    // Limite pour ne pas sortir de l'écran
    const width = modalRef.current.offsetWidth;
    const height = modalRef.current.offsetHeight;
    let newLeft = e.clientX - dragOffset.x;
    let newTop = e.clientY - dragOffset.y;

    newLeft = Math.max(0, Math.min(window.innerWidth - width, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - height, newTop));

    setModalPos({ top: newTop, left: newLeft });
  };

  const handleMouseUp = () => setDragging(false);

  const handleChange = (e) => {
    const { name, files, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Nouveau formulaire institution:", form);
    setModalOpen(false);
    setForm({ id: "", nom: "", type: "", sigle: "", description: "", logo: null });
  };

  const filtered = institutions
    .filter((inst) =>
      Object.values(inst)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const valA = getField(a, sortField, "institutions_" + sortField)
        .toString()
        .toLowerCase();
      const valB = getField(b, sortField, "institutions_" + sortField)
        .toString()
        .toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div
      className="flex flex-col gap-6 p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Header avec recherche, vue et tri */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Liste des institutions</h1>
        <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher une institution"
            className="border rounded px-3 py-1 w-64 focus:outline-none focus:ring focus:border-blue-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className="p-2 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center gap-2"
            title="Changer la vue"
          >
            {view === "grid" ? (
              <>
                <FaList />
                <span className="hidden sm:inline text-sm">Vue liste</span>
              </>
            ) : (
              <>
                <FaTh />
                <span className="hidden sm:inline text-sm">Vue miniatures</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-2 border rounded px-3 py-1 bg-white">
            <span className="font-semibold">Tri :</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border rounded px-2 py-1 focus:outline-none"
            >
              <option value="nom">Nom</option>
              <option value="type_institution">Type</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border rounded px-2 py-1 focus:outline-none"
            >
              <option value="asc">Ascendant</option>
              <option value="desc">Descendant</option>
            </select>
          </div>
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* Liste ou grid des institutions */}
      {filtered.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition"
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
              <p className="text-sm text-blue-600">
                Créer une nouvelle institution dans le système.
              </p>
            </div>
          </div>
          <p className="text-gray-500 mt-2">Aucune institution disponible pour le moment.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 transition text-center"
          >
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600 text-2xl" />
            </div>
            <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
            <p className="text-xs text-blue-600">Créer une nouvelle institution.</p>
          </div>
          {filtered.map((inst) => (
            <div
              key={getField(inst, "id_institution", "institutions_id_institution")}
              onClick={() => handleClick(inst)}
              className="cursor-pointer p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:bg-blue-100 transition"
            >
              <HiOutlineBuildingLibrary className="w-20 h-20 text-gray-700" />
              <p className="text-lg font-semibold text-center">
                {getField(inst, "nom", "institutions_nom")}
              </p>
              <p className="text-gray-600 text-sm text-center">
                {getField(inst, "type_institution", "institutions_type_institution")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer flex items-center gap-4 p-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition"
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
              <p className="text-sm text-blue-600">Créer une nouvelle institution dans le système.</p>
            </div>
          </div>
          {filtered.map((inst) => (
            <div
              key={getField(inst, "id_institution", "institutions_id_institution")}
              onClick={() => handleClick(inst)}
              className="cursor-pointer flex items-center gap-4 p-2 bg-white rounded shadow hover:bg-blue-100 transition"
            >
              <HiOutlineBuildingLibrary className="w-16 h-16 text-gray-700" />
              <div>
                <p className="text-lg font-semibold">
                  {getField(inst, "nom", "institutions_nom")}
                </p>
                <p className="text-gray-600 text-sm">
                  {getField(inst, "type_institution", "institutions_type_institution")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4"
          >
            <motion.div
              ref={modalRef}
              onMouseDown={handleMouseDown}
              className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative cursor-move"
              style={{
                top: modalPos.top,
                left: modalPos.left,
                position: "absolute",
              }}
              initial={{ y: -300, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } }}
              exit={{ y: -300, opacity: 0 }}
            >
              <h2 className="text-xl font-bold mb-4 text-center">Nouvelle Institution</h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Logo cliquable */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mb-2 cursor-pointer hover:ring-4 hover:ring-blue-300 transition"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {form.logo ? (
                      <img
                        src={URL.createObjectURL(form.logo)}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaPlus className="text-gray-400 text-5xl" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    name="logo"
                    ref={fileInputRef}
                    onChange={handleChange}
                    className="hidden"
                  />
                </div>

                <input
                  type="text"
                  name="id"
                  placeholder="ID"
                  value={form.id}
                  onChange={handleChange}
                  className="border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
                />
                <input
                  type="text"
                  name="nom"
                  placeholder="Nom"
                  value={form.nom}
                  onChange={handleChange}
                  className="border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
                />
                <input
                  type="text"
                  name="type"
                  placeholder="Type"
                  value={form.type}
                  onChange={handleChange}
                  className="border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
                />
                <input
                  type="text"
                  name="sigle"
                  placeholder="Sigle / Abbréviation"
                  value={form.sigle}
                  onChange={handleChange}
                  className="border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                  className="border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
                />

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    Créer
                  </button>
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
