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

    if (!confirm("¿Registrar devolución?")) return;

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

      {/* ===========================
          TABLA ESCRITORIO
      =========================== */}

      <div className="hidden lg:block bg-white rounded-xl shadow overflow-hidden mt-8">

        <div className="overflow-x-auto">

          <table className="min-w-[1100px] w-full">

            <thead className="bg-slate-100">

              <tr>

                <th className="text-left p-4 whitespace-nowrap">
                  Folio
                </th>

                <th className="text-left p-4 whitespace-nowrap">
                  Responsable
                </th>

                <th className="text-left p-4 whitespace-nowrap">
                  Solicitante
                </th>

                <th className="text-left p-4 whitespace-nowrap">
                  Fecha préstamo
                </th>

                <th className="text-center p-4 whitespace-nowrap">
                  Estado
                </th>

                <th className="text-center p-4 whitespace-nowrap">
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

                  <td className="p-4 font-semibold text-blue-600 whitespace-nowrap">
                    {prestamo.folio}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {prestamo.responsable}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {prestamo.solicitante}
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {prestamo.fecha_prestamo}
                  </td>

                  <td className="p-4 text-center">

                    {prestamo.estado === "PRESTADO" ? (

                      <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">

                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>

                        Prestado

                      </span>

                    ) : (

                      <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">

                        <span className="w-2 h-2 rounded-full bg-green-500"></span>

                        Devuelto

                      </span>

                    )}

                  </td>

                  <td className="p-4">

                    <div className="flex flex-wrap justify-center gap-2">

                      <button
                        onClick={() => setPrestamoSeleccionado(prestamo)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Ver
                      </button>

                      {prestamo.estado === "PRESTADO" && (

                        <button
                          onClick={() => devolverArticulo(prestamo)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Devolver
                        </button>

                      )}

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ===========================
          VISTA MÓVIL
      =========================== */}

      <div className="lg:hidden mt-6 space-y-4">

        {prestamos.map((prestamo) => (
                    <div
            key={prestamo.id}
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-5"
          >

            <div className="flex justify-between items-start">

              <div>

                <p className="text-xs text-gray-500">
                  Folio
                </p>

                <p className="text-lg font-bold text-blue-600">
                  {prestamo.folio}
                </p>

              </div>

              {prestamo.estado === "PRESTADO" ? (

                <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">

  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>

  Prestado

</span>

              ) : (

                <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">

                  <span className="w-2 h-2 rounded-full bg-green-500"></span>

                  Devuelto

                </span>

              )}

            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">

              <div>

  <p className="text-xs text-gray-500">
    Responsable
  </p>

  <div className="font-semibold">
    {prestamo.responsable}
  </div>

</div>

              <div>

                <p className="text-xs text-gray-500">
                  Solicitante
                </p>

                <p className="font-semibold">
                  {prestamo.solicitante}
                </p>

              </div>

              <div className="col-span-2">

                <p className="text-xs text-gray-500">
                  Fecha préstamo
                </p>

                <p className="font-semibold">
                  {prestamo.fecha_prestamo}
                </p>

              </div>

            </div>

            <div className="flex gap-3 mt-6">

              <button
                onClick={() =>
                  setPrestamoSeleccionado(prestamo)
                }
                className="
                  flex-1
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  py-3
                  rounded-xl
                  font-medium
                "
              >
                Ver
              </button>

              {prestamo.estado === "PRESTADO" && (

                <button
                  onClick={() =>
                    devolverArticulo(prestamo)
                  }
                  className="
                    flex-1
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    py-3
                    rounded-xl
                    font-medium
                  "
                >
                  Devolver
                </button>

              )}

            </div>

          </div>

        ))}

      </div>

      {prestamoSeleccionado && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

          <div
            className="
              bg-white
              rounded-2xl
              shadow-2xl
              w-full
              max-w-5xl
              max-h-[90vh]
              overflow-y-auto
              p-6
            "
          >

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold text-slate-800">
                Detalle del préstamo
              </h2>

              <button
                onClick={() => setPrestamoSeleccionado(null)}
                className="text-3xl text-gray-500 hover:text-red-600"
              >
                ×
              </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
<div>

  <p className="text-sm text-gray-500">
    Estado
  </p>

  <div className="font-semibold">

    {prestamoSeleccionado.estado === "PRESTADO" ? (

      <span
        className="
          inline-flex
          items-center
          gap-2
          bg-yellow-100
          text-yellow-700
          px-3
          py-1
          rounded-full
          text-sm
          font-medium
        "
      >
        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>

        Prestado
      </span>

    ) : (

      <span
        className="
          inline-flex
          items-center
          gap-2
          bg-green-100
          text-green-700
          px-3
          py-1
          rounded-full
          text-sm
          font-medium
        "
      >
        <span className="w-2 h-2 rounded-full bg-green-500"></span>

        Devuelto
      </span>

    )}

  </div>

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

              <div>

  <p className="text-sm text-gray-500">
    Estado
  </p>

  <div className="font-semibold">

    {prestamoSeleccionado.estado === "PRESTADO" ? (

      <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">

        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>

        Prestado

      </span>

    ) : (

      <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full">

        <span className="w-2 h-2 rounded-full bg-green-500"></span>

        Devuelto

      </span>

    )}

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

            <div className="overflow-x-auto">

              <table className="min-w-[650px] w-full border rounded-xl overflow-hidden">

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

                        <td className="text-center p-3 font-semibold">
                          {item.cantidad}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">

              <button
                onClick={() => {
                  if (prestamoSeleccionado) {
                    generarPrestamoPDF(prestamoSeleccionado);
                  }
                }}
                className="
                  w-full
                  sm:w-auto
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  px-6
                  py-3
                  rounded-xl
                  font-medium
                  transition
                "
              >
                Descargar PDF
              </button>

              <button
                onClick={() => setPrestamoSeleccionado(null)}
                className="
                  w-full
                  sm:w-auto
                  bg-slate-700
                  hover:bg-slate-800
                  text-white
                  px-6
                  py-3
                  rounded-xl
                  font-medium
                  transition
                "
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