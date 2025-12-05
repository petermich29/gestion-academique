// src/context/BreadcrumbContext.jsx
import React, { createContext, useContext, useState } from "react";

const BreadcrumbContext = createContext({
  breadcrumb: [],
  setBreadcrumb: () => {}
});

export const BreadcrumbProvider = ({ children }) => {
  const [breadcrumb, setBreadcrumb] = useState([]);
  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

// Hook pratique
export const useBreadcrumb = () => useContext(BreadcrumbContext);
