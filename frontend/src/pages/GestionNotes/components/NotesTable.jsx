// src/pages/GestionNotes/components/NotesTable.jsx
import React, { useState } from 'react';

export const NotesTable = ({ structure, students, onNoteChange, readOnly = false }) => {
  const [showUeDetails, setShowUeDetails] = useState(true);

  if (!structure || !students) return null;

  // Calcul du colspan dynamique pour les en-têtes UE
  const getUeColSpan = (ue) => {
    let span = ue.ecs.length; 
    if (showUeDetails) span += 2; // Colonnes Moyenne + Validation
    return span;
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Barre d'outils tableau */}
      <div className="px-4 py-2 bg-gray-50 border-b flex justify-end gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
           <input 
             type="checkbox" 
             checked={showUeDetails} 
             onChange={e => setShowUeDetails(e.target.checked)}
             className="rounded text-blue-600 focus:ring-blue-500"
           />
           Afficher Moyennes & Résultats UE
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
            {/* --- LIGNE 1 : UEs --- */}
            <tr>
              <th rowSpan={2} className="sticky left-0 z-30 bg-gray-100 px-4 py-3 text-left text-xs font-bold text-gray-700 w-64 border-r border-b shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Étudiants ({students.length})
              </th>
              {structure.ues.map(ue => (
                <th 
                  key={ue.id} 
                  colSpan={getUeColSpan(ue)} 
                  className="px-2 py-2 text-center border-l border-b border-gray-300 bg-blue-50/40"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-blue-900">{ue.code}</span>
                    <span className="text-[10px] font-normal text-gray-500 truncate max-w-[150px]" title={ue.intitule}>
                      {ue.intitule}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/60 text-blue-700 rounded-full mt-1 border border-blue-100">
                      {ue.credit} Crédits
                    </span>
                  </div>
                </th>
              ))}
              <th rowSpan={2} className="px-2 py-2 sticky right-0 z-20 bg-gray-100 border-l border-b text-center w-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                <span className="text-xs font-bold text-gray-800">Moy. Gen.</span>
              </th>
            </tr>

            {/* --- LIGNE 2 : ECs --- */}
            <tr>
              {structure.ues.map(ue => (
                <React.Fragment key={`sub-${ue.id}`}>
                  {ue.ecs.map(ec => (
                    <th key={ec.id} className="px-1 py-1 text-center border-l border-b border-gray-200 bg-white min-w-[70px]">
                      <div className="flex flex-col" title={ec.intitule}>
                        <span className="text-[10px] font-bold text-gray-700">{ec.code}</span>
                        <span className="text-[9px] text-gray-400">Coef {ec.coefficient}</span>
                      </div>
                    </th>
                  ))}
                  
                  {showUeDetails && (
                    <>
                      <th className="px-1 py-1 w-12 text-center border-l border-b border-dashed border-gray-300 bg-gray-50">
                        <span className="text-[10px] font-bold text-gray-600">Moy.</span>
                      </th>
                      <th className="px-1 py-1 w-10 text-center border-l border-b border-gray-300 bg-gray-50">
                        <span className="text-[10px] font-bold text-gray-600">V.</span>
                      </th>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {students.map((student) => (
              <tr key={student.etudiant_id} className="hover:bg-blue-50/20 transition-colors group">
                {/* 1. Colonne Étudiant Fixe */}
                <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0 border border-gray-300">
                      {student.photo_url ? (
                          <img src={`http://127.0.0.1:8000/${student.photo_url}`} alt="" className="h-full w-full object-cover" />
                      ) : (
                          student.nom.substring(0,2)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{student.nom}</div>
                      <div className="text-[10px] text-gray-500 truncate">{student.prenoms}</div>
                    </div>
                  </div>
                </td>

                {/* 2. Boucle sur les UEs */}
                {structure.ues.map(ue => {
                  const resUe = student.resultats_ue[ue.id]; // Données ResultatUE
                  return (
                    <React.Fragment key={`row-${student.etudiant_id}-${ue.id}`}>
                      
                      {/* 2a. Cellules Notes (ECs) */}
                      {ue.ecs.map(ec => {
                        const noteVal = student.notes[ec.id];
                        return (
                          <td key={ec.id} className="p-0 border-l border-gray-100 relative h-9">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.01"
                              disabled={readOnly}
                              placeholder="-"
                              value={noteVal !== undefined && noteVal !== null ? noteVal : ""}
                              // On utilise onBlur pour sauvegarder afin d'éviter trop d'appels API
                              onBlur={(e) => {
                                if(readOnly) return;
                                const valStr = e.target.value;
                                const val = valStr === "" ? null : parseFloat(valStr);
                                if (val !== noteVal) {
                                    onNoteChange(student.etudiant_id, ec.id, val);
                                }
                              }}
                              onChange={() => {}} // Controlled input warning fix
                              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                              className={`
                                w-full h-full text-center text-xs focus:outline-none focus:bg-blue-100 focus:ring-inset focus:ring-2 focus:ring-blue-500 transition-all
                                ${!noteVal && noteVal !== 0 ? 'bg-gray-50/30' : 'bg-transparent font-medium'}
                                ${noteVal < 10 && noteVal !== null ? 'text-red-600 font-bold' : 'text-gray-800'}
                              `}
                            />
                          </td>
                        );
                      })}
                      
                      {/* 2b. Cellules Résultat UE (Moyenne + Validation) */}
                      {showUeDetails && (
                        <>
                          <td className={`px-1 py-1 text-center border-l border-dashed border-gray-200 text-[11px] font-bold
                              ${resUe?.valide ? 'text-green-700 bg-green-50/20' : (resUe?.moyenne < 10 && resUe?.moyenne !== null) ? 'text-red-600 bg-red-50/20' : 'text-gray-400'}
                          `}>
                            {resUe?.moyenne !== undefined && resUe?.moyenne !== null 
                              ? resUe.moyenne.toFixed(2) 
                              : "-"}
                          </td>
                          <td className="px-1 py-1 text-center border-l border-gray-200">
                             {resUe?.valide ? (
                               <div className="w-2 h-2 rounded-full bg-green-500 mx-auto" title="Validé"></div>
                             ) : resUe?.moyenne ? (
                               <div className="w-2 h-2 rounded-full bg-red-400 mx-auto" title="Non validé"></div>
                             ) : null}
                          </td>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* 3. Moyenne Générale Semestre */}
                <td className="sticky right-0 bg-gray-50 border-l px-2 py-2 text-center text-xs font-bold text-gray-800 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                  {student.moyenne_semestre !== null && student.moyenne_semestre !== undefined ? (
                      <span className={`px-2 py-0.5 rounded ${student.moyenne_semestre >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {student.moyenne_semestre.toFixed(2)}
                      </span>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};