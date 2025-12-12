// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { BreadcrumbProvider, useBreadcrumb } from "../context/BreadcrumbContext";

// 🔥 IMPORT TOAST GLOBAL
import { ToastProvider } from "../context/ToastContext";
import { ToastContainer } from "../components/ui/Toast";

const LayoutContent = ({ sidebarOpen, setSidebarOpen, menuTitle, setMenuTitle }) => {
  const location = useLocation();
  const { breadcrumb, setBreadcrumb } = useBreadcrumb();

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
          breadcrumb={breadcrumb}
        />

        <main className="flex-1 p-6 overflow-auto">
          <Outlet context={{ setBreadcrumb }} />
        </main>
      </div>

      {/* 🔥 TOASTS TOUJOURS VISIBLES */}
      <ToastContainer />
    </div>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTitle, setMenuTitle] = useState("Tableau de bord");

  return (
    <ToastProvider>          {/* 🟦 CONTEXTE GLOBAL TOAST */}
      <BreadcrumbProvider>   {/* 🟦 CONTEXTE BREADCRUMB */}
        <LayoutContent
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          menuTitle={menuTitle}
          setMenuTitle={setMenuTitle}
        />
      </BreadcrumbProvider>
    </ToastProvider>
  );
};

export default Layout;
