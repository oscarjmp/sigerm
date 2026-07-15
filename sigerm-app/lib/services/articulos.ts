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