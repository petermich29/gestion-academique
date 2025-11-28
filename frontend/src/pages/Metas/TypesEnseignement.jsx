// gestion-academique\frontend\src\pages\Metas\TypesEnseignement.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// --- CONFIGURATION SPÉCIFIQUE ---
const CONFIG = {
  title: "Types d'occupation des Enseignements sur les EC",
  // URL ajustée avec le préfixe /api
  apiUrl: "http://localhost:8000/api/metadonnees/types-enseignement",
  // Nom exact de la clé primaire (models.py)
  idField: "TypeEnseignement_id", 
  fields: {
    code: { label: "Code", placeholder: "ex: CM" },
    label: { label: "Libellé", placeholder: "ex: Cours Magistral" }
    // Note: Pas de champ description pour cette entité
  }
};
// ---------------------------------------------------------------------

export default function TypesEnseignement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // États Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // État Formulaire (Suppression du champ description)
  const [formData, setFormData] = useState({ code: "", label: "" });

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONFIG.apiUrl);
      setData(response.data);
    } catch (error) {
      console.error("Erreur chargement des types d'enseignement:", error);
      // Optionnel : Notification d'erreur ici
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Handlers Formulaire
  const openAddModal = () => {
    setCurrentResult(null); // Mode Création
    setFormData({ code: "", label: "" });
    setIsEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentResult(item); // Mode Édition
    // Mapping des champs Backend -> Frontend
    setFormData({
      code: item.TypeEnseignement_code || "",
      label: item.TypeEnseignement_label || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // On prépare l'objet exactement comme le Backend (schemas.py) l'attend
    // C'est-à-dire avec les clés "TypeEnseignement_..."
    const payload = {
      TypeEnseignement_code: formData.code,
      TypeEnseignement_label: formData.label
    };

    try {
      if (currentResult) {
        // UPDATE
        const id = currentResult[CONFIG.idField];
        await axios.put(`${CONFIG.apiUrl}/${id}`, payload);
      } else {
        // CREATE
        await axios.post(CONFIG.apiUrl, payload);
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erreur sauvegarde du type d'enseignement:", error);
      // Afficher le détail de l'erreur si disponible
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement.";
      alert(`Erreur : ${JSON.stringify(message)}`);
    }
  };

  // 3. Handlers Suppression
  const openDeleteModal = (item) => {
    setCurrentResult(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!currentResult) return;
    try {
      const id = currentResult[CONFIG.idField];
      await axios.delete(`${CONFIG.apiUrl}/${id}`);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Impossible de supprimer ce type (peut-être utilisé dans des volumes horaires ?).");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* En-tête */}
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>{CONFIG.title}</h2>
        <button onClick={openAddModal} className={AppStyles.button.primary}>
          + Ajouter
        </button>
      </div>

      {/* Tableau Stylisé */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">ID (Auto)</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Libellé</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-500">Chargement...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-500">Aucune donnée</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item[CONFIG.idField]} className="hover:bg-blue-50/30 transition-colors">
                  {/* Affichage des propriétés exactes du backend */}
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.TypeEnseignement_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.TypeEnseignement_code}</td>
                  <td className="px-4 py-3 text-gray-700">{item.TypeEnseignement_label}</td>
                  
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      Éditer
                    </button>
                    <button 
                      onClick={() => openDeleteModal(item)}
                      className="text-red-500 hover:text-red-700 font-medium hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE D'ÉDITION */}
      <DraggableModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={currentResult ? `Modifier ${CONFIG.title}` : `Ajouter ${CONFIG.title}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={AppStyles.input.label}>{CONFIG.fields.code.label}</label>
            <input
              type="text"
              required
              className={AppStyles.input.formControl}
              placeholder={CONFIG.fields.code.placeholder}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div>
            <label className={AppStyles.input.label}>{CONFIG.fields.label.label}</label>
            <input
              type="text"
              required
              className={AppStyles.input.formControl}
              placeholder={CONFIG.fields.label.placeholder}
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className={AppStyles.button.secondary}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={AppStyles.button.primary}
            >
              Enregistrer
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* MODALE DE CONFIRMATION */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-600 mb-6">
          Voulez-vous vraiment supprimer le type d'enseignement "
          <span className="font-semibold">{currentResult?.TypeEnseignement_label}</span>" ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className={AppStyles.button.secondary}
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            className={AppStyles.button.danger}
          >
            Supprimer
          </button>
        </div>
      </ConfirmModal>
    </div>
  );
}