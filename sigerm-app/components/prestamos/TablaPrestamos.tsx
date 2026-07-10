'use client';

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Prestamo = {
  id: string;
  persona: string;
  cantidad: number;
  estado: string;
  observaciones: string;
  articulo_id: string;
  articulos: {
    nombre: string;
    cantidad: number;
  };
};

type Props = {
  prestamos: Prestamo[];
};

export default function TablaPrestamos({
  prestamos,
}: Props) {

  const router = useRouter();

  async function devolverArticulo(prestamo: Prestamo) {

    if (prestamo.estado === "Devuelto") {
      alert("Este préstamo ya fue devuelto.");
      return;
    }

    const confirmar = confirm(
      "¿Registrar devolución?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("prestamos")
      .update({
        estado: "Devuelto",
      })
      .eq("id", prestamo.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("articulos")
      .update({
        cantidad:
          prestamo.articulos.cantidad +
          prestamo.cantidad,
      })
      .eq("id", prestamo.articulo_id);

    alert("Artículo devuelto correctamente.");

    router.refresh();

  }

  return (

    <div className="bg-white rounded-xl shadow overflow-hidden mt-8">

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="text-left p-4">
              Persona
            </th>

            <th className="text-left p-4">
              Artículo
            </th>

            <th className="text-left p-4">
              Cantidad
            </th>

            <th className="text-left p-4">
              Estado
            </th>

            <th className="text-left p-4">
              Observaciones
            </th>

            <th className="text-center p-4">
              Acción
            </th>

          </tr>

        </thead>

        <tbody>

          {prestamos.map((prestamo) => (

            <tr
              key={prestamo.id}
              className="border-t hover:bg-slate-50"
            >

              <td className="p-4">
                {prestamo.persona}
              </td>

              <td className="p-4">
                {prestamo.articulos?.nombre}
              </td>

              <td className="p-4">
                {prestamo.cantidad}
              </td>

              <td className="p-4">

                {prestamo.estado === "Prestado" ? (

                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">

                    🟡 Prestado

                  </span>

                ) : (

                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">

                    🟢 Devuelto

                  </span>

                )}

              </td>

              <td className="p-4">
                {prestamo.observaciones}
              </td>

              <td className="text-center p-4">

                {prestamo.estado === "Prestado" && (

                  <button
                    onClick={() =>
                      devolverArticulo(prestamo)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >

                    Devolver

                  </button>

                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}