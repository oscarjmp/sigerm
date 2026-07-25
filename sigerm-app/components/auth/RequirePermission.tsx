"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import type { Permiso } from "@/lib/permissions/permissions";

type RequirePermissionProps = {
  permiso: Permiso;
  children: ReactNode;
  redirigirA?: string;
};

export default function RequirePermission({
  permiso,
  children,
  redirigirA = "/dashboard",
}: RequirePermissionProps) {
  const router = useRouter();

  const {
    cargando,
    estaAutenticado,
    puede,
  } = useAuth();

  const autorizado =
    estaAutenticado && puede(permiso);

  useEffect(() => {
    if (cargando) {
      return;
    }

    if (!estaAutenticado) {
      router.replace("/login");
      return;
    }

    if (!autorizado) {
      router.replace(redirigirA);
    }
  }, [
    autorizado,
    cargando,
    estaAutenticado,
    redirigirA,
    router,
  ]);

  if (cargando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div
            className="
              mx-auto h-10 w-10 animate-spin
              rounded-full border-4
              border-slate-200 border-t-blue-600
            "
          />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return null;
  }

  return <>{children}</>;
}