import React, { useState, useEffect } from "react";
import { DraggableModal } from "../../../components/ui/Modal";
import { FaExclamationTriangle, FaTrash } from "react-icons/fa";

export default function DeleteInscriptionModal({ isOpen, onClose, onConfirm, studentData }) {
    const [confirmCode, setConfirmCode] = useState("");
    const [isError, setIsError] = useState(false);

    // Reset l'input à l'ouverture
    useEffect(() => {
        if (isOpen) {
            setConfirmCode("");
            setIsError(false);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (confirmCode === studentData?.matricule) {
            onConfirm(studentData.id);
            onClose();
        } else {
            setIsError(true);
        }
    };

    if (!studentData) return null;

    return (
        <DraggableModal isOpen={isOpen} onClose={onClose} title="Confirmation de suppression critique">
            <div className="p-5">
                <div className="flex items-start gap-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg mb-6">
                    <FaExclamationTriangle className="text-red-500 text-3xl mt-1 flex-shrink-0" />
                    <div>
                        <h3 className="text-red-800 font-bold text-lg">Action Irréversible</h3>
                        <p className="text-red-700 text-sm">
                            Vous allez supprimer l'inscription de <strong>{studentData.etudiant_nom} {studentData.etudiant_prenom}</strong>.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Pour confirmer, veuillez saisir le matricule de l'étudiant : 
                        <span className="ml-2 font-mono font-bold bg-gray-200 px-2 py-1 rounded text-gray-800">
                            {studentData.matricule}
                        </span>
                    </p>

                    <input
                        type="text"
                        className={`w-full p-3 border-2 rounded-xl text-center font-bold uppercase transition-all outline-none 
                            ${isError ? 'border-red-500 bg-red-50 animate-shake' : 'border-gray-300 focus:border-red-500'}`}
                        placeholder="Saisir le matricule ici..."
                        value={confirmCode}
                        onChange={(e) => {
                            setConfirmCode(e.target.value);
                            setIsError(false);
                        }}
                    />
                    
                    {isError && <p className="text-red-500 text-xs text-center font-semibold">Le matricule saisi est incorrect.</p>}
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-semibold transition-all">
                        Annuler
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={confirmCode !== studentData.matricule}
                        className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all
                            ${confirmCode === studentData.matricule 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        <FaTrash /> Confirmer la suppression
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
}