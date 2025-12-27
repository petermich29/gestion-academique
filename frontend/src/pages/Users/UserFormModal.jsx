import React, { useState, useEffect } from "react";
import { AppStyles } from "../../components/ui/AppStyles";
import { DraggableModal } from "../../components/ui/Modal";
import { SpinnerIcon, PlusIcon } from "../../components/ui/Icons";
import { FaTrash, FaMapMarkerAlt } from "react-icons/fa";

const API_URL = "http://127.0.0.1:8000/api";

const UserFormModal = ({ isOpen, onClose, onSubmit, editUser }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "SECRETAIRE"
  });

  const [listData, setListData] = useState({
    institutions: [],
    etablissements: [],
    mentions: [],
    parcours: []
  });

  const [selectedScopes, setSelectedScopes] = useState([]);
  const [currentSelection, setCurrentSelection] = useState({ id: "", type: "" });

  const resetForm = () => {
    // 1. On vide les champs texte
    setForm({ username: "", password: "", role: "SECRETAIRE" });
    
    // 2. On vide toutes les listes (cela verrouille les selects via disabled)
    setListData({
        institutions: [],
        etablissements: [],
        mentions: [],
        parcours: []
    });

    // 3. On réinitialise la sélection actuelle (crucial pour le verrouillage)
    setCurrentSelection({ id: "", type: "" });
    
    // 4. On vide le panier de permissions
    setSelectedScopes([]);
    };

  // Chargement initial des institutions
  useEffect(() => {
    if (isOpen) {
        // Nettoyer d'abord pour éviter de voir les restes de la sélection précédente
        setListData(prev => ({ ...prev, etablissements: [], mentions: [], parcours: [] }));
        setCurrentSelection({ id: "", type: "" });

        // Charger les institutions
        fetch(`${API_URL}/institutions`)
        .then(res => res.json())
        .then(data => setListData(prev => ({ ...prev, institutions: data })));
        
        if (editUser) {
        setForm({ username: editUser.username, role: editUser.role, password: "" });
        setSelectedScopes(editUser.permissions.map(p => ({ id: p.entity_id, type: p.entity_type })));
        } else {
        setForm({ username: "", password: "", role: "SECRETAIRE" });
        setSelectedScopes([]);
        }
    }
    }, [isOpen, editUser]);

  // --- LOGIQUE DE CASCADE ---

  // 1. Pour les Institutions
    const handleInstChange = async (id) => {
        // Reset immédiat des listes dépendantes
        setListData(prev => ({ ...prev, etablissements: [], mentions: [], parcours: [] }));
        setCurrentSelection({ id, type: 'INSTITUTION' });

        if (!id) return;

        try {
            const res = await fetch(`${API_URL}/composantes/institution?institution_id=${id}`);
            if (res.ok) {
                const data = await res.json(); // Extraire d'abord
                setListData(prev => ({ ...prev, etablissements: data })); // Puis mettre à jour
            }
        } catch (error) {
            console.error("Erreur Institutions:", error);
        }
    };

    // 2. Pour les Établissements (Composantes)
    const handleEtabChange = async (id) => {
        setListData(prev => ({ ...prev, mentions: [], parcours: [] }));
        setCurrentSelection({ id, type: 'COMPOSANTE' });

        if (!id) return;

        try {
            const res = await fetch(`${API_URL}/mentions/composante/${id}`);
            if (res.ok) {
                const data = await res.json();
                setListData(prev => ({ ...prev, mentions: data }));
            }
        } catch (error) {
            console.error("Erreur Mentions:", error);
        }
    };

    // 3. Pour les Mentions
    const handleMentionChange = async (id) => {
        setListData(prev => ({ ...prev, parcours: [] }));
        setCurrentSelection({ id, type: 'MENTION' });

        if (!id) return;

        try {
            const res = await fetch(`${API_URL}/parcours/mention/${id}`);
            if (res.ok) {
                const data = await res.json();
                setListData(prev => ({ ...prev, parcours: data }));
            }
        } catch (error) {
            console.error("Erreur Parcours:", error);
        }
    };

  const addPermission = () => {
    if (currentSelection.id && !selectedScopes.find(s => s.id === currentSelection.id)) {
      setSelectedScopes([...selectedScopes, { ...currentSelection }]);
    }
  };

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={editUser ? "Modifier Utilisateur" : "Nouvel Utilisateur"}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, permissions: selectedScopes }); }} className="space-y-4 p-2">
        
        {/* Infos de base */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={AppStyles.input.label}>Nom d'utilisateur</span>
            <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} className={AppStyles.input.formControl} disabled={!!editUser}/>
          </label>
          <label className="block">
            <span className={AppStyles.input.label}>{editUser ? "Nouveau MDP (Optionnel)" : "Mot de passe"}</span>
            <input type="password" required={!editUser} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={AppStyles.input.formControl} />
          </label>
        </div>

        <hr className="my-4" />
        <h4 className="text-sm font-bold text-indigo-600 flex items-center gap-2">
          <FaMapMarkerAlt /> Configuration des périmètres (Cascade)
        </h4>

        {/* Cascade de selection */}
        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          {/* 1. Institution (Toujours éditable au départ) */}
            <select 
            onChange={e => handleInstChange(e.target.value)} 
            className={AppStyles.input.formControl}
            >
            <option value="">1. Choisir Institution...</option>
            {listData.institutions.map(i => (
                <option key={i.Institution_id} value={i.Institution_id}>{i.Institution_nom}</option>
            ))}
            </select>

            {/* 2. Établissement (Bloqué tant qu'aucune institution n'est choisie) */}
            <select 
            onChange={e => handleEtabChange(e.target.value)} 
            disabled={!currentSelection.id || currentSelection.type !== 'INSTITUTION' && listData.etablissements.length === 0} 
            className={`${AppStyles.input.formControl} ${(!listData.etablissements.length) ? 'bg-gray-100' : 'bg-white'}`}
            >
            <option value="">2. Choisir Établissement...</option>
            {listData.etablissements.map(e => (
                <option key={e.Composante_id} value={e.Composante_id}>
                {e.Composante_nom || e.Composante_label || "Sans nom"}
                </option>
            ))}
            </select>

            {/* 3. Mention (Bloqué tant qu'aucun établissement n'est choisi) */}
            <select 
            onChange={e => handleMentionChange(e.target.value)} 
            disabled={listData.mentions.length === 0} 
            className={`${AppStyles.input.formControl} ${(listData.mentions.length === 0) ? 'bg-gray-100' : 'bg-white'}`}
            >
            <option value="">3. Choisir Mention...</option>
            {listData.mentions.map(m => (
                <option key={m.Mention_id} value={m.Mention_id}>{m.Mention_label}</option>
            ))}
            </select>

            {/* 4. Parcours (Bloqué tant qu'aucune mention n'est choisie) */}
            <select 
            onChange={e => setCurrentSelection({id: e.target.value, type: 'PARCOURS'})} 
            disabled={listData.parcours.length === 0} 
            className={`${AppStyles.input.formControl} ${(listData.parcours.length === 0) ? 'bg-gray-100' : 'bg-white'}`}
            >
            <option value="">4. Choisir Parcours...</option>
            {listData.parcours.map(p => (
                <option key={p.Parcours_id} value={p.Parcours_id}>{p.Parcours_label}</option>
            ))}
            </select>

          <button type="button" onClick={addPermission} className="col-span-2 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 flex justify-center items-center gap-2 transition-all">
            <PlusIcon /> Ajouter ce périmètre à la liste
          </button>
        </div>

        {/* Panier de permissions */}
        <div className="border rounded-lg p-3 min-h-[100px] bg-white">
          <span className="text-xs font-bold text-gray-400 uppercase">Périmètres assignés</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedScopes.length === 0 && <p className="text-gray-300 text-sm italic">Aucun périmètre ajouté...</p>}
            {selectedScopes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs animate-in fade-in zoom-in duration-200">
                <span className="font-bold">[{s.type}]</span> {s.id}
                <button type="button" onClick={() => setSelectedScopes(selectedScopes.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className={AppStyles.button.secondary}>Annuler</button>
          <button type="submit" className={AppStyles.button.primary}>Enregistrer l'utilisateur</button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default UserFormModal;