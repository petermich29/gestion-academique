// components/EnrollmentResultModal.jsx (ou intégré dans InscriptionsMain)
import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaTimes } from 'react-icons/fa';

export default function EnrollmentResultModal({ isOpen, onClose, results }) {
    if (!isOpen || !results) return null;

    const { successes, alreadyEnrolled, errors } = results;
    const hasIssues = alreadyEnrolled.length > 0 || errors.length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
                {/* Header */}
                <div className={`px-6 py-4 flex justify-between items-center ${hasIssues ? "bg-amber-50 border-b border-amber-100" : "bg-emerald-50 border-b border-emerald-100"}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${hasIssues ? "text-amber-800" : "text-emerald-800"}`}>
                        {hasIssues ? <FaExclamationTriangle /> : <FaCheckCircle />}
                        Bilan des inscriptions
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition"><FaTimes size={20} /></button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                    
                    {/* SUCCÈS */}
                    {successes.length > 0 && (
                        <div className="bg-emerald-50/50 rounded-md border border-emerald-100 p-4">
                            <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                                <FaCheckCircle/> {successes.length} Inscription(s) validée(s)
                            </h4>
                            <ul className="list-disc list-inside text-xs text-emerald-600 pl-4 space-y-1">
                                {successes.map((name, i) => <li key={i}>{name}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* DÉJÀ INSCRITS (WARNING) */}
                    {alreadyEnrolled.length > 0 && (
                        <div className="bg-orange-50/50 rounded-md border border-orange-100 p-4">
                            <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                                <FaExclamationTriangle/> {alreadyEnrolled.length} Étudiant(s) déjà inscrit(s)
                            </h4>
                            <p className="text-xs text-orange-600 mb-2">Ces étudiants possèdent déjà une inscription pour ce parcours et ces semestres :</p>
                            <ul className="list-disc list-inside text-xs text-orange-800 pl-4 space-y-1 font-medium">
                                {alreadyEnrolled.map((item, i) => (
                                    <li key={i}>{item.nom} <span className="text-orange-500 font-normal">({item.details})</span></li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* ERREURS TECHNIQUES */}
                    {errors.length > 0 && (
                        <div className="bg-red-50/50 rounded-md border border-red-100 p-4">
                            <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                                <FaTimesCircle/> {errors.length} Erreur(s) technique(s)
                            </h4>
                            <ul className="list-disc list-inside text-xs text-red-600 pl-4 space-y-1">
                                {errors.map((err, i) => <li key={i}>{err.nom} : {err.reason}</li>)}
                            </ul>
                        </div>
                    )}

                    {!hasIssues && successes.length === 0 && (
                        <p className="text-center text-gray-500 italic text-sm">Aucune action n'a été effectuée.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-white border border-gray-300 text-slate-700 text-sm font-medium rounded hover:bg-gray-100 transition shadow-sm"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}