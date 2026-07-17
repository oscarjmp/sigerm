import { supabase } from "@/lib/supabase/client";

export async function subirImagen(
  bucket: string,
  archivo: File
): Promise<string> {

  const extension = archivo.name.split(".").pop();

  const nombre =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(nombre, archivo);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(nombre);

  return data.publicUrl;
}