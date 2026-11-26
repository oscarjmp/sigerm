import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Cliente administrativo de Supabase (service_role), exclusivo del
 * servidor.
 *
 * Se crea de forma diferida, en la primera llamada a
 * obtenerSupabaseAdmin(), y no al importar el módulo. Así el build y
 * los entornos sin la clave administrativa (Vercel Preview) pueden
 * compilar y servir el resto de la aplicación. Sin la clave, las
 * operaciones privilegiadas fallan con AdministracionNoDisponibleError,
 * que las rutas traducen a una respuesta 503 controlada.
 *
 * No existe clave alternativa: sin SUPABASE_SERVICE_ROLE_KEY no hay
 * cliente administrativo. Las rutas deben autorizar al solicitante
 * ANTES de pedir el cliente.
 */
export class AdministracionNoDisponibleError extends Error {
  constructor() {
    super(
      "Las funciones administrativas no están disponibles en este entorno.",
    );
    this.name = "AdministracionNoDisponibleError";
  }
}

let cliente: SupabaseClient | null = null;

export function obtenerSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "El cliente administrativo solo puede usarse en el servidor.",
    );
  }

  if (cliente) {
    return cliente;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new AdministracionNoDisponibleError();
  }

  cliente = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cliente;
}
