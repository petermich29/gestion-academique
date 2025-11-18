// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTitle, setMenuTitle] = useState("Tableau de bord");
  const [breadcrumb, setBreadcrumb] = useState([
    { label: "Tableau de bord", path: "/" },
  ]);

  const handleMenuChange = (label) => {
    setMenuTitle(label);

    if (label === "Administration") {
      setBreadcrumb([{ label: "Administration", path: "/administration" }]);
    } else if (label === "Tableau de bord") {
      setBreadcrumb([{ label: "Tableau de bord", path: "/" }]);
    }
    // Tu pourras ajouter d'autres cas ici (Ressources humaines, Inscriptions, etc.)
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
        onMenuChange={handleMenuChange}
      />
      <div className="flex-1 flex flex-col">
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          menuTitle={menuTitle}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet
            context={{
              setBreadcrumb,
              menuTitle,
              setMenuTitle,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default Layout;
