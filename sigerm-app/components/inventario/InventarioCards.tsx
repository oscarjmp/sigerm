"use client";

import Link from "next/link";
import {
  Eye,
  FileClock,
  PackageOpen,
  Pencil,
  Trash2,
} from "lucide-react";

import FotoArticulo from "@/components/inventario/FotoArticulo";
import IndicadorExistencias from "@/components/inventario/IndicadorExistencias";
import type { ArticuloInventario } from "@/components/inventario/types";

type InventarioCardsProps = {
  articulos: ArticuloInventario[];
  puedeEditar: boolean;
  puedeEliminar: boolean;
  eliminandoId: string | null;
  onEliminar: (
    articulo: ArticuloInventario,
  ) => void;
  onVerDetalle: (
    articulo: ArticuloInventario,
  ) => void;
};

function obtenerCategoria(
  categoria: string | null,
): string {
  const valor = categoria?.trim();

  return valor || "SIN CATEGORÍA";
}

function normalizarEstado(
  estado: string | null,
): string {
  return estado?.trim().toLowerCase() || "";
}

function EstadoArticulo({
  estado,
}: {
  estado: string | null;
}) {
  const estadoNormalizado =
    normalizarEstado(estado);

  if (estadoNormalizado === "bueno") {
    return (
      <span
        className="
          inline-flex shrink-0
          items-center gap-2
          rounded-full border
          border-emerald-100
          bg-emerald-50
          px-3 py-1.5
          text-xs font-bold
          text-emerald-700
          shadow-sm
        "
      >
        <span
          className="
            h-2 w-2 rounded-full
            bg-emerald-500
          "
        />

        Bueno
      </span>
    );
  }

  if (estadoNormalizado === "regular") {
    return (
      <span
        className="
          inline-flex shrink-0
          items-center gap-2
          rounded-full border
          border-amber-100
          bg-amber-50
          px-3 py-1.5
          text-xs font-bold
          text-amber-700
          shadow-sm
        "
      >
        <span
          className="
            h-2 w-2 rounded-full
            bg-amber-400
          "
        />

        Regular
      </span>
    );
  }

  if (estadoNormalizado === "malo") {
    return (
      <span
        className="
          inline-flex shrink-0
          items-center gap-2
          rounded-full border
          border-rose-100
          bg-rose-50
          px-3 py-1.5
          text-xs font-bold
          text-rose-700
          shadow-sm
        "
      >
        <span
          className="
            h-2 w-2 rounded-full
            bg-rose-500
          "
        />

        Malo
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex shrink-0
        items-center rounded-full
        bg-slate-100
        px-3 py-1.5
        text-xs font-bold
        text-slate-600
      "
    >
      {estado?.trim() || "Sin estado"}
    </span>
  );
}

export default function InventarioCards({
  articulos,
  puedeEditar,
  puedeEliminar,
  eliminandoId,
  onEliminar,
  onVerDetalle,
}: InventarioCardsProps) {
  if (articulos.length === 0) {
    return (
      <section
        className="
          rounded-3xl border
          border-slate-200
          bg-white px-5 py-14
          text-center shadow-sm
          sm:p-14
        "
      >
        <div
          className="
            mx-auto flex h-16 w-16
            items-center justify-center
            rounded-3xl
            bg-blue-50
            text-[#3483FA]
          "
        >
          <PackageOpen
            className="h-8 w-8"
            aria-hidden="true"
          />
        </div>

        <h2
          className="
            mt-5 text-xl font-black
            text-slate-800
          "
        >
          No se encontraron artículos
        </h2>

        <p
          className="
            mx-auto mt-2 max-w-md
            text-sm leading-6
            text-slate-500
          "
        >
          Ajusta la búsqueda o los filtros para
          consultar otros artículos del inventario.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Artículos del inventario"
      className="
        grid grid-cols-1
        gap-5
        sm:grid-cols-2
        xl:grid-cols-3
        2xl:grid-cols-4
      "
    >
      {articulos.map((articulo) => {
        const eliminando =
          eliminandoId === articulo.id;

        return (
          <article
            key={articulo.id}
            className="
              group flex h-full
              flex-col overflow-hidden
              rounded-3xl border
              border-slate-200
              bg-white shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
            "
          >
            {/* Imagen uniforme 4:3 */}
            <div
              className="
                relative aspect-[4/3]
                w-full shrink-0
                overflow-hidden
                bg-slate-100
              "
            >
              <FotoArticulo
                imagen={articulo.imagen}
                nombre={articulo.nombre}
                onClick={() =>
                  onVerDetalle(articulo)
                }
              />
            </div>

            {/* Información */}
            <div
              className="
                flex flex-1
                flex-col p-5
              "
            >
              <div
                className="
                  flex items-start
                  justify-between gap-3
                "
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="
                      truncate text-xs
                      font-bold uppercase
                      tracking-[0.14em]
                      text-[#3483FA]
                    "
                  >
                    {articulo.codigo}
                  </p>

                  <h2
                    className="
                      mt-2 line-clamp-2
                      min-h-14
                      text-lg font-black
                      leading-7
                      text-slate-900
                    "
                  >
                    {articulo.nombre}
                  </h2>

                  <p
                    className="
                      mt-2 truncate
                      text-sm font-semibold
                      text-slate-500
                    "
                  >
                    {obtenerCategoria(
                      articulo.categoria,
                    )}
                  </p>
                </div>

                <EstadoArticulo
                  estado={articulo.estado}
                />
              </div>

              <div className="mt-5">
                <IndicadorExistencias
                  cantidad={articulo.cantidad}
                  disponibles={
                    articulo.disponibles
                  }
                />
              </div>

              {/* Acciones principales */}
              <div
                className="
                  mt-auto grid
                  grid-cols-1 gap-3
                  pt-5 sm:grid-cols-2
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    onVerDetalle(articulo)
                  }
                  className="
                    inline-flex min-h-11
                    items-center justify-center
                    gap-2 rounded-2xl
                    bg-slate-800
                    px-4 py-3
                    text-sm font-bold
                    text-white
                    shadow-sm
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-slate-900
                    hover:shadow-md
                    focus-visible:outline-none
                    focus-visible:ring-4
                    focus-visible:ring-slate-200
                  "
                >
                  <Eye
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  Ver detalle
                </button>

                <Link
                  href={`/kardex?articulo=${articulo.id}`}
                  className="
                    inline-flex min-h-11
                    items-center justify-center
                    gap-2 rounded-2xl
                    bg-[#3483FA]
                    px-4 py-3
                    text-center
                    text-sm font-bold
                    text-white
                    shadow-sm
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-[#2968C8]
                    hover:shadow-md
                    focus-visible:outline-none
                    focus-visible:ring-4
                    focus-visible:ring-blue-100
                  "
                >
                  <FileClock
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  Ver Kardex
                </Link>
              </div>

              {/* Acciones administrativas */}
              {(puedeEditar ||
                puedeEliminar) && (
                <div
                  className={`
                    mt-3 grid gap-3
                    ${
                      puedeEditar &&
                      puedeEliminar
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }
                  `}
                >
                  {puedeEditar && (
                    <Link
                      href={`/inventario/editar/${articulo.id}`}
                      className="
                        inline-flex min-h-11
                        items-center justify-center
                        gap-2 rounded-2xl
                        border border-blue-200
                        bg-blue-50
                        px-4 py-3
                        text-center
                        text-sm font-bold
                        text-blue-700
                        transition-all
                        duration-300
                        hover:bg-blue-100
                        focus-visible:outline-none
                        focus-visible:ring-4
                        focus-visible:ring-blue-100
                      "
                    >
                      <Pencil
                        className="h-4 w-4"
                        aria-hidden="true"
                      />

                      Editar
                    </Link>
                  )}

                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() =>
                        onEliminar(articulo)
                      }
                      disabled={eliminando}
                      className="
                        inline-flex min-h-11
                        items-center justify-center
                        gap-2 rounded-2xl
                        border border-rose-200
                        bg-rose-50
                        px-4 py-3
                        text-sm font-bold
                        text-rose-700
                        transition-all
                        duration-300
                        hover:bg-rose-100
                        focus-visible:outline-none
                        focus-visible:ring-4
                        focus-visible:ring-rose-100
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      <Trash2
                        className="h-4 w-4"
                        aria-hidden="true"
                      />

                      {eliminando
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  )}
                </div>
              )}

              {!puedeEditar &&
                !puedeEliminar && (
                  <p
                    className="
                      mt-4 text-center
                      text-xs font-medium
                      text-slate-400
                    "
                  >
                    Consulta de solo lectura
                  </p>
                )}
            </div>
          </article>
        );
      })}
    </section>
  );
}