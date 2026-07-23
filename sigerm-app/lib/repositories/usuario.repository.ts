import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Rol,
  Usuario,
  UsuarioConRol,
} from "@/lib/types/usuario";

type UsuarioConsulta = Omit<UsuarioConRol, "roles"> & {
  roles: Rol[] | Rol | null;
};

export type CrearUsuarioBD = Omit<
  Usuario,
  "id" | "created_at" | "updated_at"
>;

export type ActualizarUsuarioBD = Partial<
  Omit<Usuario, "id" | "auth_id" | "created_at" | "updated_at">
>;

function normalizarUsuario(
  usuario: UsuarioConsulta,
): UsuarioConRol {
  return {
    ...usuario,
    roles: Array.isArray(usuario.roles)
      ? usuario.roles[0] ?? null
      : usuario.roles,
  };
}

export function crearUsuarioRepository(
  supabase: SupabaseClient,
) {
  return {
    async obtenerTodos(): Promise<UsuarioConRol[]> {
      const { data, error } = await supabase
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
        .order("nombre", { ascending: true });

      if (error) {
        throw new Error(
          `No fue posible consultar los usuarios: ${error.message}`,
        );
      }

      return ((data ?? []) as UsuarioConsulta[]).map(
        normalizarUsuario,
      );
    },

    async obtenerPorId(
      id: string,
    ): Promise<UsuarioConRol | null> {
      const { data, error } = await supabase
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
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(
          `No fue posible consultar el usuario: ${error.message}`,
        );
      }

      if (!data) {
        return null;
      }

      return normalizarUsuario(
        data as UsuarioConsulta,
      );
    },

    async obtenerPorAuthId(
      authId: string,
    ): Promise<UsuarioConRol | null> {
      const { data, error } = await supabase
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
        .eq("auth_id", authId)
        .maybeSingle();

      if (error) {
        throw new Error(
          `No fue posible consultar el perfil del usuario: ${error.message}`,
        );
      }

      if (!data) {
        return null;
      }

      return normalizarUsuario(
        data as UsuarioConsulta,
      );
    },

    async crear(
      usuario: CrearUsuarioBD,
    ): Promise<Usuario> {
      const { data, error } = await supabase
        .from("usuarios")
        .insert(usuario)
        .select()
        .single();

      if (error) {
        throw new Error(
          `No fue posible crear el usuario: ${error.message}`,
        );
      }

      return data as Usuario;
    },

    async actualizar(
      id: string,
      cambios: ActualizarUsuarioBD,
    ): Promise<Usuario> {
      const { data, error } = await supabase
        .from("usuarios")
        .update({
          ...cambios,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          `No fue posible actualizar el usuario: ${error.message}`,
        );
      }

      return data as Usuario;
    },

    async cambiarEstado(
      id: string,
      activo: boolean,
    ): Promise<Usuario> {
      const { data, error } = await supabase
        .from("usuarios")
        .update({
          activo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          `No fue posible cambiar el estado del usuario: ${error.message}`,
        );
      }

      return data as Usuario;
    },

    async obtenerRoles(): Promise<Rol[]> {
      const { data, error } = await supabase
        .from("roles")
        .select("id, nombre, descripcion")
        .order("nombre", { ascending: true });

      if (error) {
        throw new Error(
          `No fue posible consultar los roles: ${error.message}`,
        );
      }

      return (data ?? []) as Rol[];
    },
  };
}