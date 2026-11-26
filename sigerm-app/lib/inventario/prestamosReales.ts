import type { SupabaseClient } from "@supabase/supabase-js";

import { prestamosRealesPorArticulo } from "@/lib/inventario/existencias";

/**
 * Unidades en préstamos PRESTADO (pendientes de devolución) por artículo,
 * a partir del detalle de préstamos: la obligación real, no la resta
 * cantidad - disponibles. Con RLS, cada rol ve solo los préstamos que le
 * corresponden (el Administrador e Inventario, todos).
 *
 * Devuelve null si no se pudo consultar, para que la interfaz no presente
 * un 0 que no está confirmado.
 */
export async function cargarPrestamosReales(
  supabase: Pick<SupabaseClient, "from">,
  articuloId?: string,
): Promise<Map<string, number> | null> {
  let consulta = supabase
    .from("detalle_prestamo")
    .select("articulo_id, cantidad, prestamos!inner(estado)")
    .eq("prestamos.estado", "PRESTADO");

  if (articuloId) consulta = consulta.eq("articulo_id", articuloId);

  const { data, error } = await consulta;

  if (error) {
    console.error("[inventario] No fue posible consultar los préstamos vigentes:", { code: error.code });
    return null;
  }

  return prestamosRealesPorArticulo(data ?? []);
}
