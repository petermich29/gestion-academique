import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBirthdayCake, FaIdCard, FaGraduationCap, FaSpinner } from "react-icons/fa";

// Vous pouvez déplacer ceci dans un fichier de config global si nécessaire
const API_BASE_URL = "http://127.0.0.1:8000/api";

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-full">
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-700 break-words">{value || "N/A"}</p>
        </div>
    </div>
);

const StudentDetailsModal = ({ studentId, onClose }) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!studentId) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/etudiants/${studentId}`);
                if (!response.ok) throw new Error("Impossible de charger les données");
                const data = await response.json();
                setStudent(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [studentId]);

    // Formatage de la date de naissance (Logique Exact vs Vers)
    const renderBirthDate = () => {
        if (!student) return "N/A";
        if (student.Etudiant_naissance_date_Exact) {
            // Format JJ/MM/AAAA
            if (!student.Etudiant_naissance_date) return "N/A";
            const date = new Date(student.Etudiant_naissance_date);
            return `${date.toLocaleDateString('fr-FR')} à ${student.Etudiant_naissance_lieu || 'Inconnu'}`;
        } else {
            // Format "Vers YYYY"
            return `Vers ${student.Etudiant_naissance_annee || "???? "}`;
        }
    };

    if (!studentId) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-fadeIn p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
                
                {/* Bouton Fermer Flottant */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-10 bg-black/10 hover:bg-black/20 text-slate-600 p-2 rounded-full transition-all"
                >
                    <FaTimes size={16} />
                </button>

                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                        <FaSpinner className="animate-spin text-blue-600 text-3xl" />
                        <span className="text-slate-500 text-sm">Chargement du profil...</span>
                    </div>
                ) : error ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-red-500">
                        <FaTimes size={30} />
                        <span>{error}</span>
                    </div>
                ) : (
                    <>
                        {/* En-tête avec Photo et Infos Principales */}
                        <div className="bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0 bg-slate-200 flex items-center justify-center">
                                {student.Etudiant_photo_profil_path ? (
                                    <img 
                                        src={`http://127.0.0.1:8000/${student.Etudiant_photo_profil_path}`} 
                                        alt="Profil" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {e.target.style.display='none';}} // Fallback si image cassée
                                    />
                                ) : (
                                    <FaUser className="text-slate-400 text-4xl" />
                                )}
                            </div>
                            
                            <div className="flex-1 text-center sm:text-left">
                                <div className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded mb-2">
                                    {student.Etudiant_id}
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase leading-tight">
                                    {student.Etudiant_nom}
                                </h2>
                                <h3 className="text-lg font-medium text-slate-500 mb-2">
                                    {student.Etudiant_prenoms}
                                </h3>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                    {student.Etudiant_sexe && (
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                                            {student.Etudiant_sexe === 'M' ? 'Masculin' : 'Féminin'}
                                        </span>
                                    )}
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                                        {student.Etudiant_nationalite || 'Nationalité inconnue'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Corps : Grille d'informations */}
                        <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                
                                {/* Section État Civil */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-gray-100 pb-2 mb-3">État Civil & Identité</h4>
                                    <div className="space-y-1">
                                        <InfoItem icon={FaBirthdayCake} label="Date de naissance" value={renderBirthDate()} />
                                        <InfoItem icon={FaIdCard} label="CIN" value={`${student.Etudiant_cin || '-'} (Du ${student.Etudiant_cin_date ? new Date(student.Etudiant_cin_date).toLocaleDateString() : '-'} à ${student.Etudiant_cin_lieu || '-'})`} />
                                    </div>
                                </div>

                                {/* Section Contact */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-gray-100 pb-2 mb-3">Coordonnées</h4>
                                    <div className="space-y-1">
                                        <InfoItem icon={FaPhone} label="Téléphone" value={student.Etudiant_telephone} />
                                        <InfoItem icon={FaEnvelope} label="Email" value={student.Etudiant_mail} />
                                        <InfoItem icon={FaMapMarkerAlt} label="Adresse" value={student.Etudiant_adresse} />
                                    </div>
                                </div>

                                {/* Section BACC (Si disponible) */}
                                {(student.Etudiant_bacc_annee || student.Etudiant_bacc_serie) && (
                                    <div className="md:col-span-2">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-gray-100 pb-2 mb-3">Baccalauréat</h4>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Année</span>
                                                <span className="text-sm font-bold text-slate-700">{student.Etudiant_bacc_annee}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Série</span>
                                                <span className="text-sm font-bold text-slate-700">{student.Etudiant_bacc_serie}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Numéro</span>
                                                <span className="text-sm font-bold text-slate-700">{student.Etudiant_bacc_numero || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Mention</span>
                                                <span className="text-sm font-bold text-slate-700">{student.Etudiant_bacc_mention || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentDetailsModal;