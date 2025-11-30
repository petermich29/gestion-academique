// src/pages/Administration/Domaines.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

const CONFIG = {
  title: "Listes des Domaines",
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
  
  // États Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
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

  // --- RENDU SPÉCIAL POUR LA COLONNE ETAB/MENTIONS ---
  const renderEtablissementMentions = (mentions) => {
    if (!mentions || mentions.length === 0) {
      return <span className="text-gray-400 italic text-xs pl-2">Aucune mention</span>;
    }

    // Regroupement par Code Etablissement
    const grouped = mentions.reduce((acc, mention) => {
      // On cherche l'abréviation, sinon le code, sinon "N/A"
      const compCode = mention.composante?.Composante_abbreviation 
                    || mention.composante?.Composante_code 
                    || "N/A";
      
      if (!acc[compCode]) {
        acc[compCode] = [];
      }
      acc[compCode].push(mention.Mention_label); 
      return acc;
    }, {});

    return (
      <div className="border border-gray-200 rounded overflow-hidden text-xs">
        {Object.entries(grouped).map(([etab, listeMentions], index) => (
          <div 
            key={index} 
            className={`flex flex-row ${index !== Object.keys(grouped).length - 1 ? 'border-b border-gray-200' : ''}`}
          >
            {/* GAUCHE : Code Etablissement */}
            {/* 💡 CORRECTION : Augmentation de la largeur de w-16 à w-24 pour les abréviations. */}
            <div className="w-24 flex-shrink-0 bg-blue-50 text-blue-700 font-bold p-2 flex items-center justify-center border-r border-gray-200">
              {etab}
            </div>
            
            {/* DROITE : Liste des mentions */}
            <div className="flex-1 p-2 bg-white text-gray-600 flex items-center flex-wrap gap-1">
              {listeMentions.join(", ")}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- HANDLERS ---
  const openAddModal = async () => {
    setCurrentResult(null);
    setFormData({ id: "Chargement...", code: "", label: "", description: "" });
    setIsEditModalOpen(true);
    try {
      const res = await axios.get(`${CONFIG.apiUrl}/next-id`);
      setFormData(prev => ({ ...prev, id: res.data }));
    } catch (error) {
      setFormData(prev => ({ ...prev, id: "Erreur" }));
    }
  };

  const openEditModal = (item) => {
    setCurrentResult(item);
    setFormData({
      id: item.Domaine_id,
      code: item.Domaine_code || "",
      label: item.Domaine_label || "",
      description: item.Domaine_description || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        label: formData.label,
        description: formData.description
      };
      if (currentResult) {
        await axios.put(`${CONFIG.apiUrl}/${currentResult[CONFIG.idField]}`, payload);
      } else {
        await axios.post(CONFIG.apiUrl, payload);
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Erreur enregistrement.");
    }
  };

  const openDeleteModal = (item) => {
    setCurrentResult(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!currentResult) return;
    try {
      await axios.delete(`${CONFIG.apiUrl}/${currentResult[CONFIG.idField]}`);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="animate-fade-in"> 
      <div className={AppStyles.header.container}>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{CONFIG.title}</h2>
        <button onClick={openAddModal} className={AppStyles.button.primary}>+ Ajouter</button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
               {/* 1. RETOUR DE L'ID */}
               <th className="px-4 py-3 w-24">ID</th> 
               <th className="px-4 py-3 w-20">Code</th>
               <th className="px-4 py-3 w-1/4">Domaine</th>
               <th className="px-4 py-3">Répartition (Établissement | Mentions)</th>
               <th className="px-4 py-3 text-right w-24">Actions</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Chargement...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Aucune donnée</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.Domaine_id} className="hover:bg-blue-50/30 transition-colors align-top">
                  
                  {/* 1. AFFICHAGE ID */}
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs pt-4">
                    {item.Domaine_id}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800 font-mono pt-4">
                    {item.Domaine_code}
                  </td>
                  
                  <td className="px-4 py-3 pt-4">
                    <div className="text-gray-700 font-medium">{item.Domaine_label}</div>
                    <div className="text-gray-400 text-xs italic mt-1">{item.Domaine_description}</div>
                  </td>
                  
                  <td className="px-4 py-3">
                     {renderEtablissementMentions(item.mentions)}
                  </td>
                  
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap pt-4">
                    <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">Éditer</button>
                    <button onClick={() => openDeleteModal(item)} className="text-red-500 hover:text-red-700 font-medium hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALES EDIT & DELETE */}
      <DraggableModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={currentResult ? `Modifier ${CONFIG.title}` : `Ajouter ${CONFIG.title}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={AppStyles.input.label}>Identifiant</label>
            <input type="text" disabled className={AppStyles.input.formControlDisabled} value={formData.id} />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={AppStyles.input.label}>{CONFIG.fields.code.label}</label>
                <input type="text" required className={AppStyles.input.formControl} placeholder={CONFIG.fields.code.placeholder} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div>
                <label className={AppStyles.input.label}>{CONFIG.fields.label.label}</label>
                <input type="text" required className={AppStyles.input.formControl} placeholder={CONFIG.fields.label.placeholder} value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
              </div>
          </div>
          <div>
            <label className={AppStyles.input.label}>{CONFIG.fields.description.label}</label>
            <textarea className={AppStyles.input.formControl} rows="3" placeholder={CONFIG.fields.description.placeholder} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
        <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer cet élément ?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setIsDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
          <button onClick={handleDelete} className={AppStyles.button.danger}>Supprimer</button>
        </div>
      </ConfirmModal>
    </div>
  );
}