import React from "react";
import { DraggableModal } from "../../../components/ui/Modal"; // Assurez-vous du chemin
import { FaCheck, FaInfoCircle, FaLayerGroup, FaUserGraduate } from "react-icons/fa";

export default function EnrollmentResultModal({ isOpen, onClose, results }) {
    if (!results) return null;

    return (
        <DraggableModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Confirmation"
            width="400px" // On force une petite largeur si le composant le permet, sinon géré par le div interne
        >
            {/* Conteneur compact et propre */}
            <div className="p-5 max-w-sm mx-auto">
                
                {/* En-tête Visuel */}
                <div className="flex flex-col items-center mb-5">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-sm animate-bounce-short">
                        <FaCheck size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Inscriptions validées !</h2>
                    <p className="text-xs text-gray-500 mt-1">Le traitement est terminé avec succès.</p>
                </div>

                {/* Bloc Stats Compact (Grid) */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                        <FaUserGraduate className="text-gray-400 text-lg mb-1" />
                        <span className="text-2xl font-bold text-gray-800">{results.count}</span>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Étudiants</span>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                        <FaLayerGroup className="text-gray-400 text-lg mb-1" />
                        <span className="text-2xl font-bold text-gray-800">{results.semestres.length}</span>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Semestres</span>
                    </div>
                </div>

                {/* Liste des semestres concernés (Badges) */}
                {results.semestres.length > 0 && (
                    <div className="mb-5 text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                            {results.semestres.map((s, i) => (
                                <span key={i} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-md border border-emerald-100">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message d'info discret si besoin */}
                {results.details && results.details.includes("ignorée") && (
                    <div className="flex items-start gap-2 bg-amber-50 p-2.5 rounded-lg text-amber-700 text-xs mb-5 border border-amber-100">
                        <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                        <p className="leading-tight">{results.details}</p>
                    </div>
                )}

                {/* Bouton d'action unique */}
                <button
                    onClick={onClose}
                    className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-black transition-all shadow-md text-sm"
                >
                    Terminer
                </button>
            </div>
        </DraggableModal>
    );
}