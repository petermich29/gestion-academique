import React from "react";
import { FaUser } from "react-icons/fa";

export default function GestionDoublonsTraites({ groups }) {
    if (groups.length === 0) return <div className="text-center py-10 text-gray-400">Aucun historique.</div>;

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b">
                    <tr>
                        <th className="p-4">Groupe</th>
                        <th className="p-4">Statut</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {groups.map((g, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4">
                                <div className="flex flex-wrap gap-2">
                                    {g.students.map(s => (
                                        <span key={s.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100 flex items-center gap-1">
                                            <FaUser size={10} /> {s.nom} {s.prenoms}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Fusionné</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}