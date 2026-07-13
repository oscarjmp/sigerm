'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { generarPrestamoPDF } from "@/lib/pdf/prestamoPdf";
type Prestamo = {
  id: string;
  folio: string;
  responsable: string;
  solicitante: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estado: string;
  observaciones: string;

  detalle_prestamo: {
    id: string;
    cantidad: number;
    articulos: {
  id: string;
  codigo: string;
  nombre: string;
} | null;
  }[];
};

type Props = {
  prestamos: Prestamo[];
};

export default function TablaPrestamos({
  prestamos,
}: Props) {

  const router = useRouter();

  const [prestamoSeleccionado, setPrestamoSeleccionado] =
    useState<Prestamo | null>(null);

  async function devolverArticulo(prestamo: Prestamo) {

    if (prestamo.estado === "DEVUELTO") {
      alert("Este préstamo ya fue devuelto.");
      return;
    }

    const confirmar = confirm(
      "¿Registrar devolución?"
    );

    if (!confirmar) return;

    const { error } = await supabase.rpc(
      "devolver_prestamo",
      {
        p_prestamo_id: prestamo.id,
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    alert("Artículo devuelto correctamente.");

    router.refresh();

  }

  return (

    <>

      <div className="bg-white rounded-xl shadow overflow-hidden mt-8">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="text-left p-4">
                Folio
              </th>

              <th className="text-left p-4">
                Responsable
              </th>

              <th className="text-left p-4">
                Solicitante
              </th>

              <th className="text-left p-4">
                Fecha préstamo
              </th>

              <th className="text-left p-4">
                Estado
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

                <td className="p-4 font-medium text-blue-600">
                  {prestamo.folio}
                </td>

                <td className="p-4">
                  {prestamo.responsable}
                </td>

                <td className="p-4">
                  {prestamo.solicitante}
                </td>

                <td className="p-4">
                  {prestamo.fecha_prestamo}
                </td>

                <td className="p-4">

                  {prestamo.estado === "PRESTADO" ? (

                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      🟡 Prestado
                    </span>

                  ) : prestamo.estado === "DEVUELTO" ? (

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      🟢 Devuelto
                    </span>

                  ) : (

                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                      {prestamo.estado}
                    </span>

                  )}

                </td>

                <td className="text-center p-4">

                  <button
                    onClick={() =>
                      setPrestamoSeleccionado(prestamo)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2"
                  >
                    Ver
                  </button>

                  {prestamo.estado === "PRESTADO" && (

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
            {prestamoSeleccionado && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold text-slate-800">
                Detalle del préstamo
              </h2>

              <button
                onClick={() => setPrestamoSeleccionado(null)}
                className="text-gray-500 hover:text-red-600 text-3xl"
              >
                ×
              </button>

            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">

              <div>

                <p className="text-sm text-gray-500">
                  Folio
                </p>

                <p className="font-semibold">
                  {prestamoSeleccionado.folio}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Estado
                </p>

                <p className="font-semibold">

                  {prestamoSeleccionado.estado === "PRESTADO" ? (

                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      🟡 Prestado
                    </span>

                  ) : (

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      🟢 Devuelto
                    </span>

                  )}

                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Responsable
                </p>

                <p className="font-semibold">
                  {prestamoSeleccionado.responsable}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Solicitante
                </p>

                <p className="font-semibold">
                  {prestamoSeleccionado.solicitante}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Fecha préstamo
                </p>

                <p className="font-semibold">
                  {prestamoSeleccionado.fecha_prestamo}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Fecha devolución
                </p>

                <p className="font-semibold">
                  {prestamoSeleccionado.fecha_devolucion ?? "Pendiente"}
                </p>

              </div>

            </div>

            <table className="w-full border rounded-xl overflow-hidden">

              <thead className="bg-slate-100">

                <tr>

                  <th className="text-left p-3">
                    Código
                  </th>

                  <th className="text-left p-3">
                    Artículo
                  </th>

                  <th className="text-center p-3">
                    Cantidad
                  </th>

                </tr>

              </thead>

              <tbody>

                {prestamoSeleccionado.detalle_prestamo.length === 0 ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="text-center p-6 text-gray-400"
                    >
                      No hay artículos registrados.
                    </td>

                  </tr>

                ) : (

                  prestamoSeleccionado.detalle_prestamo.map((item) => (

                    <tr
                      key={item.id}
                      className="border-t hover:bg-slate-50"
                    >

                      <td className="p-3">
                       {item.articulos?.codigo ?? "-"}
                      </td>

                      <td className="p-3">
                        {item.articulos?.nombre ?? "Sin artículo"}
                      </td>

                      <td className="text-center p-3">
                        {item.cantidad}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

            <div className="flex justify-end gap-3 mt-8">

  <button
  onClick={() => {
    if (prestamoSeleccionado) {
      generarPrestamoPDF(prestamoSeleccionado);
    }
  }}
  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
>
  Descargar PDF
</button>

              <button
                onClick={() => setPrestamoSeleccionado(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-xl"
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

}