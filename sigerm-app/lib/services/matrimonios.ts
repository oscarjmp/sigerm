import { supabase } from "@/lib/supabase/client";
import type { Matrimonio } from "@/types/matrimonio";

type MatrimonioInput = Omit<Matrimonio, "id" | "created_at">;

export async function guardarMatrimonio(
  datos: MatrimonioInput
) {
  return await supabase
    .from("matrimonios")
    .insert(datos);
}

export async function actualizarMatrimonio(
  id: string,
  datos: Partial<MatrimonioInput>
) {
  return await supabase
    .from("matrimonios")
    .update(datos)
    .eq("id", id);
}

export async function eliminarMatrimonio(id: string) {
  return await supabase
    .from("matrimonios")
    .delete()
    .eq("id", id);
}
export async function obtenerMatrimonios() {

  return await supabase
    .from("matrimonios")
    .select("*")
    .eq("activo", true)
    .order("esposo");

}