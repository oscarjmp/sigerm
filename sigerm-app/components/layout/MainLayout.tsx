'use client';

import { useState } from "react";

import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileSidebar from "./MobileSidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [menuAbierto, setMenuAbierto] = useState(false);

  return (

    <div className="min-h-screen bg-slate-100 flex">

      {/* Sidebar escritorio */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar móvil */}
      <MobileSidebar
        abierto={menuAbierto}
        cerrar={() => setMenuAbierto(false)}
      />

      {/* Contenido */}
      <main className="flex-1 min-w-0 flex flex-col">

        <Header
          onMenuClick={() => setMenuAbierto(true)}
        />

        <section className="flex-1 p-4 md:p-8 overflow-x-auto">
          {children}
        </section>

      </main>

    </div>

  );

}