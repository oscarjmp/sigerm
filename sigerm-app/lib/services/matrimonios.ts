import { supabase } from "@/lib/supabase/client";
import type { Matrimonio } from "@/types/matrimonio";

/**
 * Columnas de datos que la aplicación puede escribir.
 * Excluye deliberadamente: id, created_at, usuario_id, comision_id y activo.
 * El estado (activo) solo se modifica con cambiarEstadoMatrimonio.
 */
export type MatrimonioDatos = Omit<
  Matrimonio,
  "id" | "created_at" | "activo"
>;

export type ResultadoOperacion = {
  error: { message: string } | null;
};

type ErrorSupabase = {
  message: string;
  code?: string;
};

const SIN_PERMISO = "42501";

function resultadoError(
  error: ErrorSupabase,
  accion: string,
): ResultadoOperacion {
  if (error.code === SIN_PERMISO) {
    return {
      error: {
        message: `No tiene permisos para ${accion}.`,
      },
    };
  }

  return { error: { message: error.message } };
}

function resultadoInesperado(
  causa: unknown,
  accion: string,
): ResultadoOperacion {
  console.error(`Error inesperado al ${accion}:`, causa);

  return {
    error: {
      message: `Ocurrió un error inesperado al ${accion}. Intente nuevamente.`,
    },
  };
}

/**
 * Construye la carga útil con una lista blanca explícita de columnas,
 * para no enviar campos adicionales aunque el objeto recibido los contenga.
 */
function columnasDatos(
  datos: MatrimonioDatos,
): MatrimonioDatos {
  return {
    esposo: datos.esposo,
    esposa: datos.esposa,
    telefono: datos.telefono,
    email: datos.email,
    direccion: datos.direccion,
    ministerio: datos.ministerio,
    foto: datos.foto,
  };
}

/**
 * Alta de un matrimonio. Envía las siete columnas de datos más activo: true.
 * Un INSERT rechazado por RLS devuelve error, por lo que no hay éxito falso.
 */
export async function guardarMatrimonio(
  datos: MatrimonioDatos,
): Promise<ResultadoOperacion> {
  const accion = "registrar el matrimonio";

  try {
    const { error } = await supabase
      .from("matrimonios")
      .insert({
        ...columnasDatos(datos),
        activo: true,
      });

    if (error) {
      return resultadoError(error, accion);
    }

    return { error: null };
  } catch (causa) {
    return resultadoInesperado(causa, accion);
  }
}

/**
 * Edición de datos. Envía solo las siete columnas de datos (nunca activo),
 * de modo que editar no reactiva un matrimonio inactivo.
 * Con RLS, un UPDATE no autorizado afecta 0 filas sin error: por eso se
 * exige que se devuelva exactamente una fila.
 */
export async function actualizarMatrimonio(
  id: string,
  datos: MatrimonioDatos,
): Promise<ResultadoOperacion> {
  const accion = "actualizar el matrimonio";

  try {
    const { data, error } = await supabase
      .from("matrimonios")
      .update(columnasDatos(datos))
      .eq("id", id)
      .select("id");

    if (error) {
      return resultadoError(error, accion);
    }

    if (!data || data.length !== 1) {
      return {
        error: {
          message:
            "No se guardaron los cambios. El matrimonio no existe o no tiene permisos para editarlo.",
        },
      };
    }

    return { error: null };
  } catch (causa) {
    return resultadoInesperado(causa, accion);
  }
}

/**
 * Desactivación (activo = false) o reactivación (activo = true) lógica.
 * Sustituye a la eliminación física. Éxito solo si se actualiza exactamente
 * una fila.
 */
export async function cambiarEstadoMatrimonio(
  id: string,
  activo: boolean,
): Promise<ResultadoOperacion> {
  const accion = activo
    ? "reactivar el matrimonio"
    : "desactivar el matrimonio";

  try {
    const { data, error } = await supabase
      .from("matrimonios")
      .update({ activo })
      .eq("id", id)
      .select("id");

    if (error) {
      return resultadoError(error, accion);
    }

    if (!data || data.length !== 1) {
      return {
        error: {
          message: `No fue posible ${accion}. El registro no existe o no tiene permisos para modificarlo.`,
        },
      };
    }

    return { error: null };
  } catch (causa) {
    return resultadoInesperado(causa, accion);
  }
}

/**
 * Matrimonios disponibles para préstamos: solo activos.
 */
export async function obtenerMatrimonios() {

  return await supabase
    .from("matrimonios")
    .select("*")
    .eq("activo", true)
    .order("esposo");

}
