// src/pages/Administration/Domaines.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

const CONFIG = {
  title: "Listes des Domaines",
  // Assure-toi que c'est la bonne URL de base (ex: /api/metadonnees/domaines)
  apiUrl: "http://localhost:8000/api/metadonnees/domaines",
  idField: "Domaine_id", 
  fields: {
    code: { label: "Code", placeholder: "ex: SCI" },
    label: { label: "Libellé", placeholder: "ex: Sciences et Technologies" },
    description: { label: "Description", placeholder: "Description facultative" }
  }
};

export default function Domaines() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  // Ajout du champ 'id' dans le state du formulaire
  const [formData, setFormData] = useState({ id: "", code: "", label: "", description: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONFIG.apiUrl);
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

  // --- MODIFICATION ICI : Récupérer le prochain ID ---
  const openAddModal = async () => {
    setCurrentResult(null);
    // On met un placeholder en attendant la réponse de l'API
    setFormData({ id: "Chargement...", code: "", label: "", description: "" });
    setIsEditModalOpen(true);

    try {
      // Appel à la route /next-id (assure-toi qu'elle existe dans ton router)
      const res = await axios.get(`${CONFIG.apiUrl}/next-id`);
      setFormData(prev => ({ ...prev, id: res.data }));
    } catch (error) {
      console.error("Impossible de récupérer l'ID suivant", error);
      setFormData(prev => ({ ...prev, id: "Erreur" }));
    }
  };

  const openEditModal = (item) => {
    setCurrentResult(item);
    setFormData({
      id: item.Domaine_id, // On remplit l'ID existant
      code: item.Domaine_code || "",
      label: item.Domaine_label || "",
      description: item.Domaine_description || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
       // Payload pour l'API
      const payload = {
        code: formData.code,
        label: formData.label,
        description: formData.description
      };

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
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de l'enregistrement. Vérifiez les doublons ou la connexion.");
    }
  };

  // ... (Reste du code: openDeleteModal, handleDelete inchangés) ...
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
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    // MODIFICATION EFFECTUÉE ICI pour correspondre à TypesFormation.jsx
    <div className="animate-fade-in"> 
      <div className={AppStyles.header.container}>
        
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
          {CONFIG.title}
        </h2>

        <button onClick={openAddModal} className={AppStyles.button.primary}>
          + Ajouter
        </button>
      </div>
      
      {/* <hr className="mt-2 mb-6 border-gray-200" /> */}
      {/* Ce séparateur n'existe pas non plus dans TypesFormation.jsx, 
      je le laisse commenté pour que vous puissiez choisir. */}

      {/* Tableau ... (Code existant inchangé) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
               <th className="px-4 py-3">ID</th>
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
                <tr key={item.Domaine_id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.Domaine_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.Domaine_code}</td>
                  <td className="px-4 py-3 text-gray-700">{item.Domaine_label}</td>
                  <td className="px-4 py-3 text-gray-500 italic truncate max-w-xs">{item.Domaine_description}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">Éditer</button>
                    <button onClick={() => openDeleteModal(item)} className="text-red-500 hover:text-red-700 font-medium hover:underline">Supprimer</button>
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
          
          {/* NOUVEAU CHAMP : ID (Lecture seule) */}
          <div>
            <label className={AppStyles.input.label}>Identifiant (Généré)</label>
            <input
              type="text"
              disabled
              className={AppStyles.input.formControlDisabled} // Utilise le style grisé
              value={formData.id}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

      {/* MODALE DE CONFIRMATION ... (Reste inchangé) */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-600 mb-6">
          Voulez-vous vraiment supprimer cet élément ?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setIsDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
          <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
        </div>
      </ConfirmModal>
    </div>
  );
}