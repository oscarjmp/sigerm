"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import type { Permiso } from "@/lib/permissions/permissions";

type PermissionGuardProps = {
  permiso: Permiso;
  children: ReactNode;
};

export default function PermissionGuard({
  permiso,
  children,
}: PermissionGuardProps) {
  const {
    cargando,
    estaAutenticado,
    puede,
  } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div
            className="
              mx-auto h-12 w-12 animate-spin
              rounded-full border-4 border-blue-500
              border-t-transparent
            "
          />

          <p className="mt-5 text-slate-500">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  if (!estaAutenticado) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert
              size={55}
              className="text-amber-600"
            />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Sesión requerida
          </h2>

          <p className="mt-4 text-slate-500">
            Debe iniciar sesión para acceder a este módulo.
          </p>

          <Link
            href="/login"
            className="
              mt-8 inline-block rounded-xl
              bg-blue-600 px-8 py-3
              font-semibold text-white
              transition hover:bg-blue-700
            "
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  if (!puede(permiso)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert
              size={55}
              className="text-red-600"
            />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Acceso denegado
          </h2>

          <p className="mt-4 text-slate-500">
            Su usuario no tiene permisos para acceder a este módulo.
          </p>

          <Link
            href="/dashboard"
            className="
              mt-8 inline-block rounded-xl
              bg-blue-600 px-8 py-3
              font-semibold text-white
              transition hover:bg-blue-700
            "
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}