// frontend/src/router/AppRouter.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "../components/Layout";

import Dashboard from "../pages/dashboard/Dashboard";

// Administration
import Administration from "../pages/Administration/Administration";
import InstitutionDetail from "../pages/Administration/InstitutionDetail";
import EtablissementDetail from "../pages/Administration/EtablissementDetail";
import Mention from "../pages/administration/Mention";
import Parcours from "../pages/administration/Parcours";
import UE from "../pages/administration/UE";
import EC from "../pages/administration/EC";
import Sessions from "../pages/administration/Sessions.jsx";
import Affectation from "../pages/administration/Affectation";
import Nomination from "../pages/administration/Nomination";

// Ressources humaines
import Enseignants from "../pages/ressources/Enseignants";
import Etudiants from "../pages/ressources/Etudiants";

// Inscriptions
import Inscriptions from "../pages/inscriptions/Inscriptions";

// Notes
import NotesAjout from "../pages/notes/NotesAjout";
import NotesModification from "../pages/notes/NotesModification";

// Services
import Resultats from "../pages/services/Resultats";
import Releves from "../pages/services/Releves";

// Métadonnées
import Institutions from "../pages/metas/Institutions";
import Composante from "../pages/metas/Composante";
import Domaine from "../pages/metas/Domaine";
import TypeInscription from "../pages/metas/TypeInscription";
import ModeInscription from "../pages/metas/ModeInscription";
import AnneeUniversitaire from "../pages/metas/AnneeUniversitaire";
import TypeEnseignement from "../pages/metas/TypeEnseignement";
import ModeEnseignement from "../pages/metas/ModeEnseignement";

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
        <Route
          path="/institution/:id/etablissement/:code"
          element={<EtablissementDetail />}
        />
        <Route path="/mention" element={<Mention />} />
        <Route path="/parcours" element={<Parcours />} />
        <Route path="/ue" element={<UE />} />
        <Route path="/ec" element={<EC />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/affectation" element={<Affectation />} />
        <Route path="/nomination" element={<Nomination />} />

        {/* Ressources humaines */}
        <Route path="/enseignants" element={<Enseignants />} />
        <Route path="/etudiants" element={<Etudiants />} />

        {/* Inscriptions */}
        <Route path="/inscriptions" element={<Inscriptions />} />

        {/* Notes */}
        <Route path="/notes-ajout" element={<NotesAjout />} />
        <Route path="/notes-modification" element={<NotesModification />} />

        {/* Services */}
        <Route path="/resultats" element={<Resultats />} />
        <Route path="/releves" element={<Releves />} />

        {/* Métadonnées */}
        <Route path="/institutions" element={<Institutions />} />
        <Route path="/composante" element={<Composante />} />
        <Route path="/domaine" element={<Domaine />} />
        <Route path="/type-inscription" element={<TypeInscription />} />
        <Route path="/mode-inscription" element={<ModeInscription />} />
        <Route path="/annee-universitaire" element={<AnneeUniversitaire />} />
        <Route path="/type-enseignement" element={<TypeEnseignement />} />
        <Route path="/mode-enseignement" element={<ModeEnseignement />} />

        {/* Paramètres */}
        <Route path="/parametres" element={<Parametres />} />
      </Route>
    </Routes>
  </Router>
);

export default AppRouter;
