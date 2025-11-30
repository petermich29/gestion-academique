// frontend/src/router/AppRouter.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "../components/Layout";

import Dashboard from "../pages/dashboard/Dashboard";

// Administration
import Administration from "../pages/Administration/Administration";
import InstitutionDetail from "../pages/Administration/InstitutionDetail";
import EtablissementDetail from "../pages/Administration/EtablissementDetail";
import MentionDetail from "../pages/Administration/MentionDetail";
import ParcoursDetail from "../pages/Administration/ParcoursDetail"; // <--- Import

// Ressources humaines

// Inscriptions

// Notes

// Services

// Métadonnées
import Metadonnees from "../pages/Metas/Metadonnees";

import Parametres from "../pages/Parametres/Parametres";

const AppRouter = () => (
  <Router>
    <Routes>
      {/* Route parente : Layout entoure tout */}
      <Route element={<Layout />}>
        {/* Tableau de bord */}
        <Route path="/" element={<Dashboard />} />

        {/* Administration */}
        <Route path="/administration" element={<Administration />} />
        <Route path="/institution/:id" element={<InstitutionDetail />} />
        <Route path="/institution/:id/etablissement/:etablissementId" element={<EtablissementDetail />} />
        <Route path="/institution/:id/etablissement/:etablissementId/mention/:mentionId" element={<MentionDetail />} /> {/* <--- Route pour le détail de la mention */}
        <Route path="/institution/:id/etablissement/:etablissementId/mention/:mentionId/parcours/:parcoursId" element={<ParcoursDetail />} /> {/* <--- Route pour le détail du parcours */}
      
        {/* Ressources humaines */}


        {/* Inscriptions */}


        {/* Notes */}


        {/* Services */}


        {/* Métadonnées */}
        <Route path="/metadonnees" element={<Metadonnees />} />

        {/* Paramètres */}
        <Route path="/parametres" element={<Parametres />} />
      </Route>
    </Routes>
  </Router>
);

export default AppRouter;
