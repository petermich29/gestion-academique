// \frontend\src\pages\Ressources\StudentsPage.jsx
import React, { useState, useEffect } from "react";
import {
    FaSearch, FaPlus, FaEdit, FaTrash, FaUser,
    FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight,
    FaBirthdayCake, FaGraduationCap, FaMapMarkerAlt
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles";
import { SpinnerIcon } from "../../components/ui/Icons";
import { ToastContainer } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import StudentFormModal from "./components/FormEtudiantsAjout";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function StudentsPage() {

    const [dataList, setDataList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    const [isLoading, setIsLoading] = useState(false);

    const [toasts, setToasts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const addToast = (msg, type = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    // Fonction utilitaire pour formater la date
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR");
    };

    // --- LOGIQUE D'AFFICHAGE DATE DE NAISSANCE ---
    const renderBirthDate = (item) => {
        const isExact = item.Etudiant_naissance_date_Exact;
        const lieu = item.Etudiant_naissance_lieu ? ` (${item.Etudiant_naissance_lieu})` : "";

        // Cas 1 : Date incertaine mais Année renseignée
        if (isExact === false && item.Etudiant_naissance_annee) {
            return (
                <>
                    <span className="font-medium">Vers {item.Etudiant_naissance_annee}</span>
                    <span className="text-gray-400 ml-1">{lieu}</span>
                </>
            );
        }

        // Cas 2 : Date exacte (ou null par défaut considéré comme exact si data legacy)
        if (item.Etudiant_naissance_date) {
            return (
                <>
                    {formatDate(item.Etudiant_naissance_date)}
                    <span className="text-gray-400 ml-1">{lieu}</span>
                </>
            );
        }

        // Cas 3 : Rien
        return <span className="text-gray-400 italic">Non renseigné</span>;
    };


    const fetchData = async () => {
        setIsLoading(true);

        try {
            const skip = (pagination.page - 1) * pagination.limit;
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: pagination.limit.toString(),
            });
            if (searchTerm) params.append("search", searchTerm);

            const url = `${API_BASE_URL}/api/etudiants?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                addToast("Erreur API /api/etudiants", "error");
                setDataList([]);
                setPagination(prev => ({ ...prev, total: 0 }));
                setIsLoading(false);
                return;
            }

            const result = await res.json();

            if (Array.isArray(result)) {
                setDataList(result);
                setPagination(prev => ({ ...prev, total: result.length || 0 }));
            } else if (result && typeof result === "object") {
                setDataList(result.items || []);
                setPagination(prev => ({ ...prev, total: result.total || (result.items ? result.items.length : 0) }));
            } else {
                setDataList([]);
                setPagination(prev => ({ ...prev, total: 0 }));
            }

        } catch (e) {
            console.error(e);
            addToast("Erreur lors du chargement", "error");
        }

        setIsLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(fetchData, 300);
        return () => clearTimeout(t);
    }, [pagination.page, pagination.limit, searchTerm]);

    const handleDelete = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/etudiants/${currentItem.Etudiant_id}`, {
                method: "DELETE"
            });

            addToast("Suppression réussie");
            setIsDeleteOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            addToast("Erreur suppression", "error");
        }
    };

    const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
    const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endIndex = Math.min(pagination.page * pagination.limit, pagination.total || 0);

    const renderPageNumbers = () => {
        const pages = [];
        const total = totalPages;
        const current = pagination.page;

        const visiblePages = new Set([
            1, total, current, current - 1, current - 2, current + 1, current + 2,
        ]);

        for (let i = 1; i <= total; i++) {
            if (visiblePages.has(i)) {
                pages.push(i);
            }
        }

        const sorted = [...pages].sort((a, b) => a - b);
        const final = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] !== sorted[i - 1] + 1) {
                final.push("…");
            }
            final.push(sorted[i]);
        }

        return final.map((p, idx) =>
            p === "…" ? (
                <span key={idx} className="px-2 text-gray-400">…</span>
            ) : (
                <button
                    key={idx}
                    onClick={() => setPagination(pg => ({ ...pg, page: p }))}
                    className={`px-3 py-1 rounded-lg border text-sm ${
                        pagination.page === p
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white hover:bg-gray-100"
                    }`}
                >
                    {p}
                </button>
            )
        );
    };

    return (
        <div className="mt-3">

            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* SEARCH + ADD BUTTON */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un étudiant..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPagination(p => ({ ...p, page: 1 }));
                        }}
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={() => { setCurrentItem({}); setIsModalOpen(true); }}
                    className={AppStyles.button.primary}
                >
                    <FaPlus /> Nouveau Étudiant
                </button>
            </div>

            {/* MAIN TABLE */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-4 flex flex-col min-h-[400px]">

                {/* TOP PAGINATION */}
                <div className="px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {pagination.total > 0 ? (
                            <>Affichage <b>{startIndex}</b> – <b>{endIndex}</b> / <b>{pagination.total}</b></>
                        ) : (
                            "Aucun étudiant"
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={pagination.limit}
                            onChange={(e) => setPagination(p => ({
                                ...p, limit: Number(e.target.value), page: 1
                            }))}
                            className="border border-gray-300 rounded-lg py-1 px-2 text-sm bg-white"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>

                        <div className="hidden md:flex items-center gap-1">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="px-2 py-1 border rounded-lg text-sm disabled:opacity-30"
                            >
                                <FaChevronLeft />
                            </button>
                            {renderPageNumbers()}
                            <button
                                disabled={pagination.page >= totalPages}
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="px-2 py-1 border rounded-lg text-sm disabled:opacity-30"
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                {isLoading ? (
                    <div className="flex justify-center items-center flex-grow py-20">
                        <SpinnerIcon className="animate-spin text-4xl text-blue-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left border-collapse">

                            <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="p-3 w-[250px]">Identité</th>
                                    <th className="p-3 w-[220px]">Infos Personnelles</th> 
                                    <th className="p-3 w-[30%]">Cursus</th>
                                    <th className="p-3 w-[20%]">Contact</th>
                                    <th className="p-3 text-right w-24">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y text-sm">
                                {dataList.length > 0 ? dataList.map(item => (
                                    <tr key={item.Etudiant_id} className="hover:bg-blue-50/30 group">

                                        {/* 1. IDENTITÉ */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center border border-gray-100 shadow-sm">
                                                    {item.Etudiant_photo_profil_path ? (
                                                        <img
                                                            src={`http://127.0.0.1:8000/${item.Etudiant_photo_profil_path}`}
                                                            className="w-full h-full object-cover"
                                                            alt="Profil"
                                                        />
                                                    ) : (
                                                        <FaUser className="text-gray-400" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-semibold text-gray-900 truncate">
                                                        {item.Etudiant_nom}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate uppercase">
                                                        {item.Etudiant_prenoms}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                        {item.Etudiant_id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. INFOS PERSONNELLES (MODIFIÉ ICI) */}
                                        <td className="p-3 align-middle">
                                            <div className="flex flex-col gap-1.5">
                                                {/* Date de naissance avec logique Vers... */}
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <FaBirthdayCake className="text-gray-400 text-xs flex-shrink-0" />
                                                    <span className="text-xs">
                                                        {renderBirthDate(item)}
                                                    </span>
                                                </div>

                                                {/* Bacc */}
                                                {(item.Etudiant_bacc_annee || item.Etudiant_bacc_serie) && (
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <FaGraduationCap className="text-gray-400 text-xs flex-shrink-0" />
                                                        <span className="text-xs">
                                                            BAC {item.Etudiant_bacc_serie ? `Série ${item.Etudiant_bacc_serie}` : ""} 
                                                            {item.Etudiant_bacc_annee ? ` (${item.Etudiant_bacc_annee})` : ""}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* 3. CURSUS */}
                                        <td className="p-3 align-top">
                                            {item.cursus_liste?.length > 0 ? (
                                                <div className="flex flex-col gap-3">
                                                    {item.cursus_liste.map((c, idx) => (
                                                        <div key={idx} className="leading-snug">
                                                            <div className="font-semibold text-blue-700 text-xs">
                                                                {c.mention_nom}
                                                            </div>
                                                            <div className="text-xs text-gray-600 flex flex-wrap gap-1 mt-0.5">
                                                                <span>{c.institution_nom}</span>
                                                                {c.composante_abbr && (
                                                                    <>
                                                                        <span className="text-gray-300">|</span>
                                                                        <span>{c.composante_abbr}</span>
                                                                    </>
                                                                )}
                                                                {c.annee_universitaire_list?.length > 0 && (
                                                                    <>
                                                                        <span className="text-gray-300">|</span>
                                                                        <span className="bg-gray-100 px-1 rounded text-gray-700 font-mono text-[10px] border">
                                                                            {c.annee_universitaire_list.join(", ")}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Aucun cursus actif</span>
                                            )}
                                        </td>

                                        {/* 4. CONTACT */}
                                        <td className="p-3 align-middle">
                                            <div className="flex flex-col gap-1.5">
                                                {item.Etudiant_mail ? (
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FaEnvelope className="text-gray-400 text-xs flex-shrink-0" />
                                                        <span className="text-xs truncate" title={item.Etudiant_mail}>
                                                            {item.Etudiant_mail}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {item.Etudiant_telephone ? (
                                                    <div className="flex items-center gap-2">
                                                        <FaPhone className="text-gray-400 text-xs flex-shrink-0" />
                                                        <span className="text-xs">{item.Etudiant_telephone}</span>
                                                    </div>
                                                ) : null}
                                                {item.Etudiant_adresse ? (
                                                    <div className="flex items-center gap-2">
                                                        <FaMapMarkerAlt className="text-gray-400 text-xs flex-shrink-0" />
                                                        <span className="text-xs truncate max-w-[150px]" title={item.Etudiant_adresse}>
                                                            {item.Etudiant_adresse}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>

                                        {/* 5. ACTIONS */}
                                        <td className="p-3 text-right align-middle">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setCurrentItem(item); setIsModalOpen(true); }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200"
                                                    title="Modifier"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => { setCurrentItem(item); setIsDeleteOpen(true); }}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
                                                    title="Supprimer"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                                            Aucun étudiant trouvé.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <StudentFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={currentItem}
                reloadList={fetchData}
            />

            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirmation"
            >
                <p>
                    Supprimer <b>{currentItem?.Etudiant_nom}</b> ?
                </p>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsDeleteOpen(false)} className={AppStyles.button.secondary}>
                        Annuler
                    </button>
                    <button onClick={handleDelete} className={AppStyles.button.danger}>
                        Supprimer
                    </button>
                </div>
            </ConfirmModal>
        </div>
    );
}