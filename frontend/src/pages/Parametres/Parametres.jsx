import React, { useEffect, useState } from "react";
import { AppStyles } from "../../components/ui/AppStyles";

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
    <div className={AppStyles.pageContainer}>
      
      {/* HEADER AVEC STYLE HARMONISÉ ET STICKY */}
      <div className={`${AppStyles.header.container} sticky top-0 z-30 bg-gray-50 pb-4 pt-2`}>
        <h2 className={AppStyles.mainTitle}>Paramètres</h2>
      </div>
      <hr className={AppStyles.separator} />

      <div className="space-y-6">
        <p className="text-gray-600">
            Personnalisez le comportement visuel de l'application.
        </p>

        {/* Paramètre animation header Institution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
            <h2 className="font-semibold text-lg text-gray-800">Transition des entêtes d’institution</h2>
            <p className="text-sm text-gray-500">
            Animation utilisée lors de l’affichage d’une institution (page InstitutionDetail).
            </p>

            <select
            value={headerAnimation}
            onChange={handleHeaderChange}
            className={`${AppStyles.input.formControl} w-full md:w-64`}
            >
            <option value="fade">Fondu (fade)</option>
            <option value="slide">Glissement (slide)</option>
            </select>
        </div>

        {/* Paramètre animation Etablissement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
            <h2 className="font-semibold text-lg text-gray-800">Transition des établissements</h2>
            <p className="text-sm text-gray-500">
            Animation utilisée lors du changement d’établissement (boutons Précédent / Suivant).
            </p>

            <select
            value={etabAnimation}
            onChange={handleEtabChange}
            className={`${AppStyles.input.formControl} w-full md:w-64`}
            >
            <option value="fade">Fondu (fade)</option>
            <option value="slide">Glissement (slide)</option>
            </select>
        </div>
      </div>
    </div>
  );
};

export default Parametres;