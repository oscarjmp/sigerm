import MainLayout from "@/components/layout/MainLayout";
import RequirePermission from "@/components/auth/RequirePermission";
import TablaUsuarios from "@/components/usuarios/TablaUsuarios";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

import type {
  Rol,
  UsuarioConRol,
} from "@/lib/types/usuario";

type UsuarioConsulta = Omit<UsuarioConRol, "roles"> & {
  roles: Rol[] | Rol | null;
};

function normalizarUsuario(
  usuario: UsuarioConsulta,
): UsuarioConRol {
  return {
    ...usuario,
    activo: usuario.activo ?? false,
    roles: Array.isArray(usuario.roles)
      ? usuario.roles[0] ?? null
      : usuario.roles,
  };
}

export default async function UsuariosPage() {
  const supabase = await createClient();

  const [
    { data: usuariosData, error: usuariosError },
    { data: rolesData, error: rolesError },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select(`
        id,
        auth_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        email,
        telefono,
        activo,
        rol_id,
        created_at,
        updated_at,
        roles (
          id,
          nombre,
          descripcion
        )
      `)
      .order("nombre", { ascending: true }),

    supabase
      .from("roles")
      .select("id, nombre, descripcion")
      .order("nombre", { ascending: true }),
  ]);

  if (usuariosError) {
    console.error(
      "Error al consultar usuarios:",
      usuariosError.message,
    );
  }

  if (rolesError) {
    console.error(
      "Error al consultar roles:",
      rolesError.message,
    );
  }

  const usuarios = (
    (usuariosData ?? []) as UsuarioConsulta[]
  ).map(normalizarUsuario);

  const roles = (rolesData ?? []) as Rol[];

  return (
    <MainLayout>
      <RequirePermission
        permiso={PERMISOS.ADMINISTRAR_USUARIOS}
      >
        <TablaUsuarios
          usuarios={usuarios}
          roles={roles}
          error={
            usuariosError?.message ??
            rolesError?.message ??
            null
          }
        />
      </RequirePermission>
    </MainLayout>
  );
}