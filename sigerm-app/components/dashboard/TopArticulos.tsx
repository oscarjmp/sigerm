"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Package2,
  TrendingUp,
} from "lucide-react";

import type { ArticuloMasPrestado } from "@/components/dashboard/types";

type TopArticulosProps = {
  articulos: ArticuloMasPrestado[];
};

function obtenerClasePosicion(
  posicion: number,
): string {
  if (posicion === 1) {
    return `
      bg-gradient-to-br
      from-amber-300
      to-amber-500
      text-white
      shadow-amber-200
    `;
  }

  if (posicion === 2) {
    return `
      bg-gradient-to-br
      from-slate-300
      to-slate-500
      text-white
      shadow-slate-200
    `;
  }

  if (posicion === 3) {
    return `
      bg-gradient-to-br
      from-orange-300
      to-orange-500
      text-white
      shadow-orange-200
    `;
  }

  return `
    bg-blue-50
    text-[#3483FA]
    shadow-blue-100
  `;
}

export default function TopArticulos({
  articulos,
}: TopArticulosProps) {
  return (
    <section
      className="
        overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        shadow-sm
      "
    >
      {/* Encabezado */}
      <header
        className="
          border-b border-slate-100
          bg-gradient-to-r
          from-slate-50
          via-white
          to-blue-50/40
          px-5 py-5
          sm:px-6
        "
      >
        <div className="flex items-start gap-3">
          <div
            className="
              flex h-11 w-11
              shrink-0 items-center
              justify-center
              rounded-2xl
              bg-blue-50
              text-[#3483FA]
              shadow-sm
            "
          >
            <TrendingUp
              className="h-5 w-5"
              aria-hidden="true"
            />
          </div>

          <div>
            <p
              className="
                text-xs font-bold
                uppercase
                tracking-[0.16em]
                text-[#3483FA]
              "
            >
              Rotación del inventario
            </p>

            <h2
              className="
                mt-2 text-xl
                font-black
                tracking-tight
                text-slate-900
                sm:text-2xl
              "
            >
              Artículos más prestados
            </h2>

            <p
              className="
                mt-2 text-sm
                leading-6
                text-slate-500
              "
            >
              Clasificación basada en las unidades
              prestadas registradas en el Kardex.
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {articulos.length === 0 ? (
          <div
            className="
              flex min-h-80
              flex-col items-center
              justify-center
              rounded-3xl
              border border-dashed
              border-slate-200
              bg-slate-50
              px-6 text-center
            "
          >
            <div
              className="
                flex h-16 w-16
                items-center justify-center
                rounded-3xl
                bg-white
                text-slate-300
                shadow-sm
              "
            >
              <Award
                className="h-8 w-8"
                aria-hidden="true"
              />
            </div>

            <h3
              className="
                mt-5 text-lg
                font-black
                text-slate-700
              "
            >
              Ranking aún no disponible
            </h3>

            <p
              className="
                mt-2 max-w-sm
                text-sm leading-6
                text-slate-500
              "
            >
              Todavía no existen suficientes préstamos
              para generar la clasificación.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articulos.map(
              (articulo, indice) => {
                const posicion = indice + 1;

                return (
                  <article
                    key={articulo.articuloId}
                    className="
                      group relative
                      overflow-hidden
                      rounded-3xl
                      border border-slate-200
                      bg-white
                      p-3
                      shadow-sm
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:border-blue-200
                      hover:shadow-lg
                      sm:p-4
                    "
                  >
                    <div
                      className="
                        flex flex-col
                        gap-4
                        sm:flex-row
                        sm:items-center
                      "
                    >
                      {/* Posición */}
                      <div
                        className={`
                          absolute left-5 top-5
                          z-20
                          flex h-10 w-10
                          items-center justify-center
                          rounded-full
                          text-sm font-black
                          shadow-lg
                          sm:static
                          sm:h-11 sm:w-11
                          sm:shrink-0
                          ${obtenerClasePosicion(
                            posicion,
                          )}
                        `}
                      >
                        {posicion}
                      </div>

                      {/* Fotografía uniforme */}
                      <Link
                        href={`/kardex?articulo=${articulo.articuloId}`}
                        aria-label={`Consultar Kardex de ${articulo.nombre}`}
                        className="
                          relative block
                          aspect-[4/3]
                          w-full
                          shrink-0
                          overflow-hidden
                          rounded-2xl
                          bg-slate-100
                          sm:h-24
                          sm:w-32
                          sm:aspect-auto
                        "
                      >
                        {articulo.imagen ? (
                          <Image
                            src={articulo.imagen}
                            alt={`Fotografía de ${articulo.nombre}`}
                            fill
                            sizes="
                              (max-width: 640px) 100vw,
                              128px
                            "
                            className="
                              object-cover
                              object-center
                              transition-transform
                              duration-500
                              group-hover:scale-105
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex h-full w-full
                              items-center
                              justify-center
                              text-slate-300
                            "
                          >
                            <Package2
                              className="h-10 w-10"
                              aria-hidden="true"
                            />
                          </div>
                        )}

                        <div
                          aria-hidden="true"
                          className="
                            pointer-events-none
                            absolute inset-0
                            bg-gradient-to-t
                            from-black/20
                            via-transparent
                            to-transparent
                            opacity-0
                            transition-opacity
                            duration-300
                            group-hover:opacity-100
                          "
                        />
                      </Link>

                      {/* Información */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/kardex?articulo=${articulo.articuloId}`}
                          className="
                            line-clamp-2
                            text-base font-black
                            leading-6
                            text-slate-900
                            transition-colors
                            hover:text-[#3483FA]
                            sm:text-lg
                          "
                        >
                          {articulo.nombre}
                        </Link>

                        <p
                          className="
                            mt-1 truncate
                            text-xs font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-slate-400
                          "
                        >
                          {articulo.codigo}
                        </p>

                        <p
                          className="
                            mt-1 truncate
                            text-sm
                            text-slate-500
                          "
                        >
                          {articulo.categoria}
                        </p>

                        <div
                          className="
                            mt-3 flex
                            flex-wrap gap-2
                          "
                        >
                          <span
                            className="
                              inline-flex
                              items-center gap-1.5
                              rounded-full
                              bg-amber-50
                              px-3 py-1.5
                              text-xs font-bold
                              text-amber-700
                            "
                          >
                            <Award
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />

                            {articulo.unidadesPrestadas.toLocaleString(
                              "es-MX",
                            )}{" "}
                            unidades
                          </span>

                          <span
                            className="
                              inline-flex
                              items-center
                              rounded-full
                              bg-blue-50
                              px-3 py-1.5
                              text-xs font-bold
                              text-[#3483FA]
                            "
                          >
                            {articulo.movimientos.toLocaleString(
                              "es-MX",
                            )}{" "}
                            préstamos
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/kardex?articulo=${articulo.articuloId}`}
                        className="
                          inline-flex
                          min-h-11
                          w-full items-center
                          justify-center
                          rounded-2xl
                          bg-[#3483FA]
                          px-4 py-3
                          text-sm font-bold
                          text-white
                          shadow-sm
                          transition-all
                          duration-300
                          hover:-translate-y-0.5
                          hover:bg-[#2968C8]
                          hover:shadow-md
                          sm:w-auto
                          sm:shrink-0
                        "
                      >
                        Ver Kardex
                      </Link>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}