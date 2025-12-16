// frontend/src/pages/Ressources/components/ConfigurationInscription.jsx
import React from "react";
import {
    FaUniversity,
    FaGraduationCap,
    FaSave,
    FaTimes,
    FaCog
} from "react-icons/fa";
import { AppStyles } from "../../../components/ui/AppStyles";

// === COMPOSANTS INTERNES (inchangés) ===
const SelectBox = ({ label, options, value, onChange, icon: Icon, required=false, disabled=false }) => (
    <div className="flex flex-col">
        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
            {Icon && <Icon className="text-blue-500"/>}
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            className={`border border-gray-300 rounded text-xs py-1.5 px-2 bg-white outline-none ${disabled ? 'bg-gray-100 text-gray-500' : 'focus:ring-1 focus:ring-blue-500'}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
        >
            <option value="">-- Sélectionner --</option>
            {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const FilterGroup = ({ title, icon: Icon, children }) => (
    <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm mb-3">
        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-2">
            <Icon className="text-blue-600 text-sm" /> {title}
        </h4>
        <div className="grid grid-cols-3 gap-2">
            {children}
        </div>
    </div>
);

// === MODAL PRINCIPAL ===
export default function ConfigurationInscription({
    isOpen,
    onClose,
    filters,
    setFilters,
    options,
    onSave
}) {
    if (!isOpen) return null;

    const handleSave = () => {
        if (!filters.mention || !filters.annee) {
            alert("Veuillez sélectionner une Mention et une Année Universitaire.");
            return;
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl transform transition-all overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="flex justify-between items-center p-4 border-b bg-blue-600 text-white shrink-0">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FaCog/> Configuration de l'Inscription
                    </h3>
                    <button onClick={onClose} className="text-xl opacity-80 hover:opacity-100">
                        <FaTimes/>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-4">
                        Définissez les paramètres académiques de la promotion à inscrire.
                    </p>

                    <FilterGroup title="Critères Administratifs" icon={FaUniversity}>
                        <SelectBox
                            label="Institution"
                            options={options.institutions}
                            value={filters.institution}
                            onChange={(v) => setFilters({ ...filters, institution: v })}
                        />
                        <SelectBox
                            label="Composante (Établissement)"
                            options={options.composantes}
                            value={filters.composante}
                            onChange={(v) => setFilters({ ...filters, composante: v })}
                        />
                        <SelectBox
                            label="Mention"
                            options={options.mentions}
                            value={filters.mention}
                            onChange={(v) => setFilters({ ...filters, mention: v })}
                            required
                        />
                    </FilterGroup>

                    <FilterGroup title="Critères Pédagogiques" icon={FaGraduationCap}>
                        <SelectBox
                            label="Année Univ."
                            options={options.annees}
                            value={filters.annee}
                            onChange={(v) => setFilters({ ...filters, annee: v })}
                            required
                        />
                        <SelectBox
                            label="Niveau"
                            options={options.niveaux}
                            value={filters.niveau}
                            onChange={(v) => setFilters({ ...filters, niveau: v })}
                        />
                        <SelectBox
                            label="Parcours"
                            options={options.parcours}
                            value={filters.parcours}
                            onChange={(v) => setFilters({ ...filters, parcours: v })}
                        />
                        <SelectBox
                            label="Mode Insc."
                            options={options.modes}
                            value={filters.mode}
                            onChange={(v) => setFilters({ ...filters, mode: v })}
                        />
                    </FilterGroup>
                </div>

                <div className="p-4 border-t flex justify-end shrink-0 bg-gray-50">
                    <button
                        onClick={handleSave}
                        className={AppStyles.button.primary + " flex items-center gap-2"}
                    >
                        <FaSave/> Appliquer la Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
