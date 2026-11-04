"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import type { Permiso } from "@/lib/permissions/permissions";

type CanProps = {
  permiso: Permiso;
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Mantiene montado el contenido mientras AuthContext revalida la sesión
   * (renovación de token o regreso a la pestaña, que emiten eventos de
   * autenticación) para no perder el estado de formularios abiertos.
   *
   * Solo se conserva si el perfil cargado pertenece a la MISMA identidad de
   * la sesión y ya concedía el permiso. Un cierre de sesión, un cambio de
   * identidad, un perfil inactivo o la pérdida del permiso lo desmontan.
   * Durante la revalidación, los componentes deben bloquear escrituras
   * comprobando `cargando` en useAuth().
   *
   * Por defecto es false: comportamiento original (oculta mientras carga).
   */
  conservarDuranteRevalidacion?: boolean;
};

export default function Can({
  permiso,
  children,
  fallback = null,
  conservarDuranteRevalidacion = false,
}: CanProps) {
  const {
    authUser,
    usuario,
    rol,
    cargando,
    estaAutenticado,
    puede,
  } = useAuth();

  if (cargando && conservarDuranteRevalidacion) {
    const mismaIdentidad = Boolean(
      authUser &&
        usuario &&
        usuario.auth_id === authUser.id,
    );

    const autorizadoPreviamente =
      mismaIdentidad &&
      estaAutenticado &&
      tienePermiso(rol, permiso);

    return (
      <>{autorizadoPreviamente ? children : fallback}</>
    );
  }

  if (
    cargando ||
    !estaAutenticado ||
    !puede(permiso)
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
