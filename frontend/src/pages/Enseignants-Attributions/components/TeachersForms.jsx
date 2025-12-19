// frontend\src\pages\Enseignants-Attributions\components\TeachersForms.jsx
import React, { useState, useEffect, useRef } from "react";
import { DraggableModal } from "../../../components/ui/Modal";
import { 
    FaSave, FaCamera, FaFingerprint, FaSpinner, 
    FaUniversity, FaBuilding, FaUserTie, FaIdCard 
} from "react-icons/fa";

// URL de base
const API_BASE_URL = "http://127.0.0.1:8000";
const API_ROUTE_PREFIX = "/api/enseignants"; 

const GRADES = [
    "Assistant", "Maitre de conférences", "Professeur", 
    "Professeur Titulaire"
];

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch (e) { return ''; }
}

// --- FONCTIONS DE FORMATAGE (MASQUES) ---

// Format CIN : XXX-XXX-XXX-XXX (12 chiffres)
const formatCIN = (value) => {
    if (!value) return "";
    // Garder uniquement les chiffres
    const clean = value.replace(/\D/g, '').slice(0, 12);
    
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 3);
    if (clean.length > 3) formatted += "-" + clean.substring(3, 6);
    if (clean.length > 6) formatted += "-" + clean.substring(6, 9);
    if (clean.length > 9) formatted += "-" + clean.substring(9, 12);
    
    return formatted;
};

// Format Tel : XXX XX XXX XX (10 chiffres)
const formatPhone = (value) => {
    if (!value) return "";
    // Garder uniquement les chiffres (034...)
    const clean = value.replace(/\D/g, '').slice(0, 10);
    
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 3);
    if (clean.length > 3) formatted += " " + clean.substring(3, 5);
    if (clean.length > 5) formatted += " " + clean.substring(5, 8);
    if (clean.length > 8) formatted += " " + clean.substring(8, 10);
    
    return formatted;
};

