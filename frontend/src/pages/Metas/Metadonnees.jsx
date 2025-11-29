import React, { useState } from "react";
// Suppression de PageWrapper
import { AppStyles } from "../../components/ui/AppStyles"; // Import AppStyles

import Domaines from "./Domaines";
import TypesFormation from "./TypesFormation";
import ModesInscription from "./ModesInscription";
import AnneesUniversitaires from "./AnneesUniversitaires";
import TypesEnseignement from "./TypesEnseignement";

export default function Metadonnees() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "Domaines des Mentions", component: <Domaines /> },
    { label: "Types de Formation", component: <TypesFormation /> },
    { label: "Modes d'inscription", component: <ModesInscription /> },
    { label: "Années universitaires", component: <AnneesUniversitaires /> },
    { label: "Types d’enseignement", component: <TypesEnseignement /> },
  ];

  return (
    <div className={AppStyles.pageContainer}>
      
      {/* HEADER STANDARDISÉ */}
      <div className={AppStyles.header.container}>
         <h2 className={AppStyles.mainTitle}>Gestion des Métadonnées Académiques</h2>
      </div>
      <hr className={AppStyles.separator} />

      {/* Navigation des Onglets */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 
              ${activeTab === i 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu interne */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
         {tabs[activeTab].component}
      </div>
    </div>
  );
}