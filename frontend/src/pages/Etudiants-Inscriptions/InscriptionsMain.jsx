import React, { useState } from "react";
import DossierInscription from "./components/DossierInscription";
import InscriptionPedagogique from "./components/InscriptionPedagogique"; // Placeholder

export default function InscriptionsMain() {
    const [subTab, setSubTab] = useState("dossier");

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
            {/* Sous-header gris */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 pt-4">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setSubTab("dossier")}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                            subTab === "dossier" 
                            ? "border-blue-600 text-blue-700" 
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Dossier d'Inscription (Administratif)
                    </button>
                    <button
                        onClick={() => setSubTab("pedagogique")}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                            subTab === "pedagogique" 
                            ? "border-blue-600 text-blue-700" 
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Inscription Pédagogique (EC/UE)
                    </button>
                </div>
            </div>

            <div className="p-6 flex-1 bg-gray-50/50">
                {subTab === "dossier" ? <DossierInscription /> : <InscriptionPedagogique />}
            </div>
        </div>
    );
}