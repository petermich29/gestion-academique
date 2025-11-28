import React, { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

const Parametres = () => {
  const [headerAnimation, setHeaderAnimation] = useState("fade");
  const [etabAnimation, setEtabAnimation] = useState("fade");

  // Charger les valeurs sauvegardées
  useEffect(() => {
    const savedHeader = localStorage.getItem("headerAnimation") || "fade";
    const savedEtab = localStorage.getItem("etabAnimation") || "fade";
    setHeaderAnimation(savedHeader);
    setEtabAnimation(savedEtab);
  }, []);

  const handleHeaderChange = (e) => {
    const value = e.target.value;
    setHeaderAnimation(value);
    localStorage.setItem("headerAnimation", value);
  };

  const handleEtabChange = (e) => {
    const value = e.target.value;
    setEtabAnimation(value);
    localStorage.setItem("etabAnimation", value);
  };

  return (
    <PageWrapper title="Paramètres">
      <p className="text-gray-600 mb-4">
        Personnalisez le comportement visuel de l'application.
      </p>

      {/* Paramètre animation header Institution */}
      <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
        <h2 className="font-semibold text-lg">Transition des entêtes d’institution</h2>
        <p className="text-sm text-gray-600">
          Animation utilisée lors de l’affichage d’une institution (page InstitutionDetail).
        </p>

        <select
          value={headerAnimation}
          onChange={handleHeaderChange}
          className="mt-2 border rounded px-3 py-2 w-60 focus:outline-none focus:ring focus:border-blue-300"
        >
          <option value="fade">Fondu (fade)</option>
          <option value="slide">Glissement (slide)</option>
        </select>
      </div>

      {/* Paramètre animation Etablissement */}
      <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
        <h2 className="font-semibold text-lg">Transition des établissements</h2>
        <p className="text-sm text-gray-600">
          Animation utilisée lors du changement d’établissement (boutons Précédent / Suivant).
        </p>

        <select
          value={etabAnimation}
          onChange={handleEtabChange}
          className="mt-2 border rounded px-3 py-2 w-60 focus:outline-none focus:ring focus:border-blue-300"
        >
          <option value="fade">Fondu (fade)</option>
          <option value="slide">Glissement (slide)</option>
        </select>
      </div>
    </PageWrapper>
  );
};

export default Parametres;
