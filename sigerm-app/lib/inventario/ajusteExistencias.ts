import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ajuste y conciliación de inventario mediante ajustar_inventario_articulo
 * (inv_01): bloquea el artículo, comprueba que existencia y disponibles
 * sigan siendo los mostrados, recalcula disponibles con los préstamos
 * reales y registra el movimiento AJUSTE en Kardex en una sola transacción.
 *
 * La clave de operación se genera una vez por intento de la usuaria y se
 * reutiliza en los reintentos: si un ajuste ya se aplicó (p. ej. se perdió
 * la respuesta), la base de datos devuelve ese mismo resultado y no
 * registra otro movimiento.
 */

export type ResultadoAjuste =
  | {
      estado: "aplicado";
      yaAplicado: boolean;
      existenciaAnterior: number;
      existenciaNueva: number;
      disponibles: number;
    }
  | { estado: "conflicto"; mensaje: string }
  | { estado: "rechazado"; mensaje: string }
  | { estado: "sin_permiso"; mensaje: string }
  | { estado: "incierto"; mensaje: string };

type RespuestaAjuste = {
  ya_aplicado?: boolean;
  articulo?: { cantidad?: number; disponibles?: number };
  movimiento?: { existencia_anterior?: number; existencia_nueva?: number };
};

export function nuevaClaveOperacion(): string {
  return crypto.randomUUID();
}

export async function ajustarInventario(
  supabase: Pick<SupabaseClient, "rpc">,
  entrada: {
    articuloId: string;
    existenciaEsperada: number;
    disponiblesEsperados: number;
    existenciaNueva: number;
    motivo: string;
    observaciones: string;
    claveOperacion: string;
  },
): Promise<ResultadoAjuste> {
  let respuesta: { data: unknown; error: { code?: string; message?: string } | null };

  try {
    respuesta = await supabase.rpc("ajustar_inventario_articulo", {
      p_articulo_id: entrada.articuloId,
      p_existencia_esperada: entrada.existenciaEsperada,
      p_disponibles_esperados: entrada.disponiblesEsperados,
      p_existencia_nueva: entrada.existenciaNueva,
      p_motivo_tipo: entrada.motivo,
      p_observaciones: entrada.observaciones.trim() || null,
      p_clave_operacion: entrada.claveOperacion,
    });
  } catch {
    return {
      estado: "incierto",
      mensaje:
        "No se pudo confirmar el ajuste por un problema de conexión. Puede volver a pulsar «Aplicar ajuste»: si ya se aplicó, no se registrará dos veces.",
    };
  }

  const { data, error } = respuesta;

  if (error) {
    const mensaje = error.message ?? "No fue posible ajustar el inventario.";

    if (error.code === "40001") return { estado: "conflicto", mensaje };
    if (error.code === "42501") {
      return {
        estado: "sin_permiso",
        mensaje:
          "Su sesión no tiene permisos para ajustar el inventario. Cierre sesión, vuelva a iniciarla e intente de nuevo.",
      };
    }

    return { estado: "rechazado", mensaje };
  }

  const r = (data ?? {}) as RespuestaAjuste;

  if (typeof r.articulo?.cantidad !== "number" || typeof r.articulo?.disponibles !== "number") {
    return {
      estado: "incierto",
      mensaje:
        "La respuesta del servidor no confirmó el ajuste. Puede volver a intentarlo: no se registrará dos veces.",
    };
  }

  return {
    estado: "aplicado",
    yaAplicado: r.ya_aplicado === true,
    existenciaAnterior: r.movimiento?.existencia_anterior ?? entrada.existenciaEsperada,
    existenciaNueva: r.articulo.cantidad,
    disponibles: r.articulo.disponibles,
  };
}
