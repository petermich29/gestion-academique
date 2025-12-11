//frontend\src\pages\Ressources\TeachersPage.jsx
import React, { useState, useEffect } from "react";
import {
    FaSearch, FaPlus, FaEdit, FaTrash, FaUser,
    FaPhone, FaEnvelope
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles";
import { SpinnerIcon } from "../../components/ui/Icons";
import { ToastContainer } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import { TeacherFormModal } from "./components/TeachersForms";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function TeachersPage() {

    const [dataList, setDataList] = useState([]);
    const [composantesList, setComposantesList] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [toasts, setToasts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addToast = (msg, type = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/enseignants`);
            const result = await res.json();
            setDataList(result);

            if (composantesList.length === 0) {
                const resComp = await fetch(`${API_BASE_URL}/api/composantes`);
                if (resComp.ok) setComposantesList(await resComp.json());
            }

        } catch {
            addToast("Erreur chargement enseignants", "error");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        setCurrentItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const id = currentItem?.Enseignant_id;
            const method = id ? "PUT" : "POST";

            const url = `${API_BASE_URL}/api/enseignants${id ? "/" + id : ""}`;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentItem)
            });

            if (!res.ok) throw new Error();

            addToast("Opération réussie");
            setIsModalOpen(false);
            fetchData();

        } catch {
            addToast("Erreur enregistrement", "error");
        }

        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        try {
            const id = currentItem?.Enseignant_id;

            await fetch(`${API_BASE_URL}/api/enseignants/${id}`, { method: "DELETE" });

            addToast("Suppression effectuée");
            setIsDeleteOpen(false);
            fetchData();

        } catch {
            addToast("Erreur suppression", "error");
        }
    };

    // Filtrer enseignants
    const displayData = dataList.filter(item =>
        (item.Enseignant_nom || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mt-2">

            {/* Toasts */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Search + Button */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un enseignant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                </div>

                <button
                    onClick={() => { setCurrentItem({}); setIsModalOpen(true); }}
                    className={AppStyles.button.primary}
                >
                    <FaPlus /> Nouvel Enseignant
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col mt-4">

                {isLoading ? (
                    <div className="flex items-center justify-center flex-grow h-64">
                        <SpinnerIcon className="animate-spin text-4xl text-blue-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left border-collapse">

                            <thead className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <tr>
                                    <th className="p-4">Identité</th>
                                    <th className="p-4">Matricule</th>
                                    <th className="p-4 w-1/3">Affectation</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 text-sm">

                                {displayData.length > 0 ? displayData.map(item => (
                                    <tr key={item.Enseignant_id} className="hover:bg-blue-50/30 transition-colors group align-top">

                                        {/* Identité */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                    <FaUser />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{item.Enseignant_nom}</div>
                                                    <div className="text-xs text-gray-500">{item.Enseignant_prenoms}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Matricule */}
                                        <td className="p-4">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 border border-gray-200">
                                                {item.Enseignant_matricule || "N/A"}
                                            </span>
                                        </td>

                                        {/* Affectation */}
                                        <td className="p-4 text-xs">
                                            {item.Composante_id_affectation_fk ? (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-semibold">
                                                    {composantesList.find(c => c.Composante_id === item.Composante_id_affectation_fk)?.Composante_label}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Transversal</span>
                                            )}
                                        </td>

                                        {/* Contact */}
                                        <td className="p-4 text-gray-600 text-xs">
                                            {item.Enseignant_mail && (
                                                <div><FaEnvelope className="inline text-gray-400" /> {item.Enseignant_mail}</div>
                                            )}
                                            {item.Enseignant_telephone && (
                                                <div><FaPhone className="inline text-gray-400" /> {item.Enseignant_telephone}</div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            Aucun élément trouvé.
                                        </td>
                                    </tr>
                                )}

                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* Modal enseignant */}
            <TeacherFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={currentItem || {}}
                onChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title={currentItem?.Enseignant_id ? "Modifier" : "Nouveau"}
                composantesList={composantesList}
            />

            {/* Confirm delete */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirmation"
            >
                <p>
                    Voulez-vous vraiment supprimer <b>{currentItem?.Enseignant_nom}</b> ?
                </p>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsDeleteOpen(false)} className={AppStyles.button.secondary}>
                        Non
                    </button>
                    <button onClick={handleDelete} className={AppStyles.button.danger}>
                        Oui
                    </button>
                </div>
            </ConfirmModal>

        </div>
    );
}
