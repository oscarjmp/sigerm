"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";

import type { UsuarioConRol } from "@/lib/types/usuario";

type EliminarUsuarioModalProps = {
  abierto: boolean;
  usuario: UsuarioConRol | null;
  eliminando: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

function construirNombreCompleto(
  usuario: UsuarioConRol,
): string {
  return [
    usuario.nombre,
    usuario.apellido_paterno,
    usuario.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function EliminarUsuarioModal({
  abierto,
  usuario,
  eliminando,
  error,
  onClose,
  onConfirm,
}: EliminarUsuarioModalProps) {
  if (!abierto || !usuario) {
    return null;
  }

  const nombreCompleto = construirNombreCompleto(usuario);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-red-600">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Eliminar usuario
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Esta acción eliminará su acceso a SIGERM.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={eliminando}
            aria-label="Cerrar"
            className="
              rounded-xl p-2 text-slate-500 transition
              hover:bg-slate-100 hover:text-slate-900
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
            <p className="text-sm text-slate-700">
              Está por eliminar permanentemente al usuario:
            </p>

            <p className="mt-2 text-lg font-bold text-slate-900">
              {nombreCompleto || usuario.email}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {usuario.email}
            </p>

            <p className="mt-3 text-sm font-medium text-red-700">
              La cuenta será eliminada de Supabase Authentication y
              de la tabla de usuarios.
            </p>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            Esta operación no puede deshacerse. Verifica que el usuario
            seleccionado sea el correcto antes de continuar.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={eliminando}
            className="
              rounded-xl border border-slate-300 px-5 py-3
              font-semibold text-slate-700 transition
              hover:bg-slate-50 disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={eliminando}
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-red-600 px-5 py-3 font-semibold text-white
              transition hover:bg-red-700
              disabled:cursor-not-allowed disabled:bg-red-300
            "
          >
            <Trash2 size={18} />

            {eliminando
              ? "Eliminando..."
              : "Eliminar usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}