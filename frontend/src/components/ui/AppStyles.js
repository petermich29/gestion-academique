// src/components/ui/AppStyles.js

export const AppStyles = {
  // Conteneurs et Layouts
  pageContainer: "flex flex-col gap-4 p-4 relative",
  header: {
    container: "flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-3",
    title: "text-xl font-semibold",
    controls: "flex flex-col md:flex-row items-center gap-2 flex-wrap",
  },
  
  // Inputs et Formulaires
  input: {
    text: "border rounded px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm",
    formControl: "px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm",
    formControlDisabled: "px-2 py-1.5 border rounded bg-gray-100 text-gray-600 text-sm",
    errorText: "text-red-500 text-[11px]",
    label: "text-sm text-gray-700",
  },

  // Boutons
  button: {
    primary: "px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2",
    secondary: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm",
    icon: "p-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center transition-colors text-sm",
    danger: "px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm",
  },

  // Cartes et Listes (Miniatures)
  item: {
    grid: "p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:shadow-lg hover:bg-blue-50 duration-200 min-h-52 cursor-pointer transition relative",
    list: "flex items-center gap-3 p-2 bg-white rounded shadow hover:shadow-md hover:bg-blue-50 duration-200 cursor-pointer transition relative",
    imgGrid: "w-20 h-20 object-cover mb-1 rounded-full border border-gray-200",
    imgList: "w-10 h-10 object-cover rounded-full border border-gray-200 flex-shrink-0",
    titleGrid: "font-semibold text-gray-800 break-words text-base",
    titleList: "font-semibold text-gray-800 break-words text-sm truncate",
  },

  // Bouton "Ajouter"
  addCard: {
    grid: "cursor-pointer p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-center min-h-40",
    list: "cursor-pointer flex items-center gap-4 p-2 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100",
    iconContainer: "flex items-center justify-center rounded-full bg-blue-100",
  },
};