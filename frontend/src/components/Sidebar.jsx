// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

// Icônes
import { FaTachometerAlt, FaUniversity, FaUsers, FaChalkboardTeacher, FaFileAlt, FaUserShield } from "react-icons/fa";
import { MdAppRegistration, MdSettings } from "react-icons/md";
import { BiCategory } from "react-icons/bi";
import { SiDatabricks } from "react-icons/si";

// Breadcrumb
import { useBreadcrumb } from "../context/BreadcrumbContext";

import { useAuth } from "../context/AuthContext"; // Import context

const Sidebar = ({ isOpen = true, toggle, onMenuChange }) => {
  const location = useLocation();
  const { setBreadcrumb } = useBreadcrumb();

  const { user } = useAuth();

  const menuItems = [
    {
      path: "/",
      label: "Tableau de bord - Statistiques",
      icon: <FaTachometerAlt className="text-lg" />,
    },
    {
      path: "/administration",
      label: "Administration",
      icon: <FaUniversity className="text-lg" />,
    },
    {
      path: "/etudiants-inscriptions",
      label: "Étudiants & Inscriptions",
      icon: <MdAppRegistration className="text-xl" />,
    },
    {
      path: "/enseignants-attributions",
      label: "Enseignants & Attributions",
      icon: <FaChalkboardTeacher className="text-lg" />,
    },
    {
      path: "/gestion-notes",
      label: "Gestion des notes",
      icon: <FaFileAlt className="text-lg" />,
    },
    {
      path: "/services",
      label: "Services",
      icon: <BiCategory className="text-xl" />,
    },
    {
      path: "/metadonnees",
      label: "Métadonnées",
      icon: <SiDatabricks className="text-xl" />,
    },
    {
      path: "/parametres",
      label: "Paramètres",
      icon: <MdSettings className="text-xl" />,
    },
  ];

  if (user && user.role === 'SUPER_ADMIN') {
    menuItems.push({
        path: "/gestion-utilisateurs",
        label: "Gestion Utilisateurs",
        icon: <FaUserShield className="text-xl" />
    });
  }

  const handleClick = (item) => {
    if (onMenuChange) {
      onMenuChange(item.label);
    }

    setBreadcrumb([
      { label: item.label, path: item.path }
    ]);

    if (toggle) toggle();
  };

  return (
    <>
      {/* Overlay mobile */}
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
