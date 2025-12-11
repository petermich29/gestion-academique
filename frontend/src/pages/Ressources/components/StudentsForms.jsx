import React, { useEffect, useState, useRef } from "react";
import { DraggableModal } from "../../../components/ui/Modal"; // Assurez-vous que le chemin est bon
import { AppStyles } from "../../../components/ui/AppStyles";
import { SpinnerIcon } from "../../../components/ui/Icons";
import {
  FaSave, FaUser, FaGraduationCap, FaCamera,
  FaIdCard, FaPhone, FaChevronDown
} from "react-icons/fa";

// -----------------------------------------------
//      CONSTANTES
// -----------------------------------------------
const COUNTRIES = [
  { code: "mg", name: "Madagascar" },
  { code: "fr", name: "France" },
  { code: "km", name: "Comores" },
  { code: "mu", name: "Maurice" },
  { code: "yt", name: "La Réunion" },
  { code: "sc", name: "Seychelles" },
  { code: "za", name: "Afrique du Sud" },
  { code: "ke", name: "Kenya" },
  { code: "tz", name: "Tanzanie" },
  { code: "rw", name: "Rwanda" }
];

const BACC_SERIES = ["A1", "A2", "C", "D", "L", "S", "OSE", "Technique", "Technologique"];

// -----------------------------------------------
//      SELECT PERSONNALISÉ (PAYS)
// -----------------------------------------------
const CustomCountrySelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Valeur par défaut si vide
  const selectedCountry = COUNTRIES.find(c => c.name === value) || COUNTRIES[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="relative"
      ref={wrapperRef}
      // Empêche le drag du modal quand on clique ici
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`${AppStyles.input.formControl} flex items-center justify-between cursor-pointer py-2`}
      >
        <div className="flex items-center gap-3">
          <img
            src={`https://flagcdn.com/w40/${selectedCountry.code}.png`}
            alt={selectedCountry.code}
            className="w-5 h-3 rounded-sm shadow-sm"
          />
          <span className="text-gray-700 text-sm">{selectedCountry.name}</span>
        </div>
        <FaChevronDown
          className={`text-[10px] text-gray-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {COUNTRIES.map((c) => (
            <div
              key={c.code}
              onClick={() => {
                // Simule un event standard pour le handler parent
                onChange({ target: { name: "Etudiant_nationalite", value: c.name } });
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} className="w-5 h-3" />
              <span className="text-xs">{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================
//               MODAL FORMULAIRE ÉTUDIANT (MAIN)
// =============================================================
export const StudentFormModal = ({
  isOpen,
  onClose,
  data = {},    // Données initiales passées par le parent
  reloadList    // Fonction pour recharger la liste après succès
}) => {

  // --- LOCAL STATE (Crucial pour l'édition fluide) ---
  const [formData, setFormData] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [generatedId, setGeneratedId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const fileInputRef = useRef(null);

  // --- INITIALISATION À L'OUVERTURE ---
  useEffect(() => {
    if (isOpen) {
      const hasId = !!data?.Etudiant_id;
      setIsEditMode(hasId);
      setFormData(data || {}); // On copie les props dans le state local
      
      // Gestion photo existante
      if (data?.Etudiant_photo_profil_path) {
        // Ajustez l'URL selon votre backend static files
        setPhotoPreview(`http://127.0.0.1:8000/${data.Etudiant_photo_profil_path}`);
      } else {
        setPhotoPreview(null);
      }

      // Gestion ID
      if (!hasId) {
        fetchNextId();
      } else {
        setGeneratedId(data.Etudiant_numero_inscription || "");
      }
    } else {
        // Reset à la fermeture
        setFormData({});
        setPhotoPreview(null);
        setIsSubmitting(false);
    }
  }, [isOpen, data]);

  // --- GÉNÉRATION ID AUTO ---
  const fetchNextId = async () => {
    setGeneratedId("Chargement...");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/etudiants/next-id");
      if(response.ok){
          const payload = await response.json();
          setGeneratedId(payload.next_id);
          setFormData(prev => ({ ...prev, Etudiant_numero_inscription: payload.next_id }));
      } else {
          throw new Error("Erreur API");
      }
    } catch (err) {
      // Fallback local si l'API échoue
      const fallback = `ETU${new Date().getFullYear()}_000000`;
      setGeneratedId(fallback);
      setFormData(prev => ({ ...prev, Etudiant_numero_inscription: fallback }));
    }
  };

  // --- HANDLERS ---

  // Pour les champs textes classiques
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Formatage auto CIN (XXX-XXX-XXX-XXX)
  const handleCinChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").substring(0, 12);
    let formatted = val;
    if (val.length > 3) formatted = val.slice(0, 3) + "-" + val.slice(3);
    if (val.length > 6) formatted = formatted.slice(0, 7) + "-" + val.slice(6);
    if (val.length > 9) formatted = formatted.slice(0, 11) + "-" + val.slice(9);
    setFormData(prev => ({ ...prev, Etudiant_cin: formatted }));
  };

  // Formatage auto Téléphone
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").substring(0, 10);
    let formatted = val;
    if (val.length > 3) formatted = val.slice(0, 3) + " " + val.slice(3);
    if (val.length > 6) formatted = formatted.slice(0, 6) + " " + val.slice(5);
    if (val.length > 8) formatted = formatted.slice(0, 10) + " " + val.slice(8);
    setFormData(prev => ({ ...prev, Etudiant_telephone: formatted }));
  };

  // Gestion Photo
  const handlePhotoClick = () => fileInputRef.current.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, photo_profil: file }));
    }
  };

  // --- SOUMISSION DU FORMULAIRE ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSend = new FormData();

    // Ajouter tous les champs textes
    Object.keys(formData).forEach(key => {
      // On exclut photo_profil ici car on l'ajoute manuellement si c'est un fichier
      // On exclut les valeurs nulles pour éviter d'envoyer "null" en string
      if (key !== "photo_profil" && formData[key] !== null && formData[key] !== undefined) {
        dataToSend.append(key, formData[key]);
      }
    });

    // Ajouter la photo seulement si c'est un nouveau fichier (objet File)
    if (formData.photo_profil instanceof File) {
      dataToSend.append("photo_profil", formData.photo_profil);
    }

    const url = isEditMode
      ? `http://127.0.0.1:8000/api/etudiants/${formData.Etudiant_id}` // Assurez-vous d'avoir l'ID ici
      : `http://127.0.0.1:8000/api/etudiants`;

    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        body: dataToSend, 
        // Ne pas mettre de header Content-Type, le navigateur le mettra en multipart/form-data
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erreur: ${errData.detail || "Impossible d'enregistrer"}`);
      } else {
        // Succès
        if(reloadList) reloadList();
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion au serveur");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---
  return (
    <DraggableModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={null} 
        widthClass="max-w-3xl"
    >
      {/* HEADER PERSONNALISÉ */}
      <div 
        className="bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-3 rounded-t-lg flex justify-between items-center text-white shadow-md cursor-grab active:cursor-grabbing modal-drag-handle"
      >
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FaUser className="text-blue-300" />
          {isEditMode ? "Modifier Étudiant" : "Nouveau Dossier Étudiant"}
        </h2>

        <div className="flex flex-col items-end pointer-events-none">
          <span className="text-[10px] text-blue-300 uppercase tracking-wide">
            ID Système
          </span>
          <div className="bg-blue-800/50 px-2 py-0.5 rounded border border-blue-600">
            <span className="font-mono text-sm font-bold">{generatedId}</span>
          </div>
        </div>
      </div>

      {/* FORMULAIRE 
          Notez le onMouseDown={e => e.stopPropagation()} :
          C'est VITAL pour pouvoir cliquer dans les inputs sans déclencher le drag
      */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 max-h-[80vh] overflow-y-auto custom-scrollbar"
        onMouseDown={(e) => e.stopPropagation()} 
      >
        <div className="p-5 space-y-5">

          {/* SECTION 1: PHOTO & IDENTITÉ DE BASE */}
          <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row gap-5">
            
            {/* Zone Photo */}
            <div className="flex flex-col items-center sm:w-1/4 border-r border-gray-100 pr-2">
              <div 
                className="relative group cursor-pointer" 
                onClick={handlePhotoClick}
                title="Changer la photo"
              >
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow bg-gray-100 object-cover">
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Profil" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FaUser size={50} />
                    </div>
                  )}
                </div>
                {/* Icône Overlay */}
                <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow hover:bg-blue-700 transition">
                  <FaCamera size={12} />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <span className="text-[9px] text-gray-400 mt-2">Cliquez pour modifier</span>
            </div>

            {/* Inputs Principaux */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={AppStyles.input.label}>Nom *</label>
                <input
                  required
                  name="Etudiant_nom"
                  value={formData.Etudiant_nom || ""}
                  onChange={(e) => setFormData({...formData, Etudiant_nom: e.target.value.toUpperCase()})}
                  className={`${AppStyles.input.formControl} font-bold uppercase text-sm`}
                  placeholder="ex: RAKOTO"
                />
              </div>

              <div>
                <label className={AppStyles.input.label}>Prénoms</label>
                <input
                  name="Etudiant_prenoms"
                  value={formData.Etudiant_prenoms || ""}
                  onChange={handleChange}
                  className={AppStyles.input.formControl}
                  placeholder="ex: Jean Pierre"
                />
              </div>

              <div>
                <label className={AppStyles.input.label}>Sexe</label>
                <div className="flex gap-3 mt-1">
                  <label className="inline-flex items-center cursor-pointer bg-white border px-3 py-1.5 rounded text-sm hover:bg-gray-50">
                    <input
                      type="radio"
                      name="Etudiant_sexe"
                      value="M"
                      checked={formData.Etudiant_sexe === "M"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Masculin
                  </label>
                  <label className="inline-flex items-center cursor-pointer bg-white border px-3 py-1.5 rounded text-sm hover:bg-gray-50">
                    <input
                      type="radio"
                      name="Etudiant_sexe"
                      value="F"
                      checked={formData.Etudiant_sexe === "F"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Féminin
                  </label>
                </div>
              </div>

              <div>
                <label className={AppStyles.input.label}>Date de naissance</label>
                <input
                  type="date"
                  name="Etudiant_naissance_date"
                  value={formData.Etudiant_naissance_date || ""}
                  onChange={handleChange}
                  className={AppStyles.input.formControl}
                />
              </div>

              <div>
                <label className={AppStyles.input.label}>Nationalité</label>
                <CustomCountrySelect
                  value={formData.Etudiant_nationalite}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ÉTAT CIVIL & CONTACT + CURSUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Col Gauche : Contact */}
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-2 mb-2">
                <FaIdCard className="text-blue-400 inline mr-1" /> État civil & Contact
              </h4>

              <div>
                <label className={AppStyles.input.label}>CIN</label>
                <input
                  value={formData.Etudiant_cin || ""}
                  onChange={handleCinChange}
                  className={`${AppStyles.input.formControl} font-mono tracking-wide`}
                  placeholder="XXX-XXX-XXX-XXX"
                  maxLength={15}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={AppStyles.input.label}>Fait le</label>
                  <input
                    type="date"
                    name="Etudiant_cin_date"
                    value={formData.Etudiant_cin_date || ""}
                    onChange={handleChange}
                    className={AppStyles.input.formControl}
                  />
                </div>
                <div>
                  <label className={AppStyles.input.label}>Lieu</label>
                  <input
                    name="Etudiant_cin_lieu"
                    value={formData.Etudiant_cin_lieu || ""}
                    onChange={handleChange}
                    className={AppStyles.input.formControl}
                    placeholder="ex: Antananarivo"
                  />
                </div>
              </div>

              <div>
                <label className={AppStyles.input.label}>Téléphone</label>
                <div className="relative">
                  <input
                    value={formData.Etudiant_telephone || ""}
                    onChange={handlePhoneChange}
                    className={`${AppStyles.input.formControl} pl-8`}
                    placeholder="03X XX XXX XX"
                  />
                  <FaPhone className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                </div>
              </div>

              <div>
                <label className={AppStyles.input.label}>Email</label>
                <input
                  type="email"
                  name="Etudiant_mail"
                  value={formData.Etudiant_mail || ""}
                  onChange={handleChange}
                  className={AppStyles.input.formControl}
                  placeholder="etudiant@example.com"
                />
              </div>
            </div>

            {/* Col Droite : Bacc & Adresse */}
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-2 mb-2">
                <FaGraduationCap className="text-green-400 inline mr-1" /> Baccalauréat & Adresse
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={AppStyles.input.label}>Série Bacc</label>
                  <select
                    name="Etudiant_bacc_serie"
                    value={formData.Etudiant_bacc_serie || ""}
                    onChange={handleChange}
                    className={AppStyles.input.formControl}
                  >
                    <option value="">-- Choix --</option>
                    {BACC_SERIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={AppStyles.input.label}>Année</label>
                  <input
                    type="number"
                    name="Etudiant_bacc_annee"
                    value={formData.Etudiant_bacc_annee || ""}
                    onChange={handleChange}
                    className={AppStyles.input.formControl}
                    placeholder="YYYY"
                  />
                </div>
              </div>

              <div>
                <label className={AppStyles.input.label}>N° Inscription Bacc</label>
                <input
                  name="Etudiant_bacc_numero"
                  value={formData.Etudiant_bacc_numero || ""}
                  onChange={handleChange}
                  className={AppStyles.input.formControl}
                  placeholder="Numéro matricule bacc"
                />
              </div>

              <div>
                <label className={AppStyles.input.label}>Adresse actuelle</label>
                <textarea
                  name="Etudiant_adresse"
                  value={formData.Etudiant_adresse || ""}
                  onChange={handleChange}
                  rows={2}
                  className={AppStyles.input.formControl}
                  placeholder="Lot, Ville, Code Postal..."
                />
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-gray-100 px-5 py-3 flex justify-end gap-3 border-t rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-gray-600 hover:bg-gray-200 text-sm font-medium transition"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded shadow text-sm font-bold flex items-center transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="animate-spin mr-2" /> Traitement...
              </>
            ) : (
              <>
                <FaSave className="mr-2" /> {isEditMode ? "Mettre à jour" : "Enregistrer"}
              </>
            )}
          </button>
        </div>

      </form>
    </DraggableModal>
  );
};