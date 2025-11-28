import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// --- CONFIGURATION SPÉCIFIQUE ---
const CONFIG = {
  title: "Listes des Domaines",
  // 1. Assurez-vous que le préfixe /api est présent si votre main.py l'utilise
  apiUrl: "http://localhost:8000/api/metadonnees/domaines",
  // 2. Utilisez le nom exact de la clé primaire renvoyée par le backend (modèle SQLAlchemy)
  idField: "Domaine_id", 
  fields: {
    code: { label: "Code", placeholder: "ex: SCI" },
    label: { label: "Libellé", placeholder: "ex: Sciences et Technologies" },
    description: { label: "Description", placeholder: "Description facultative" }
  }
};
// ---------------------------------------------------------------------

export default function Domaines() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // États Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // État Formulaire
  const [formData, setFormData] = useState({ code: "", label: "", description: "" });

  // 1. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONFIG.apiUrl);
      // console.log("Données reçues:", response.data); // Décommentez pour voir la structure exacte
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
    // 4. CORRECTION ICI : On mappe les noms de champs du Backend (ex: Domaine_code)
    // vers les noms de champs du formulaire (ex: code)
    setFormData({
      code: item.Domaine_code || "",
      label: item.Domaine_label || "",
      description: item.Domaine_description || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentResult) {
        // UPDATE
        const id = currentResult[CONFIG.idField];
        // Note: Le backend attend probablement les champs 'code', 'label', 'description' via Pydantic,
        // donc formData est correct ici.
        await axios.put(`${CONFIG.apiUrl}/${id}`, formData);
      } else {
        // CREATE
        await axios.post(CONFIG.apiUrl, formData);
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de l'enregistrement. Vérifiez les doublons.");
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
      alert("Erreur lors de la suppression. Vérifiez si ce domaine est utilisé ailleurs.");
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

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">{CONFIG.fields.code.label}</th>
              <th className="px-4 py-3">{CONFIG.fields.label.label}</th>
              <th className="px-4 py-3">{CONFIG.fields.description.label}</th>
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
                <tr key={item[CONFIG.idField]} className="hover:bg-blue-50/30 transition-colors">
                  {/* 3. CORRECTION ICI : Utilisation des noms de propriétés exacts du backend */}
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.Domaine_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.Domaine_code}</td>
                  <td className="px-4 py-3 text-gray-700">{item.Domaine_label}</td>
                  <td className="px-4 py-3 text-gray-500 italic truncate max-w-xs">{item.Domaine_description}</td>
                  
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

      {/* MODALE DE CONFIRMATION */}
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