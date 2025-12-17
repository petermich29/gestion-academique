// src/components/students/forms/StudentsForms.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { DraggableModal } from "../../../components/ui/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaSave, FaUser, FaCamera, FaIdCard, FaGraduationCap,
  FaChevronDown, FaSpinner, FaEnvelope, FaPhone,
  FaFingerprint, FaVenusMars, FaCalendarAlt
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
  label: "block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1", 
  sectionTitle: "text-xs font-bold text-gray-800 flex items-center gap-1.5 pb-1 mb-2 border-b border-gray-100",
  card: "bg-white p-3 rounded-lg shadow-sm border border-gray-100",
};

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
  
    useEffect(() => {
      if (!isOpen) return;
      function handleClickOutside(event) {
        const isClickOnWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
        const menuElement = document.getElementById('country-select-portal');
        const isClickOnMenu = menuElement && menuElement.contains(event.target);
        if (!isClickOnWrapper && !isClickOnMenu) { setIsOpen(false); }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [isOpen]);
  
    const dropdownMenu = isOpen ? ReactDOM.createPortal(
      <div 
        id="country-select-portal"
        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-y-auto custom-scrollbar p-1 animate-fadeIn"
        style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: "200px" }}
        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      >
        {COUNTRIES.map((c) => (
          <div
            key={c.code}
            onClick={() => { onChange({ target: { name: "Etudiant_nationalite", value: c.name } }); setIsOpen(false); }}
            className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
          >
            <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} className="w-5 h-3.5 rounded-[2px] shadow-sm border border-gray-100 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">{c.name}</span>
          </div>
        ))}
      </div>, document.body
    ) : null;
  
    return (
      <>
        <div ref={wrapperRef} onClick={toggleOpen} className={`${styles.input} flex items-center justify-between cursor-pointer group hover:border-blue-300 pr-2 relative`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <img src={`https://flagcdn.com/w40/${selectedCountry.code}.png`} alt={selectedCountry.code} className="w-5 h-3.5 rounded-[2px] shadow-sm object-cover border border-gray-100 shrink-0" />
            <span className="text-gray-700 font-medium truncate">{selectedCountry.name}</span>
          </div>
          <FaChevronDown className={`text-[10px] text-gray-400 group-hover:text-blue-500 transition-all shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </div>
        {dropdownMenu}
      </>
    );
};

export default function StudentsForms({ isOpen, onClose, data = {}, reloadList, onSuccess }) {
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
      const isExact = data.Etudiant_naissance_date_Exact !== false; 
      
      setFormData({
        ...data,
        Etudiant_naissance_date_Exact: isExact
      });
      
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
        
        Etudiant_naissance_date_Exact: true,
        Etudiant_naissance_annee: "",
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
      } else { throw new Error("Erreur de réponse API"); }
    } catch (err) {
      console.error("Erreur de génération d'ID:", err);
      addToast("Impossible de générer un ID", "error");
    } finally { setIsFetchingId(false); }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    
    if (name === "Etudiant_nom") finalValue = (finalValue || "").toUpperCase();
    
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
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
      if (isEditMode) form.append("Etudiant_id", formData.Etudiant_id);

      Object.keys(formData).forEach((k) => {
        if (k !== "photo_file" && k !== "Etudiant_id" && formData[k] != null && formData[k] !== "") {
          form.append(k, formData[k]);
        }
      });
      
      if (formData.photo_file) form.append("photo_profil", formData.photo_file);

      const url = isEditMode
        ? `${API_BASE_URL}/api/etudiants/${formData.Etudiant_id}`
        : `${API_BASE_URL}/api/etudiants`;

      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, { method: method, body: form });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Erreur API");
      }

      const savedStudent = await res.json();

      addToast(isEditMode ? "Mis à jour avec succès" : "Étudiant créé avec succès", "success");
      
      // 1. Cas GestionInscriptions : On renvoie l'objet direct
      if (onSuccess) {
          onSuccess(savedStudent);
      }

      // 2. Cas BaseEtudiants : On recharge la liste classique
      if (reloadList) {
          reloadList();
      }

      onClose();
    } catch (err) {
      console.error(err);
      addToast(err.message || "Erreur d'enregistrement", "error");
    } finally { setIsSubmitting(false); }
  };

  const modalTitle = (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md shadow-sm ${isEditMode ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
        <FaUser className="text-sm" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold text-gray-900 leading-tight truncate">
          {isEditMode ? "Modifier Étudiant" : "Nouveau Étudiant"}
        </span>
      </div>
    </div>
  );

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      widthClass="w-[480px]"
    >
      <form onSubmit={handleSubmit} className="bg-transparent flex flex-col max-h-[85vh] rounded-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* Header Compact */}
        <div className="bg-white pt-4 pb-0 border-b border-gray-100 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4 px-5 w-full">
            {/* Photo à gauche - AGRANDIE ICI (w-24 h-24) */}
            <div className="shrink-0 relative group">
              <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 rounded-full ring-4 ring-gray-100 shadow-md bg-gray-50 cursor-pointer overflow-hidden hover:ring-blue-100 transition-all">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <FaCamera className="text-3xl" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Infos rapides à droite */}
            <div className="min-w-0 flex-1 pl-2">
               <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Matricule</span>
                  <div className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {isEditMode ? formData.Etudiant_id : (generatedId || "...")}
                  </div>
               </div>
               <input 
                 required 
                 name="Etudiant_nom" 
                 value={formData.Etudiant_nom || ""} 
                 onChange={handleChange} 
                 className="w-full bg-transparent border-b border-gray-200 text-sm font-bold text-gray-800 placeholder-gray-300 focus:border-blue-500 outline-none uppercase pb-0.5" 
                 placeholder="NOM DE FAMILLE" 
               />
               <input 
                 name="Etudiant_prenoms" 
                 value={formData.Etudiant_prenoms || ""} 
                 onChange={handleChange} 
                 className="w-full bg-transparent text-xs text-gray-600 placeholder-gray-300 outline-none capitalize mt-1" 
                 placeholder="Prénoms..." 
               />
            </div>
          </div>

          <div className="w-full px-4">
            <nav className="-mb-px flex space-x-6">
              {[{ id: 'identity', label: 'État Civil', icon: FaIdCard }, { id: 'contact', label: 'Contact & Bacc', icon: FaGraduationCap }].map(tab => (
                <button
                  key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`${tab.id === activeTab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} group inline-flex items-center gap-1.5 px-1 py-2 border-b-2 font-bold text-[11px] transition-colors`}
                >
                  <tab.icon className="text-xs" /> <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Corps du formulaire */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50">
          
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                 <div className="w-1/3">
                    <label className={styles.label}>Genre</label>
                    <div className="flex bg-white border border-gray-200 rounded-md p-0.5 h-[34px]">
                      {["M", "F"].map((s) => (
                        <label key={s} className={`flex-1 cursor-pointer flex items-center justify-center rounded-[3px] text-xs font-bold transition-all ${formData.Etudiant_sexe === s ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" : "text-gray-400 hover:text-gray-600"}`}>
                            <input type="radio" name="Etudiant_sexe" value={s} checked={formData.Etudiant_sexe === s} onChange={handleChange} className="hidden" />
                            {s}
                        </label>
                      ))}
                    </div>
                 </div>
                 <div className="flex-1">
                    <label className={styles.label}>Nationalité</label>
                    <CustomCountrySelect value={formData.Etudiant_nationalite} onChange={handleChange} />
                 </div>
              </div>

              {/* DATE DE NAISSANCE LOGIQUE */}
              <div className={styles.card}>
                <div className="flex justify-between items-center mb-2">
                   <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <FaCalendarAlt className="text-orange-400" /> Naissance
                   </h4>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="Etudiant_naissance_date_Exact" 
                        checked={formData.Etudiant_naissance_date_Exact || false} 
                        onChange={handleChange}
                        className="w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 select-none">Date Exacte ?</span>
                   </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   {formData.Etudiant_naissance_date_Exact ? (
                      <div className="col-span-2 sm:col-span-1">
                         <label className={styles.label}>Date précise</label>
                         <input type="date" name="Etudiant_naissance_date" value={formData.Etudiant_naissance_date || ""} onChange={handleChange} className={styles.input} />
                      </div>
                   ) : (
                      <div className="col-span-2 sm:col-span-1">
                         <label className={styles.label}>Année estimée</label>
                         <input type="number" min="1950" max={new Date().getFullYear()} placeholder="Ex: 2002" name="Etudiant_naissance_annee" value={formData.Etudiant_naissance_annee || ""} onChange={handleChange} className={styles.input} />
                      </div>
                   )}
                   
                   <div className="col-span-2 sm:col-span-1">
                      <label className={styles.label}>Lieu</label>
                      <input name="Etudiant_naissance_lieu" value={formData.Etudiant_naissance_lieu || ""} onChange={handleChange} className={styles.input} placeholder="Commune" />
                   </div>
                </div>
              </div>

              {/* CIN */}
              <div className={styles.card}>
                 <h4 className={styles.sectionTitle}>Carte d'Identité</h4>
                 <div className="space-y-3">
                    <div>
                       <label className={styles.label}>Numéro</label>
                       <input name="Etudiant_cin" value={formData.Etudiant_cin || ""} onChange={handleCinChange} className={`${styles.input} font-mono tracking-wide`} placeholder="XXX-XXX-XXX-XXX" maxLength={15} />
                    </div>
                    <div className="flex gap-3">
                       <div className="w-1/2">
                          <label className={styles.label}>Du</label>
                          <input type="date" name="Etudiant_cin_date" value={formData.Etudiant_cin_date || ""} onChange={handleChange} className={styles.input} />
                       </div>
                       <div className="w-1/2">
                          <label className={styles.label}>À</label>
                          <input name="Etudiant_cin_lieu" value={formData.Etudiant_cin_lieu || ""} onChange={handleChange} className={styles.input} placeholder="Lieu" />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4"> 
              <div className={styles.card}>
                <h4 className={styles.sectionTitle}>Coordonnées</h4>
                <div className="space-y-3">
                   <div>
                       <label className={styles.label}>Mobile</label>
                       <input name="Etudiant_telephone" value={formData.Etudiant_telephone || ""} onChange={handlePhoneChange} className={styles.input} placeholder="03x xx xxx xx" />
                   </div>
                   <div>
                       <label className={styles.label}>Email</label>
                       <input type="email" name="Etudiant_mail" value={formData.Etudiant_mail || ""} onChange={handleChange} className={styles.input} placeholder="email@exemple.com" />
                   </div>
                   <div>
                     <label className={styles.label}>Adresse</label>
                     <textarea name="Etudiant_adresse" value={formData.Etudiant_adresse || ""} onChange={handleChange} rows={2} className={`${styles.input} resize-none`} placeholder="Adresse..." />
                   </div>
                </div>
              </div>

              <div className={styles.card}>
                <h4 className={styles.sectionTitle}>Baccalauréat</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1">
                        <label className={styles.label}>Série</label>
                        <select name="Etudiant_bacc_serie" value={formData.Etudiant_bacc_serie || ""} onChange={handleChange} className={`${styles.input} cursor-pointer`}>
                           <option value="">-</option>
                           {BACC_SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1">
                        <label className={styles.label}>Année</label>
                        <input type="number" min="1990" max={new Date().getFullYear()} name="Etudiant_bacc_annee" value={formData.Etudiant_bacc_annee || ""} onChange={handleChange} className={styles.input} placeholder="YYYY" />
                    </div>
                    <div className="col-span-2">
                        <label className={styles.label}>N° Matricule Bacc</label>
                        <input name="Etudiant_bacc_numero" value={formData.Etudiant_bacc_numero || ""} onChange={handleChange} className={styles.input} placeholder="Numéro..." />
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-4 py-3 border-t border-gray-100 flex justify-end gap-3">
           <button onClick={onClose} type="button" className="px-3 py-1.5 rounded text-gray-600 text-xs font-bold uppercase hover:bg-gray-100">Annuler</button>
           <button type="submit" disabled={isSubmitting || isFetchingId} className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-bold uppercase shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
           </button>
        </div>
      </form>
    </DraggableModal>
  );
}