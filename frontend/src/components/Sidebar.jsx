// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
// Icônes
import { FaTachometerAlt, FaUniversity, FaUsers, FaFileAlt } from "react-icons/fa";
import { MdAppRegistration, MdSettings } from "react-icons/md";
import { BiCategory } from "react-icons/bi";
import { SiDatabricks } from "react-icons/si"; 

// 1. IMPORT DU CONTEXTE BREADCRUMB
import { useBreadcrumb } from "../context/BreadcrumbContext"; 

const Sidebar = ({ isOpen = true, toggle, onMenuChange }) => {
  const location = useLocation();
  
  // 2. RÉCUPÉRATION DU SETTER
  const { setBreadcrumb } = useBreadcrumb(); 

  const menuItems = [
    { path: "/", label: "Tableau de bord", icon: <FaTachometerAlt className="text-lg" /> },
    { path: "/administration", label: "Administration", icon: <FaUniversity className="text-lg" /> },
    { path: "/ressources-humaines", label: "Ressources Humaines", icon: <FaUsers className="text-lg" /> },
    { path: "/inscriptions", label: "Inscriptions", icon: <MdAppRegistration className="text-xl" /> },
    { path: "/notes", label: "Notes", icon: <FaFileAlt className="text-lg" /> },
    { path: "/services", label: "Services", icon: <BiCategory className="text-xl" /> },
    { path: "/metadonnees", label: "Métadonnées", icon: <SiDatabricks className="text-xl" /> },
    { path: "/parametres", label: "Paramètres", icon: <MdSettings className="text-xl" /> },
  ];

  // 3. LOGIQUE MISE À JOUR LORS DU CLIC
  const handleClick = (item) => {
    // Mise à jour du titre (Header)
    if (onMenuChange) {
      onMenuChange(item.label);
    }

    // Mise à jour du Breadcrumb (Réinitialisation à la racine)
    setBreadcrumb([
      { label: item.label, path: item.path }
    ]);

    // Fermeture du menu sur mobile
    if (toggle) toggle();
  };

  return (
    <>
      {/* Overlay sombre sur mobile quand le menu est ouvert */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed z-40 inset-y-0 left-0
          transform transition-transform duration-200 ease-in-out
          bg-gray-900 text-white w-64 p-4
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Menu</h2>

          {/* Bouton fermer sur mobile */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={toggle}
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                // 4. PASSAGE DE L'OBJET ITEM ENTIER
                onClick={() => handleClick(item)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-gray-800 border-l-4 border-blue-400"
                      : "hover:bg-gray-700"
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;