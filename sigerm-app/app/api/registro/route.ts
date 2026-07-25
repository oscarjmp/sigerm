import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type RegistroRequest = {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
  password?: string;
  confirmar_password?: string;
};

function limpiarTexto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function validarRegistro(
  datos: RegistroRequest,
): string[] {
  const errores: string[] = [];

  const nombre = limpiarTexto(datos.nombre);
  const email = limpiarTexto(
    datos.email,
  ).toLowerCase();

  const password = limpiarTexto(
    datos.password,
  );

  const confirmarPassword = limpiarTexto(
    datos.confirmar_password,
  );

  if (!nombre) {
    errores.push(
      "El nombre es obligatorio.",
    );
  }

  if (!email) {
    errores.push(
      "El correo electrónico es obligatorio.",
    );
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errores.push(
      "El correo electrónico no es válido.",
    );
  }

  if (!password) {
    errores.push(
      "La contraseña es obligatoria.",
    );
  } else if (password.length < 8) {
    errores.push(
      "La contraseña debe contener al menos 8 caracteres.",
    );
  }

  if (password !== confirmarPassword) {
    errores.push(
      "Las contraseñas no coinciden.",
    );
  }

  return errores;
}

export async function POST(
  request: Request,
) {
  let authIdCreado: string | null = null;

  try {
    let datos: RegistroRequest;

    try {
      datos =
        (await request.json()) as RegistroRequest;
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

    const errores =
      validarRegistro(datos);

    if (errores.length > 0) {
      return NextResponse.json(
        {
          error:
            "Revise la información del formulario.",
          errores,
        },
        {
          status: 400,
        },
      );
    }

    const nombre = limpiarTexto(
      datos.nombre,
    );

    const apellidoPaterno =
      limpiarTexto(
        datos.apellido_paterno,
      ) || null;

    const apellidoMaterno =
      limpiarTexto(
        datos.apellido_materno,
      ) || null;

    const email = limpiarTexto(
      datos.email,
    ).toLowerCase();

    const telefono =
      limpiarTexto(datos.telefono) || null;

    const password = limpiarTexto(
      datos.password,
    );

    /*
     * Obtener automáticamente el rol
     * Solicitante.
     */
    const {
      data: rolSolicitante,
      error: rolError,
    } = await supabaseAdmin
      .from("roles")
      .select("id, nombre")
      .eq("nombre", "Solicitante")
      .maybeSingle();

    if (rolError) {
      console.error(
        "Error al consultar el rol Solicitante:",
        rolError,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible preparar el registro.",
        },
        {
          status: 500,
        },
      );
    }

    if (!rolSolicitante) {
      return NextResponse.json(
        {
          error:
            "No se encontró el rol Solicitante.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Verificar si el correo ya existe
     * en public.usuarios.
     */
    const {
      data: usuarioExistente,
      error: usuarioExistenteError,
    } = await supabaseAdmin
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
            "Ya existe una cuenta registrada con ese correo.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Crear cuenta en Supabase Auth.
     */
    const {
      data: authData,
      error: crearAuthError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          telefono,
        },
      });

    if (
      crearAuthError ||
      !authData.user
    ) {
      console.error(
        "Error al crear la cuenta en Auth:",
        crearAuthError,
      );

      return NextResponse.json(
        {
          error:
            crearAuthError?.message ??
            "No fue posible crear la cuenta.",
        },
        {
          status: 400,
        },
      );
    }

    authIdCreado = authData.user.id;

    /*
     * Crear perfil pendiente de aprobación.
     */
    const {
      data: nuevoUsuario,
      error: crearPerfilError,
    } = await supabaseAdmin
      .from("usuarios")
      .insert({
        auth_id: authIdCreado,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        email,
        telefono,
        activo: false,
        rol_id: rolSolicitante.id,
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
        "Error al crear el perfil público:",
        crearPerfilError,
      );

      await supabaseAdmin.auth.admin.deleteUser(
        authIdCreado,
      );

      authIdCreado = null;

      return NextResponse.json(
        {
          error:
            "No fue posible completar el registro.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        mensaje:
          "Su cuenta fue registrada correctamente y está pendiente de aprobación.",
        usuario: {
          ...nuevoUsuario,
          rol: rolSolicitante,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error inesperado en el registro público:",
      error,
    );

    if (authIdCreado) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          authIdCreado,
        );
      } catch (rollbackError) {
        console.error(
          "No fue posible revertir la cuenta de Auth:",
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