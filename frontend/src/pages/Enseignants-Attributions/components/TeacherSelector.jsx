import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaSearch, FaUser, FaTimes, FaChevronDown } from 'react-icons/fa';

export const TeacherSelector = ({ selectedTeacher, onSelect, teachersList }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [openUpwards, setOpenUpwards] = useState(false);
    
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);

    // Normalisation robuste des données
    const getTeacherInfo = (t) => {
        if (!t) return { nom: "", photo: null };
        // On cherche toutes les variantes possibles de clés venant de l'API ou du Frontend
        const nom = t.enseignant_nom || t.Enseignant_nom || 
                    (t.Enseignant_prenoms ? `${t.Enseignant_nom} ${t.Enseignant_prenoms}` : null) || 
                    t.nom || "Inconnu";
        
        const photo = t.enseignant_photo || t.Enseignant_photo_profil_path || t.photo || null;
        
        return { nom, photo };
    };

    const info = getTeacherInfo(selectedTeacher);

    const updatePosition = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const dropdownHeight = 300; // Hauteur estimée du menu
            const spaceBelow = window.innerHeight - rect.bottom;
            
            // On décide d'ouvrir vers le haut s'il n'y a pas assez de place en bas
            const shouldOpenUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
            
            setOpenUpwards(shouldOpenUp);
            setPosition({
                left: rect.left,
                top: shouldOpenUp ? (rect.top + window.scrollY) : (rect.bottom + window.scrollY),
                width: Math.max(rect.width, 280) // On force une largeur minimale pour que ça déborde joliment sur les côtés
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            // Fermer si on scrolle pour éviter que le menu flottant se décale mal
            const handleScroll = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target) && 
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = teachersList.filter(t => 
        (t.Enseignant_nom && t.Enseignant_nom.toLowerCase().includes(search.toLowerCase())) || 
        (t.Enseignant_prenoms && t.Enseignant_prenoms.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = (t) => {
        onSelect(t);
        setIsOpen(false);
        setSearch("");
    };

    const dropdownMenu = (
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-gray-200 shadow-2xl rounded-lg overflow-hidden flex flex-col"
            style={{
                top: openUpwards ? (position.top - 5) : (position.top + 5),
                left: position.left,
                width: position.width,
                transform: openUpwards ? 'translateY(-100%)' : 'none',
                maxHeight: '300px'
            }}
        >
            <div className="p-2 border-b bg-gray-50 sticky top-0">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"/>
                    <input 
                        autoFocus
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Rechercher un enseignant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar">
                {filtered.length > 0 ? filtered.map(t => (
                    <div 
                        key={t.Enseignant_id} 
                        onClick={() => handleSelect(t)}
                        className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {t.Enseignant_photo_profil_path ? (
                                <img 
                                    src={t.Enseignant_photo_profil_path.startsWith('http') ? t.Enseignant_photo_profil_path : `http://127.0.0.1:8000/${t.Enseignant_photo_profil_path}`} 
                                    alt="" className="w-full h-full object-cover" 
                                />
                            ) : <FaUser className="text-gray-300 m-auto mt-2 text-sm"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 truncate">{t.Enseignant_nom} {t.Enseignant_prenoms}</div>
                            <div className="text-[10px] text-gray-500">{t.Enseignant_grade || "Grade N/A"}</div>
                        </div>
                    </div>
                )) : (
                    <div className="p-4 text-xs text-center text-gray-400 italic">Aucun enseignant trouvé</div>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full" ref={wrapperRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 p-1.5 border rounded-md cursor-pointer transition-all text-xs
                ${selectedTeacher ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
            >
                {selectedTeacher ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden shrink-0 border border-white shadow-sm">
                            {info.photo ? (
                                <img 
                                    src={info.photo.startsWith('http') ? info.photo : `http://127.0.0.1:8000/${info.photo}`} 
                                    alt="" className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-[8px] font-bold text-blue-700">
                                    {info.nom ? info.nom.substring(0,2).toUpperCase() : "??"}
                                </span>
                            )}
                        </div>
                        <div className="truncate font-semibold text-gray-700">
                            {info.nom}
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400 italic pl-1">Choisir...</span>
                )}

                <div className="flex items-center">
                    {selectedTeacher ? (
                        <button onClick={(e) => { e.stopPropagation(); onSelect(null); }} className="text-gray-400 hover:text-red-500 p-1">
                            <FaTimes size={10} />
                        </button>
                    ) : <FaChevronDown className="text-gray-300 text-[10px]" />}
                </div>
            </div>

            {/* Le Portal permet d'afficher la liste au-dessus de TOUT le reste du site */}
            {isOpen && createPortal(dropdownMenu, document.body)}
        </div>
    );
};