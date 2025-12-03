import React, { useState, useRef, useEffect } from "react";
import { FaCalendarAlt, FaChevronDown, FaCheck } from "react-icons/fa";

const YearMultiSelect = React.memo(function YearMultiSelect({
  years = [],
  selectedYearIds = [],
  onChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // --- NOUVEAU : Gestion du clic en dehors ---
  useEffect(() => {
    function handleClickOutside(event) {
      // Si le menu est ouvert et que le clic est en dehors du containerRef
      if (
        isOpen && 
        containerRef.current && 
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    // On attache l'écouteur au document
    document.addEventListener("mousedown", handleClickOutside);
    
    // Nettoyage de l'écouteur quand le composant est démonté
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]); // On re-vérifie à chaque fois que isOpen change

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleCheckboxChange = (yearId) => {
    let newSelection;

    if (selectedYearIds.includes(yearId)) {
      newSelection = selectedYearIds.filter((id) => id !== yearId);
    } else {
      newSelection = [...selectedYearIds, yearId];
    }

    onChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedYearIds.length === years.length) {
      onChange([]);
    } else {
      onChange(years.map((y) => y.AnneeUniversitaire_id));
    }
  };

  const handleDeselectAll = () => onChange([]);

  const selectionLabel =
    selectedYearIds.length === 0
      ? "Toutes les années"
      : selectedYearIds.length === years.length
      ? "Toutes les années"
      : `${selectedYearIds.length} année(s)`;

  return (
    <div className="relative z-20" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white text-sm shadow-sm hover:bg-gray-50 transition-colors"
      >
        <FaCalendarAlt className="text-gray-500" />
        <span className="font-medium text-gray-700 truncate min-w-[120px] text-left">
          {selectionLabel}
        </span>
        <FaChevronDown
          className={`text-gray-400 text-xs transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-96 overflow-y-auto z-50"
          // On garde le stopPropagation pour éviter des effets de bord si le composant est dans un autre élément cliquable
          onClick={(e) => e.stopPropagation()}
        >
          {/* Actions globales */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={handleSelectAll}
              className="flex-1 px-4 py-2 hover:bg-gray-50 text-xs font-bold text-blue-600 text-left"
            >
              Tout sélectionner
            </button>
            <button
              onClick={handleDeselectAll}
              className="flex-1 px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-500 text-right"
            >
              Tout désélectionner
            </button>
          </div>

          {years.map((year) => {
            const isChecked = selectedYearIds.includes(
              year.AnneeUniversitaire_id
            );

            return (
              <label
                key={year.AnneeUniversitaire_id}
                className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors select-none"
                // Important : ne pas mettre de stopPropagation ici sinon le clic sur label
                // pourrait être ignoré par certains gestionnaires, mais ici c'est géré par l'input
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center mr-3 transition-colors ${
                    isChecked
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isChecked && (
                    <FaCheck className="text-white text-[10px]" />
                  )}
                </div>

                <input
                  type="checkbox"
                  className="hidden"
                  checked={isChecked}
                  onChange={() =>
                    handleCheckboxChange(year.AnneeUniversitaire_id)
                  }
                />

                <div className="flex flex-col">
                  <span
                    className={`text-sm ${
                      isChecked
                        ? "font-semibold text-gray-800"
                        : "text-gray-700"
                    }`}
                  >
                    {year.AnneeUniversitaire_annee}
                  </span>
                  {year.AnneeUniversitaire_is_active && (
                    <span className="text-[9px] text-green-600 uppercase font-bold leading-none">
                      Active
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default YearMultiSelect;