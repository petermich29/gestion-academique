// frontend/src/router/AppRouter.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";

// --- CONTEXTES ---
import { AdministrationProvider } from "../context/AdministrationContext";
import { AuthProvider, useAuth } from "../context/AuthContext"; // Assurez-vous que le chemin est bon

// --- COMPOSANTS & PAGES ---
import Layout from "../components/Layout";
import Login from "../pages/Login/Login"; // Assurez-vous d'avoir créé ce fichier
import Dashboard from "../pages/dashboard/Dashboard";

// Administration
import Administration from "../pages/Administration/Administration";
import InstitutionDetail from "../pages/Administration/InstitutionDetail";
import EtablissementDetail from "../pages/Administration/EtablissementDetail";
import MentionDetail from "../pages/Administration/MentionDetail";
import ParcoursDetail from "../pages/Administration/ParcoursDetail";

// Gestion Utilisateurs (Nouveau)
import UserManagement from "../pages/Users/UserManagement";

// Autres pages...
import EtudiantsInscriptions from "../pages/Etudiants-Inscriptions/EtudiantsInscriptions";
import EnseingnantsAttributions from "../pages/Enseignants-Attributions/EnseignantsAttributions";
import GestionNotes from "../pages/GestionNotes/GestionNotes";
import Metadonnees from "../pages/Metas/Metadonnees";
import Parametres from "../pages/Parametres/Parametres";

// --- COMPOSANT DE PROTECTION ---
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Chargement de la session...</div>;
  
  // Si pas d'utilisateur, redirection vers Login
  if (!user) return <Navigate to="/login" replace />;

  // Si connecté, on affiche le contenu (Outlet)
  return <Outlet />;
};

// --- ROUTER PRINCIPAL ---
const AppRouter = () => (
  <Router>
    {/* AuthProvider englobe tout pour que useAuth soit accessible partout */}
    <AuthProvider>
      <Routes>
        
        {/* Route Publique : Login (Pas de Layout Sidebar/Navbar) */}
        <Route path="/login" element={<Login />} />

        {/* Routes Protégées (Nécessitent une connexion) */}
        <Route element={<ProtectedRoute />}>
          
          {/* Layout englobe les pages protégées */}
          <Route element={<Layout />}>
            
            {/* Tableau de bord */}
            <Route path="/" element={<Dashboard />} />

            {/* --- GESTION DES UTILISATEURS (ADMIN SEULEMENT) --- */}
            <Route path="/gestion-utilisateurs" element={<UserManagement />} />

            {/* --- ADMINISTRATION --- */}
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

            {/* --- AUTRES MODULES --- */}
            <Route path="/etudiants-inscriptions" element={<EtudiantsInscriptions />} />
            <Route path="/enseignants-attributions" element={<EnseingnantsAttributions />} />
            <Route path="/gestion-notes" element={<GestionNotes />} />
            <Route path="/metadonnees" element={<Metadonnees />} />
            <Route path="/parametres" element={<Parametres />} />

          </Route> {/* Fin Layout */}
        </Route> {/* Fin ProtectedRoute */}

        {/* Redirection par défaut (si URL inconnue) */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </AuthProvider>
  </Router>
);

export default AppRouter;