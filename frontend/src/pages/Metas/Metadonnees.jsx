import React, { useState } from "react";
import PageWrapper from "../../components/PageWrapper";

import Domaines from "./Domaines";
import TypesFormation from "./TypesFormation";
import ModesInscription from "./ModesInscription";
import AnneesUniversitaires from "./AnneesUniversitaires";
import TypesEnseignement from "./TypesEnseignement";

export default function Metadonnees() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "Domaines des Mentions", component: <Domaines /> },
    { label: "Types de Formation des Parcours", component: <TypesFormation /> },
    { label: "Modes d'inscription des Etudiants", component: <ModesInscription /> },
    { label: "Années universitaires", component: <AnneesUniversitaires /> },
    { label: "Types d’enseignement des EC", component: <TypesEnseignement /> },
  ];

  return (
    <PageWrapper title="Gestion des Métadonnées Académiques">
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium
              ${activeTab === i ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu interne */}
      {tabs[activeTab].component}
    </PageWrapper>
  );
}
