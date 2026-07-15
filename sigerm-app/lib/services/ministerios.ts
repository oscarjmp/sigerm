import { supabase } from "@/lib/supabase/client";

export async function obtenerMinisterios() {

  const { data, error } = await supabase
    .from("ministerios")
    .select("*")
    .order("nombre");

  return {
    data,
    error,
  };

}

export async function guardarMinisterio(
  nombre: string
) {

  return await supabase
    .from("ministerios")
    .insert({
      nombre: nombre.toUpperCase(),
    });

}