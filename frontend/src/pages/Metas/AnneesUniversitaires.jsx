import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// --- CONFIGURATION SPÉCIFIQUE ---
const CONFIG = {
  title: "Années Universitaires",
  // 1. CORRECTION: Ajout du préfixe "/api" si votre main.py l'utilise
  apiUrl: "http://localhost:8000/api/metadonnees/annees-universitaires",
  // 2. Utilisez le nom exact de la clé primaire renvoyée par le backend (modèle SQLAlchemy)
  idField: "AnneeUniversitaire_id", // Assurez-vous que c'est le nom exact de la propriété ID renvoyée
  fields: {
    annee: { label: "Année (Code)", placeholder: "ex: 2024-2025" },
    ordre: { label: "Ordre", placeholder: "ex: 1" },
    description: { label: "Description", placeholder: "Description facultative" }
  }
};
// ---------------------------------------------------------------------

export default function AnneesUniversitaires() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false); // Ajout de l'état loading
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // Formulaire spécifique aux années
  const [formData, setFormData] = useState({ annee: "", ordre: "", description: "" });

  const fetchData = async () => {
    setLoading(true); // Début du chargement
    try {
      // console.log("Fetching data from:", CONFIG.apiUrl); // Pour le debug
      const response = await axios.get(CONFIG.apiUrl);
      // console.log("Data received for AnneesUniversitaires:", response.data); // Pour le debug
      setData(response.data);
    } catch (error) {
      console.error("Erreur chargement des années universitaires:", error);
      alert("Erreur lors du chargement des années universitaires. Veuillez vérifier la connexion.");
    } finally {
      setLoading(false); // Fin du chargement
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
      setCurrentResult(null);
      // CORRECTION : Utilisation du bon nom de propriété
      const maxOrdre = data.length > 0 ? Math.max(...data.map(d => d.AnneeUniversitaire_ordre)) : 0; 
      setFormData({ annee: "", ordre: maxOrdre + 1, description: "" });
      setIsEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentResult(item);
    // CORRECTION : Mapping correct
    setFormData({
      annee: item.AnneeUniversitaire_annee || "",
      ordre: item.AnneeUniversitaire_ordre || "",
      description: item.AnneeUniversitaire_description || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // **Payload Corrigé** : Utiliser les noms de champs Pydantic/SQLAlchemy
    const payload = {
      // Les clés envoyées doivent correspondre aux alias du Backend
      AnneeUniversitaire_annee: formData.annee, 
      AnneeUniversitaire_ordre: formData.ordre,
      AnneeUniversitaire_description: formData.description
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
      console.error("Erreur sauvegarde de l'année universitaire:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement. Vérifiez si l'année ou l'ordre existe déjà.";
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
      console.error("Erreur suppression des années universitaires:", error);
      alert("Erreur lors de la suppression de l'année universitaire. Vérifiez si elle est utilisée ailleurs.");
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
              <th className="px-4 py-3">ID (Auto)</th>
              <th className="px-4 py-3">{CONFIG.fields.annee.label}</th>
              <th className="px-4 py-3">{CONFIG.fields.ordre.label}</th>
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
                // 4. CORRECTION ICI : Utilisation des noms de propriétés exacts du backend pour l'affichage
                <tr key={item[CONFIG.idField]} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.AnneeUniversitaire_id}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{item.AnneeUniversitaire_annee}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                      {item.AnneeUniversitaire_ordre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 italic truncate max-w-xs">{item.AnneeUniversitaire_description}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEditModal(item)} className="text-blue-600 hover:underline">Éditer</button>
                    <button 
                      onClick={() => openDeleteModal(item)} 
                      className="text-red-500 hover:underline"
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
                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 0 })} // Convertir en nombre
              />
            </div>
          </div>
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
          <span className="font-semibold">{currentResult?.Annee_universitaire_annee}</span>" ?
          Cette action est irréversible et peut impacter les historiques étudiants.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setIsDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
          <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
        </div>
      </ConfirmModal>
    </div>
  );
}