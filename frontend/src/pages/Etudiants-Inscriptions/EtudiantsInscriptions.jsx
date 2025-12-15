import React, { useState, useEffect } from "react";
import { FaUserGraduate, FaFileSignature } from "react-icons/fa";
import { AppStyles } from "../../components/ui/AppStyles";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

// Importez votre StudentsPage existant (même s'il ne marche pas sans backend, on l'importe juste pour l'onglet)
import StudentsPage from "./BaseEtudiants"; 
import InscriptionsMain from "./GestionsInscriptions"; 

export default function EtudiantsInscriptions() {

    const { setBreadcrumb } = useBreadcrumb();
    const [activeTab, setActiveTab] = useState("inscriptions"); // On force l'onglet inscription par défaut pour tester

    useEffect(() => {
        setBreadcrumb([
            { label: "Scolarité", path: "/etudiants-inscriptions" },
            { label: activeTab === "etudiants" ? "Base Étudiants" : "Gestion Inscriptions", path: "#" }
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
            </div>

            {/* --- CONTENU --- */}
            <div className="mt-4">
                {activeTab === "etudiants" ? (
                    <StudentsPage /> 
                ) : (
                    <InscriptionsMain />
                )}
            </div>
        </div>
    );
}