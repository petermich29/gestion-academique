// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom"; // <- IMPORTANT
import { BreadcrumbProvider, useBreadcrumb } from "../context/BreadcrumbContext"; // <- TON CONTEXTE

const LayoutContent = ({ sidebarOpen, setSidebarOpen, menuTitle, setMenuTitle }) => {
  const location = useLocation();
  const { breadcrumb, setBreadcrumb } = useBreadcrumb(); // <- RÉCUPÈRE LE CONTEXTE GLOBAL

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
        onMenuChange={(label) => setMenuTitle(label)}
      />

      <div className="flex-1 flex flex-col">
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          menuTitle={menuTitle}
          breadcrumb={breadcrumb}          // <- TRÈS IMPORTANT
        />

        <main className="flex-1 p-6 overflow-auto">
          {/* ENVOIE setBreadcrumb AUX PAGES */}
          <Outlet context={{ setBreadcrumb }} />
        </main>
      </div>
    </div>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTitle, setMenuTitle] = useState("Tableau de bord");

  return (
    <BreadcrumbProvider>
      <LayoutContent
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        menuTitle={menuTitle}
        setMenuTitle={setMenuTitle}
      />
    </BreadcrumbProvider>
  );
};

export default Layout;
