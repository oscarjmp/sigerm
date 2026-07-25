"use client";

import { X } from "lucide-react";

import UsuarioForm from "@/components/usuarios/UsuarioForm";
import type { Rol } from "@/lib/types/usuario";

type NuevoUsuarioModalProps = {
  abierto: boolean;
  roles: Rol[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function NuevoUsuarioModal({
  abierto,
  roles,
  onClose,
  onSuccess,
}: NuevoUsuarioModalProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Nuevo usuario
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registra una nueva cuenta de acceso para SIGERM.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6">
          <UsuarioForm
            roles={roles}
            onCancel={onClose}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}