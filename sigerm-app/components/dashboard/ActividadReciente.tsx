"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import type { ActividadDashboard } from "@/components/dashboard/types";

type ActividadRecienteProps = {
  actividades: ActividadDashboard[];
};

function obtenerClaseOperacion(tipo: string): string {
  const tipoNormalizado = tipo.trim().toUpperCase();

  if (tipoNormalizado === "PRESTAMO") {
    return "bg-amber-100 text-amber-700";
  }

  if (tipoNormalizado === "DEVOLUCION") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    tipoNormalizado === "ALTA" ||
    tipoNormalizado === "ENTRADA"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    tipoNormalizado === "SALIDA" ||
    tipoNormalizado === "BAJA"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (tipoNormalizado === "AJUSTE") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
}

function obtenerTipoLegible(tipo: string): string {
  const tipoNormalizado = tipo.trim().toUpperCase();

  if (tipoNormalizado === "PRESTAMO") {
    return "PRÉSTAMO";
  }

  if (tipoNormalizado === "DEVOLUCION") {
    return "DEVOLUCIÓN";
  }

  return tipoNormalizado || "MOVIMIENTO";
}

function obtenerDiferenciaLegible(
  diferencia: number,
): string {
  const numero = Math.abs(diferencia).toLocaleString(
    "es-MX",
  );

  if (diferencia > 0) {
    return `+${numero}`;
  }

  if (diferencia < 0) {
    return `-${numero}`;
  }

  return "0";
}

function obtenerTiempoRelativo(fecha: string): string {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no disponible";
  }

  return formatDistanceToNow(valor, {
    addSuffix: true,
    locale: es,
  });
}

export default function ActividadReciente({
  actividades,
}: ActividadRecienteProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
          Kardex
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Actividad reciente
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Últimos movimientos registrados en el
          inventario.
        </p>
      </div>

      {actividades.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm text-slate-500">
          No existen movimientos registrados.
        </div>
      ) : (
        <div className="space-y-4">
          {actividades.map((actividad) => (
            <article
              key={actividad.id}
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span
                  className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${obtenerClaseOperacion(
                    actividad.tipo,
                  )}`}
                >
                  {obtenerTipoLegible(actividad.tipo)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/kardex?articulo=${actividad.articuloId}`}
                        className="block truncate font-bold text-slate-900 transition hover:text-blue-700 hover:underline"
                      >
                        {actividad.articulo}
                      </Link>

                      <p className="mt-1 text-sm text-slate-500">
                        {actividad.codigo}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs text-slate-500">
                      {obtenerTiempoRelativo(
                        actividad.fecha,
                      )}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span>
                      Usuario:
                      <strong className="ml-1 text-slate-700">
                        {actividad.usuario ||
                          "Sin información"}
                      </strong>
                    </span>

                    <span>
                      Referencia:
                      <strong className="ml-1 text-slate-700">
                        {actividad.referencia ||
                          "Sin referencia"}
                      </strong>
                    </span>

                    <span>
                      Movimiento:
                      <strong
                        className={`ml-1 ${
                          actividad.diferencia > 0
                            ? "text-emerald-700"
                            : actividad.diferencia < 0
                              ? "text-rose-700"
                              : "text-slate-700"
                        }`}
                      >
                        {obtenerDiferenciaLegible(
                          actividad.diferencia,
                        )}
                      </strong>
                    </span>

                    <span>
                      Solicitante:
                      <strong className="ml-1 text-slate-700">
                        {actividad.solicitante ||
                          "Sin información"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}