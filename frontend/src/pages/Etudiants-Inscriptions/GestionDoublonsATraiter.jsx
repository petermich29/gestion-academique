import React, { useState, useEffect } from "react";
import { FaSearch, FaCheckCircle, FaBan, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import DuplicateGroupResolver from "./DuplicateGroupResolver";

export default function GestionDoublonsATraiter({ groups, onMerge, onIgnore }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 3;

    const filteredGroups = groups.filter(group => {
        if (!search) return true;
        const s = search.toLowerCase();
        return group.students.some(stu => 
            (stu.nom && stu.nom.toLowerCase().includes(s)) || 
            (stu.prenoms && stu.prenoms.toLowerCase().includes(s)) ||
            (stu.id && stu.id.toLowerCase().includes(s))
        );
    });

    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    const paginated = filteredGroups.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    useEffect(() => setPage(1), [search]);

    if (groups.length === 0) return (
        <div className="text-center py-20 text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
            <FaCheckCircle className="text-4xl mx-auto mb-2 text-green-100" />
            <p>Aucun doublon à traiter.</p>
        </div>
    );

    return (
        <div>
            <div className="mb-4 flex justify-between items-center bg-white p-3 rounded border border-gray-200">
                <div className="relative w-full max-w-md">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border rounded bg-gray-50 focus:bg-white outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="text-sm text-gray-500">{filteredGroups.length} résultat(s)</div>
            </div>

            <div className="space-y-8">
                {paginated.map(group => (
                    <div key={group.group_id} className="relative group-container">
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => { if(window.confirm("Ignorer ce groupe ?")) onIgnore(group); }} className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
                                <FaBan /> Faux doublon
                            </button>
                        </div>
                        <DuplicateGroupResolver group={group} onSuccess={() => onMerge(group)} />
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded bg-white disabled:opacity-50"><FaChevronLeft /></button>
                    <span className="py-2 px-4 bg-white border rounded">Page {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded bg-white disabled:opacity-50"><FaChevronRight /></button>
                </div>
            )}
        </div>
    );
}