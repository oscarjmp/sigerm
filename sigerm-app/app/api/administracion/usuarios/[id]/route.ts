import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ActualizarUsuarioRequest = {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  telefono?: string;
  rol_id?: string;
  activo?: boolean;
};

type RolRelacion =
  | {
      id?: string;
      nombre: string;
    }
  | {
      id?: string;
      nombre: string;
    }[]
  | null;

type PerfilAdministrador = {
  id: string;
  auth_id: string | null;
  activo: boolean;
  roles: RolRelacion;
};

function obtenerPrimerRol(
  roles: RolRelacion,
): {
  id?: string;
  nombre: string;
} | null {
  if (Array.isArray(roles)) {
    return roles[0] ?? null;
  }

  return roles ?? null;
}

function limpiarTexto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function validarDatos(
  datos: ActualizarUsuarioRequest,
): string[] {
  const errores: string[] = [];

  const nombre = limpiarTexto(datos.nombre);
  const rolId = limpiarTexto(datos.rol_id);

  if (!nombre) {
    errores.push("El nombre es obligatorio.");
  }

  if (!rolId) {
    errores.push("Debe seleccionar un rol.");
  }

  return errores;
}

async function obtenerAdministradorActual() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        {
          error: "No existe una sesión válida.",
        },
        {
          status: 401,
        },
      ),
      supabase,
      perfil: null,
    };
  }

  const {
    data: perfil,
    error: perfilError,
  } = await supabase
    .from("usuarios")
    .select(`
      id,
      auth_id,
      activo,
      roles (
        id,
        nombre
      )
    `)
    .eq("auth_id", user.id)
    .maybeSingle();

  if (perfilError) {
    console.error(
      "Error al consultar el perfil administrador:",
      perfilError,
    );

    return {
      error: NextResponse.json(
        {
          error:
            "No fue posible comprobar sus permisos.",
        },
        {
          status: 500,
        },
      ),
      supabase,
      perfil: null,
    };
  }

  if (!perfil || !perfil.activo) {
    return {
      error: NextResponse.json(
        {
          error: "Su cuenta no está activa.",
        },
        {
          status: 403,
        },
      ),
      supabase,
      perfil: null,
    };
  }

  const perfilNormalizado =
    perfil as unknown as PerfilAdministrador;

  const rolAdministrador = obtenerPrimerRol(
    perfilNormalizado.roles,
  );

  if (rolAdministrador?.nombre !== "Administrador") {
    return {
      error: NextResponse.json(
        {
          error:
            "No cuenta con autorización para administrar usuarios.",
        },
        {
          status: 403,
        },
      ),
      supabase,
      perfil: null,
    };
  }

  return {
    error: null,
    supabase,
    perfil: perfilNormalizado,
  };
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "No se recibió el identificador del usuario.",
        },
        {
          status: 400,
        },
      );
    }

    const autenticacion =
      await obtenerAdministradorActual();

    if (autenticacion.error) {
      return autenticacion.error;
    }

    const perfilAdministrador =
      autenticacion.perfil;

    if (!perfilAdministrador) {
      return NextResponse.json(
        {
          error:
            "No fue posible identificar al administrador.",
        },
        {
          status: 401,
        },
      );
    }

    let datos: ActualizarUsuarioRequest;

    try {
      datos =
        (await request.json()) as ActualizarUsuarioRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "La información enviada no es válida.",
        },
        {
          status: 400,
        },
      );
    }

    const errores = validarDatos(datos);

    if (errores.length > 0) {
      return NextResponse.json(
        {
          error:
            "Revise los datos del formulario.",
          errores,
        },
        {
          status: 400,
        },
      );
    }

    if (
      datos.activo !== undefined &&
      typeof datos.activo !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "El estado del usuario no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    const nombre = limpiarTexto(datos.nombre);

    const apellidoPaterno =
      limpiarTexto(datos.apellido_paterno) || null;

    const apellidoMaterno =
      limpiarTexto(datos.apellido_materno) || null;

    const telefono =
      limpiarTexto(datos.telefono) || null;

    const rolId = limpiarTexto(datos.rol_id);

    const {
      data: usuarioExistente,
      error: usuarioExistenteError,
    } = await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        auth_id,
        email,
        activo,
        rol_id
      `)
      .eq("id", id)
      .maybeSingle();

    if (usuarioExistenteError) {
      console.error(
        "Error al consultar el usuario:",
        usuarioExistenteError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible consultar el usuario.",
        },
        {
          status: 500,
        },
      );
    }

    if (!usuarioExistente) {
      return NextResponse.json(
        {
          error: "El usuario no existe.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Si la petición no incluye "activo", se conserva el
     * estado actual (editar no reactiva ni desactiva).
     */
    const activo =
      typeof datos.activo === "boolean"
        ? datos.activo
        : usuarioExistente.activo;

    /*
     * Se compara con el id devuelto por la base de datos,
     * no con el parámetro de la URL, para evitar variantes
     * de mayúsculas del mismo UUID.
     */
    const esPropiaCuenta =
      perfilAdministrador.id === usuarioExistente.id;

    const {
      data: rol,
      error: rolError,
    } = await supabaseAdmin
      .from("roles")
      .select("id, nombre, descripcion")
      .eq("id", rolId)
      .maybeSingle();

    if (rolError) {
      console.error(
        "Error al consultar el rol:",
        rolError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible comprobar el rol seleccionado.",
        },
        {
          status: 500,
        },
      );
    }

    if (!rol) {
      return NextResponse.json(
        {
          error:
            "El rol seleccionado no existe.",
        },
        {
          status: 400,
        },
      );
    }

    if (esPropiaCuenta) {
      if (!activo) {
        return NextResponse.json(
          {
            error:
              "No puede desactivar su propia cuenta.",
          },
          {
            status: 400,
          },
        );
      }

      if (rolId !== usuarioExistente.rol_id) {
        return NextResponse.json(
          {
            error:
              "No puede modificar su propio rol.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const {
      data: usuarioActualizado,
      error: actualizarError,
    } = await supabaseAdmin
      .from("usuarios")
      .update({
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        telefono,
        rol_id: rolId,
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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
        updated_at
      `)
      .single();

    if (actualizarError) {
      console.error(
        "Error al actualizar el usuario:",
        actualizarError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible actualizar el usuario.",
        },
        {
          status: 500,
        },
      );
    }

    if (usuarioExistente.auth_id) {
      const {
        error: actualizarAuthError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          usuarioExistente.auth_id,
          {
            user_metadata: {
              nombre,
              apellido_paterno: apellidoPaterno,
              apellido_materno: apellidoMaterno,
            },
          },
        );

      if (actualizarAuthError) {
        console.error(
          "No fue posible actualizar los metadatos de Auth:",
          actualizarAuthError,
        );
      }
    }

    return NextResponse.json(
      {
        mensaje:
          "Usuario actualizado correctamente.",
        usuario: {
          ...usuarioActualizado,
          roles: rol,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Error inesperado al actualizar usuario:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "No se recibió el identificador del usuario.",
        },
        {
          status: 400,
        },
      );
    }

    const autenticacion =
      await obtenerAdministradorActual();

    if (autenticacion.error) {
      return autenticacion.error;
    }

    const perfilAdministrador =
      autenticacion.perfil;

    if (!perfilAdministrador) {
      return NextResponse.json(
        {
          error:
            "No fue posible identificar al administrador.",
        },
        {
          status: 401,
        },
      );
    }

    if (perfilAdministrador.id === id) {
      return NextResponse.json(
        {
          error:
            "No puede eliminar su propia cuenta.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: usuarioObjetivo,
      error: usuarioObjetivoError,
    } = await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        auth_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        email,
        activo,
        rol_id,
        roles (
          id,
          nombre
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (usuarioObjetivoError) {
      console.error(
        "Error al consultar el usuario que será eliminado:",
        usuarioObjetivoError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible consultar el usuario.",
        },
        {
          status: 500,
        },
      );
    }

    if (!usuarioObjetivo) {
      return NextResponse.json(
        {
          error: "El usuario no existe.",
        },
        {
          status: 404,
        },
      );
    }

    const rolUsuarioObjetivo =
      obtenerPrimerRol(
        usuarioObjetivo.roles as RolRelacion,
      );

    /*
     * Evitar que desaparezca el último administrador
     * activo del sistema.
     */
    if (
      rolUsuarioObjetivo?.nombre ===
        "Administrador" &&
      usuarioObjetivo.activo
    ) {
      const {
        data: rolAdministrador,
        error: rolAdministradorError,
      } = await supabaseAdmin
        .from("roles")
        .select("id")
        .eq("nombre", "Administrador")
        .maybeSingle();

      if (rolAdministradorError) {
        console.error(
          "Error al consultar el rol Administrador:",
          rolAdministradorError,
        );

        return NextResponse.json(
          {
            error:
              "No fue posible comprobar los administradores existentes.",
          },
          {
            status: 500,
          },
        );
      }

      if (rolAdministrador) {
        const {
          count,
          error: conteoError,
        } = await supabaseAdmin
          .from("usuarios")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "rol_id",
            rolAdministrador.id,
          )
          .eq("activo", true);

        if (conteoError) {
          console.error(
            "Error al contar administradores:",
            conteoError,
          );

          return NextResponse.json(
            {
              error:
                "No fue posible comprobar los administradores activos.",
            },
            {
              status: 500,
            },
          );
        }

        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            {
              error:
                "No puede eliminar al último administrador activo del sistema.",
            },
            {
              status: 400,
            },
          );
        }
      }
    }

    /*
     * Primero se inactiva el perfil. Si posteriormente
     * falla alguna eliminación, la cuenta queda bloqueada.
     */
    const {
      error: inactivarError,
    } = await supabaseAdmin
      .from("usuarios")
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (inactivarError) {
      console.error(
        "Error al inactivar el usuario:",
        inactivarError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible preparar la eliminación del usuario.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Eliminar la cuenta de Supabase Authentication.
     */
    if (usuarioObjetivo.auth_id) {
      const {
        error: eliminarAuthError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          usuarioObjetivo.auth_id,
          false,
        );

      if (eliminarAuthError) {
        console.error(
          "Error al eliminar el usuario de Auth:",
          eliminarAuthError,
        );

        /*
         * Si falla Auth, restauramos el estado anterior.
         */
        await supabaseAdmin
          .from("usuarios")
          .update({
            activo: usuarioObjetivo.activo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        return NextResponse.json(
          {
            error:
              "No fue posible eliminar la cuenta de acceso.",
          },
          {
            status: 500,
          },
        );
      }
    }

    /*
     * Eliminar el perfil de public.usuarios.
     */
    const {
      error: eliminarPerfilError,
    } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", id);

    if (eliminarPerfilError) {
      console.error(
        "Error al eliminar el perfil:",
        eliminarPerfilError,
      );

      return NextResponse.json(
        {
          error:
            "La cuenta de acceso fue eliminada, pero el perfil no pudo eliminarse. El perfil quedó inactivo.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        mensaje:
          "Usuario eliminado correctamente.",
        usuario: {
          id: usuarioObjetivo.id,
          email: usuarioObjetivo.email,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Error inesperado al eliminar usuario:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      },
      {
        status: 500,
      },
    );
  }
}