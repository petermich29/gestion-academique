import React from "react";
import { FaHardHat } from "react-icons/fa";

export default function InscriptionPedagogique() {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <FaHardHat className="text-4xl mb-3 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-500">En construction</h3>
            <p className="text-sm">La gestion des Inscriptions Pédagogiques (Choix des UE/EC) sera disponible bientôt.</p>
        </div>
    );
}