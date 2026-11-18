import { redirect } from "next/navigation";

import {
  TODOS_LOS_ROLES,
  type NombreRol,
} from "@/lib/constants/roles";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import {
  PERMISOS,
  type Permiso,
} from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type PerfilAutorizado = {
  usuarioId: string;
  authId: string;
  rol: NombreRol;
};

type RolRelacion =
  | { nombre: string | null }
  | { nombre: string | null }[]
  | null;

/**
 * Orden de destino cuando el usuario no tiene permiso para la ruta
 * solicitada. Se envía a la primera ruta que sí puede ver, para no
 * generar redirecciones circulares (p. ej. Inventario no ve el dashboard).
 */
const RUTAS_POR_PERMISO: readonly [string, Permiso][] = [
  ["/dashboard", PERMISOS.VER_DASHBOARD],
  ["/inventario", PERMISOS.VER_INVENTARIO],
  ["/prestamos", PERMISOS.VER_PRESTAMOS],
  ["/catalogo", PERMISOS.VER_CATALOGO],
  ["/matrimonios", PERMISOS.VER_MATRIMONIOS],
  ["/kardex", PERMISOS.VER_KARDEX],
  ["/reportes/inventario", PERMISOS.VER_REPORTES],
  ["/administracion/usuarios", PERMISOS.ADMINISTRAR_USUARIOS],
];

function obtenerRol(roles: RolRelacion): NombreRol | null {
  const nombre = Array.isArray(roles)
    ? roles[0]?.nombre
    : roles?.nombre;

  if (
    nombre &&
    (TODOS_LOS_ROLES as string[]).includes(nombre)
  ) {
    return nombre as NombreRol;
  }

  return null;
}

function rutaAlternativa(
  rol: NombreRol,
  rutaActual: string,
): string {
  const destino = RUTAS_POR_PERMISO.find(
    ([ruta, permiso]) =>
      ruta !== rutaActual && tienePermiso(rol, permiso),
  );

  return destino?.[0] ?? "/sin-acceso";
}

/**
 * Autorización del lado del servidor para páginas protegidas.
 *
 * Valida la sesión contra Supabase Auth, exige un perfil activo con un
 * rol reconocido y comprueba el permiso con la misma matriz que usa la
 * interfaz. La protección de los datos la impone RLS en Supabase; esta
 * función evita que se rendericen páginas a quien no corresponde.
 *
 * Debe invocarse fuera de try/catch: redirect() interrumpe el render
 * lanzando una excepción controlada por Next.js.
 */
export async function requerirPermiso(
  permiso: Permiso,
  rutaActual: string,
): Promise<PerfilAutorizado> {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorSesion,
  } = await supabase.auth.getUser();

  if (errorSesion || !user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(rutaActual)}`,
    );
  }

  const { data: perfil, error: errorPerfil } =
    await supabase
      .from("usuarios")
      .select(`
        id,
        activo,
        roles (
          nombre
        )
      `)
      .eq("auth_id", user.id)
      .maybeSingle();

  if (errorPerfil) {
    console.error(
      "[autorizacion] No fue posible verificar el perfil:",
      { code: errorPerfil.code },
    );

    throw new Error(
      "No fue posible verificar sus permisos. Intente nuevamente.",
    );
  }

  const rol = perfil
    ? obtenerRol(perfil.roles as RolRelacion)
    : null;

  /*
   * Sin perfil, perfil inactivo o rol no reconocido: no se envía a
   * /login porque el proxy regresa a los usuarios con sesión al
   * dashboard, lo que provocaría un ciclo.
   */
  if (!perfil || perfil.activo !== true || !rol) {
    redirect("/sin-acceso");
  }

  if (!tienePermiso(rol, permiso)) {
    redirect(rutaAlternativa(rol, rutaActual));
  }

  return {
    usuarioId: perfil.id,
    authId: user.id,
    rol,
  };
}
