// frontend/src/components/ui/CardItem.jsx
import React from "react";
import { motion } from "framer-motion";
import { EditIcon, TrashIcon } from "./Icons"; // Assurez-vous que ces imports sont corrects selon votre projet
import { AppStyles } from "./AppStyles";

export const CardItem = ({
  viewMode = "grid",
  title,
  subTitle,
  imageSrc,
  PlaceholderIcon,
  onEdit,
  onDelete,
  onClick,
  children, // 🟢 AJOUT : Permet d'insérer la liste des parcours
}) => {
  const isGrid = viewMode === "grid";

  return (
    <motion.div
      {...AppStyles.animation.itemProps}
      className={isGrid ? AppStyles.item.grid : AppStyles.item.list}
      onClick={onClick}
    >
      {/* Image / Icône */}
      <div
        className={`flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50 ${
          isGrid ? "w-20 h-20 mb-2" : "w-10 h-10"
        }`}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
        ) : (
          <PlaceholderIcon className={isGrid ? "w-8 h-8 text-gray-400" : "w-5 h-5 text-gray-400"} />
        )}
      </div>

      {/* Contenu Texte */}
      <div className={isGrid ? "text-center w-full px-2" : "flex-1 min-w-0"}>
        <p className={isGrid ? AppStyles.item.titleGrid : AppStyles.item.titleList}>
          {title}
        </p>
        
        {/* Affichage du sous-titre (ex: Code Mention) */}
        {subTitle && <p className={AppStyles.item.subtext}>{subTitle}</p>}

        {/* 🟢 Affichage du contenu personnalisé (Liste des parcours) */}
        {children && <div className="mt-2 text-left w-full">{children}</div>}
      </div>

      {/* Boutons Actions (Hover) */}
      <div
        className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 ${
          isGrid ? "top-2 right-2 bg-white/90 p-1 rounded shadow-sm" : "right-3"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Modifier"
        >
          <EditIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Supprimer"
        >
          <TrashIcon />
        </button>
      </div>
    </motion.div>
  );
};