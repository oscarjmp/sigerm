"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  RotateCcw,
  X,
} from "lucide-react";

import { generarPrestamoPDF } from "@/lib/pdf/prestamoPdf";
import { supabase } from "@/lib/supabase/client";

type ArticuloDetalle = {
  id: string;
  codigo: string;
  nombre: string;
};

type DetallePrestamo = {
  id: string;
  cantidad: number;
  articulos: ArticuloDetalle | null;
};

type Prestamo = {
  id: string;
  folio: string;
  responsable: string;
  solicitante: string;
  fecha_prestamo: string;
  fecha_devolucion: string;
  estado: string;
  observaciones: string;
  detalle_prestamo: DetallePrestamo[];
};

type TablaPrestamosProps = {
  prestamos: Prestamo[];
};

type ResultadoDevolucion = {
  success: boolean;
  prestamo?: {
    id: string;
    folio: string;
    estado: string;
  };
  resumen?: {
    total_articulos: number;
    total_unidades: number;
  };
};

function normalizarEstado(
  estado: string | null | undefined,
): string {
  return estado?.trim().toUpperCase() || "";
}

function formatearFecha(
  fecha: string | null | undefined,
): string {
  if (!fecha) {
    return "Pendiente";
  }

  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  const [anio, mes, dia] = partes;

  return `${dia}/${mes}/${anio}`;
}

