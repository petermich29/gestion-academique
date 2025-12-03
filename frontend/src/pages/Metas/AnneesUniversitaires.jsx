import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// --- CONFIGURATION SPÉCIFIQUE ---
const CONFIG = {
  title: "Années Universitaires",
  apiUrl: "http://localhost:8000/api/metadonnees/annees-universitaires",
  idField: "AnneeUniversitaire_id",
  fields: {
    annee: { label: "Année (Code)", placeholder: "ex: 2024-2025" },
    ordre: { label: "Ordre", placeholder: "ex: 1" },
    description: { label: "Description", placeholder: "Description facultative" },
    isActive: { label: "Année en cours (Active)" } // Nouveau champ label
  }
};

export default function AnneesUniversitaires() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // Mise à jour du state initial pour inclure isActive
  const [formData, setFormData] = useState({ 
    annee: "", 
    ordre: "", 
    description: "", 
    isActive: false 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONFIG.apiUrl);
      setData(response.data);
    } catch (error) {
      console.error("Erreur chargement des années universitaires:", error);
      alert("Erreur lors du chargement des années universitaires.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
      setCurrentResult(null);
      const maxOrdre = data.length > 0 ? Math.max(...data.map(d => d.AnneeUniversitaire_ordre)) : 0; 
      // Reset form avec isActive à false par défaut
      setFormData({ annee: "", ordre: maxOrdre + 1, description: "", isActive: false });
      setIsEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentResult(item);
    setFormData({
      annee: item.AnneeUniversitaire_annee || "",
      ordre: item.AnneeUniversitaire_ordre || "",
      description: item.AnneeUniversitaire_description || "",
      // Récupération de la valeur booléenne
      isActive: item.AnneeUniversitaire_is_active || false 
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Payload correspondant aux alias Pydantic
    const payload = {
      AnneeUniversitaire_annee: formData.annee, 
      AnneeUniversitaire_ordre: formData.ordre,
      AnneeUniversitaire_description: formData.description,
      AnneeUniversitaire_is_active: formData.isActive
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
      console.error("Erreur sauvegarde :", error);
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement.";
      alert(`Erreur: ${JSON.stringify(message)}`);
    }
  };

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
      console.error("Erreur suppression :", error);
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className={AppStyles.header.container}>
        <h2 className={AppStyles.header.title}>{CONFIG.title}</h2>
        <button onClick={openAddModal} className={AppStyles.button.primary}>+ Ajouter</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Année</th>
              <th className="px-4 py-3">Statut</th> {/* Nouvelle colonne */}
              <th className="px-4 py-3">{CONFIG.fields.ordre.label}</th>
              <th className="px-4 py-3">{CONFIG.fields.description.label}</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">Chargement...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">Aucune donnée</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item[CONFIG.idField]} className={`hover:bg-blue-50/30 ${item.AnneeUniversitaire_is_active ? "bg-green-50/50" : ""}`}>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.AnneeUniversitaire_id}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{item.AnneeUniversitaire_annee}</td>
                  
                  {/* Badge Statut */}
                  <td className="px-4 py-3">
                    {item.AnneeUniversitaire_is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            ● Active
                        </span>
                    ) : (
                        <span className="text-gray-400 text-xs italic">Clôturée</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                      {item.AnneeUniversitaire_ordre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 italic truncate max-w-xs">{item.AnneeUniversitaire_description}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEditModal(item)} className="text-blue-600 hover:underline">Éditer</button>
                    <button onClick={() => openDeleteModal(item)} className="text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DraggableModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={currentResult ? `Modifier ${CONFIG.title}` : `Ajouter ${CONFIG.title}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={AppStyles.input.label}>{CONFIG.fields.annee.label}</label>
              <input
                type="text" required
                className={AppStyles.input.formControl}
                placeholder={CONFIG.fields.annee.placeholder}
                value={formData.annee}
                onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
              />
            </div>
            <div>
              <label className={AppStyles.input.label}>{CONFIG.fields.ordre.label}</label>
              <input
                type="number" required
                className={AppStyles.input.formControl}
                value={formData.ordre}
                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Nouvelle case à cocher pour is_active */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded border border-gray-200">
             <input
                id="isActiveCheckbox"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
             />
             <label htmlFor="isActiveCheckbox" className="text-sm font-medium text-gray-700 cursor-pointer">
                Définir comme <strong>Année Universitaire en cours</strong>
             </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1">
             ⚠️ Cocher cette case désactivera automatiquement l'année précédente.
          </p>

          <div>
            <label className={AppStyles.input.label}>{CONFIG.fields.description.label}</label>
            <textarea
              className={AppStyles.input.formControl}
              rows="2"
              placeholder={CONFIG.fields.description.placeholder}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" className={AppStyles.button.primary}>Enregistrer</button>
          </div>
        </form>
      </DraggableModal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-600 mb-6">
          Voulez-vous vraiment supprimer l'année universitaire "
          <span className="font-semibold">{currentResult?.AnneeUniversitaire_annee}</span>" ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setIsDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
          <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
        </div>
      </ConfirmModal>
    </div>
  );
}