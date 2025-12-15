// frontend/src/router/AppRouter.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { AdministrationProvider } from "../context/AdministrationContext"; // Importer le provider
import Layout from "../components/Layout";

import Dashboard from "../pages/dashboard/Dashboard";


// Administration
import Administration from "../pages/Administration/Administration";
import InstitutionDetail from "../pages/Administration/InstitutionDetail";
import EtablissementDetail from "../pages/Administration/EtablissementDetail";
import MentionDetail from "../pages/Administration/MentionDetail";
import ParcoursDetail from "../pages/Administration/ParcoursDetail"; // <--- Import

// Etudiants et Inscriptions
import EtudiantsInscriptions from "../pages/Etudiants-Inscriptions/EtudiantsInscriptions";

// Enseignants Attributions
import EnseingnantsAttributions from "../pages/Enseignants-Attributions/EnseignantsAttributions";

// Notes

// Services

// Métadonnées
import Metadonnees from "../pages/Metas/Metadonnees";

import Parametres from "../pages/Parametres/Parametres";

const AppRouter = () => (
  <Router>
    <Routes>

      {/* Layout entoure tout */}
      <Route element={<Layout />}>

        {/* Tableau de bord */}
        <Route path="/" element={<Dashboard />} />

        {/* Administration (LE CONTEXTE NE DOIT PAS CASSER LE CONTEXT DU LAYOUT) */}
        <Route
          element={
            <AdministrationProvider>
              <Outlet /> 
            </AdministrationProvider>
          }
        >
          <Route path="/administration" element={<Administration />} />
          <Route path="/institution/:id" element={<InstitutionDetail />} />
          <Route path="/institution/:id/etablissement/:etablissementId" element={<EtablissementDetail />} />
          <Route path="/institution/:id/etablissement/:etablissementId/mention/:mentionId" element={<MentionDetail />} />
          <Route path="/institution/:id/etablissement/:etablissementId/mention/:mentionId/parcours/:parcoursId" element={<ParcoursDetail />} />
        </Route>

        {/* Etudiants et inscriptions */}
        <Route path="/etudiants-inscriptions" element={<EtudiantsInscriptions />} />

        {/* Enseignants et attriutions */}
        <Route path="/enseignants-attributions" element={<EnseingnantsAttributions />} />

        {/* Métadonnées */}
        <Route path="/metadonnees" element={<Metadonnees />} />

        {/* Paramètres */}
        <Route path="/parametres" element={<Parametres />} />

      </Route>
    </Routes>
  </Router>
);


export default AppRouter;
