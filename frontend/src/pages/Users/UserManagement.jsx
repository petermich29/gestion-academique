import React, { useState, useEffect } from "react";
import { AppStyles } from "../../components/ui/AppStyles";
import { PlusIcon, SpinnerIcon } from "../../components/ui/Icons";
import { ConfirmModal } from "../../components/ui/Modal";
import { FaUserShield, FaEdit, FaTrash, FaUserCircle } from "react-icons/fa";
import UserFormModal from "./UserFormModal"; // Import du composant séparé

const API_URL = "http://127.0.0.1:8000/api";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // 1. Charger la liste des utilisateurs
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Erreur lors du chargement des utilisateurs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 2. Gérer l'enregistrement (Création ou Mise à jour)
    const handleSaveUser = async (payload) => {
        const method = editUser ? "PUT" : "POST";
        const url = editUser ? `${API_URL}/users/${editUser.id}` : `${API_URL}/users`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setModalOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Erreur: ${err.detail || "Une erreur est survenue"}`);
            }
        } catch (error) {
            alert("Erreur réseau lors de l'enregistrement");
        }
    };

    // 3. Gérer la suppression
    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const res = await fetch(`${API_URL}/users/${deleteConfirm.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                setDeleteConfirm(null);
                fetchUsers();
            }
        } catch (error) {
            alert("Erreur lors de la suppression");
        }
    };

    if (isLoading) return <div className="p-10 text-center"><SpinnerIcon className="animate-spin h-8 w-8 mx-auto" /></div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUserShield className="text-indigo-600" /> Gestion des Comptes Secrétaires
                    </h1>
                    <p className="text-gray-500 text-sm">Créez et gérez les accès aux institutions, mentions et parcours.</p>
                </div>
                <button 
                    onClick={() => { setEditUser(null); setModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                >
                    <PlusIcon /> Nouveau Secrétaire
                </button>
            </div>

            {/* Table des utilisateurs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-4 text-sm font-semibold text-gray-600">Utilisateur</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Rôle</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Périmètres d'accès</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <FaUserCircle className="text-gray-400 text-2xl" />
                                        <span className="font-medium text-gray-700">{user.username}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-sm">
                                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-medium">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions?.length > 0 ? (
                                            user.permissions.map((p, idx) => (
                                                <span key={idx} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full">
                                                    {p.entity_type}: {p.entity_id}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Aucun accès spécifique</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => { setEditUser(user); setModalOpen(true); }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            onClick={() => setDeleteConfirm(user)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Formulaire (Séparé) */}
            <UserFormModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                onSubmit={handleSaveUser}
                editUser={editUser}
            />

            {/* Modal de Confirmation de suppression */}
            <ConfirmModal 
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title="Supprimer l'utilisateur"
                message={`Êtes-vous sûr de vouloir supprimer ${deleteConfirm?.username} ? Cette action supprimera également toutes ses permissions.`}
            />
        </div>
    );
};

export default UserManagement;