import { redirect } from "next/navigation";
import { requerirPermiso } from "@/lib/auth/requerirPermiso";
import { ROLES } from "@/lib/constants/roles";
import type { Permiso } from "@/lib/permissions/permissions";

// Restricción del bloque funcional; no modifica la matriz ni la seguridad de usuarios.
export async function requerirAdministradorOperacion(permiso: Permiso, ruta: string) {
  const perfil = await requerirPermiso(permiso, ruta);
  if (perfil.rol !== ROLES.ADMINISTRADOR) redirect("/sin-acceso");
  return perfil;
}
