"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import Sidebar from "@/components/layout/Sidebar";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({
  children,
}: MainLayoutProps) {
  const [menuAbierto, setMenuAbierto] =
    useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {/* Menú fijo para computadora */}
      <div className="hidden h-screen shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Menú deslizable para celular */}
      <MobileSidebar
        abierto={menuAbierto}
        cerrar={() => setMenuAbierto(false)}
      />

      {/* Columna derecha */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Encabezado fijo */}
        <div className="relative z-30 shrink-0">
          <Header
            onMenuClick={() =>
              setMenuAbierto(true)
            }
          />
        </div>

        {/* Única zona con desplazamiento */}
        <main
          id="contenido-principal"
          className="
            min-h-0 flex-1
            overflow-y-auto overflow-x-hidden
            overscroll-contain
            scroll-smooth
          "
        >
          <section
            className="
              mx-auto w-full
              max-w-[1800px]
              p-4
              sm:p-5
              md:p-6
              lg:p-8
            "
          >
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}