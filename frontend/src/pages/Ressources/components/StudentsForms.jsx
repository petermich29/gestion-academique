// src/components/students/forms/StudentsForms.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { DraggableModal } from "../../../components/ui/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaSave,
  FaUser,
  FaCamera,
  FaIdCard,
  FaGraduationCap,
  FaChevronDown,
  FaSpinner,
  FaEnvelope,
  FaPhone,
  FaFingerprint,
  FaVenusMars
} from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000";

const COUNTRIES = [
  { code: "mg", name: "Madagascar" },
  { code: "fr", name: "France" },
  { code: "km", name: "Comores" },
  { code: "mu", name: "Maurice" },
  { code: "yt", name: "La Réunion" },
  { code: "sc", name: "Seychelles" },
  { code: "za", name: "Afrique du Sud" },
  { code: "cn", name: "Chine" },
  { code: "us", name: "États-Unis" },
];

const BACC_SERIES = ["A1", "A2", "C", "D", "L", "S", "OSE", "Tech.", "Techno."];

const styles = {
  input: "w-full text-sm bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-100",
  label: "block text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1",
  sectionTitle: "text-sm font-bold text-gray-800 flex items-center gap-1.5 pb-1 mb-2",
  card: "bg-white p-3.5 rounded-lg shadow-sm border border-gray-100",
};

