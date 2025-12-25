import React, { useState } from "react";
import { FaSearch, FaUndo, FaBan } from "react-icons/fa";

export default function GestionDoublonsFaux({ groups, onRestore }) {
    const [search, setSearch] = useState("");

    const filtered = groups.filter(g => {
        if (!search) return true;
        const s = search.toLowerCase();
        return g.students.some(stu => (stu.nom + " " + stu.prenoms).toLowerCase().includes(s));
    });

    if (groups.length === 0) return <div className="text-center py-10 text-gray-400">Aucun faux doublon.</div>;

    return (
        <div>
            <div className="mb-4 bg-white p-3 rounded border border-gray-200">
                 <div className="flex items-center gap-2 border bg-gray-50 rounded px-3 py-2">
                    <FaSearch className="text-gray-400" />
                    <input type="text" placeholder="Chercher..." className="bg-transparent outline-none w-full" value={search} onChange={e => setSearch(e.target.value)} />
                 </div>
            </div>
            <div className="grid gap-4">
                {filtered.map(group => (
                    <div key={group.group_id} className="bg-white border border-gray-200 p-4 rounded flex justify-between items-center">
                        <div>
                            <div className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1"><FaBan /> Ignoré</div>
                            <div className="flex gap-4">
                                {group.students.map(s => (
                                    <div key={s.id} className="text-sm text-gray-700 font-medium">{s.nom} {s.prenoms}</div>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => onRestore(group)} className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded text-sm font-bold flex items-center gap-1">
                            <FaUndo /> Restaurer
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}