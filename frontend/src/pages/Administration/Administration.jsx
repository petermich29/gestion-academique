// frontend/src/pages/Administration/Administration.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FaTh, FaList, FaPlus } from "react-icons/fa";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";

const Administration = () => {
  const [institutions, setInstitutions] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // 'grid' ou 'list'
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  useEffect(() => {
    // Définir le breadcrumb pour la page "Liste des institutions"
    if (setBreadcrumb) {
      setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    }

    fetch("http://127.0.0.1:8000/api/institutions")
      .then((res) => res.json())
      .then((data) => {
        console.log("Institutions fetched:", data);
        setInstitutions(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(err));
  }, [setBreadcrumb]);

  // Fonction pour récupérer un champ de manière safe
  const getField = (obj, field1, field2) => obj[field1] || obj[field2] || "";

  const handleClick = (inst) => {
    const id = getField(inst, "id_institution", "institutions_id_institution");
    navigate(`/institution/${id}`);
  };

  // 🔹 Carte spéciale : ajout d'une nouvelle institution
  const handleAddInstitution = () => {
    console.log("Ajouter une nouvelle institution");
    // Plus tard : navigate("/administration/institution/nouvelle") ou ouvrir un modal
    // navigate("/administration/institution/nouvelle");
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
    <div className="flex flex-col gap-6 p-4">
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
                <span className="hidden sm:inline text-sm">
                  Vue miniatures
                </span>
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
          {/* Même si aucune institution : carte d'ajout */}
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition"
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-700">
                Ajouter une institution
              </p>
              <p className="text-sm text-blue-600">
                Créer une nouvelle institution dans le système.
              </p>
            </div>
          </div>

          <p className="text-gray-500 mt-2">
            Aucune institution disponible pour le moment.
          </p>
        </div>
      ) : view === "grid" ? (
        // 🌟 VUE GRID : carte d'ajout + cartes institutions
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* 1️⃣ Carte “Ajouter une institution” */}
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 transition text-center"
          >
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600 text-2xl" />
            </div>
            <p className="text-lg font-semibold text-blue-700">
              Ajouter une institution
            </p>
            <p className="text-xs text-blue-600">
              Créer une nouvelle institution.
            </p>
          </div>

          {/* 2️⃣ Institutions existantes */}
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
        // 🌟 VUE LISTE : ligne d'ajout + lignes institutions
        <div className="flex flex-col gap-2">
          {/* 1️⃣ Ligne “Ajouter une institution” */}
          <div
            onClick={handleAddInstitution}
            className="cursor-pointer flex items-center gap-4 p-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 transition"
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
              <FaPlus className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-700">
                Ajouter une institution
              </p>
              <p className="text-sm text-blue-600">
                Créer une nouvelle institution dans le système.
              </p>
            </div>
          </div>

          {/* 2️⃣ Lignes institutions */}
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
    </div>
  );
};

export default Administration;
