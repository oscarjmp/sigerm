import {
  ROLES,
  type NombreRol,
} from "@/lib/constants/roles";

import {
  PERMISOS,
  type Permiso,
} from "@/lib/permissions/permissions";

export const PERMISOS_POR_ROL: Record<
  NombreRol,
  readonly Permiso[]
> = {
  // =====================================================
  // ADMINISTRADOR
  // =====================================================

  [ROLES.ADMINISTRADOR]: Object.values(PERMISOS),

  // =====================================================
  // COORDINADOR
  // =====================================================

  [ROLES.COORDINADOR]: [
    PERMISOS.VER_DASHBOARD,

    PERMISOS.VER_CATALOGO,

    PERMISOS.VER_PRESTAMOS,
    PERMISOS.CREAR_PRESTAMO,
    PERMISOS.EDITAR_PRESTAMO,
    PERMISOS.REGISTRAR_DEVOLUCION,

    PERMISOS.VER_ENCUENTROS,
    PERMISOS.CREAR_ENCUENTRO,
    PERMISOS.EDITAR_ENCUENTRO,

    PERMISOS.VER_MATRIMONIOS,
    PERMISOS.CREAR_MATRIMONIO,
    PERMISOS.EDITAR_MATRIMONIO,

    PERMISOS.VER_SERVIDORES,
    PERMISOS.CREAR_SERVIDOR,
    PERMISOS.EDITAR_SERVIDOR,

    PERMISOS.VER_REPORTES,
  ],

  // =====================================================
  // INVENTARIO
  // =====================================================

  [ROLES.INVENTARIO]: [
    PERMISOS.VER_CATALOGO,

    PERMISOS.VER_PRESTAMOS,
    PERMISOS.CREAR_PRESTAMO,
    PERMISOS.EDITAR_PRESTAMO,
    PERMISOS.REGISTRAR_DEVOLUCION,

    PERMISOS.VER_MATRIMONIOS,
  ],

  // =====================================================
  // SECRETARIA
  // =====================================================

  [ROLES.SECRETARIA]: [
    PERMISOS.VER_CATALOGO,

    PERMISOS.VER_ENCUENTROS,

    PERMISOS.VER_MATRIMONIOS,
    PERMISOS.CREAR_MATRIMONIO,
    PERMISOS.EDITAR_MATRIMONIO,

    PERMISOS.VER_SERVIDORES,
  ],

  // =====================================================
  // TESORERIA
  // =====================================================

  [ROLES.TESORERIA]: [
    PERMISOS.VER_CATALOGO,

    PERMISOS.VER_MATRIMONIOS,

    PERMISOS.VER_REPORTES,
  ],

  // =====================================================
  // SOLICITANTE
  // =====================================================

  [ROLES.SOLICITANTE]: [
    PERMISOS.VER_CATALOGO,
    PERMISOS.VER_PRESTAMOS,
    PERMISOS.VER_MATRIMONIOS,
  ],
};

export function tienePermiso(
  rol: NombreRol | null | undefined,
  permiso: Permiso,
): boolean {
  if (!rol) {
    return false;
  }

  return (
    PERMISOS_POR_ROL[rol]?.includes(
      permiso,
    ) ?? false
  );
}