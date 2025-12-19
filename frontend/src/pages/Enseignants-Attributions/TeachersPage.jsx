// frontend\src\pages\Enseignants-Attributions\TeachersPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    FaSearch, FaPlus, FaEdit, FaTrash, FaUser,
    FaPhone, FaEnvelope
} from "react-icons/fa";

import { ToastContainer } from "../../components/ui/Toast";
import { TeacherFormModal } from "./components/TeachersForms";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function TeachersPage() {

    const [dataList, setDataList] = useState([]);
    const [composantesList, setComposantesList] = useState([]); // Liste simple pour l'affichage

    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [toasts, setToasts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // Pour le delete modal si besoin

    // --- Gestion des Toasts ---
    const addToast = (msg, type = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    // --- Chargement des données ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch des Enseignants
            const teachersRes = await fetch(`${API_BASE_URL}/api/enseignants?search=${searchTerm}`);
            if (!teachersRes.ok) throw new Error("Erreur chargement enseignants");
            const teachersData = await teachersRes.json();
            setDataList(teachersData.items || []);

            // 2. Fetch des Composantes (Via la route /options qui est légère et fonctionnelle)
            const composantesRes = await fetch(`${API_BASE_URL}/api/composantes/options`); 
            if (!composantesRes.ok) throw new Error("Erreur chargement composantes");
            const composantesData = await composantesRes.json();
            
            // On stocke la liste telle quelle : [{id, nom, institution_id}, ...]
            setComposantesList(composantesData); 
            
        } catch (error) {
            console.error(error);
            addToast("Erreur de connexion au serveur", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Suppression ---
    const handleDelete = async () => {
        if (!currentItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/enseignants/${currentItem.Enseignant_id}`, { 
                method: "DELETE" 
            });
            
            if (res.ok) {
                addToast("Enseignant supprimé avec succès");
                setIsDeleteOpen(false);
                fetchData(); // Rafraîchir la liste
            } else {
                addToast("Impossible de supprimer", "error");
            }
        } catch {
            addToast("Erreur réseau", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Helper pour trouver le nom de la composante ---
    const getComposanteName = (id) => {
        if (!id) return null;
        const comp = composantesList.find(c => c.id === id);
        return comp ? comp.nom : id;
    };

    return (
        <div className="mt-2 animate-in fade-in duration-500">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* BARRE D'OUTILS */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <div className="relative w-96">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher nom, prénom..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => { setCurrentItem(null); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                    <FaPlus /> Nouvel Enseignant
                </button>
            </div>

            {/* TABLEAU */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Chargement...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold border-b">
                            <tr>
                                <th className="p-4">Identité & Grade</th>
                                <th className="p-4">Statut / Affectation</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dataList.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400 italic">Aucun enseignant trouvé.</td>
                                </tr>
                            ) : (
                                dataList.map(item => (
                                    <tr key={item.Enseignant_id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 border overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                                                    {item.Enseignant_photo_profil_path ? (
                                                        <img src={`${API_BASE_URL}/${item.Enseignant_photo_profil_path}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FaUser className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{item.Enseignant_nom} {item.Enseignant_prenoms}</div>
                                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tight flex items-center gap-2">
                                                        <span>{item.Enseignant_grade || "Sans grade"}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="text-gray-400 font-mono">{item.Enseignant_id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                item.Enseignant_statut === 'PERM' 
                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {item.Enseignant_statut === 'PERM' ? 'PERMANENT' : 'VACATAIRE'}
                                            </span>
                                            
                                            {/* Affichage Conditionnel de l'affectation */}
                                            {item.Enseignant_statut === 'PERM' && item.Composante_id_affectation_fk && (
                                                <div className="text-[11px] text-gray-600 mt-1.5 font-medium flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                    {getComposanteName(item.Composante_id_affectation_fk) || "Etablissement inconnu"}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2"><FaEnvelope className="text-gray-300" /> {item.Enseignant_mail || "-"}</div>
                                            <div className="flex items-center gap-2"><FaPhone className="text-gray-300" /> {item.Enseignant_telephone || "-"}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setCurrentItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><FaEdit /></button>
                                                <button onClick={() => { setCurrentItem(item); setIsDeleteOpen(true); }} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL FORMULAIRE */}
            <TeacherFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={currentItem}
                reloadList={fetchData}
            />

            {/* MODAL SUPPRESSION SIMPLE (Inline pour éviter un autre fichier) */}
            {isDeleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer la suppression ?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            L'enseignant <span className="font-bold text-gray-800">{currentItem?.Enseignant_nom}</span> sera définitivement supprimé.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Annuler</button>
                            <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-200">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}