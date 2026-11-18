import { supabase } from "@/lib/supabase/client";

export type ArticuloInput = {
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  estado: string;
  imagen: string;
};

export async function guardarArticulo(
  datos: ArticuloInput,
  id?: string
) {

  if (id) {

    return await supabase
      .from("articulos")
      .update(datos)
      .eq("id", id);

  }

  return await supabase
    .from("articulos")
    .insert(datos);

}

/**
 * Baja lógica (activo = false) o reactivación (activo = true).
 * Sustituye a la eliminación física, que rompería el Kardex y los
 * préstamos asociados. Con RLS, un UPDATE no autorizado afecta 0 filas
 * sin error: el éxito exige exactamente una fila actualizada.
 */
export async function cambiarEstadoArticulo(
  id: string,
  activo: boolean,
): Promise<{ error: { message: string } | null }> {
  const accion = activo
    ? "reactivar el artículo"
    : "desactivar el artículo";

  const { data, error } = await supabase
    .from("articulos")
    .update({ activo })
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      error: {
        message:
          error.code === "42501"
            ? `No tiene permisos para ${accion}.`
            : error.message,
      },
    };
  }

  if (!data || data.length !== 1) {
    return {
      error: {
        message: `No fue posible ${accion}. El artículo no existe o no tiene permisos para modificarlo.`,
      },
    };
  }

  return { error: null };
}