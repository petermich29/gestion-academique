import React, { createContext, useContext, useState, useEffect } from "react";

const AdministrationContext = createContext();

export const useAdministration = () => useContext(AdministrationContext);

export const AdministrationProvider = ({ children }) => {
  // On essaye de récupérer depuis le localStorage au chargement
  const [selectedYearsIds, setSelectedYearsIds] = useState(() => {
    const saved = localStorage.getItem("adminSelectedYears");
    return saved ? JSON.parse(saved) : [];
  });

  const [yearsList, setYearsList] = useState([]);

  // Sauvegarde automatique dans le localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem("adminSelectedYears", JSON.stringify(selectedYearsIds));
  }, [selectedYearsIds]);

  // Chargement global des années (pour éviter de le refaire sur chaque page)
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/metadonnees/annees-universitaires");
        if (res.ok) {
          const data = await res.json();
          setYearsList(data);
          
          // Si aucune sélection et qu'on a des données, sélectionner l'active par défaut
          if (selectedYearsIds.length === 0) {
            const active = data.find(y => y.AnneeUniversitaire_is_active);
            if (active) setSelectedYearsIds([active.AnneeUniversitaire_id]);
          }
        }
      } catch (e) {
        console.error("Erreur chargement années context", e);
      }
    };
    fetchYears();
  }, []); // Se lance une seule fois au montage du Provider

  return (
    <AdministrationContext.Provider value={{ 
        selectedYearsIds, 
        setSelectedYearsIds, 
        yearsList 
    }}>
      {children}
    </AdministrationContext.Provider>
  );
};