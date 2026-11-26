import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AdministracionNoDisponibleError,
  obtenerSupabaseAdmin,
} from "@/lib/supabase/admin";

type ResultadoClienteAdministrativo =
  | { cliente: SupabaseClient; error: null }
  | { cliente: null; error: NextResponse };

/**
 * Obtiene el cliente administrativo para una ruta de API ya autorizada.
 * Si el entorno no tiene la clave administrativa, devuelve una respuesta
 * 503 sin detalles de configuración; cualquier otro error se propaga.
 */
export function clienteAdministrativo(): ResultadoClienteAdministrativo {
  try {
    return { cliente: obtenerSupabaseAdmin(), error: null };
  } catch (error) {
    if (error instanceof AdministracionNoDisponibleError) {
      console.error(
        "[administracion] Cliente administrativo no configurado en este entorno.",
      );

      return {
        cliente: null,
        error: NextResponse.json(
          {
            error:
              "La administración de usuarios no está disponible en este entorno.",
          },
          {
            status: 503,
          },
        ),
      };
    }

    throw error;
  }
}
