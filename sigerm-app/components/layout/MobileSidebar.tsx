'use client';

import Sidebar from "./Sidebar";

type Props = {
  abierto: boolean;
  cerrar: () => void;
};

export default function MobileSidebar({
  abierto,
  cerrar,
}: Props) {
  return (
    <>
      {/* Fondo oscuro */}
      {abierto && (
        <div
          onClick={cerrar}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Menú */}
      <div
        className={`
          fixed
          top-0
          left-0
          h-full
          z-50
          transform
          transition-transform
          duration-300
          md:hidden
          ${
            abierto
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <Sidebar />
      </div>
    </>
  );
}