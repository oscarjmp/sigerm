"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Package2,
} from "lucide-react";

import type { AlertaInventario } from "./types";

type AlertasInventarioProps = {
  alertas: AlertaInventario[];
};

function obtenerEstiloNivel(
  nivel: AlertaInventario["nivel"],
) {
  if (nivel === "agotado") {
    return {
      texto: "Agotado",
      badge: "bg-red-100 text-red-700",
      borde: "border-red-200",
      fondo: "bg-red-50/40",
      disponibilidad: "text-red-600",
    };
  }

  if (nivel === "critico") {
    return {
      texto: "Crítico",
      badge: "bg-orange-100 text-orange-700",
      borde: "border-orange-200",
      fondo: "bg-orange-50/30",
      disponibilidad: "text-orange-600",
    };
  }

  return {
    texto: "Bajo",
    badge: "bg-amber-100 text-amber-700",
    borde: "border-amber-200",
    fondo: "bg-amber-50/30",
    disponibilidad: "text-amber-700",
  };
}

export default function AlertasInventario({
  alertas,
}: AlertasInventarioProps) {
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
      <header
        className="
          border-b border-slate-100
          bg-gradient-to-r
          from-red-50/70
          via-white
          to-orange-50/40
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
              bg-red-50
              text-red-500
              shadow-sm
            "
          >
            <AlertTriangle
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
                text-red-600
              "
            >
              Atención
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
              Inventario crítico
            </h2>

            <p
              className="
                mt-2 text-sm
                leading-6
                text-slate-500
              "
            >
              Artículos agotados o con pocas unidades
              disponibles que requieren seguimiento.
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {alertas.length === 0 ? (
          <div
            className="
              flex min-h-80
              flex-col items-center
              justify-center
              rounded-3xl
              border border-emerald-100
              bg-emerald-50
              px-6 text-center
            "
          >
            <div
              className="
                flex h-16 w-16
                items-center justify-center
                rounded-3xl
                bg-white
                text-emerald-600
                shadow-sm
              "
            >
              <CheckCircle2
                className="h-8 w-8"
                aria-hidden="true"
              />
            </div>

            <h3
              className="
                mt-5 text-lg
                font-black
                text-emerald-700
              "
            >
              Inventario estable
            </h3>

            <p
              className="
                mt-2 max-w-sm
                text-sm leading-6
                text-emerald-700/80
              "
            >
              No existen artículos con niveles críticos
              de disponibilidad.
            </p>
          </div>
        ) : (
          <div
            className="
              grid grid-cols-1
              gap-5
              md:grid-cols-2
              2xl:grid-cols-1
            "
          >
            {alertas.map((articulo) => {
              const estilo = obtenerEstiloNivel(
                articulo.nivel,
              );

              return (
                <article
                  key={articulo.id}
                  className={`
                    group flex h-full
                    flex-col overflow-hidden
                    rounded-3xl
                    border bg-white
                    shadow-sm
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-xl
                    ${estilo.borde}
                    ${estilo.fondo}
                  `}
                >
                  <Link
                    href={`/kardex?articulo=${articulo.id}`}
                    aria-label={`Consultar Kardex de ${articulo.nombre}`}
                    className="
                      relative block
                      aspect-[4/3]
                      w-full overflow-hidden
                      bg-slate-100
                    "
                  >
                    {articulo.imagen ? (
                      <Image
                        src={articulo.imagen}
                        alt={`Fotografía de ${articulo.nombre}`}
                        fill
                        sizes="
                          (max-width: 768px) 100vw,
                          (max-width: 1536px) 50vw,
                          420px
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
                          items-center justify-center
                          text-slate-300
                        "
                      >
                        <Package2
                          className="h-16 w-16"
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
                        from-black/45
                        via-transparent
                        to-transparent
                      "
                    />

                    <span
                      className={`
                        absolute right-3 top-3
                        rounded-full
                        px-3 py-1.5
                        text-xs font-black
                        shadow-sm
                        ${estilo.badge}
                      `}
                    >
                      {estilo.texto}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <p
                      className="
                        text-xs font-bold
                        uppercase
                        tracking-[0.14em]
                        text-[#3483FA]
                      "
                    >
                      {articulo.codigo}
                    </p>

                    <h3
                      className="
                        mt-2 line-clamp-2
                        min-h-14
                        text-lg font-black
                        leading-7
                        text-slate-900
                      "
                    >
                      {articulo.nombre}
                    </h3>

                    <p
                      className="
                        mt-2 truncate
                        text-sm font-semibold
                        text-slate-500
                      "
                    >
                      {articulo.categoria}
                    </p>

                    <div
                      className="
                        mt-5 rounded-2xl
                        bg-white/80 p-4
                        shadow-sm
                      "
                    >
                      <p className="text-xs text-slate-500">
                        Disponibles
                      </p>

                      <div
                        className="
                          mt-1 flex items-end
                          justify-between gap-4
                        "
                      >
                        <p
                          className={`
                            text-3xl font-black
                            ${estilo.disponibilidad}
                          `}
                        >
                          {articulo.disponibles.toLocaleString(
                            "es-MX",
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          de{" "}
                          {articulo.cantidad.toLocaleString(
                            "es-MX",
                          )}{" "}
                          unidades
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/kardex?articulo=${articulo.id}`}
                      className="
                        mt-auto inline-flex
                        min-h-11 w-full
                        items-center justify-center
                        rounded-2xl
                        bg-[#3483FA]
                        px-4 py-3
                        pt-3
                        text-sm font-bold
                        text-white
                        shadow-sm
                        transition-all
                        duration-300
                        hover:-translate-y-0.5
                        hover:bg-[#2968C8]
                        hover:shadow-md
                      "
                    >
                      Ver Kardex
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}