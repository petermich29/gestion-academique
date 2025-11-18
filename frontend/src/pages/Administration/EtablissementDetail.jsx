// src/pages/Administration/EtablissementDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useOutletContext, useNavigate } from "react-router-dom";
import { BiSolidInstitution } from "react-icons/bi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000";

const EtablissementDetail = () => {
  const { id, code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};

  const [institution, setInstitution] = useState(null);
  const [etablissement, setEtablissement] = useState(null);

  // 🔹 Liste des établissements de l'institution
  const [etablissementsList, setEtablissementsList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  // 🔹 Libellés pour le header
  const etabLabel = etablissement?.label || etablissement?.nom || etablissement?.intitule;
  const etabAbbrev = etablissement?.abbreviation || etabLabel;

  // 🔹 Charger institution
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/institutions/${id}`)
      .then((res) => res.json())
      .then((data) => setInstitution(data))
      .catch((err) => console.error("Erreur fetch institution:", err));
  }, [id]);

  // 🔹 Charger la liste complète des établissements de l'institution
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/composantes?institution_id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setEtablissementsList(arr);

        // trouver l'index de l'établissement courant
        const idx = arr.findIndex((e) => {
          const eCode = e.code || e.composantes_code || e.id;
          return String(eCode) === String(code);
        });
        setCurrentIndex(idx >= 0 ? idx : null);
      })
      .catch((err) => console.error("Erreur fetch établissements list:", err));
  }, [id, code]);

  // 🔹 Mettre à jour l'établissement à chaque changement de "code" (URL) ou location.state
  useEffect(() => {
    if (location.state?.composante) {
      setEtablissement(location.state.composante);
    } else if (etablissementsList.length > 0) {
      // trouver l'établissement dans la liste
      const found = etablissementsList.find((e) => {
        const eCode = e.code || e.composantes_code || e.id;
        return String(eCode) === String(code);
      });
      setEtablissement(found || null);
    } else {
      // fallback: fetch depuis API si la liste n'est pas encore chargée
      fetch(`${API_BASE_URL}/api/composantes/${code}`)
        .then((res) => res.json())
        .then((data) => setEtablissement(data))
        .catch((err) => console.error("Erreur fetch établissement:", err));
    }
  }, [code, location.state, etablissementsList]);

  // 🔹 Breadcrumb
  useEffect(() => {
    if (institution && etabAbbrev && setBreadcrumb) {
      setBreadcrumb([
        { label: "Administration", path: "/administration" },
        { label: institution.nom, path: `/institution/${id}` },
        { label: etabAbbrev, path: `/institution/${id}/etablissement/${code}` },
      ]);
    }
  }, [institution, etabAbbrev, id, code, setBreadcrumb]);

  // 🔹 Navigation Back / Next entre établissements
  const handlePrevEtablissement = () => {
    if (currentIndex === null || currentIndex <= 0) return;
    const prev = etablissementsList[currentIndex - 1];
    const prevCode = prev.code || prev.composantes_code || prev.id;
    if (prevCode) navigate(`/institution/${id}/etablissement/${prevCode}`);
  };

  const handleNextEtablissement = () => {
    if (currentIndex === null || currentIndex >= etablissementsList.length - 1) return;
    const next = etablissementsList[currentIndex + 1];
    const nextCode = next.code || next.composantes_code || next.id;
    if (nextCode) navigate(`/institution/${id}/etablissement/${nextCode}`);
  };

  const isFirst = currentIndex === 0 || currentIndex === null;
  const isLast = currentIndex === null || currentIndex === etablissementsList.length - 1;

  if (!institution || !etablissement) return <p>Chargement...</p>;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* HEADER DYNAMIQUE */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BiSolidInstitution className="w-16 h-16 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold">
              {etabLabel}
              {etablissement.abbreviation && (
                <span className="ml-2 text-gray-500 text-lg">({etablissement.abbreviation})</span>
              )}
            </h1>
            <p className="text-gray-600 text-sm">
              {institution.nom} — {institution.type_institution}
            </p>
          </div>
        </div>

        {/* Boutons Back / Next */}
        <div className="flex gap-2">
          <button
            onClick={handlePrevEtablissement}
            disabled={isFirst}
            className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
              isFirst
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100 text-gray-700"
            }`}
          >
            <FaChevronLeft />
            <span>Précédent</span>
          </button>
          <button
            onClick={handleNextEtablissement}
            disabled={isLast}
            className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
              isLast
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100 text-gray-700"
            }`}
          >
            <span>Suivant</span>
            <FaChevronRight />
          </button>
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* DETAILS DE L'ETABLISSEMENT */}
      <div className="bg-white rounded shadow p-4 flex flex-col gap-3">
        {etablissement.description && (
          <p className="text-gray-700">{etablissement.description}</p>
        )}
        <p className="text-gray-500 text-sm">
          Code établissement : <span className="font-mono">{code}</span>
        </p>
      </div>
    </div>
  );
};

export default EtablissementDetail;
