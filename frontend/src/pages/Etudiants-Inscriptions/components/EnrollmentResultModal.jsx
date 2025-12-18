import React from "react";
import { DraggableModal } from "../../../components/ui/Modal";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";

export default function EnrollmentResultModal({ isOpen, onClose, results }) {
    if (!results) return null;

    return (
        <DraggableModal isOpen={isOpen} onClose={onClose} title="Résumé des inscriptions">
            <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCheckCircle size={40} />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Opération réussie</h2>
                <p className="text-gray-500 mb-6">Le traitement des dossiers d'inscription est terminé.</p>

                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600">Étudiants traités :</span>
                        <span className="font-bold text-gray-800 text-lg">{results.count}</span>
                    </div>

                    <div>
                        <span className="text-gray-600 block mb-2">Semestres validés :</span>
                        <div className="flex flex-wrap gap-2">
                            {results.semestres.map((s, i) => (
                                <span key={i} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg text-blue-700 text-xs italic">
                        <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                        <p>{results.details}</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg"
                >
                    Fermer
                </button>
            </div>
        </DraggableModal>
    );
}