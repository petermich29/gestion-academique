// src/components/Navbar.jsx
import React from "react";
import { FaBars } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useBreadcrumb } from "../context/BreadcrumbContext";

// Icônes SVG premium (monochrome, modernes)
const icons = {
  institution: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L3 9L12 15L21 9L12 3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 17L12 23L21 17" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9V17" stroke="currentColor" strokeWidth="2" />
      <path d="M21 9V17" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  etablissement: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 21V7L12 3L21 7V21H3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  mention: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L19 21L12 17L5 21L12 3Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  parcours: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4V20" stroke="currentColor" strokeWidth="2" />
      <path d="M15 10H20" stroke="currentColor" strokeWidth="2" />
      <path d="M15 14H20" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  default: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
};

const Navbar = ({ toggleSidebar, menuTitle = "Tableau de bord" }) => {
  const { breadcrumb } = useBreadcrumb();

  // Si rien comme breadcrumb → fallback au menuTitle
  const breadcrumbToShow =
    breadcrumb && breadcrumb.length > 0
      ? breadcrumb
      : [{ label: menuTitle, path: "#", type: "default" }];

  return (
    <header className="bg-white shadow-sm px-5 py-4 flex items-center justify-between border-b border-gray-200">
      
      {/* Icône menu (mobile) */}
      <button
        onClick={toggleSidebar}
        className="text-gray-700 text-xl md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <FaBars />
      </button>

      {/* Breadcrumb Premium */}
      <div className="flex flex-col">
        <nav className="flex items-center gap-3 text-sm">

          {breadcrumbToShow.map((item, index) => {
            const isLast = index === breadcrumbToShow.length - 1;

            return (
              <div key={index} className="flex items-center gap-2">

                {/* Badge cliquable ou non */}
                {!isLast ? (
                  <Link
                    to={item.path}
                    state={item.state}
                    className={`
                      flex items-center gap-1
                      px-2 py-1 rounded-full border shadow-sm text-xs font-medium
                      bg-gray-50 border-gray-200 text-gray-700
                      hover:bg-gray-100 transition
                    `}
                  >
                    {icons[item.type] || icons.default}
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={`
                      flex items-center gap-1
                      px-2 py-1 rounded-full border shadow-sm text-xs font-medium
                      bg-blue-600 border-blue-700 text-white
                    `}
                  >
                    {icons[item.type] || icons.default}
                    <span className="font-semibold text-white">{item.label}</span>
                  </span>
                )}

                {/* Séparateur premium */}
                {!isLast && (
                  <svg width="12" height="12" viewBox="0 0 24 24" className="text-gray-400">
                    <path d="M8 4L16 12L8 20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}

              </div>
            );
          })}

        </nav>
      </div>

      {/* Profil utilisateur (placeholder) */}
      <div className="flex items-center gap-4">
        <span className="text-gray-700">Pierre Michel</span>
        <div className="w-9 h-9 bg-gray-300 rounded-full border border-gray-400" />
      </div>

    </header>
  );
};

export default Navbar;
