// \frontend\src\pages\Ressources\StudentsPage.jsx
import React, { useState, useEffect } from "react";
import {
    FaSearch, FaPlus, FaEdit, FaTrash, FaUser,
    FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles";
import { SpinnerIcon } from "../../components/ui/Icons";
import { ToastContainer } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import { StudentFormModal } from "./components/StudentsForms";

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

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);

        try {
            const skip = (pagination.page - 1) * pagination.limit;
            const params = new URLSearchParams({
                skip: skip.toString(),
                limit: pagination.limit.toString(),
            });
            if (searchTerm) params.append("search", searchTerm);

            // 🔥 FIX : Utilisation de la bonne URL
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
            setDataList(result.items || []);
            setPagination(prev => ({ ...prev, total: result.total || 0 }));

        } catch (e) {
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
        } catch {
            addToast("Erreur suppression", "error");
        }
    };

    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
    const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endIndex = Math.min(pagination.page * pagination.limit, pagination.total || 0);

    const renderPageNumbers = () => {
        const pages = [];
        const total = totalPages;
        const current = pagination.page;

        const visiblePages = new Set([
            1,
            total,
            current,
            current - 1,
            current - 2,
            current + 1,
            current + 2,
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
                                ...p,
                                limit: Number(e.target.value),
                                page: 1
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
                                    <th className="p-3 w-[200px] max-w-[200px]">Identité</th>
                                    <th className="p-3 w-20">N° Inscription</th>
                                    <th className="p-3 w-[45%]">Cursus</th>
                                    <th className="p-3 w-60">Contact</th>
                                    <th className="p-3 text-right w-24">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y text-sm">
                                {dataList.length > 0 ? dataList.map(item => (
                                    <tr key={item.Etudiant_id} className="hover:bg-blue-50/30 group">

                                        {/* IDENTITÉ */}
                                        <td className="p-3 max-w-[200px]">
                                            <div className="flex items-center gap-2">

                                                {/* PHOTO */}
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                                    {item.Etudiant_photo_profil_path ? (
                                                        <img
                                                            src={`http://127.0.0.1:8000/${item.Etudiant_photo_profil_path}`}
                                                            className="w-full h-full object-cover"
                                                            alt="Profil"
                                                        />
                                                    ) : (
                                                        <FaUser className="text-gray-500" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-semibold truncate">
                                                        {item.Etudiant_nom}
                                                    </div>
                                                    <div className="text-xs truncate text-gray-600">
                                                        {item.Etudiant_prenoms}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* MATRICULE */}
                                        <td className="p-3 w-20">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs border">
                                                {item.Etudiant_numero_inscription || "N/A"}
                                            </span>
                                        </td>

                                        {/* CURSUS */}
                                        <td className="p-3 align-top">
                                            {item.cursus_liste?.length > 0 ? (
                                                <div className="flex flex-col gap-3">

                                                    {item.cursus_liste.map((c, idx) => (
                                                        <div key={idx} className="leading-snug">

                                                            <div className="font-semibold text-gray-900">
                                                                {c.mention_nom}
                                                            </div>

                                                            <div className="text-xs text-gray-600 flex flex-wrap gap-1 mt-0.5">

                                                                <span>{c.institution_nom}</span>

                                                                {c.composante_abbr && (
                                                                    <>
                                                                        <span>|</span>
                                                                        <span>{c.composante_abbr}</span>
                                                                    </>
                                                                )}

                                                                {c.annee_universitaire_list?.length > 0 && (
                                                                    <>
                                                                        <span>|</span>
                                                                        <span className="font-semibold">
                                                                            {c.annee_universitaire_list.join(", ")}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Aucun cursus</span>
                                            )}
                                        </td>

                                        {/* CONTACT */}
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1">
                                                {item.Etudiant_mail && (
                                                    <div className="flex items-center gap-2">
                                                        <FaEnvelope className="text-gray-400 text-xs" />
                                                        <span className="text-sm">{item.Etudiant_mail}</span>
                                                    </div>
                                                )}
                                                {item.Etudiant_telephone && (
                                                    <div className="flex items-center gap-2">
                                                        <FaPhone className="text-gray-400 text-xs" />
                                                        <span className="text-sm">{item.Etudiant_telephone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setCurrentItem(item); setIsModalOpen(true); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => { setCurrentItem(item); setIsDeleteOpen(true); }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
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

            {/* MODAL FORM */}
            <StudentFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={currentItem}
                reloadList={fetchData}
            />

            {/* CONFIRM DELETE */}
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
