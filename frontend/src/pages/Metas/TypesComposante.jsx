// frontend/src/pages/Metadonnees/TypesComposante.jsx
import React, { useState, useEffect } from "react";
import { AppStyles } from "../../components/ui/AppStyles";
import { PlusIcon, EditIcon, TrashIcon, SpinnerIcon } from "../../components/ui/Icons";
import { DraggableModal, ConfirmModal } from "../../components/ui/Modal";

// Configuration de l'URL API
const API_BASE_URL = "http://127.0.0.1:8000";
// L'URL pointe vers le routeur 'metadonnees'
const TYPES_COMPOSANTE_URL = `${API_BASE_URL}/api/metadonnees/types-composante`; 

export default function TypesComposante() {
  const [types, setTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({ id: "", label: "", description: "" });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      // Le backend, grâce au joinedload(), renverra désormais une liste 'composantes' dans chaque objet
      const res = await fetch(TYPES_COMPOSANTE_URL); 
      if (res.ok) setTypes(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const generateNextId = () => {
    if (types.length === 0) return "TYCO_01";
    // Extraire les numéros, trier, trouver le max pour générer le suivant
    const nums = types.map(t => {
        const parts = t.TypeComposante_id.split('_');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    });
    const max = Math.max(...nums);
    const next = max + 1;
    return `TYCO_${String(next).padStart(2, '0')}`;
  };

  const openModal = (item = null) => {
    setEditItem(item);
    if (item) {
      setForm({
        id: item.TypeComposante_id,
        label: item.TypeComposante_label,
        description: item.TypeComposante_description || ""
      });
    } else {
      setForm({ id: generateNextId(), label: "", description: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Payload pour la création (nécessite l'ID)
    const payloadCreate = {
      id_type_composante: form.id, 
      label: form.label,
      description: form.description
    };
    
    // Payload pour la mise à jour (pas d'ID dans le corps)
    const payloadUpdate = {
      label: form.label,
      description: form.description
    };

    const method = editItem ? "PUT" : "POST";
    const url = editItem 
      ? `${TYPES_COMPOSANTE_URL}/${form.id}`
      : `${TYPES_COMPOSANTE_URL}`;
    
    const bodyPayload = editItem ? payloadUpdate : payloadCreate;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        fetchTypes(); // Recharger la liste pour voir les changements
        setModalOpen(false);
      } else {
        const error = await res.json();
        console.error("Erreur API:", error.detail);
        alert(`Erreur: ${error.detail}`);
      }
    } catch (e) { console.error(e); alert("Erreur de connexion au serveur."); }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`${TYPES_COMPOSANTE_URL}/${itemToDelete.TypeComposante_id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) { 
          // Mise à jour optimiste de l'état local
          setTypes(prev => prev.filter(t => t.TypeComposante_id !== itemToDelete.TypeComposante_id));
          setDeleteModalOpen(false);
      } else {
          const error = await res.json();
          alert(`Erreur suppression: ${error.detail}`);
      }
    } catch (e) { console.error(e); alert("Erreur lors de la suppression."); }
  };

  if (isLoading) return <div className="p-4"><SpinnerIcon className="animate-spin text-blue-600"/></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-700">Liste des Types d'Etablissement</h3>
        <button onClick={() => openModal()} className={AppStyles.button.primary}>
          <PlusIcon /> Nouveau
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs leading-normal">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Libellé</th>
              <th className="px-4 py-3">Description</th>
              {/* ✅ AJOUT : Nouvel en-tête de colonne */}
              <th className="px-4 py-3">Composantes liées</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((t) => (
              <tr key={t.TypeComposante_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{t.TypeComposante_id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{t.TypeComposante_label}</td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-xs" title={t.TypeComposante_description}>
                    {t.TypeComposante_description || "-"}
                </td>
                
                {/* ✅ AJOUT : Nouvelle cellule pour afficher les badges des composantes */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.composantes && t.composantes.length > 0 ? (
                      // Itération sur la liste des composantes renvoyée par l'API
                      t.composantes.map((comp, index) => (
                        <span 
                          key={index} 
                          // Badge style : petit, arrondi, fond bleu clair, texte bleu foncé
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                          // Affiche l'abréviation s'il y en a une, sinon un "?"
                          title={comp.Composante_abbreviation || "Sans abréviation"} 
                        >
                          {comp.Composante_abbreviation || "?"}
                        </span>
                      ))
                    ) : (
                      // Affichage discret si aucune composante n'est liée
                      <span className="text-xs text-gray-400 italic">Aucune affectation</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 flex justify-end gap-2">
                  <button onClick={() => openModal(t)} className="text-gray-400 hover:text-blue-600 transition-colors p-1"><EditIcon /></button>
                  <button onClick={() => { setItemToDelete(t); setDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 transition-colors p-1"><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {types.length === 0 && !isLoading && (
            <div className="text-center py-4 text-gray-500 text-sm">Aucun type de composante défini.</div>
        )}
      </div>

      {/* Modal de Création / Edition */}
      <DraggableModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Modifier le Type" : "Nouveau Type"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <span className={AppStyles.input.label}>ID (Généré auto.)</span>
            <input value={form.id} disabled className={AppStyles.input.formControlDisabled} />
          </div>
          <div>
            <span className={AppStyles.input.label}>Libellé <span className="text-red-500">*</span></span>
            <input 
                value={form.label} 
                onChange={e => setForm({...form, label: e.target.value})} 
                className={AppStyles.input.formControl} 
                required 
                placeholder="Ex: Etablissement Public..."
            />
          </div>
          <div>
            <span className={AppStyles.input.label}>Description</span>
            <textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                className={AppStyles.input.formControl} 
                rows="3" 
                placeholder="Description optionnelle..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t mt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
            <button type="submit" className={AppStyles.button.primary}>{editItem ? "Mettre à jour" : "Enregistrer"}</button>
          </div>
        </form>
      </DraggableModal>

      {/* Modal de Confirmation de Suppression */}
      <ConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Supprimer ce type ?">
        <div className="text-sm text-gray-600 space-y-2">
            <p>Êtes-vous sûr de vouloir supprimer le type <strong>{itemToDelete?.TypeComposante_label}</strong> ({itemToDelete?.TypeComposante_id}) ?</p>
            <p className="text-red-600 bg-red-50 p-2 rounded border border-red-100">
                ⚠️ Attention : Cette action sera bloquée si des composantes sont actuellement liées à ce type.
            </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteModalOpen(false)} className={AppStyles.button.secondary}>Annuler</button>
            <button onClick={handleDelete} className={AppStyles.button.danger}>Confirmer la suppression</button>
        </div>
      </ConfirmModal>
    </div>
  );
}