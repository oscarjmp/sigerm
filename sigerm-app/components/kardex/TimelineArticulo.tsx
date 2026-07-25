"use client";

import Image from "next/image";

import type { Movimiento } from "@/components/kardex/types";
import {
  formatearFecha,
  formatearNumero,
  normalizarTexto,
  obtenerCategoriaArticulo,
  obtenerCodigoArticulo,
  obtenerDiferencia,
  obtenerNombreArticulo,
  obtenerReferencia,
  obtenerSolicitante,
  obtenerUsuario,
} from "@/components/kardex/utils";

type TimelineArticuloProps = {
  abierto: boolean;
  movimientos: Movimiento[];
  articuloId: string | null;
  onCerrar: () => void;
};

function obtenerTipoLegible(tipo: string): string {
  const normalizado = tipo.trim().toUpperCase();

  if (normalizado === "PRESTAMO") {
    return "Préstamo";
  }

  if (normalizado === "DEVOLUCION") {
    return "Devolución";
  }

  if (normalizado === "ALTA") {
    return "Alta";
  }

  if (normalizado === "ENTRADA") {
    return "Entrada";
  }

  if (normalizado === "SALIDA") {
    return "Salida";
  }

  if (normalizado === "BAJA") {
    return "Baja";
  }

  if (normalizado === "AJUSTE") {
    return "Ajuste";
  }

  return normalizado || "Movimiento";
}

function obtenerClaseTipo(tipo: string): string {
  const normalizado = tipo.trim().toUpperCase();

  if (
    normalizado === "ALTA" ||
    normalizado === "ENTRADA"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (normalizado === "PRESTAMO") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalizado === "DEVOLUCION") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    normalizado === "SALIDA" ||
    normalizado === "BAJA"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (normalizado === "AJUSTE") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
}

function TarjetaIndicador({
  titulo,
  valor,
  claseValor,
}: {
  titulo: string;
  valor: number | null;
  claseValor: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {titulo}
      </p>

      <p className={`mt-2 text-2xl font-bold ${claseValor}`}>
        {formatearNumero(valor)}
      </p>
    </article>
  );
}

