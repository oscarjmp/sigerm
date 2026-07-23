import { SupabaseClient } from "@supabase/supabase-js";

import {
  crearArticuloRepository,
  CrearArticulo,
  ActualizarArticulo,
} from "@/lib/repositories/articulo.repository";

export function crearArticuloService(
  supabase: SupabaseClient
) {

  const repository =
    crearArticuloRepository(supabase);

  return {

    obtenerTodos() {

      return repository.obtenerTodos();

    },

    obtenerPorId(id: string) {

      return repository.obtenerPorId(id);

    },

    async crear(
      articulo: CrearArticulo
    ) {

      if (!articulo.nombre.trim()) {
        throw new Error(
          "El nombre es obligatorio."
        );
      }

      if (
        articulo.cantidad != null &&
        articulo.cantidad < 0
      ) {
        throw new Error(
          "La cantidad no puede ser negativa."
        );
      }

      return repository.crear(articulo);

    },

    actualizar(
      id: string,
      cambios: ActualizarArticulo
    ) {

      return repository.actualizar(
        id,
        cambios
      );

    },

    desactivar(id: string) {

      return repository.desactivar(id);

    },

  };

}