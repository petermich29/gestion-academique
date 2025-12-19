// frontend\src\pages\Enseignants-Attributions\EnseignantsAttributions.jsx
import React, { useState, useEffect } from "react";
import { FaUserGraduate, FaChalkboardTeacher, FaNetworkWired } from "react-icons/fa";
import { AppStyles } from "../../components/ui/AppStyles";
import { useBreadcrumb } from "../../context/BreadcrumbContext";

// On importe la nouvelle page au lieu de StudentsPage
import AttributionsPage from "./AttributionsPage"; // <--- NOUVEAU
import TeachersPage from "./TeachersPage";

export default function EnseignantsAttributions() {

    const { setBreadcrumb } = useBreadcrumb();
    // Par défaut, on peut afficher "attributions" ou "enseignants"
    const [activeTab, setActiveTab] = useState("attributions"); 

    useEffect(() => {
        setBreadcrumb([
            { label: "Enseignants et Charges", path: "/enseignants-attributions" },
            { label: activeTab === "attributions" ? "Répartition des Services" : "Annuaire Enseignants", path: "#" }
        ]);
    }, [activeTab]);

    return (
        <div className={AppStyles.pageContainer}>

            <div>
                <h2 className={AppStyles.mainTitle}>Gestion du Personnel Enseignant</h2>
                <p className="text-gray-500 text-sm mt-1">Annuaire des professeurs et attribution des charges d'enseignement.</p>
            </div>

            {/* Onglets */}
            <div className="flex gap-4 border-b border-gray-200 mt-4">
                <button
                    onClick={() => setActiveTab("attributions")}
                    className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "attributions"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaNetworkWired className="text-lg" /> Attributions & Charges
                </button>

                <button
                    onClick={() => setActiveTab("enseignants")}
                    className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${
                        activeTab === "enseignants"
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                >
                    <FaChalkboardTeacher className="text-lg" /> Enseignants (Annuaire)
                </button>
            </div>

            {/* Sous-pages */}
            <div className="mt-4">
                {activeTab === "attributions" ? <AttributionsPage /> : <TeachersPage />}
            </div>
        </div>
    );
}