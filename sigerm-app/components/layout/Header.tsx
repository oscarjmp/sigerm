"use client";

import { Menu } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

type Props = {
  onMenuClick: () => void;
};

function construirNombreCompleto(
  nombre?: string | null,
  apellidoPaterno?: string | null,
  apellidoMaterno?: string | null,
): string {
  return [
    nombre,
    apellidoPaterno,
    apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Header({
  onMenuClick,
}: Props) {
  const {
    usuario,
    rol,
    cargando,
  } = useAuth();

  const nombreCompleto = usuario
    ? construirNombreCompleto(
        usuario.nombre,
        usuario.apellido_paterno,
        usuario.apellido_materno,
      )
    : "";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 transition hover:bg-gray-100 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>

        <h1 className="text-2xl font-bold text-slate-800">
          SIGERM
        </h1>
      </div>

      <div className="hidden text-right md:block">
        {cargando ? (
          <p className="text-sm font-medium text-slate-400">
            Cargando usuario...
          </p>
        ) : (
          <>
            <p className="font-semibold text-slate-800">
              {nombreCompleto || "Usuario"}
            </p>

            <p className="text-sm text-slate-500">
              {rol ?? "Sin rol"}
            </p>
          </>
        )}
      </div>
    </header>
  );
}