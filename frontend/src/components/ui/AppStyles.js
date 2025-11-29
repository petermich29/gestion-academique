// src/components/ui/AppStyles.js

export const AppStyles = {
  // Conteneurs et Layouts
  pageContainer: "flex flex-col gap-4 p-4 relative min-h-screen bg-gray-50", 

  // NOUVEAU STYLE DE TITRE EMBELLI
  // Utilisation de tracking-tight, text-gray-900, et underline pour un effet plus marqué
  mainTitle: "text-4xl font-extrabold text-gray-900 tracking-tight", 
  
  // NOUVEAU SÉPARATEUR PLUS ÉPAIS ET MIEUX STYLISÉ
  separator: "mt-1 mb-6 border-t-2 border-blue-600 w-1/4 max-w-sm", // Ligne bleue plus courte et plus épaisse

  // Grille standardisée (Max 4 colonnes sur grands écrans)
  gridContainer: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
  
  header: {
    container: "flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-3",
    title: "text-xl font-bold text-gray-800", // Sous-titre (ex: "Institutions (4)")
    controls: "flex flex-col md:flex-row items-center gap-2 flex-wrap",
  },
  
  // Inputs et Formulaires
  input: {
    text: "border border-gray-300 rounded px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow",
    formControl: "px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full transition-shadow",
    formControlDisabled: "px-3 py-2 border border-gray-200 rounded bg-gray-100 text-gray-500 text-sm w-full cursor-not-allowed",
    errorText: "text-red-500 text-xs mt-1",
    label: "block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1",
  },

  // Boutons
  button: {
    primary: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center gap-2 shadow-sm transition-colors",
    secondary: "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors",
    icon: "p-2 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm text-lg",
    danger: "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium shadow-sm transition-colors",
  },

  // Cartes (Grid) et Listes (List)
  item: {
    // GRID : Carte haute avec contenu centré
    grid: "p-5 bg-white rounded-xl border border-gray-100 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-blue-200 duration-200 min-h-[220px] cursor-pointer relative group transition-all",
    
    // LIST : Compacte
    list: "flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 duration-200 cursor-pointer relative group transition-all",
    
    imgGrid: "w-24 h-24 object-contain mb-2 rounded-full bg-gray-50 p-2 border border-gray-100",
    imgList: "w-10 h-10 object-contain rounded-full bg-gray-50 p-1 border border-gray-100 flex-shrink-0",
    
    titleGrid: "font-bold text-gray-800 text-center text-base line-clamp-2",
    titleList: "font-bold text-gray-800 text-sm truncate",
    
    subtext: "text-xs text-gray-500 font-medium"
  },

  // Bouton "Ajouter"
  addCard: {
    grid: "cursor-pointer p-5 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center gap-3 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition-colors min-h-[220px] group",
    list: "cursor-pointer flex items-center gap-4 p-3 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition-colors group",
    iconContainer: "flex items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm",
  },

  // Animation
  animation: {
    presenceProps: {
      mode: "popLayout"
    },
    itemProps: {
      layout: true,
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.2 }
    }
  },
};