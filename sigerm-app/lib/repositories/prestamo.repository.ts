import type { SupabaseClient } from "@supabase/supabase-js";

export type Prestamo = {
  id: string;
  folio: string;
  responsable: string;
  telefono: string | null;
  evento: string | null;
  fecha_prestamo: string | null;
  fecha_devolucion: string | null;
  estado: string | null;
  observaciones: string | null;
  created_at: string | null;
  solicitante: string | null;
  lugar: string | null;
  correo: string | null;
  autorizado_por: string | null;
  recibido_por: string | null;
  fecha_entrega: string | null;
  tipo_evento: string | null;
  matrimonio_id: string | null;
};

export type CrearPrestamo = Omit<
  Prestamo,
  "id" | "created_at"
>;

export type ActualizarPrestamo = Partial<CrearPrestamo>;

export function crearPrestamoRepository(
  supabase: SupabaseClient
) {
  return {

    async obtenerTodos(): Promise<Prestamo[]> {

      const { data, error } = await supabase
        .from("prestamos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error)
        throw new Error(error.message);

      return (data ?? []) as Prestamo[];

    },

    async obtenerPorId(id: string): Promise<Prestamo | null> {

      const { data, error } = await supabase
        .from("prestamos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error)
        throw new Error(error.message);

      return data as Prestamo | null;

    },

    async crear(
      prestamo: CrearPrestamo
    ): Promise<Prestamo> {

      const { data, error } = await supabase
        .from("prestamos")
        .insert(prestamo)
        .select()
        .single();

      if (error)
        throw new Error(error.message);

      return data as Prestamo;

    },

    async actualizar(
      id: string,
      cambios: ActualizarPrestamo
    ): Promise<Prestamo> {

      const { data, error } = await supabase
        .from("prestamos")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();

      if (error)
        throw new Error(error.message);

      return data as Prestamo;

    },

    async eliminar(id: string): Promise<void> {

      const { error } = await supabase
        .from("prestamos")
        .delete()
        .eq("id", id);

      if (error)
        throw new Error(error.message);

    }

  };

}