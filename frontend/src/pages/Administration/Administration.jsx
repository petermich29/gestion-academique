// frontend/src/pages/Administration/Administration.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
// AJOUT de FaTrash pour la suppression
import { FaTh, FaList, FaPlus, FaEdit, FaSpinner, FaTrash } from "react-icons/fa"; 
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://127.0.0.1:8000/api";

// Regex pour extraire le numéro : INST_0002 -> 0002
const ID_REGEX = /INST_(\d+)/;

/**
 * Calcule le prochain ID séquentiel basé sur le dernier ID trouvé.
 */
const getNextId = (lastId) => {
    if (!lastId) return "INST_0001";
    
    const match = lastId.match(ID_REGEX);
    if (!match) return "INST_0001"; 

    const lastNumber = parseInt(match[1], 10);
    const nextNumber = lastNumber + 1;
    const nextNumberFormatted = String(nextNumber).padStart(4, '0');
    
    return `INST_${nextNumberFormatted}`;
};


const Administration = () => {
  const [institutions, setInstitutions] = useState([]);
  const [lastInstitutionId, setLastInstitutionId] = useState(""); 
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // MODIFICATION 1/3 : AJOUT du champ 'code' dans l'état du formulaire
  const [form, setForm] = useState({
    id: "",
    code: "", // <-- NOUVEAU
    nom: "",
    type: "",
    sigle: "",
    description: "",
    logo: null,
    logoPath: "",
  });
  
  const [errors, setErrors] = useState({});
  const [editInstitution, setEditInstitution] = useState(null);
  
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 50, left: 0 });

  const navigate = useNavigate();
  const { setBreadcrumb } = useOutletContext() || {};
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  const typesInstitution = ["PRIVE", "PUBLIC"];
  
  // ------------------ Chargement des données et dernier ID ------------------

  useEffect(() => {
    if (setBreadcrumb)
      setBreadcrumb([{ label: "Administration", path: "/administration" }]);

    setIsLoading(true);
    fetch(`${API_URL}/institutions`)
      .then((res) => {
            if (!res.ok) {
                console.error("Erreur HTTP:", res.status);
                return res.json().catch(() => ({ detail: `Erreur serveur ${res.status}` })); 
            }
            return res.json();
        })
      .then((data) => {
            if (data && data.detail) {
                console.error("Détail de l'erreur API:", data.detail);
                setInstitutions([]); 
                return; 
            }

        const list = Array.isArray(data) ? data : [];
        setInstitutions(list);
        
        // Trouver l'ID le plus grand numériquement pour la séquence
        if (list.length > 0) {
          const maxId = list.reduce((max, current) => {
                // Utilisation du nom de champ original: Institution_id
            if (current.Institution_id && ID_REGEX.test(current.Institution_id)) {
              const currentNum = parseInt(current.Institution_id.match(ID_REGEX)[1], 10);
              const maxNum = max ? parseInt(max.match(ID_REGEX)[1], 10) : 0;
              return currentNum > maxNum ? current.Institution_id : max;
            }
            return max;
          }, "");
          setLastInstitutionId(maxId);
        }
      })
      .catch((err) => console.error("Erreur de connexion:", err))
      .finally(() => setIsLoading(false));
  }, [setBreadcrumb]);

  // ------------------ Fonctions du Modal ------------------

  const closeModal = () => {
    setModalOpen(false);
    setEditInstitution(null);
    // Réinitialisation complète du formulaire, y compris 'code'
    setForm({ id: "", code: "", nom: "", type: "", sigle: "", description: "", logo: null, logoPath: "" }); 
    setErrors({});
  };

  const openModal = (inst = null) => {
    const centerX = window.innerWidth / 2 - 250; 
    setModalPos({ top: 50, left: centerX > 0 ? centerX : 20 });

    if (inst) {
        // Chargement du champ 'code' (en supposant que le backend le renvoie)
      setForm({
        id: inst.Institution_id || "",
        code: inst.Institution_code || "", // <-- NOUVEAU
        nom: inst.Institution_nom || "",
        type: inst.Institution_type || "",
        sigle: inst.Institution_abbreviation || "",
        description: inst.Institution_description || "",
        logo: null,
        logoPath: inst.Institution_logo_path || "",
      });
    } else {
      // GÉNÉRATION DU NOUVEL ID
      const newId = getNextId(lastInstitutionId);

      setForm({
        id: newId, 
        code: "", // <-- NOUVEAU
        nom: "",
        type: "",
        sigle: "",
        description: "",
        logo: null,
        logoPath: "",
      });
    }

    setErrors({});
    setEditInstitution(inst);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };
  
  // ------------------ Logique du Drag du Modal (inchangée) ------------------

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !modalRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = modalRef.current;
    
    let left = e.clientX - dragOffset.x;
    let top = e.clientY - dragOffset.y;

    left = Math.max(0, Math.min(window.innerWidth - w, left));
    top = Math.max(0, Math.min(window.innerHeight - h, top));
    
    setModalPos({ top, left });
  }, [dragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    const isHeaderClick = e.target.closest('.modal-drag-handle');
    if (!isHeaderClick) return;

    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // ------------------ Soumission du Formulaire ------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrors = {};
    // MODIFICATION 2/3 : AJOUT de la validation du 'code'
    if (!form.code) newErrors.code = "Le code est obligatoire.";
    if (!form.nom) newErrors.nom = "Le nom est obligatoire.";
    if (!form.type) newErrors.type = "Le type est obligatoire.";
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length) {
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    // 🚨 CORRECTION CRITIQUE : Utiliser les noms d'arguments exacts du backend (id_institution, code, nom, etc.)
    Object.entries({
      // Noms attendus par FastAPI (arguments de la fonction)
      id_institution: form.id,
      code: form.code,
      nom: form.nom,
      type_institution: form.type, // Renommé de 'type' à 'type_institution' pour correspondre à FastAPI
      abbreviation: form.sigle,
      description: form.description,
    }).forEach(([k, v]) => {
        // Ajoute la valeur si elle n'est pas undefined (ce qui gère l'exclusion du logo_path)
        if (v !== undefined) {
          // Si la valeur est null, elle sera envoyée comme chaîne vide, ce qui est géré par le backend
          formData.append(k, v || ""); 
        }
    });

    // Le fichier doit utiliser le nom 'logo_file'
    if (form.logo) formData.append("logo_file", form.logo);

    try {
      const method = editInstitution ? "PUT" : "POST";
      const res = await fetch(`${API_URL}/institutions`, {
        method: method,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        const errObj = {};
        
        if (typeof errData.detail === "string") {
          if (errData.detail.includes("Institution_id")) {
            errObj.id = "L'ID généré est déjà utilisé. Veuillez recharger la page.";
          } else if (errData.detail.includes("Institution_nom")) {
            errObj.nom = "Ce nom d'institution existe déjà.";
          } else if (errData.detail.includes("Institution_code")) {
            errObj.code = "Ce code d'institution est déjà utilisé.";
          } else {
            alert(`Erreur lors de la ${method === 'POST' ? 'création' : 'modification'} : ${errData.detail}`);
          }
        } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
            // Gestion des erreurs Pydantic de validation (ex: champ manquant)
             alert(`Erreur de validation: un champ est manquant ou invalide. Détail: ${errData.detail[0].loc[1]}`);
        }
        setErrors(errObj);
        setIsSubmitting(false);
        return;
      }

      const newInst = await res.json();

      setInstitutions((prev) =>
        editInstitution
          ? prev.map((i) =>
              i.Institution_id === editInstitution.Institution_id ? newInst : i
            )
          : [...prev, newInst]
      );
      
      // Mise à jour du dernier ID après insertion réussie
      if (!editInstitution) {
        setLastInstitutionId(newInst.Institution_id);
      }

      closeModal(); 
    } catch (err) {
      alert("Erreur de connexion au serveur : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
    
    // NOUVEAU : Fonction de suppression
    const handleDelete = async (institutionId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette institution ? Cette action est irréversible.")) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/institutions/${institutionId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errData = await res.json();
                alert(`Erreur lors de la suppression: ${errData.detail}`);
                return;
            }

            // Supprimer l'institution de l'état local
            setInstitutions((prev) => 
                prev.filter((i) => i.Institution_id !== institutionId)
            );
            
        } catch (err) {
            alert("Erreur de connexion au serveur lors de la suppression.");
        }
    };


  // ------------------ Rendu ------------------

  const filtered = institutions.filter((inst) =>
    // Recherche sur le Nom, le Sigle et maintenant le Code
    (inst.Institution_nom + ' ' + (inst.Institution_code || '') + ' ' + (inst.Institution_abbreviation || '')).toLowerCase().includes(search.toLowerCase())
  );
  
  if (isLoading) {
  	return (
          <div className="p-10 flex flex-col items-center justify-center text-gray-500">
              <FaSpinner className="animate-spin text-4xl mb-4" />
              <p>Chargement des institutions...</p>
          </div>
      );
  }

  const InstitutionItem = ({ inst, grid = true }) => {
    const handleClick = () =>
      navigate(`/institution/${inst.Institution_id}`);

    const commonClass = "cursor-pointer transition relative";
    const base = grid
      ? "p-4 bg-white rounded-lg flex flex-col items-center gap-2 shadow hover:shadow-lg hover:bg-blue-50 duration-200"
      : "flex items-center gap-4 p-3 bg-white rounded shadow hover:shadow-md hover:bg-blue-50 duration-200";

    return (
      <div className={`${commonClass} ${base}`} onClick={handleClick}>
        {inst.Institution_logo_path ? (
          <img
            src={`http://127.0.0.1:8000${inst.Institution_logo_path}`}
            alt={`Logo de ${inst.Institution_nom}`}
            className={grid ? "w-20 h-20 object-cover mb-2 rounded-full border border-gray-200" : "w-16 h-16 object-cover rounded-full border border-gray-200"}
          />
        ) : (
          <HiOutlineBuildingLibrary className={grid ? "w-20 h-20 text-gray-700" : "w-16 h-16 text-gray-700"} />
        )}
        <div className={grid ? "text-center" : "flex-1"}>
          <p className="text-lg font-semibold">{inst.Institution_nom}</p>
          {/* MODIFICATION 3/3 : AFFICHAGE du code et des autres infos */}
          <p className="text-gray-600 text-sm">
            {inst.Institution_type} {inst.Institution_abbreviation && `(${inst.Institution_abbreviation})`}
          </p>
          <p className="text-gray-500 text-xs">Code: {inst.Institution_code}</p>
        </div>
        {/* AJOUT des boutons Éditer et Supprimer */}
        <div className="absolute top-2 right-2 flex gap-1">
            <FaEdit
                className="text-blue-600 hover:text-blue-800 cursor-pointer p-1 rounded hover:bg-white z-10"
                onClick={(e) => { e.stopPropagation(); openModal(inst); }}
            />
            <FaTrash
                className="text-red-600 hover:text-red-800 cursor-pointer p-1 rounded hover:bg-white z-10"
                onClick={(e) => { e.stopPropagation(); handleDelete(inst.Institution_id); }}
            />
        </div>
      </div>
    );
  };

  const AddInstitutionButton = ({ grid = true }) => (
    <div
      onClick={() => openModal()}
      className={`cursor-pointer h-full ${
        grid
          ? "p-4 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-center min-h-[200px]"
          : "flex items-center gap-4 p-3 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100"
      }`}
    >
      <div className={grid ? "w-20 h-20 flex items-center justify-center rounded-full bg-blue-100" : "w-16 h-16 flex items-center justify-center rounded-full bg-blue-100"}>
        <FaPlus className={grid ? "text-blue-600 text-2xl" : "text-blue-600"} />
      </div>
      <p className="text-lg font-semibold text-blue-700">Ajouter une institution</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Liste des institutions</h1>
        <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher (Nom, Code, Sigle)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button onClick={() => setView(view === "grid" ? "list" : "grid")} 
            className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 flex items-center gap-2 transition-colors">
            {view === "grid" ? (<><FaList /><span className="hidden sm:inline text-sm">Vue liste</span></>) : (<><FaTh /><span className="hidden sm:inline text-sm">Vue miniatures</span></>)}
          </button>
        </div>
      </div>

      <hr className="border-t border-gray-300 my-1" />

      {/* LISTE / GRID */}
      {filtered.length === 0 && search.length === 0 ? (
        <div className="flex flex-col gap-3">
          <AddInstitutionButton grid />
          <p className="text-gray-500 mt-2">Aucune institution disponible pour le moment.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AddInstitutionButton grid />
          {filtered.map((inst) => <InstitutionItem key={inst.Institution_id} inst={inst} grid />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AddInstitutionButton grid={false} />
          {filtered.map((inst) => <InstitutionItem key={inst.Institution_id} inst={inst} grid={false} />)}
        </div>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div 
            onClick={(e) => e.target.classList.contains('fixed') && closeModal()} 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-start justify-center pt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={modalRef}
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 z-50 overflow-hidden"
              style={{ top: modalPos.top, left: modalPos.left, position: "absolute", cursor: dragging ? "grabbing" : "grab" }}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } }}
              exit={{ y: -50, opacity: 0 }}
            >
              <h2 
                className="modal-drag-handle text-xl font-bold p-4 border-b bg-gray-50 text-gray-800 cursor-grab" 
                onMouseDown={handleMouseDown}
              >
                {editInstitution ? "Modifier Institution" : "Nouvelle Institution"}
              </h2>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                {/* LOGO */}
                <div className="flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mb-2 cursor-pointer ring-2 ring-gray-300 hover:ring-blue-400 transition duration-150"
                       onClick={() => fileInputRef.current.click()}>
                    {form.logo ? (
                      <img src={URL.createObjectURL(form.logo)} alt="Logo Preview" className="w-full h-full object-cover"/>
                    ) : form.logoPath ? (
                      <img src={`http://127.0.0.1:8000${form.logoPath}`} alt="Existing Logo" className="w-full h-full object-cover"/>
                    ) : (
                      <FaPlus className="text-gray-400 text-5xl"/>
                    )}
                  </div>
                  <input type="file" accept="image/*" name="logo" ref={fileInputRef} onChange={handleChange} className="hidden"/>
                  <p className="text-xs text-gray-500">Cliquer pour changer le logo</p>
                </div>

                {/* ID - NON ÉDITABLE */}
                <input type="text" name="id" placeholder="ID (identifiant unique)" value={form.id} onChange={handleChange} 
                    className={`p-2 border rounded focus:outline-none bg-gray-100 text-gray-600 ${errors.id ? "border-red-500" : ""}`} 
                    disabled={true}/> 
                {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
                
                {/* NOUVEAU CHAMP : CODE */}
                <input type="text" name="code" placeholder="Code (ex: UNIFIV)" value={form.code} onChange={handleChange} 
                    className={`p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.code ? "border-red-500" : ""}`}/>
                {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}


                {/* Nom */}
                <input type="text" name="nom" placeholder="Nom complet de l'Institution" value={form.nom} onChange={handleChange} 
                    className={`p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.nom ? "border-red-500" : ""}`}/>
                {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}

                {/* Type */}
                <select name="type" value={form.type} onChange={handleChange} 
                    className={`p-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.type ? "border-red-500" : ""}`}>
                  <option value="">-- Sélectionner le type --</option>
                  {typesInstitution.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}

                {/* Sigle */}
                <input type="text" name="sigle" placeholder="Sigle / Abbréviation (ex: FS)" value={form.sigle} onChange={handleChange} 
                    className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"/>

                {/* Description */}
                <textarea name="description" placeholder="Description de l'institution" value={form.description} onChange={handleChange} 
                    className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-24"/>

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={closeModal} 
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-150"
                      disabled={isSubmitting}>Annuler</button>
                  <button type="submit" 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 flex items-center justify-center gap-2"
                      disabled={isSubmitting}>
                    {isSubmitting ? <FaSpinner className="animate-spin" /> : null}
                    {editInstitution ? "Modifier" : "Créer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  	</div>
  );
};

export default Administration;