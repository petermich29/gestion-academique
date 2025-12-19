import React from "react";
import { FaExclamationTriangle, FaTrash, FaTimes } from "react-icons/fa";
import { DraggableModal } from "../../../components/ui/Modal";

/**
 * Modal de confirmation de suppression d'un EC
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void
 * - ecCode?: string
 * - ecIntitule?: string
 */
const ECDeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  ecCode,
  ecIntitule,
}) => {
  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmation de suppression"
      width="max-w-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-100 text-red-600 p-2 rounded-full">
            <FaExclamationTriangle />
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">
              Voulez-vous vraiment supprimer ce module ?
            </p>
            <p className="text-xs text-gray-500">
              Cette action sera <b>prise en compte lors de la validation</b> de la configuration.
            </p>
          </div>
        </div>

        {(ecCode || ecIntitule) && (
          <div className="mb-4 p-2 bg-gray-50 border rounded text-xs">
            {ecCode && (
              <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mr-2">
                {ecCode}
              </span>
            )}
            <span className="font-medium">{ecIntitule}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 flex items-center gap-1"
          >
            <FaTimes /> Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <FaTrash /> Supprimer
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default ECDeleteConfirmModal;