// --- COMPOSANT SELECT AMÉLIORÉ (PORTAL) ---
const CustomCountrySelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const selectedCountry = COUNTRIES.find((c) => c.name === value) || COUNTRIES[0];

  const toggleOpen = () => {
    if (!isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  // Correction: Gère la fermeture au clic à l'extérieur, sans le listener de scroll agressif
  useEffect(() => {
    if (!isOpen) return;
    
    function handleClickOutside(event) {
      const isClickOnWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
      const menuElement = document.getElementById('country-select-portal');
      const isClickOnMenu = menuElement && menuElement.contains(event.target); // Vérifie si le clic est sur le menu Portal
      
      if (!isClickOnWrapper && !isClickOnMenu) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const dropdownMenu = isOpen ? ReactDOM.createPortal(
    <div 
      id="country-select-portal" // ID pour l'identification dans le gestionnaire de clic
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-y-auto custom-scrollbar p-1 animate-fadeIn"
      style={{ 
        top: coords.top, 
        left: coords.left, 
        width: coords.width,
        maxHeight: "200px" 
      }}
      // Stoppe la propagation des événements de souris dans le menu
      // Pour éviter qu'un clic ne remonte au wrapper ou au document de manière inattendue
      onMouseDown={(e) => e.stopPropagation()} 
      onClick={(e) => e.stopPropagation()}
    >
      {COUNTRIES.map((c) => (
        <div
          key={c.code}
          onClick={() => {
            onChange({ target: { name: "Etudiant_nationalite", value: c.name } });
            setIsOpen(false);
          }}
          className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
        >
          <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} className="w-5 h-3.5 rounded-[2px] shadow-sm border border-gray-100 shrink-0" />
          {/* Troncature retirée pour laisser le nom s'afficher */}
          <span className="text-sm text-gray-700 font-medium">{c.name}</span>
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div ref={wrapperRef} onClick={toggleOpen} className={`${styles.input} flex items-center justify-between cursor-pointer group hover:border-blue-300 pr-2 relative`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={`https://flagcdn.com/w40/${selectedCountry.code}.png`}
            alt={selectedCountry.code}
            className="w-5 h-3.5 rounded-[2px] shadow-sm object-cover border border-gray-100 shrink-0"
          />
          <span className="text-gray-700 font-medium truncate">{selectedCountry.name}</span>
        </div>
        <FaChevronDown className={`text-[10px] text-gray-400 group-hover:text-blue-500 transition-all shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </div>
      {dropdownMenu}
    </>
  );
};

export default function StudentsForms({ isOpen, onClose, data = {}, reloadList }) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingId, setIsFetchingId] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [activeTab, setActiveTab] = useState('identity');

  const fileInputRef = useRef(null);
  const isEditMode = !!data?.Etudiant_id;

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('identity');
    if (isEditMode) {
      setFormData(data);
      setGeneratedId("");
      setPhotoPreview(data.Etudiant_photo_profil_path ? `${API_BASE_URL}/${data.Etudiant_photo_profil_path}` : null);
    } else {
      setFormData({
        Etudiant_nationalite: "Madagascar",
        Etudiant_sexe: "M",
        Etudiant_bacc_serie: "",
        Etudiant_nom: "",
        Etudiant_prenoms: "",
        Etudiant_naissance_lieu: "",
        Etudiant_cin: "",
        Etudiant_cin_lieu: "",
        Etudiant_telephone: "",
        Etudiant_mail: "",
        Etudiant_adresse: "",
        Etudiant_bacc_annee: "",
        Etudiant_bacc_numero: "",
      });
      setPhotoPreview(null);
      fetchNewId();
    }
  }, [isOpen, isEditMode, data]);

  const fetchNewId = async () => {
    setIsFetchingId(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/etudiants/init-new`);
      if (res.ok) {
        const payload = await res.json();
        setGeneratedId(payload.Etudiant_id);
      } else {
        throw new Error("Erreur de réponse API");
      }
    } catch (err) {
      console.error("Erreur de génération d'ID:", err);
      addToast("Impossible de générer un ID", "error");
    } finally {
      setIsFetchingId(false);
    }
  };

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "Etudiant_nom") value = (value || "").toUpperCase();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCinChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 12);
    if (val.length > 9) val = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6, 9)}-${val.slice(9)}`;
    else if (val.length > 6) val = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
    else if (val.length > 3) val = `${val.slice(0, 3)}-${val.slice(3)}`;
    setFormData((prev) => ({ ...prev, Etudiant_cin: val }));
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (val.length > 8) val = `${val.slice(0, 3)} ${val.slice(3, 5)} ${val.slice(5, 8)} ${val.slice(8)}`;
    else if (val.length > 5) val = `${val.slice(0, 3)} ${val.slice(3, 5)} ${val.slice(5)}`;
    else if (val.length > 3) val = `${val.slice(0, 3)} ${val.slice(3)}`;
    setFormData((prev) => ({ ...prev, Etudiant_telephone: val }));
  };

  const handlePhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setPhotoPreview(URL.createObjectURL(f));
    setFormData((p) => ({ ...p, photo_file: f }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = new FormData();
      if (isEditMode) {
        form.append("Etudiant_id", formData.Etudiant_id);
      }
      Object.keys(formData).forEach((k) => {
        if (k !== "photo_file" && k !== "Etudiant_id" && formData[k] != null && formData[k] !== "") {
          form.append(k, formData[k]);
        }
      });
      if (formData.photo_file) {
        form.append("photo_profil", formData.photo_file);
      }

      const url = isEditMode
        ? `${API_BASE_URL}/api/etudiants/${formData.Etudiant_id}`
        : `${API_BASE_URL}/api/etudiants`;

      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, { method: method, body: form });

      if (!res.ok) {
        const errorData = await res.json();
        const message = errorData.detail || (errorData.title ? `${errorData.title}: ${JSON.stringify(errorData.errors)}` : "Erreur API");
        throw new Error(message);
      }

      addToast(isEditMode ? "Mis à jour avec succès" : "Étudiant créé avec succès", "success");
      if (reloadList) reloadList();
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Erreur d'enregistrement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md shadow-sm ${isEditMode ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
        <FaUser className="text-sm" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-base font-bold text-gray-900 leading-tight truncate">
          {isEditMode ? "Modifier l'Étudiant" : "Nouveau Dossier"}
        </span>
        <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
          {isEditMode ? (
            <><span className="bg-amber-100 text-amber-700 px-1.5 py-0 rounded text-[10px] font-mono">{formData.Etudiant_id}</span> Édition</>
          ) : (
            "Création de profil étudiant"
          )}
        </span>
      </div>
    </div>
  );

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      widthClass="w-[600px] max-w-[96vw]" 
    >
      <form onSubmit={handleSubmit} className="bg-transparent flex flex-col max-h-[85vh] rounded-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* Header Centré */}
        <div className="bg-white pt-5 pb-0 border-b border-gray-100 flex flex-col items-center">
          
          <div className="flex flex-col items-center gap-3 mb-4 px-5">
            {/* Photo */}
            <div className="shrink-0 relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-[100px] h-[100px] rounded-full ring-4 ring-white shadow-lg bg-gray-100 cursor-pointer overflow-hidden hover:scale-[1.02] transition-all duration-300 mx-auto"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                    <FaCamera className="text-2xl text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-all duration-300">
                  <FaCamera className="text-white text-lg drop-shadow-md" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Nom et Matricule Centrés */}
            <div className="text-center w-full">
              <h3 className="text-lg font-bold text-gray-800 truncate uppercase mb-1">
                {formData.Etudiant_nom || "NOM"} <span className="text-gray-600 font-semibold capitalize">{formData.Etudiant_prenoms || "Prénoms"}</span>
              </h3>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-700 bg-blue-50/50 px-3 py-0.5 rounded-full border border-blue-100/50">
                <FaFingerprint className="text-blue-400 text-xs" />
                {isEditMode ? formData.Etudiant_id : (generatedId || <FaSpinner className="animate-spin text-xs" />)}
              </div>
            </div>
          </div>

          {/* Tabs Centrés */}
          <div className="w-full px-5">
            <nav className="-mb-px flex justify-center space-x-8">
              {[{ id: 'identity', label: 'Identité', icon: FaIdCard }, { id: 'contact', label: 'Contact & Bacc', icon: FaGraduationCap }].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${tab.id === activeTab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    group inline-flex items-center gap-2 px-1 py-2 border-b-2 font-bold text-xs transition-colors
                  `}
                >
                  <tab.icon className={`text-sm ${tab.id === activeTab ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Corps du formulaire scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-gray-50">
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Colonne Gauche */}
                <div className="space-y-3">
                  <div className="w-full">
                    <label className={styles.label}>Nom de Famille *</label>
                    <input required name="Etudiant_nom" value={formData.Etudiant_nom || ""} onChange={handleChange} className={`${styles.input} font-bold uppercase tracking-wide`} placeholder="Ex: RAKOTO" />
                  </div>
                  <div className="w-full">
                    <label className={styles.label}>Prénoms</label>
                    <input name="Etudiant_prenoms" value={formData.Etudiant_prenoms || ""} onChange={handleChange} className={styles.input} placeholder="Prénoms usuels" />
                  </div>

                  {/* Genre - Pleine largeur */}
                  <div>
                      <label className={styles.label}><FaVenusMars className="inline mr-1 text-gray-400" /> Genre</label>
                      <div className="flex bg-gray-200/50 p-0.5 rounded-md shadow-inner h-[34px]">
                      {["M", "F"].map((s) => {
                          const isActive = formData.Etudiant_sexe === s;
                          return (
                          <label
                              key={s}
                              className={`flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-[4px] text-xs font-bold transition-all relative ${isActive ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"}`}
                          >
                              <input type="radio" name="Etudiant_sexe" value={s} checked={isActive} onChange={handleChange} className="hidden" />
                              {s === "M" ? "Masculin" : "Féminin"}
                          </label>
                          );
                      })}
                      </div>
                  </div>
                  
                  {/* Nationalité - Pleine largeur, PLACÉ EN DESSOUS */}
                  <div>
                      <label className={styles.label}>Nationalité</label>
                      <CustomCountrySelect value={formData.Etudiant_nationalite} onChange={handleChange} />
                  </div>
                </div>

                {/* Colonne Droite */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={styles.label}>Né(e) le</label>
                      <input type="date" name="Etudiant_naissance_date" value={formData.Etudiant_naissance_date || ""} onChange={handleChange} className={styles.input} />
                    </div>
                    <div>
                      <label className={styles.label}>Lieu Naissance</label>
                      <input name="Etudiant_naissance_lieu" value={formData.Etudiant_naissance_lieu || ""} onChange={handleChange} className={styles.input} placeholder="Commune" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 mt-3">
                    <h4 className="text-[11px] uppercase font-bold text-gray-400 mb-2">Carte d'Identité</h4>
                    <div className="space-y-3">
                      <div>
                        <label className={styles.label}>N° CIN</label>
                        <input name="Etudiant_cin" value={formData.Etudiant_cin || ""} onChange={handleCinChange} className={`${styles.input} font-mono tracking-wide text-gray-700`} placeholder="XXX-XXX-XXX-XXX" maxLength={15} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={styles.label}>Du</label>
                          <input type="date" name="Etudiant_cin_date" value={formData.Etudiant_cin_date || ""} onChange={handleChange} className={styles.input} />
                        </div>
                        <div>
                          <label className={styles.label}>À</label>
                          <input name="Etudiant_cin_lieu" value={formData.Etudiant_cin_lieu || ""} onChange={handleChange} className={styles.input} placeholder="Lieu CIN" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 gap-4"> 
              <div className={`${styles.card} space-y-3`}>
                <h4 className={styles.sectionTitle}>
                  <FaPhone className="text-blue-500 text-sm" /> Coordonnées
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={styles.label}>Mobile</label>
                        <div className="relative group">
                            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors text-xs" />
                            <input name="Etudiant_telephone" value={formData.Etudiant_telephone || ""} onChange={handlePhoneChange} className={`${styles.input} pl-8`} placeholder="03x xx xxx xx" />
                        </div>
                    </div>
                    <div>
                        <label className={styles.label}>Email</label>
                        <div className="relative group">
                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors text-xs" />
                            <input type="email" name="Etudiant_mail" value={formData.Etudiant_mail || ""} onChange={handleChange} className={`${styles.input} pl-8`} placeholder="email@exemple.com" />
                        </div>
                    </div>
                </div>
                <div>
                  <label className={styles.label}>Adresse</label>
                  <textarea name="Etudiant_adresse" value={formData.Etudiant_adresse || ""} onChange={handleChange} rows={2} className={`${styles.input} resize-none py-2 leading-tight`} placeholder="Lot, Rue, Ville..." />
                </div>
              </div>

              <div className={`${styles.card} space-y-3`}>
                <h4 className={styles.sectionTitle}>
                  <FaGraduationCap className="text-purple-500 text-sm" /> Baccalauréat
                </h4>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Série</label>
                        <div className="relative cursor-pointer group">
                            <select name="Etudiant_bacc_serie" value={formData.Etudiant_bacc_serie || ""} onChange={handleChange} className={`${styles.input} appearance-none font-bold text-blue-800 cursor-pointer pl-3 pr-8 hover:border-blue-300`}>
                            <option value="">-</option>
                            {BACC_SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={styles.label}>Année</label>
                        <input type="number" min="1990" max={new Date().getFullYear()} name="Etudiant_bacc_annee" value={formData.Etudiant_bacc_annee || ""} onChange={handleChange} className={`${styles.input} text-center font-semibold`} placeholder="YYYY" />
                    </div>
                    <div>
                        <label className={styles.label}>N° Matricule</label>
                        <input name="Etudiant_bacc_numero" value={formData.Etudiant_bacc_numero || ""} onChange={handleChange} className={`${styles.input} font-mono`} placeholder="123456-A" />
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
            <FaFingerprint className="text-gray-300" />
            {isEditMode ? "Mode Édition" : "Génération auto."}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-md border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wide hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isFetchingId}
              className="px-5 py-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <FaSpinner className="animate-spin text-sm" /> : <FaSave className="text-sm" />}
              <span>{isSubmitting ? "..." : "Enregistrer"}</span>
            </button>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
}