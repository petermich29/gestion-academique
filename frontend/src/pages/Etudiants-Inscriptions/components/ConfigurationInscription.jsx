// frontend/src/pages/Ressources/components/ConfigurationInscription.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion"; // Assurez-vous d'avoir installé framer-motion
import {
    FaUniversity,
    FaGraduationCap,
    FaCheckCircle,
    FaTimes,
    FaCog,
    FaBuilding,
    FaLayerGroup,
    FaCalendarAlt,
    FaLevelUpAlt,
    FaCodeBranch,
    FaTag
} from "react-icons/fa";

// Si vous n'avez pas framer-motion, supprimez les balises motion.div et AnimatePresence
// et utilisez des divs simples.

// === SOUS-COMPOSANT SELECT ===
const ModernSelect = ({ label, options, value, onChange, icon: Icon, required = false, disabled = false, placeholder = "Choisir..." }) => (
    <div className={`flex flex-col group ${disabled ? "opacity-60 grayscale" : ""}`}>
        <label className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
            {Icon && <Icon className="text-indigo-500" />}
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <select
                className={`w-full appearance-none bg-white border border-slate-300 text-slate-700 text-xs py-2.5 pl-3 pr-8 rounded-lg outline-none transition-all shadow-sm
                ${disabled 
                    ? 'bg-slate-100 cursor-not-allowed border-slate-200' 
                    : 'hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">— {placeholder} —</option>
                {options.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
            </select>
            {/* Flèche personnalisée */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
);

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
        // Validation simple
        if (!filters.mention || !filters.annee || !filters.niveau || !filters.mode) {
            // Vous pouvez utiliser votre Toast ici si vous passez la fonction en props, sinon alert
            alert("Configuration incomplète : Année, Mention, Niveau et Mode sont requis.");
            return;
        }
        onSave();
    };

    // Variantes d'animation
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const modalVariants = {
        hidden: { opacity: 0, y: -20, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={backdropVariants}
                    transition={{ duration: 0.2 }}
                >
                    <motion.div 
                        className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        variants={modalVariants}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                    >
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                        <FaCog />
                                    </div>
                                    Configuration Inscription
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Définissez le contexte académique pour la session de travail.</p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Section 1 : Structure Administrative */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase mb-4">
                                    <FaUniversity className="text-lg opacity-80" /> Structure Administrative
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <ModernSelect
                                        label="Institution"
                                        icon={FaUniversity}
                                        options={options.institutions}
                                        value={filters.institution}
                                        onChange={(v) => setFilters({ ...filters, institution: v })}
                                    />
                                    <ModernSelect
                                        label="Composante"
                                        icon={FaBuilding}
                                        options={options.composantes}
                                        value={filters.composante}
                                        onChange={(v) => setFilters({ ...filters, composante: v })}
                                        disabled={!filters.institution}
                                    />
                                    <ModernSelect
                                        label="Mention"
                                        icon={FaLayerGroup}
                                        options={options.mentions}
                                        value={filters.mention}
                                        onChange={(v) => setFilters({ ...filters, mention: v })}
                                        disabled={!filters.composante}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Section 2 : Critères Pédagogiques */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase mb-4">
                                    <FaGraduationCap className="text-lg opacity-80" /> Critères Pédagogiques
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 border-b border-dashed border-gray-100 mb-2">
                                        <ModernSelect
                                            label="Année Universitaire"
                                            icon={FaCalendarAlt}
                                            options={options.annees}
                                            value={filters.annee}
                                            onChange={(v) => setFilters({ ...filters, annee: v })}
                                            required
                                        />
                                        <ModernSelect
                                            label="Mode d'Inscription"
                                            icon={FaTag}
                                            options={options.modes}
                                            value={filters.mode}
                                            onChange={(v) => setFilters({ ...filters, mode: v })}
                                            required
                                        />
                                    </div>

                                    <ModernSelect
                                        label="Parcours"
                                        icon={FaCodeBranch}
                                        options={options.parcours}
                                        value={filters.parcours}
                                        onChange={(v) => setFilters({ ...filters, parcours: v })}
                                        disabled={!filters.mention}
                                        placeholder="Optionnel (Tous)"
                                    />
                                    <ModernSelect
                                        label="Niveau"
                                        icon={FaLevelUpAlt}
                                        options={options.niveaux}
                                        value={filters.niveau}
                                        onChange={(v) => setFilters({ ...filters, niveau: v })}
                                        disabled={!filters.mention} // Le niveau dépend souvent du parcours, mais parfois juste de la mention
                                        required
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <FaCheckCircle /> Appliquer & Fermer
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}