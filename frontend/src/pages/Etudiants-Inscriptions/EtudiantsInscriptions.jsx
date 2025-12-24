import React, { useState, useEffect } from "react";
// CORRECTION ICI : Ajout de FaUserFriends
import { FaUserGraduate, FaFileSignature, FaUserFriends } from "react-icons/fa"; 
import { AppStyles } from "../../components/ui/AppStyles";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

import StudentsPage from "./BaseEtudiants"; 
import InscriptionsMain from "./GestionsInscriptions"; 
import GestionDoublons from "./GestionDoublons"; 

export default function EtudiantsInscriptions() {
    const { setBreadcrumb } = useBreadcrumb();
    const [activeTab, setActiveTab] = useState("inscriptions");

    useEffect(() => {
        const labels = {
            etudiants: "Base Étudiants",
            inscriptions: "Gestion Inscriptions",
            doublons: "Gestion des Doublons"
        };
        setBreadcrumb([
            { label: "Scolarité", path: "/etudiants-inscriptions" },
            { label: labels[activeTab], path: "#" }
        ]);
    }, [activeTab]);

    return (
        <div className={AppStyles.pageContainer}>
            <div>
                <h2 className={AppStyles.mainTitle}>Scolarité & Inscriptions</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Gérez la base de données étudiants et leurs affectations académiques.
                </p>
            </div>

            {/* --- ONGLETS DE NAVIGATION --- */}
            <div className="flex gap-6 border-b border-gray-200 mt-6 px-1">
                <button
                    onClick={() => setActiveTab("etudiants")}
                    className={`pb-3 px-1 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "etudiants"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaUserGraduate className="text-lg" /> Base Étudiants
                </button>

                <button
                    onClick={() => setActiveTab("inscriptions")}
                    className={`pb-3 px-1 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "inscriptions"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaFileSignature className="text-lg" /> Gestion des Inscriptions
                </button>

                <button
                    onClick={() => setActiveTab("doublons")}
                    className={`pb-3 px-1 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "doublons"
                            ? "text-orange-600 border-orange-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaUserFriends className="text-lg" /> Fusion & Doublons
                </button>
            </div>

            {/* --- CONTENU --- */}
            <div className="mt-4">
                {activeTab === "etudiants" && <StudentsPage />}
                {activeTab === "inscriptions" && <InscriptionsMain />}
                {activeTab === "doublons" && <GestionDoublons />}
            </div>
        </div>
    );
}