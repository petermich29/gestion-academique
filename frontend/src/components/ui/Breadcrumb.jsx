// src/components/ui/Breadcrumb.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

// Icônes (lettres stylées)
const typeIcons = {
  institution: "I",
  etablissement: "E",
  mention: "M",
  parcours: "P",
  default: "•"
};

export default function Breadcrumb() {
  const { breadcrumb } = useBreadcrumb();

  if (!breadcrumb || breadcrumb.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">

      {breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1;
        const icon = typeIcons[item.type] || typeIcons.default;

        return (
          <div key={index} className="flex items-center">

            {/* Icône */}
            <span className={
              `mr-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold 
              ${isLast ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`
            }>
              {icon}
            </span>

            {/* Label */}
            {isLast ? (
              <span className="font-semibold text-gray-900">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                state={item.state}
                className="hover:text-blue-600 transition"
              >
                {item.label}
              </Link>
            )}

            {/* Séparateur */}
            {!isLast && <span className="mx-2 text-gray-300">/</span>}
          </div>
        );
      })}

    </nav>
  );
}
