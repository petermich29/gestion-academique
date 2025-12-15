import React, { useState, useEffect } from "react";
import { FaUserGraduate, FaChalkboardTeacher } from "react-icons/fa";
import { AppStyles } from "../../components/ui/AppStyles";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

import StudentsPage from "./StudentsPage";
import TeachersPage from "./TeachersPage";

export default function EnseignantsAttributions() {

    const { setBreadcrumb } = useBreadcrumb();
    const [activeTab, setActiveTab] = useState("etudiants");

    useEffect(() => {
        setBreadcrumb([
            { label: "Enseignants et Attributions", path: "/enseignants-attributions" },
            { label: activeTab === "etudiants" ? "Gestion Étudiants" : "Gestion Enseignants", path: "#" }
        ]);
    }, [activeTab]);

    return (
        <div className={AppStyles.pageContainer}>

            <div>
                <h2 className={AppStyles.mainTitle}>Gestion des Étudiants et leurs Inscriptions</h2>
                <p className="text-gray-500 text-sm mt-1">Gestion administrative et académique.</p>
            </div>

            {/* Onglets */}
            <div className="flex gap-4 border-b border-gray-200 mt-4">
                <button
                    onClick={() => setActiveTab("etudiants")}
                    className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "etudiants"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaUserGraduate className="text-lg" /> Étudiants
                </button>

                <button
                    onClick={() => setActiveTab("enseignants")}
                    className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "enseignants"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaChalkboardTeacher className="text-lg" /> Enseignants
                </button>
            </div>

            {/* Sous-pages */}
            <div className="mt-4">
                {activeTab === "etudiants" ? <StudentsPage /> : <TeachersPage />}
            </div>
        </div>
    );
}
