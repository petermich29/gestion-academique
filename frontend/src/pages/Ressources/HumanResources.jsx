import React, { useState, useEffect } from "react";
import { 
    FaUserGraduate, FaChalkboardTeacher, FaSearch, FaPlus, 
    FaEdit, FaTrash, FaUser, FaPhone, FaEnvelope, 
    FaChevronLeft, FaChevronRight, FaUniversity, FaBuilding, FaClock
} from "react-icons/fa";

import { AppStyles } from "../../components/ui/AppStyles";
import { SpinnerIcon } from "../../components/ui/Icons";
import { ToastContainer } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/Modal";
import { useBreadcrumb } from "../../context/BreadcrumbContext";
import { StudentFormModal, TeacherFormModal } from "../Administration/components/HRForms";

const API_BASE_URL = "http://127.0.0.1:8000";

const HumanResources = () => {
    const { setBreadcrumb } = useBreadcrumb();
  
    // --- STATES ---
    const [activeTab, setActiveTab] = useState("etudiants");
    const [dataList, setDataList] = useState([]);
    const [composantesList, setComposantesList] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    // Pagination & Recherche
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // Modals & UI
    const [toasts, setToasts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- UTILS ---
    const addToast = (msg, type = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    // --- DATA FETCHING ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            let url = "";
            if (activeTab === "etudiants") {
                const skip = (pagination.page - 1) * pagination.limit;
                const params = new URLSearchParams({ skip: skip.toString(), limit: pagination.limit.toString() });
                if (searchTerm) params.append("search", searchTerm);
                url = `${API_BASE_URL}/api/etudiants?${params.toString()}`;
            } else {
                url = `${API_BASE_URL}/api/enseignants`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Erreur chargement données");
            const result = await res.json();

            if (activeTab === "etudiants") {
                setDataList(result.items);
                setPagination(prev => ({ ...prev, total: result.total }));
            } else {
                setDataList(result);
                if (composantesList.length === 0) {
                    const resComp = await fetch(`${API_BASE_URL}/api/composantes`);
                    if (resComp.ok) setComposantesList(await resComp.json());
                }
            }
        } catch (error) {
            console.error(error);
            addToast("Impossible de charger les données", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setBreadcrumb([
            { label: "Ressources Humaines", path: "/ressources-humaines" },
            { label: activeTab === "etudiants" ? "Gestion Étudiants" : "Gestion Enseignants", path: "#" }
        ]);
        setSearchTerm("");
        setPagination(prev => ({ ...prev, page: 1, total: 0 }));
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchData(); }, 500);
        return () => clearTimeout(timer);
    }, [activeTab, pagination.page, searchTerm]);

    // --- HANDLERS ---
    const handleSearchChange = (e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); };
    const handlePageChange = (p) => { if (p > 0) setPagination(prev => ({ ...prev, page: p })); };
    const handleOpenCreate = () => { setCurrentItem({}); setIsModalOpen(true); };
    const handleOpenEdit = (item) => { setCurrentItem({ ...item }); setIsModalOpen(true); };

    // --- CRUD ---
    const handleChange = (e) => { const { name, value } = e.target; setCurrentItem(prev => ({ ...prev, [name]: value })); };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const isStudent = activeTab === "etudiants";
            const id = isStudent ? currentItem.Etudiant_id : currentItem.Enseignant_id;
            let url = `${API_BASE_URL}/api/${activeTab}` + (id ? `/${id}` : "");
            const method = id ? "PUT" : "POST";

            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(currentItem)
            });
            if (!res.ok) throw new Error("Erreur enregistrement");
            addToast("Opération réussie");
            setIsModalOpen(false);
            fetchData();
        } catch (error) { addToast(error.message, "error"); } finally { setIsSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!currentItem) return;
        try {
            const id = activeTab === "etudiants" ? currentItem.Etudiant_id : currentItem.Enseignant_id;
            const res = await fetch(`${API_BASE_URL}/api/${activeTab}/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erreur suppression");
            addToast("Suppression effectuée");
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) { addToast("Erreur suppression", "error"); }
    };

    // --- RENDER HELPERS ---
    const displayData = activeTab === "etudiants" ? dataList : dataList.filter(item => 
        (item.Enseignant_nom || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = activeTab === "etudiants" ? Math.ceil(pagination.total / pagination.limit) : 1;

    return (
        <div className={AppStyles.pageContainer}>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            <div>
                <h2 className={AppStyles.mainTitle}>Ressources Humaines</h2>
                <p className="text-gray-500 text-sm mt-1">Gestion administrative et académique.</p>
            </div>
            
            <div className="flex gap-4 border-b border-gray-200 mt-4">
                <button onClick={() => setActiveTab("etudiants")} className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${activeTab === "etudiants" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
                    <FaUserGraduate className="text-lg"/> Étudiants
                </button>
                <button onClick={() => setActiveTab("enseignants")} className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm border-b-2 transition-all ${activeTab === "enseignants" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
                    <FaChalkboardTeacher className="text-lg"/> Enseignants
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-4">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder={activeTab === "etudiants" ? "Rechercher un étudiant..." : "Rechercher un enseignant..."} value={searchTerm} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
                <button onClick={handleOpenCreate} className={AppStyles.button.primary}>
                    <FaPlus /> Nouveau {activeTab === "etudiants" ? "Étudiant" : "Enseignant"}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col mt-4">
                {isLoading ? (
                    <div className="flex items-center justify-center flex-grow h-64"><SpinnerIcon className="animate-spin text-4xl text-blue-600" /></div>
                ) : (
                    <>
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <tr>
                                    <th className="p-4">Identité</th>
                                    <th className="p-4">{activeTab === "etudiants" ? "N° Inscription" : "Matricule"}</th>
                                    {/* COLONNE MODIFIÉE: affiche les mentions distinctes */}
                                    <th className="p-4 w-1/3">{activeTab === "etudiants" ? "Cursus (Mentions Distinctes)" : "Affectation"}</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {displayData.length > 0 ? displayData.map(item => {
                                    const id = activeTab === "etudiants" ? item.Etudiant_id : item.Enseignant_id;
                                    
                                    return (
                                        <tr key={id} className="hover:bg-blue-50/30 transition-colors group align-top">
                                            {/* Identité */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><FaUser /></div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{activeTab === "etudiants" ? item.Etudiant_nom : item.Enseignant_nom}</div>
                                                        <div className="text-xs text-gray-500">{activeTab === "etudiants" ? item.Etudiant_prenoms : item.Enseignant_prenoms}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Matricule */}
                                            <td className="p-4">
                                                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 border border-gray-200">
                                                    {activeTab === "etudiants" ? (item.Etudiant_numero_inscription || "N/A") : (item.Enseignant_matricule || "N/A")}
                                                </span>
                                            </td>

                                            {/* --- COLONNE LISTE DES MENTIONS REGROUPÉES --- */}
                                            <td className="p-4">
                                                {activeTab === "etudiants" ? (
                                                    item.cursus_liste && item.cursus_liste.length > 0 ? (
                                                        <div className="flex flex-col gap-4">
                                                            {item.cursus_liste.map((cursus_mention, idx) => {
                                                                const yearsDisplay = cursus_mention.annee_universitaire_list.join(', ');
                                                                const isMultipleYears = cursus_mention.annee_universitaire_list.length > 1;

                                                                return (
                                                                    <div key={idx} className={`flex flex-col gap-1.5 ${idx > 0 ? "pt-3 border-t border-gray-100" : ""}`}>
                                                                        {/* Ligne 1: Mention Nom */}
                                                                        <div className="flex justify-between items-start gap-2">
                                                                            <div className="font-bold text-gray-800 text-sm leading-tight">
                                                                                {cursus_mention.mention_nom}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Ligne 2: Institution & Etablissement (Composante) */}
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {cursus_mention.institution_abbr && (
                                                                                <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded" title="Institution">
                                                                                    <FaUniversity className="text-[9px]"/> {cursus_mention.institution_abbr}
                                                                                </span>
                                                                            )}
                                                                            {cursus_mention.composante_abbr && (
                                                                                <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" title="Établissement (Composante)">
                                                                                    <FaBuilding className="text-[9px]"/> {cursus_mention.composante_abbr}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Ligne 3: Années universitaires (Regroupées) */}
                                                                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                                                            <FaClock className="text-gray-400 text-sm"/>
                                                                            <span className={`font-semibold ${isMultipleYears ? "text-blue-700" : "text-gray-600"}`}>
                                                                                {yearsDisplay}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        {/* Info Parcours (Optionnel, si besoin de détail) 
                                                                        <div className="mt-1 text-[10px] text-gray-500 italic">
                                                                            {cursus_mention.parcours_details.map(p => p.parcours_nom).join(', ')}
                                                                        </div>
                                                                        */}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">Aucune inscription active</span>
                                                    )
                                                ) : (
                                                    // Cas Enseignant
                                                    <div className="text-xs">
                                                        {item.Composante_id_affectation_fk ? (
                                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-semibold">
                                                                {composantesList.find(c => c.Composante_id === item.Composante_id_affectation_fk)?.Composante_label}
                                                            </span>
                                                        ) : "Transversal"}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Contact */}
                                            <td className="p-4 text-gray-600">
                                                <div className="flex flex-col gap-1 text-xs">
                                                    {(activeTab === "etudiants" ? item.Etudiant_mail : item.Enseignant_mail) && 
                                                        <span className="flex items-center gap-1"><FaEnvelope className="text-gray-400"/> {activeTab === "etudiants" ? item.Etudiant_mail : item.Enseignant_mail}</span>
                                                    }
                                                    {(activeTab === "etudiants" ? item.Etudiant_telephone : item.Enseignant_telephone) && 
                                                        <span className="flex items-center gap-1"><FaPhone className="text-gray-400"/> {activeTab === "etudiants" ? item.Etudiant_telephone : item.Enseignant_telephone}</span>
                                                    }
                                                </div>
                                            </td>

                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><FaEdit /></button>
                                                    <button onClick={() => { setCurrentItem(item); setIsDeleteOpen(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded"><FaTrash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">Aucun élément trouvé.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Etudiant */}
                    {activeTab === "etudiants" && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <span className="text-xs text-gray-500">Total: <span className="font-bold">{pagination.total}</span></span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)} className="p-2 rounded hover:bg-white disabled:opacity-30"><FaChevronLeft /></button>
                                <span className="text-sm font-bold text-gray-700 px-2">Page {pagination.page} / {totalPages}</span>
                                <button disabled={pagination.page >= totalPages} onClick={() => handlePageChange(pagination.page + 1)} className="p-2 rounded hover:bg-white disabled:opacity-30"><FaChevronRight /></button>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>

            {/* Modals */}
            {activeTab === "etudiants" ? (
                <StudentFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={currentItem || {}} onChange={handleChange} onSubmit={handleSubmit} isSubmitting={isSubmitting} title={currentItem?.Etudiant_id ? "Modifier" : "Nouveau"} />
            ) : (
                <TeacherFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={currentItem || {}} onChange={handleChange} onSubmit={handleSubmit} isSubmitting={isSubmitting} title={currentItem?.Enseignant_id ? "Modifier" : "Nouveau"} composantesList={composantesList} />
            )}
            <ConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmation"><p>Voulez-vous vraiment supprimer {activeTab === "etudiants" ? currentItem?.Etudiant_nom : currentItem?.Enseignant_nom}?</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsDeleteOpen(false)} className={AppStyles.button.secondary}>Non</button><button onClick={handleDelete} className={AppStyles.button.danger}>Oui</button></div></ConfirmModal>
        </div>
    );
};

export default HumanResources;