import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CrearUsuarioRequest = {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
  password?: string;
  rol_id?: string;
  activo?: boolean;
};

type RolRelacion =
  | {
      nombre: string;
    }
  | {
      nombre: string;
    }[]
  | null;

function obtenerNombreRol(roles: RolRelacion): string | null {
  if (Array.isArray(roles)) {
    return roles[0]?.nombre ?? null;
  }

  return roles?.nombre ?? null;
}

function limpiarTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function validarDatos(datos: CrearUsuarioRequest): string[] {
  const errores: string[] = [];

  const nombre = limpiarTexto(datos.nombre);
  const email = limpiarTexto(datos.email).toLowerCase();
  const password = limpiarTexto(datos.password);
  const rolId = limpiarTexto(datos.rol_id);

  if (!nombre) {
    errores.push("El nombre es obligatorio.");
  }

  if (!email) {
    errores.push("El correo electrónico es obligatorio.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.push("El correo electrónico no es válido.");
  }

  if (!password) {
    errores.push("La contraseña temporal es obligatoria.");
  } else if (password.length < 8) {
    errores.push(
      "La contraseña temporal debe contener al menos 8 caracteres.",
    );
  }

  if (!rolId) {
    errores.push("Debe seleccionar un rol.");
  }

  return errores;
}

export async function POST(request: Request) {
  let authIdCreado: string | null = null;

  try {
    /*
     * 1. Verificar la sesión del usuario que realiza la operación.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "No existe una sesión válida.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 2. Verificar que el usuario esté activo y sea Administrador.
     */
    const { data: perfil, error: perfilError } = await supabase
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

    if (perfilError) {
      console.error(
        "Error al consultar el perfil administrador:",
        perfilError,
      );

      return NextResponse.json(
        {
          error: "No fue posible comprobar sus permisos.",
        },
        {
          status: 500,
        },
      );
    }

    if (!perfil || !perfil.activo) {
      return NextResponse.json(
        {
          error: "Su cuenta no está activa.",
        },
        {
          status: 403,
        },
      );
    }

    const nombreRol = obtenerNombreRol(
      perfil.roles as RolRelacion,
    );

    if (nombreRol !== "Administrador") {
      return NextResponse.json(
        {
          error:
            "No cuenta con autorización para crear usuarios.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 3. Leer y validar la información enviada.
     */
    let datos: CrearUsuarioRequest;

    try {
      datos = (await request.json()) as CrearUsuarioRequest;
    } catch {
      return NextResponse.json(
        {
          error: "La información enviada no es válida.",
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
          error: "Revise los datos del formulario.",
          errores,
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
    const email = limpiarTexto(datos.email).toLowerCase();
    const telefono = limpiarTexto(datos.telefono) || null;
    const password = limpiarTexto(datos.password);
    const rolId = limpiarTexto(datos.rol_id);
    const activo = datos.activo ?? true;

    /*
     * 4. Comprobar que el rol seleccionado exista.
     */
    const { data: rol, error: rolError } = await supabaseAdmin
      .from("roles")
      .select("id, nombre")
      .eq("id", rolId)
      .maybeSingle();

    if (rolError) {
      console.error("Error al consultar el rol:", rolError);

      return NextResponse.json(
        {
          error: "No fue posible comprobar el rol seleccionado.",
        },
        {
          status: 500,
        },
      );
    }

    if (!rol) {
      return NextResponse.json(
        {
          error: "El rol seleccionado no existe.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 5. Evitar correos duplicados en public.usuarios.
     */
    const { data: usuarioExistente, error: usuarioExistenteError } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (usuarioExistenteError) {
      console.error(
        "Error al comprobar el correo:",
        usuarioExistenteError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible comprobar el correo electrónico.",
        },
        {
          status: 500,
        },
      );
    }

    if (usuarioExistente) {
      return NextResponse.json(
        {
          error:
            "Ya existe un usuario registrado con ese correo.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Crear la cuenta en Supabase Authentication.
     */
    const {
      data: authData,
      error: crearAuthError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
      },
    });

    if (crearAuthError || !authData.user) {
      console.error(
        "Error al crear el usuario en Auth:",
        crearAuthError,
      );

      return NextResponse.json(
        {
          error:
            crearAuthError?.message ??
            "No fue posible crear la cuenta de acceso.",
        },
        {
          status: 400,
        },
      );
    }

    authIdCreado = authData.user.id;

    /*
     * 7. Crear el perfil en public.usuarios.
     */
    const { data: nuevoUsuario, error: crearPerfilError } =
      await supabaseAdmin
        .from("usuarios")
        .insert({
          auth_id: authIdCreado,
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          email,
          telefono,
          activo,
          rol_id: rolId,
        })
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

    if (crearPerfilError) {
      console.error(
        "Error al crear el perfil:",
        crearPerfilError,
      );

      /*
       * Si falla el perfil, eliminamos la cuenta de Auth para
       * no dejar un registro incompleto.
       */
      await supabaseAdmin.auth.admin.deleteUser(authIdCreado);

      authIdCreado = null;

      return NextResponse.json(
        {
          error:
            "La cuenta fue creada, pero no fue posible registrar su perfil.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        mensaje: "Usuario creado correctamente.",
        usuario: {
          ...nuevoUsuario,
          rol,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Error inesperado al crear usuario:", error);

    /*
     * Limpieza adicional si ocurrió una excepción después de crear Auth.
     */
    if (authIdCreado) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authIdCreado);
      } catch (rollbackError) {
        console.error(
          "No fue posible revertir el usuario de Auth:",
          rollbackError,
        );
      }
    }

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