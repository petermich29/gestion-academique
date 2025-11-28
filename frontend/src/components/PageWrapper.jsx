import React from "react";
import { AppStyles } from "./ui/AppStyles";

export default function PageWrapper({ title, right, children }) {
  return (
    <div className={AppStyles.pageContainer}>
      
      {/* Header uniforme comme dans Administration.jsx */}
      <div className={AppStyles.header.container}>
        {title && <h2 className={AppStyles.header.title}>{title}</h2>}
        {right && <div className={AppStyles.header.controls}>{right}</div>}
      </div>

      {/* Contenu principal */}
      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}
