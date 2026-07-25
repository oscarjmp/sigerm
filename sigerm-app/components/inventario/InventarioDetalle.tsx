"use client";

import Image from "next/image";
import Link from "next/link";

import IndicadorExistencias from "@/components/inventario/IndicadorExistencias";
import type { ArticuloInventario } from "@/components/inventario/types";

type InventarioDetalleProps = {
  articulo: ArticuloInventario | null;
  abierto: boolean;
  puedeEditar: boolean;
  onCerrar: () => void;
};

function obtenerTexto(
  valor: string | null,
  reemplazo = "Sin información",
): string {
  const texto = valor?.trim();

  return texto || reemplazo;
}

function obtenerNumero(
  valor: number | null,
): number {
  return Math.max(valor ?? 0, 0);
}

export default function InventarioDetalle({
  articulo,
  abierto,
  puedeEditar,
  onCerrar,
}: InventarioDetalleProps) {
  if (!abierto || !articulo) {
    return null;
  }

  const total = obtenerNumero(articulo.cantidad);

  const disponibles = Math.min(
    obtenerNumero(articulo.disponibles),
    total,
  );

  const prestados = Math.max(
    total - disponibles,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-articulo"
      onClick={onCerrar}
    >
      <aside
        className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex justify-end bg-transparent p-4">
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={onCerrar}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-slate-500 shadow-lg transition hover:bg-rose-50 hover:text-rose-600"
          >
            ×
          </button>
        </div>

        <div className="-mt-20">
          <section className="relative overflow-hidden border-b border-slate-200 bg-white">
            <div className="relative h-[340px] w-full bg-slate-100 sm:h-[460px]">
              {articulo.imagen ? (
                <Image
                  src={articulo.imagen}
                  alt={`Fotografía de ${articulo.nombre}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain p-6 transition duration-500 hover:scale-[1.03]"
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
                    Agrega una imagen desde la edición del artículo.
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent" />
            </div>

            <div className="relative -mt-12 px-5 pb-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Detalle del artículo
              </p>

              <h2
                id="titulo-detalle-articulo"
                className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl"
              >
                {articulo.nombre}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                  {articulo.codigo}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {obtenerTexto(
                    articulo.categoria,
                    "SIN CATEGORÍA",
                  )}
                </span>

                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    disponibles > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {disponibles > 0
                    ? "Disponible"
                    : "Sin disponibilidad"}
                </span>
              </div>
            </div>
          </section>

          <div className="p-5 sm:p-8">
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Existencia total
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {total}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Disponibles
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {disponibles}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Prestados
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {prestados}
                </p>
              </article>
            </section>

            <div className="mt-6">
              <IndicadorExistencias
                cantidad={articulo.cantidad}
                disponibles={articulo.disponibles}
              />
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-bold text-slate-900">
                Información del artículo
              </h3>

              <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Estado físico
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-900">
                    {obtenerTexto(articulo.estado)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Unidad
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-900">
                    {obtenerTexto(articulo.unidad)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Ubicación
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-900">
                    {obtenerTexto(articulo.ubicacion)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Registro
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-900">
                    {articulo.activo === false
                      ? "Inactivo"
                      : "Activo"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href={`/kardex?articulo=${articulo.id}`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Ver Kardex
              </Link>

              {puedeEditar && (
                <Link
                  href={`/inventario/editar/${articulo.id}`}
                  className="rounded-xl bg-slate-800 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-900"
                >
                  Editar artículo
                </Link>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}