import React, { useState, useCallback } from "react";
import { FaDatabase, FaLayerGroup } from "react-icons/fa";
import ScanDoublons from "./ScanDoublons";
import DoublonsTrouves from "./DoublonsTrouves";

export default function GestionDoublons() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleScanUpdate = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        // CHANGEMENT ICI : w-full, h-full, pas de max-w
        <div className="flex flex-col w-full min-h-screen bg-gray-50 font-sans">
            
            {/* Header simple avec padding ajusté */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <FaLayerGroup className="text-blue-600" />
                        Console de Gestion des Doublons
                    </h1>
                </div>
                <div className="text-sm text-gray-500 hidden sm:block">
                    Module de détection et fusion
                </div>
            </div>

            {/* Contenu principal fluide */}
            <div className="flex-1 p-4 md:p-6 w-full space-y-6">
                
                {/* Zone de Scan */}
                <div className="animate-fade-in-down">
                    <ScanDoublons onRefreshNeeded={handleScanUpdate} />
                </div>

                {/* Séparateur */}
                <div className="flex items-center gap-4 opacity-50">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <div className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <FaDatabase /> Résultats en base
                    </div>
                    <div className="h-px bg-gray-300 flex-1"></div>
                </div>

                {/* Liste des résultats (prend toute la largeur) */}
                <div className="animate-fade-in-up">
                    <DoublonsTrouves externalRefreshTrigger={refreshTrigger} />
                </div>
            </div>
        </div>
    );
}