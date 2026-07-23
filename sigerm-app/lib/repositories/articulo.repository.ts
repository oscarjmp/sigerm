import type { SupabaseClient } from "@supabase/supabase-js";

export type Articulo = {
  id: string;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  cantidad: number | null;
  unidad: string | null;
  estado: string | null;
  ubicacion: string | null;
  imagen: string | null;
  activo: boolean | null;
  created_at: string | null;
  disponibles: number | null;
  es_consumible: boolean | null;
};

export type CrearArticulo = Omit<Articulo, "id" | "created_at">;

export type ActualizarArticulo = Partial<CrearArticulo>;

export function crearArticuloRepository(supabase: SupabaseClient) {
  return {
    async obtenerTodos(): Promise<Articulo[]> {
      const { data, error } = await supabase
        .from("articulos")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

      if (error) {
        throw new Error(`No fue posible consultar los artículos: ${error.message}`);
      }

      return (data ?? []) as Articulo[];
    },

    async obtenerPorId(id: string): Promise<Articulo | null> {
      const { data, error } = await supabase
        .from("articulos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(`No fue posible consultar el artículo: ${error.message}`);
      }

      return data as Articulo | null;
    },

    async crear(articulo: CrearArticulo): Promise<Articulo> {
      const { data, error } = await supabase
        .from("articulos")
        .insert(articulo)
        .select()
        .single();

      if (error) {
        throw new Error(`No fue posible crear el artículo: ${error.message}`);
      }

      return data as Articulo;
    },

    async actualizar(
      id: string,
      cambios: ActualizarArticulo,
    ): Promise<Articulo> {
      const { data, error } = await supabase
        .from("articulos")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`No fue posible actualizar el artículo: ${error.message}`);
      }

      return data as Articulo;
    },

    async desactivar(id: string): Promise<void> {
      const { error } = await supabase
        .from("articulos")
        .update({ activo: false })
        .eq("id", id);

      if (error) {
        throw new Error(`No fue posible desactivar el artículo: ${error.message}`);
      }
    },
  };
}