export const TeacherFormModal = ({ isOpen, onClose, data, reloadList }) => {
    const [formData, setFormData] = useState({});
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedId, setGeneratedId] = useState("");
    
    const [institutions, setInstitutions] = useState([]);
    const [allComposantes, setAllComposantes] = useState([]); 
    const [filteredComposantes, setFilteredComposantes] = useState([]); 
    const [selectedInstitution, setSelectedInstitution] = useState("");

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormData({});
        setPhotoPreview(null);
        setSelectedInstitution("");
        setFilteredComposantes([]);
        setGeneratedId("");

        const initForm = async () => {
            try {
                const [instRes, compRes] = await Promise.all([
                    fetch(`${API_BASE_URL}${API_ROUTE_PREFIX}/form-options/institutions`),
                    fetch(`${API_BASE_URL}${API_ROUTE_PREFIX}/form-options/composantes`)
                ]);

                if(instRes.ok && compRes.ok) {
                    const instData = await instRes.json();
                    const compData = await compRes.json();
                    setInstitutions(instData);
                    setAllComposantes(compData);

                    let initialData = { 
                        Enseignant_statut: "PERM", 
                        Enseignant_sexe: "M", // Valeur par défaut Interne
                        Enseignant_grade: "" 
                    };

                    if (data?.Enseignant_id) {
                        initialData = {
                            ...data,
                            Enseignant_date_naissance: formatDate(data.Enseignant_date_naissance),
                            Enseignant_cin_date: formatDate(data.Enseignant_cin_date),
                        };
                        setFormData(initialData);

                        if (data.Enseignant_photo_profil_path) {
                            setPhotoPreview(`${API_BASE_URL}/${data.Enseignant_photo_profil_path}`);
                        }
                        
                        if (data.Composante_id_affectation_fk && compData.length > 0) {
                            const linkedComp = compData.find(c => c.id === data.Composante_id_affectation_fk);
                            if (linkedComp) setSelectedInstitution(linkedComp.institution_id);
                        }
                    } else {
                        setFormData(initialData);
                        try {
                            const idRes = await fetch(`${API_BASE_URL}${API_ROUTE_PREFIX}/init-new`);
                            if (idRes.ok) {
                                const idData = await idRes.json();
                                setGeneratedId(idData.Enseignant_id);
                            }
                        } catch (e) { console.error("Erreur ID gen", e); }
                    }
                }
            } catch (err) { console.error("Erreur réseau init form:", err); }
        };
        initForm();
    }, [isOpen, data]);

    useEffect(() => {
        if (selectedInstitution && allComposantes.length > 0) {
            setFilteredComposantes(allComposantes.filter(c => c.institution_id === selectedInstitution));
        } else {
            setFilteredComposantes([]);
        }
    }, [selectedInstitution, allComposantes]);

    const handleInstitutionChange = (e) => {
        setSelectedInstitution(e.target.value);
        setFormData(prev => ({ ...prev, Composante_id_affectation_fk: "" }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Application des masques pour CIN et Téléphone
        if (name === "Enseignant_cin") {
            setFormData(prev => ({ ...prev, [name]: formatCIN(value) }));
        } else if (name === "Enseignant_telephone") {
            setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const formPayload = new FormData();
        if (!data?.Enseignant_id && generatedId) formPayload.append("Enseignant_id", generatedId);

        Object.keys(formData).forEach(k => {
            if (formData[k] != null && k !== 'photo_file') {
                formPayload.append(k, formData[k]);
            }
        });

        if (formData.photo_file) formPayload.append("photo_profil", formData.photo_file);

        try {
            const url = data?.Enseignant_id 
                ? `${API_BASE_URL}${API_ROUTE_PREFIX}/${data.Enseignant_id}`
                : `${API_BASE_URL}${API_ROUTE_PREFIX}/`;
            const method = data?.Enseignant_id ? "PUT" : "POST";
            const res = await fetch(url, { method: method, body: formPayload });
            
            if (res.ok) {
                reloadList();
                onClose();
            } else {
                const errData = await res.json();
                alert(`Erreur: ${errData.detail || res.statusText}`);
            }
        } catch (error) { alert("Erreur de connexion."); } 
        finally { setIsSubmitting(false); }
    };

    return (
        <DraggableModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={data?.Enseignant_id ? "Modifier Enseignant" : "Nouvel Enseignant"} 
            widthClass="w-[700px]" // Un peu plus large pour accommoder les nouveaux champs
        >
            <form onSubmit={handleSubmit} className="p-5 bg-gray-50 flex flex-col gap-5">
                
                {/* 1. IDENTITÉ & PHOTO */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                    <div className="text-xs font-mono bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200 inline-flex items-center gap-2 max-w-fit">
                        <FaFingerprint className="text-blue-500" /> 
                        <span className="font-bold">ID: {data?.Enseignant_id || generatedId || "..."}</span> 
                    </div>

                    <div className="flex gap-6 items-center pt-2 border-t border-gray-100">
                        {/* PHOTO: MODIFIÉE POUR ÊTRE RONDE ET PLUS GRANDE */}
                        <div 
                            className="w-32 h-32 bg-gray-100 rounded-full border-4 border-white shadow-md flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden shrink-0 relative group"
                            onClick={() => fileInputRef.current.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                <FaCamera className="text-gray-300 text-3xl group-hover:text-blue-400 transition-colors" />
                            )}
                            <input type="file" name="photo_file" ref={fileInputRef} hidden accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files[0];
                                    if(f){
                                        setPhotoPreview(URL.createObjectURL(f));
                                        setFormData(p => ({ ...p, photo_file: f }));
                                    }
                                }} 
                            />
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col gap-2">
                                <input 
                                    required 
                                    name="Enseignant_nom"
                                    className="w-full border-b-2 border-gray-200 py-1 px-2 text-lg font-bold uppercase focus:border-blue-500 outline-none bg-transparent placeholder-gray-300"
                                    placeholder="NOM DE FAMILLE *"
                                    value={formData.Enseignant_nom || ""} 
                                    onChange={e => setFormData({...formData, Enseignant_nom: e.target.value.toUpperCase()})} 
                                />
                                <input 
                                    name="Enseignant_prenoms"
                                    className="w-full border-b border-gray-200 py-1 px-2 text-sm focus:border-blue-500 outline-none bg-transparent placeholder-gray-300" 
                                    placeholder="Prénoms"
                                    value={formData.Enseignant_prenoms || ""} 
                                    onChange={handleChange} 
                                />
                            </div>

                            {/* SEXE : BOUTONS "HOMME" / "FEMME" */}
                            <div className="flex bg-gray-100 rounded-md p-1 h-9 w-fit">
                                <button type="button" onClick={() => setFormData({...formData, Enseignant_sexe: 'M'})}
                                    className={`px-4 text-xs font-bold rounded flex items-center gap-1 transition-all ${formData.Enseignant_sexe === 'M' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    Homme
                                </button>
                                <button type="button" onClick={() => setFormData({...formData, Enseignant_sexe: 'F'})}
                                    className={`px-4 text-xs font-bold rounded flex items-center gap-1 transition-all ${formData.Enseignant_sexe === 'F' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    Femme
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CONTACTS & CIN (AVEC MASQUES) */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FaIdCard /> Contacts & État Civil</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* TELEPHONE avec Masque */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Téléphone (Mobile)</label>
                            <input 
                                name="Enseignant_telephone" 
                                className="w-full border border-gray-300 rounded px-2 py-2 text-sm outline-none focus:border-blue-500 font-mono tracking-wide" 
                                placeholder="034 00 000 00" 
                                value={formData.Enseignant_telephone || ""} 
                                onChange={handleChange} 
                                maxLength={13} // 10 chiffres + 3 espaces
                            />
                        </div>
                         {/* EMAIL */}
                         <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Adresse Email</label>
                            <input 
                                name="Enseignant_mail" 
                                type="email"
                                className="w-full border border-gray-300 rounded px-2 py-2 text-sm outline-none focus:border-blue-500" 
                                placeholder="exemple@univ.mg" 
                                value={formData.Enseignant_mail || ""} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-3">
                         {/* CIN avec Masque */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">N° CIN (12 chiffres)</label>
                            <input 
                                name="Enseignant_cin" 
                                className="w-full border border-gray-300 p-2 rounded text-sm outline-none focus:border-blue-500 font-mono tracking-wide" 
                                placeholder="XXX-XXX-XXX-XXX" 
                                value={formData.Enseignant_cin || ""} 
                                onChange={handleChange}
                                maxLength={15} // 12 chiffres + 3 tirets
                            />
                        </div>
                        
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Date CIN</label>
                            <input type="date" name="Enseignant_cin_date" className="w-full border border-gray-300 p-1.5 rounded text-sm outline-none" value={formData.Enseignant_cin_date || ""} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Lieu CIN</label>
                            <input name="Enseignant_cin_lieu" className="w-full border border-gray-300 p-2 rounded text-sm outline-none" placeholder="Lieu" value={formData.Enseignant_cin_lieu || ""} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* 3. INFO PRO (Reste quasi identique) */}
                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FaUserTie /> Statut & Grade</h4>
                        <div className="flex w-full bg-gray-200 p-1 rounded">
                            <button type="button" onClick={() => setFormData({...formData, Enseignant_statut: "PERM"})}
                                className={`flex-1 text-xs font-bold py-1.5 rounded ${formData.Enseignant_statut === 'PERM' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>PERMANENT</button>
                            <button type="button" onClick={() => { setFormData({...formData, Enseignant_statut: "VAC", Composante_id_affectation_fk: ""}); setSelectedInstitution(""); }}
                                className={`flex-1 text-xs font-bold py-1.5 rounded ${formData.Enseignant_statut === 'VAC' ? 'bg-white text-orange-600 shadow' : 'text-gray-500'}`}>VACATAIRE</button>
                        </div>
                        <select name="Enseignant_grade" className="w-full border border-gray-300 p-2 rounded text-xs outline-none" value={formData.Enseignant_grade || ""} onChange={handleChange}>
                            <option value="">-- Grade --</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input name="Enseignant_rib" className="w-full border border-gray-300 p-2 rounded text-xs outline-none" placeholder="RIB Bancaire" value={formData.Enseignant_rib || ""} onChange={handleChange} />
                    </div>

                    <div className={`space-y-3 transition-opacity ${formData.Enseignant_statut === 'PERM' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FaBuilding /> Affectation</h4>
                        <div>
                            <label className="text-[9px] text-gray-500 block mb-1">INSTITUTION</label>
                            <div className="relative">
                                <FaUniversity className="absolute left-2 top-2 text-gray-400 text-xs"/>
                                <select className="w-full border border-gray-300 pl-7 p-1.5 rounded text-xs outline-none focus:border-blue-500 bg-white" value={selectedInstitution} onChange={handleInstitutionChange}>
                                    <option value="">-- Choisir --</option>
                                    {institutions.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label className="text-[9px] text-gray-500 block mb-1">ÉTABLISSEMENT</label>
                             <div className="relative">
                                <FaBuilding className="absolute left-2 top-2 text-gray-400 text-xs"/>
                                <select name="Composante_id_affectation_fk" className="w-full border border-gray-300 pl-7 p-1.5 rounded text-xs outline-none focus:border-blue-500 bg-white" value={formData.Composante_id_affectation_fk || ""} onChange={handleChange} disabled={!selectedInstitution}>
                                    <option value="">-- Choisir --</option>
                                    {filteredComposantes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4 border-t border-gray-200 mt-auto gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded text-xs font-bold text-gray-500 hover:bg-gray-100">Annuler</button>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-md">
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />} 
                        {data?.Enseignant_id ? "Modifier" : "Enregistrer"}
                    </button>
                </div>
            </form>
        </DraggableModal>
    );
};