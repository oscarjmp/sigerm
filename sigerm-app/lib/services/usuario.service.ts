import type { SupabaseClient } from "@supabase/supabase-js";

import { crearUsuarioRepository } from "@/lib/repositories/usuario.repository";
import type {
  Rol,
  Usuario,
  UsuarioConRol,
  UsuarioFormulario,
} from "@/lib/types/usuario";

export function crearUsuarioService(
  supabase: SupabaseClient,
) {
  const repository = crearUsuarioRepository(supabase);

  return {

    async listarUsuarios(): Promise<UsuarioConRol[]> {
      return repository.obtenerTodos();
    },

    async obtenerUsuario(
      id: string,
    ): Promise<UsuarioConRol | null> {
      return repository.obtenerPorId(id);
    },

    async listarRoles(): Promise<Rol[]> {
      return repository.obtenerRoles();
    },

    validarFormulario(
      datos: UsuarioFormulario,
    ): string[] {

      const errores: string[] = [];

      if (!datos.nombre.trim()) {
        errores.push("El nombre es obligatorio.");
      }

      if (!datos.email.trim()) {
        errores.push("El correo electrónico es obligatorio.");
      }

      if (
        datos.email &&
        !datos.email.includes("@")
      ) {
        errores.push("El correo electrónico no es válido.");
      }

      if (!datos.password.trim()) {
        errores.push("La contraseña es obligatoria.");
      }

      if (datos.password.length < 8) {
        errores.push(
          "La contraseña debe tener al menos 8 caracteres.",
        );
      }

      if (!datos.rol_id) {
        errores.push("Debe seleccionar un rol.");
      }

      return errores;
    },

    async actualizarUsuario(
      id: string,
      datos: Partial<Usuario>,
    ): Promise<Usuario> {

      return repository.actualizar(id, datos);

    },

    async cambiarEstado(
      id: string,
      activo: boolean,
    ): Promise<Usuario> {

      return repository.cambiarEstado(id, activo);

    },

  };

}