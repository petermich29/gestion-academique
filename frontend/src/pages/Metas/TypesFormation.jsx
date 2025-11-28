// gestion-academique\frontend\src\pages\Metas\TypesFormation.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// --- CONFIGURATION SPÉCIFIQUE ---
const CONFIG = {
  title: "Types de Formation",
  // CORRECTION 1 : Ajout de /api/
  apiUrl: "http://localhost:8000/api/metadonnees/types-formation", 
  // CORRECTION 2 : ID du modèle SQLAlchemy
  idField: "TypeFormation_id",
  fields: {
    code: { label: "Code", placeholder: "ex: FI" },
    label: { label: "Libellé", placeholder: "ex: Formation Initiale" },
    description: { label: "Description", placeholder: "" }
  }
};
// ---------------------------------------------------------------------

// CORRECTION 3 : Renommer l'export si le fichier est TypesFormation.jsx
export default function TypesFormation() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // États Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // État Formulaire
  const [formData, setFormData] = useState({ code: "", label: "", description: "" });

  // 1. Fetch Data (Rien à changer ici)
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONFIG.apiUrl);
      // Correction implicite : Les données sont déjà mappées correctement pour la lecture
      setData(response.data);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Handlers Formulaire
  const openAddModal = () => {
    setCurrentResult(null);
    setFormData({ code: "", label: "", description: "" });
    setIsEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentResult(item);
    // CORRECTION (Lecture) : Les noms utilisés dans item doivent être les noms du modèle SQLAlchemy (ou les noms dans le JSON renvoyé par le backend)
    setFormData({
      code: item.TypeFormation_code || "",
      label: item.TypeFormation_label || "",
      description: item.TypeFormation_description || ""
    });
    setIsEditModalOpen(true);
  };

  // CORRECTION 4 : Modification de handleSave pour envoyer le bon format au backend
  const handleSave = async (e) => {
    e.preventDefault();
    
    // PAYLOAD CORRIGÉ : Utiliser les noms de champs Pydantic/SQL Alchemy
    const payload = {
      TypeFormation_code: formData.code,
      TypeFormation_label: formData.label,
      TypeFormation_description: formData.description
    };
    
    try {
      if (currentResult) {
        // UPDATE
        const id = currentResult[CONFIG.idField];
        await axios.put(`${CONFIG.apiUrl}/${id}`, payload); // Utiliser 'payload'
      } else {
        // CREATE
        await axios.post(CONFIG.apiUrl, payload); // Utiliser 'payload'
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement. Vérifiez les doublons.";
      alert(`Erreur: ${JSON.stringify(message)}`);
    }
  };

  // 3. Handlers Suppression (Rien à changer ici)
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
    }
  };

  return (
    <div className="animate-fade-in">
      {/* En-tête avec AppStyles */}
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
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Chargement...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Aucune donnée</td></tr>
            ) : (
              data.map((item) => (
                // CORRECTION (Affichage) : Utiliser les noms de propriétés exacts du backend
                <tr key={item[CONFIG.idField]} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.TypeFormation_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.TypeFormation_code}</td>
                  <td className="px-4 py-3 text-gray-700">{item.TypeFormation_label}</td>
                  <td className="px-4 py-3 text-gray-500 italic truncate max-w-xs">{item.TypeFormation_description}</td>
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

      {/* MODALES : Le contenu du formulaire est correct car il utilise formData */}
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

          <div>
            <label className={AppStyles.input.label}>{CONFIG.fields.description.label}</label>
            <textarea
              className={AppStyles.input.formControl}
              rows="3"
              placeholder={CONFIG.fields.description.placeholder}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-600 mb-6">
          Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.
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