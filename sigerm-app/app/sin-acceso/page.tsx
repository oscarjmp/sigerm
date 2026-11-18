"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Destino de requerirPermiso() cuando la cuenta no tiene perfil activo,
 * no tiene un rol reconocido o ningún módulo autorizado. No es una ruta
 * protegida por el proxy, para evitar redirecciones circulares.
 */
export default function SinAccesoPage() {
  const { cerrarSesion } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);

    try {
      await cerrarSesion();
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Acceso no disponible
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          Su cuenta no está activa o no tiene módulos asignados.
          Comuníquese con el Administrador de SIGERM.
        </p>

        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saliendo ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </main>
  );
}