export default function TimelineArticulo({
  abierto,
  movimientos,
  articuloId,
  onCerrar,
}: TimelineArticuloProps) {
  if (!abierto || !articuloId) {
    return null;
  }

  const historial = movimientos
    .filter(
      (movimiento) =>
        movimiento.articulo_id === articuloId,
    )
    .sort(
      (a, b) =>
        new Date(b.fecha).getTime() -
        new Date(a.fecha).getTime(),
    );

  const primerMovimiento = historial[0] ?? null;

  const articulo = primerMovimiento?.articulos ?? null;

  const nombreArticulo = primerMovimiento
    ? obtenerNombreArticulo(primerMovimiento)
    : "Artículo";

  const codigoArticulo = primerMovimiento
    ? obtenerCodigoArticulo(primerMovimiento)
    : "Sin código";

  const categoriaArticulo = primerMovimiento
    ? obtenerCategoriaArticulo(primerMovimiento)
    : "Sin categoría";

  const imagenArticulo = articulo?.imagen?.trim() || null;

  const existenciaTotal =
    articulo?.cantidad ??
    primerMovimiento?.metadata?.existencia_total ??
    null;

  const disponibles =
    articulo?.disponibles ??
    primerMovimiento?.existencia_nueva ??
    null;

  const prestadosActualmente =
    existenciaTotal !== null && disponibles !== null
      ? Math.max(existenciaTotal - disponibles, 0)
      : null;

  const totalPrestamos = historial.filter(
    (movimiento) =>
      movimiento.tipo.trim().toUpperCase() ===
      "PRESTAMO",
  ).length;

  const totalDevoluciones = historial.filter(
    (movimiento) =>
      movimiento.tipo.trim().toUpperCase() ===
      "DEVOLUCION",
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-timeline-articulo"
      onClick={onCerrar}
    >
      <aside
        className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex justify-end bg-transparent p-4">
          <button
            type="button"
            aria-label="Cerrar historial"
            onClick={onCerrar}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-slate-500 shadow-lg transition hover:bg-rose-50 hover:text-rose-600"
          >
            ×
          </button>
        </div>

        <div className="-mt-20">
          <section className="relative overflow-hidden border-b border-slate-200 bg-white">
            <div className="relative h-[300px] w-full bg-slate-100 sm:h-[380px]">
              {imagenArticulo ? (
                <Image
                  src={imagenArticulo}
                  alt={`Fotografía de ${nombreArticulo}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain p-5 transition duration-500 hover:scale-[1.03]"
                  priority
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-5xl">
                    📦
                  </div>

                  <p className="mt-5 text-lg font-semibold text-slate-700">
                    Sin fotografía disponible
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Agrega una imagen desde el módulo de inventario.
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent" />
            </div>

            <div className="relative -mt-10 px-5 pb-7 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Historial del artículo
              </p>

              <h2
                id="titulo-timeline-articulo"
                className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl"
              >
                {nombreArticulo}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                  {codigoArticulo}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {categoriaArticulo}
                </span>

                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    disponibles !== null && disponibles > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {disponibles !== null && disponibles > 0
                    ? "Disponible"
                    : "Sin disponibilidad"}
                </span>
              </div>
            </div>
          </section>

          <div className="p-5 sm:p-8">
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <TarjetaIndicador
                titulo="Existencia total"
                valor={existenciaTotal}
                claseValor="text-slate-900"
              />

              <TarjetaIndicador
                titulo="Disponibles"
                valor={disponibles}
                claseValor="text-emerald-600"
              />

              <TarjetaIndicador
                titulo="Prestados actualmente"
                valor={prestadosActualmente}
                claseValor="text-amber-600"
              />

              <TarjetaIndicador
                titulo="Movimientos"
                valor={historial.length}
                claseValor="text-blue-600"
              />

              <TarjetaIndicador
                titulo="Préstamos"
                valor={totalPrestamos}
                claseValor="text-amber-600"
              />

              <TarjetaIndicador
                titulo="Devoluciones"
                valor={totalDevoluciones}
                claseValor="text-emerald-600"
              />
            </section>

            {historial.length === 0 ? (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h3 className="text-lg font-bold text-slate-800">
                  Sin movimientos
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  No se encontró historial para este artículo.
                </p>
              </section>
            ) : (
              <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                      Auditoría
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-slate-900">
                      Línea de tiempo
                    </h3>
                  </div>

                  <p className="text-sm text-slate-500">
                    {historial.length} registros
                  </p>
                </div>

                <div className="mt-6 space-y-0">
                  {historial.map((movimiento, indice) => {
                    const diferencia =
                      obtenerDiferencia(movimiento);

                    const esUltimo =
                      indice === historial.length - 1;

                    return (
                      <article
                        key={movimiento.id}
                        className="relative pl-11"
                      >
                        {!esUltimo && (
                          <span className="absolute left-[17px] top-9 h-[calc(100%-1rem)] w-px bg-slate-300" />
                        )}

                        <span
                          className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full text-base font-bold shadow-sm ${
                            diferencia > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : diferencia < 0
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {diferencia > 0
                            ? "↑"
                            : diferencia < 0
                              ? "↓"
                              : "•"}
                        </span>

                        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerClaseTipo(
                                  movimiento.tipo,
                                )}`}
                              >
                                {obtenerTipoLegible(
                                  movimiento.tipo,
                                )}
                              </span>

                              <p className="mt-3 text-base font-bold text-slate-900">
                                {obtenerReferencia(
                                  movimiento,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatearFecha(
                                  movimiento.fecha,
                                )}
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p
                                className={
                                  diferencia > 0
                                    ? "text-3xl font-bold text-emerald-600"
                                    : diferencia < 0
                                      ? "text-3xl font-bold text-rose-600"
                                      : "text-3xl font-bold text-slate-600"
                                }
                              >
                                {diferencia > 0 ? "+" : ""}
                                {new Intl.NumberFormat(
                                  "es-MX",
                                ).format(diferencia)}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {formatearNumero(
                                  movimiento.existencia_anterior,
                                )}{" "}
                                →{" "}
                                {formatearNumero(
                                  movimiento.existencia_nueva,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-slate-500">
                                Solicitante
                              </p>

                              <p className="font-semibold text-slate-800">
                                {obtenerSolicitante(
                                  movimiento,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">
                                Usuario
                              </p>

                              <p className="font-semibold text-slate-800">
                                {obtenerUsuario(movimiento)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">
                                Motivo
                              </p>

                              <p className="font-semibold text-slate-800">
                                {normalizarTexto(
                                  movimiento.motivo,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">
                                Observaciones
                              </p>

                              <p className="whitespace-pre-wrap font-semibold text-slate-800">
                                {normalizarTexto(
                                  movimiento.observaciones,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}