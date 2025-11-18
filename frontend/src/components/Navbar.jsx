// src/components/Navbar.jsx
import React from "react";
import { FaBars } from "react-icons/fa";
import { Link } from "react-router-dom";

const Navbar = ({ toggleSidebar, menuTitle = "Tableau de bord", breadcrumb = [] }) => {
  // Si aucun breadcrumb passé, on affiche juste menuTitle
  const breadcrumbToShow =
    breadcrumb && breadcrumb.length > 0
      ? breadcrumb
      : [{ label: menuTitle, path: "#" }];

  return (
    <header className="bg-white shadow p-4 flex items-center justify-between">
      <button
        onClick={toggleSidebar}
        className="text-gray-700 text-xl md:hidden"
      >
        <FaBars />
      </button>

      <div className="flex flex-col">
        {/* Fil d'Ariane */}
        <nav className="text-sm text-gray-500">
          {breadcrumbToShow.map((item, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-1">{">"}</span>}
              {item.path && item.path !== "#" && index !== breadcrumbToShow.length - 1 ? (
                <Link to={item.path} className="hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={index === breadcrumbToShow.length - 1 ? "font-semibold text-gray-800" : ""}>
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-700">Pierre Michel</span>
        <div className="w-8 h-8 bg-gray-300 rounded-full" />
      </div>
    </header>
  );
};

export default Navbar;
