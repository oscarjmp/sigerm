"use client";

import { X } from "lucide-react";

import UsuarioForm from "@/components/usuarios/UsuarioForm";
import type {
  Rol,
  UsuarioConRol,
} from "@/lib/types/usuario";

type EditarUsuarioModalProps = {
  abierto: boolean;
  usuario: UsuarioConRol | null;
  roles: Rol[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditarUsuarioModal({
  abierto,
  usuario,
  roles,
  onClose,
  onSuccess,
}: EditarUsuarioModalProps) {
  if (!abierto || !usuario) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Editar usuario
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Modifica la información del usuario seleccionado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-slate-100"
          >
            <X size={22} />
          </button>

        </div>

        <div className="p-6">

          <UsuarioForm
            modo="editar"
            usuario={usuario}
            roles={roles}
            onCancel={onClose}
            onSuccess={onSuccess}
          />

        </div>

      </div>
    </div>
  );
}