function EstadoPrestamo({
  estado,
}: {
  estado: string;
}) {
  const estadoNormalizado =
    normalizarEstado(estado);

  if (estadoNormalizado === "PRESTADO") {
    return (
      <span
        className="
          inline-flex items-center gap-2
          rounded-full bg-amber-100
          px-3 py-1.5
          text-xs font-semibold
          text-amber-700
        "
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Prestado
      </span>
    );
  }

  if (estadoNormalizado === "DEVUELTO") {
    return (
      <span
        className="
          inline-flex items-center gap-2
          rounded-full bg-emerald-100
          px-3 py-1.5
          text-xs font-semibold
          text-emerald-700
        "
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Devuelto
      </span>
    );
  }

  if (estadoNormalizado === "CANCELADO") {
    return (
      <span
        className="
          inline-flex items-center gap-2
          rounded-full bg-rose-100
          px-3 py-1.5
          text-xs font-semibold
          text-rose-700
        "
      >
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Cancelado
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex items-center gap-2
        rounded-full bg-slate-100
        px-3 py-1.5
        text-xs font-semibold
        text-slate-700
      "
    >
      <span className="h-2 w-2 rounded-full bg-slate-500" />

      {estado || "Sin estado"}
    </span>
  );
}

export default function TablaPrestamos({
  prestamos,
}: TablaPrestamosProps) {
  const router = useRouter();

  const [
    prestamoSeleccionado,
    setPrestamoSeleccionado,
  ] = useState<Prestamo | null>(null);

  const [devolviendoId, setDevolviendoId] =
    useState<string | null>(null);

  async function devolverPrestamo(
    prestamo: Prestamo,
  ) {
    if (
      normalizarEstado(prestamo.estado) !==
      "PRESTADO"
    ) {
      window.alert(
        "Este préstamo ya fue devuelto o no se encuentra activo.",
      );
      return;
    }

    const confirmado = window.confirm(
      `¿Desea registrar la devolución del préstamo ${prestamo.folio}?`,
    );

    if (!confirmado) {
      return;
    }

    setDevolviendoId(prestamo.id);

    try {
      const { data, error } = await supabase.rpc(
        "devolver_prestamo",
        {
          p_prestamo_id: prestamo.id,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          "La base de datos no devolvió información de la devolución.",
        );
      }

      const resultado =
        data as ResultadoDevolucion;

      if (!resultado.success) {
        throw new Error(
          "La devolución no pudo completarse.",
        );
      }

      const totalArticulos =
        resultado.resumen?.total_articulos ?? 0;

      const totalUnidades =
        resultado.resumen?.total_unidades ?? 0;

      window.alert(
        [
          "Devolución registrada correctamente.",
          `Folio: ${prestamo.folio}`,
          `Artículos diferentes: ${totalArticulos}`,
          `Unidades devueltas: ${totalUnidades}`,
        ].join("\n"),
      );

      setPrestamoSeleccionado(null);
      router.refresh();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible registrar la devolución.";

      window.alert(mensaje);
    } finally {
      setDevolviendoId(null);
    }
  }

  function descargarPDF(
    prestamo: Prestamo,
  ) {
    try {
      generarPrestamoPDF(prestamo);
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible generar el PDF.";

      window.alert(mensaje);
    }
  }

  if (prestamos.length === 0) {
    return (
      <div
        className="
          mt-8 rounded-3xl
          border border-slate-200
          bg-white p-10
          text-center shadow-sm
        "
      >
        <h3 className="text-lg font-semibold text-slate-700">
          No hay préstamos registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Los préstamos nuevos aparecerán en esta
          sección.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Tabla para computadora */}
      <section
        className="
          mt-8 hidden w-full
          overflow-hidden rounded-3xl
          border border-slate-200
          bg-white shadow-sm
          lg:block
        "
      >
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[23%]" />
            <col className="w-[17%]" />
            <col className="w-[14%]" />
            <col className="w-[19%]" />
          </colgroup>

          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Folio
              </th>

              <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Responsable
              </th>

              <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Solicitante
              </th>

              <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Fecha
              </th>

              <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                Estado
              </th>

              <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {prestamos.map((prestamo) => {
              const estaPrestado =
                normalizarEstado(
                  prestamo.estado,
                ) === "PRESTADO";

              return (
                <tr
                  key={prestamo.id}
                  className="
                    border-t border-slate-200
                    transition duration-200
                    hover:bg-blue-50/40
                  "
                >
                  <td className="px-4 py-5 align-middle">
                    <button
                      type="button"
                      onClick={() =>
                        setPrestamoSeleccionado(
                          prestamo,
                        )
                      }
                      className="
                        break-words text-left
                        font-bold text-blue-600
                        transition hover:text-blue-800
                        hover:underline
                      "
                    >
                      {prestamo.folio}
                    </button>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <p className="break-words text-sm font-medium text-slate-800">
                      {prestamo.responsable ||
                        "Sin responsable"}
                    </p>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <p className="break-words text-sm font-medium text-slate-800">
                      {prestamo.solicitante ||
                        "Sin solicitante"}
                    </p>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <p className="text-sm text-slate-700">
                      {formatearFecha(
                        prestamo.fecha_prestamo,
                      )}
                    </p>
                  </td>

                  <td className="px-3 py-5 text-center align-middle">
                    <EstadoPrestamo
                      estado={prestamo.estado}
                    />
                  </td>

                  <td className="px-3 py-5 align-middle">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        title="Ver detalle"
                        onClick={() =>
                          setPrestamoSeleccionado(
                            prestamo,
                          )
                        }
                        className="
                          inline-flex min-h-11
                          items-center justify-center
                          gap-2 rounded-2xl
                          bg-blue-600 px-3 py-2
                          text-sm font-semibold
                          text-white shadow-sm
                          transition
                          hover:-translate-y-0.5
                          hover:bg-blue-700
                          hover:shadow-md
                        "
                      >
                        <Eye className="h-4 w-4" />

                        <span className="hidden xl:inline">
                          Ver
                        </span>
                      </button>

                      {estaPrestado && (
                        <button
                          type="button"
                          title="Registrar devolución"
                          onClick={() => {
                            void devolverPrestamo(
                              prestamo,
                            );
                          }}
                          disabled={
                            devolviendoId ===
                            prestamo.id
                          }
                          className="
                            inline-flex min-h-11
                            items-center justify-center
                            gap-2 rounded-2xl
                            bg-emerald-600
                            px-3 py-2
                            text-sm font-semibold
                            text-white shadow-sm
                            transition
                            hover:-translate-y-0.5
                            hover:bg-emerald-700
                            hover:shadow-md
                            disabled:cursor-not-allowed
                            disabled:bg-emerald-300
                          "
                        >
                          <RotateCcw className="h-4 w-4" />

                          <span className="hidden 2xl:inline">
                            {devolviendoId ===
                            prestamo.id
                              ? "Devolviendo..."
                              : "Devolver"}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Tarjetas para celular y tableta */}
      <section className="mt-6 space-y-4 lg:hidden">
        {prestamos.map((prestamo) => {
          const estaPrestado =
            normalizarEstado(prestamo.estado) ===
            "PRESTADO";

          return (
            <article
              key={prestamo.id}
              className="
                rounded-3xl border
                border-slate-200
                bg-white p-5
                shadow-sm transition
                hover:-translate-y-0.5
                hover:shadow-lg
              "
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Folio
                  </p>

                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {prestamo.folio}
                  </p>
                </div>

                <EstadoPrestamo
                  estado={prestamo.estado}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatoPrestamo
                  etiqueta="Responsable"
                  valor={
                    prestamo.responsable ||
                    "Sin responsable"
                  }
                />

                <DatoPrestamo
                  etiqueta="Solicitante"
                  valor={
                    prestamo.solicitante ||
                    "Sin solicitante"
                  }
                />

                <DatoPrestamo
                  etiqueta="Fecha de préstamo"
                  valor={formatearFecha(
                    prestamo.fecha_prestamo,
                  )}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setPrestamoSeleccionado(
                      prestamo,
                    )
                  }
                  className="
                    inline-flex min-h-12
                    items-center justify-center
                    gap-2 rounded-2xl
                    bg-blue-600 px-5 py-3
                    font-semibold text-white
                    transition
                    hover:bg-blue-700
                  "
                >
                  <Eye className="h-5 w-5" />
                  Ver detalle
                </button>

                {estaPrestado && (
                  <button
                    type="button"
                    onClick={() => {
                      void devolverPrestamo(
                        prestamo,
                      );
                    }}
                    disabled={
                      devolviendoId === prestamo.id
                    }
                    className="
                      inline-flex min-h-12
                      items-center justify-center
                      gap-2 rounded-2xl
                      bg-emerald-600
                      px-5 py-3
                      font-semibold text-white
                      transition
                      hover:bg-emerald-700
                      disabled:cursor-not-allowed
                      disabled:bg-emerald-300
                    "
                  >
                    <RotateCcw className="h-5 w-5" />

                    {devolviendoId ===
                    prestamo.id
                      ? "Devolviendo..."
                      : "Registrar devolución"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Modal de detalle */}
      {prestamoSeleccionado && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-slate-950/60 p-3
            backdrop-blur-sm sm:p-5
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-detalle-prestamo"
          onClick={() =>
            setPrestamoSeleccionado(null)
          }
        >
          <div
            className="
              max-h-[92vh] w-full
              max-w-5xl overflow-y-auto
              overflow-x-hidden
              rounded-3xl bg-white
              p-5 shadow-2xl
              sm:p-7
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="titulo-detalle-prestamo"
                  className="text-2xl font-bold text-slate-900"
                >
                  Detalle del préstamo
                </h2>

                <p className="mt-1 font-bold text-blue-600">
                  {prestamoSeleccionado.folio}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() =>
                  setPrestamoSeleccionado(null)
                }
                className="
                  flex h-11 w-11
                  shrink-0 items-center
                  justify-center rounded-full
                  bg-slate-100
                  text-slate-500
                  transition
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="
                mb-8 grid
                grid-cols-1 gap-5
                rounded-2xl
                bg-slate-50 p-5
                sm:grid-cols-2
              "
            >
              <DatoPrestamo
                etiqueta="Estado"
                contenido={
                  <EstadoPrestamo
                    estado={
                      prestamoSeleccionado.estado
                    }
                  />
                }
              />

              <DatoPrestamo
                etiqueta="Responsable"
                valor={
                  prestamoSeleccionado.responsable ||
                  "Sin responsable"
                }
              />

              <DatoPrestamo
                etiqueta="Solicitante"
                valor={
                  prestamoSeleccionado.solicitante ||
                  "Sin solicitante"
                }
              />

              <DatoPrestamo
                etiqueta="Fecha de préstamo"
                valor={formatearFecha(
                  prestamoSeleccionado.fecha_prestamo,
                )}
              />

              <DatoPrestamo
                etiqueta="Fecha de devolución"
                valor={formatearFecha(
                  prestamoSeleccionado.fecha_devolucion,
                )}
              />

              <DatoPrestamo
                etiqueta="Observaciones"
                valor={
                  prestamoSeleccionado.observaciones ||
                  "Sin observaciones"
                }
              />
            </div>

            {/* Artículos en escritorio */}
            <div
              className="
                hidden overflow-hidden
                rounded-2xl border
                border-slate-200
                sm:block
              "
            >
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[58%]" />
                  <col className="w-[20%]" />
                </colgroup>

                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Código
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Artículo
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Cantidad
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {prestamoSeleccionado
                    .detalle_prestamo.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-6 text-center text-slate-400"
                      >
                        No hay artículos registrados.
                      </td>
                    </tr>
                  ) : (
                    prestamoSeleccionado.detalle_prestamo.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-200 transition hover:bg-slate-50"
                        >
                          <td className="break-words px-4 py-4 text-sm">
                            {item.articulos
                              ?.codigo ?? "-"}
                          </td>

                          <td className="break-words px-4 py-4 text-sm font-medium text-slate-800">
                            {item.articulos
                              ?.nombre ??
                              "Artículo no disponible"}
                          </td>

                          <td className="px-4 py-4 text-center font-bold">
                            {item.cantidad}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Artículos en celular */}
            <div className="space-y-3 sm:hidden">
              {prestamoSeleccionado
                .detalle_prestamo.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-400">
                  No hay artículos registrados.
                </div>
              ) : (
                prestamoSeleccionado.detalle_prestamo.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="
                        rounded-2xl border
                        border-slate-200
                        bg-white p-4
                      "
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {item.articulos?.codigo ??
                          "Sin código"}
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {item.articulos?.nombre ??
                          "Artículo no disponible"}
                      </p>

                      <p className="mt-3 text-sm text-slate-500">
                        Cantidad:{" "}
                        <strong className="text-slate-900">
                          {item.cantidad}
                        </strong>
                      </p>
                    </article>
                  ),
                )
              )}
            </div>

            <div className="mt-8 flex flex-col justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  descargarPDF(
                    prestamoSeleccionado,
                  )
                }
                className="
                  inline-flex min-h-12
                  w-full items-center
                  justify-center gap-2
                  rounded-2xl
                  bg-blue-600 px-6 py-3
                  font-semibold text-white
                  transition
                  hover:bg-blue-700
                  sm:w-auto
                "
              >
                <Download className="h-5 w-5" />
                Descargar PDF
              </button>

              {normalizarEstado(
                prestamoSeleccionado.estado,
              ) === "PRESTADO" && (
                <button
                  type="button"
                  onClick={() => {
                    void devolverPrestamo(
                      prestamoSeleccionado,
                    );
                  }}
                  disabled={
                    devolviendoId ===
                    prestamoSeleccionado.id
                  }
                  className="
                    inline-flex min-h-12
                    w-full items-center
                    justify-center gap-2
                    rounded-2xl
                    bg-emerald-600
                    px-6 py-3
                    font-semibold text-white
                    transition
                    hover:bg-emerald-700
                    disabled:cursor-not-allowed
                    disabled:bg-emerald-300
                    sm:w-auto
                  "
                >
                  <RotateCcw className="h-5 w-5" />

                  {devolviendoId ===
                  prestamoSeleccionado.id
                    ? "Devolviendo..."
                    : "Registrar devolución"}
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setPrestamoSeleccionado(null)
                }
                className="
                  min-h-12 w-full
                  rounded-2xl bg-slate-700
                  px-6 py-3
                  font-semibold text-white
                  transition
                  hover:bg-slate-800
                  sm:w-auto
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

type DatoPrestamoProps = {
  etiqueta: string;
  valor?: string;
  contenido?: React.ReactNode;
};

function DatoPrestamo({
  etiqueta,
  valor,
  contenido,
}: DatoPrestamoProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {etiqueta}
      </p>

      {contenido ?? (
        <p className="mt-1 break-words font-semibold text-slate-800">
          {valor}
        </p>
      )}
    </div>
  );
}