"use client";

import Image from "next/image";
import { Package2, Plus, ShoppingCart } from "lucide-react";

export type ArticuloCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  cantidad: number | null;
  disponibles: number | null;
  unidad: string | null;
  estado: string | null;
  imagen: string | null;
  ubicacion: string | null;
  activo: boolean | null;
};

type TarjetaArticuloProps = {
  articulo: ArticuloCatalogo;
  onAgregar?: (articulo: ArticuloCatalogo) => void;
};

function obtenerCategoria(categoria: string | null): string {
  const valor = categoria?.trim();

  return valor || "SIN CATEGORÍA";
}

function obtenerDisponibles(disponibles: number | null): number {
  return disponibles ?? 0;
}

function obtenerClaseDisponibilidad(disponibles: number): string {
  if (disponibles <= 0) {
    return "bg-red-100 text-red-700";
  }

  if (disponibles <= 5) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function obtenerTextoDisponibilidad(disponibles: number): string {
  if (disponibles <= 0) {
    return "Agotado";
  }

  if (disponibles <= 5) {
    return "Pocas unidades";
  }

  return "Disponible";
}

export default function TarjetaArticulo({
  articulo,
  onAgregar,
}: TarjetaArticuloProps) {
  const disponibles = obtenerDisponibles(articulo.disponibles);
  const agotado = disponibles <= 0;

  function manejarAgregar() {
    if (agotado) {
      return;
    }

    onAgregar?.(articulo);
  }

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-slate-200
        bg-white shadow-sm
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl
      "
    >
      <div
        className="
          relative aspect-[4/3]
          overflow-hidden bg-slate-100
        "
      >
        {articulo.imagen ? (
          <Image
            src={articulo.imagen}
            alt={articulo.nombre}
            fill
            sizes="
              (max-width: 640px) 100vw,
              (max-width: 1280px) 50vw,
              25vw
            "
            className="
              object-cover
              transition-transform duration-500
              group-hover:scale-105
            "
          />
        ) : (
          <div
            className="
              flex h-full items-center
              justify-center text-slate-300
            "
          >
            <Package2 className="h-16 w-16" />
          </div>
        )}

        <span
          className={`
            absolute right-3 top-3
            rounded-full px-3 py-1.5
            text-xs font-bold shadow-sm
            ${obtenerClaseDisponibilidad(disponibles)}
          `}
        >
          {obtenerTextoDisponibilidad(disponibles)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p
          className="
            text-xs font-bold uppercase
            tracking-wider text-blue-600
          "
        >
          {articulo.codigo}
        </p>

        <h2
          className="
            mt-2 text-lg font-bold
            leading-7 text-slate-900
          "
        >
          {articulo.nombre}
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {obtenerCategoria(articulo.categoria)}
        </p>

        {articulo.descripcion && (
          <p
            className="
              mt-3 line-clamp-2
              text-sm leading-6 text-slate-500
            "
          >
            {articulo.descripcion}
          </p>
        )}

        <div className="mt-auto pt-5">
          <div
            className="
              flex items-end justify-between gap-4
              border-t border-slate-100 pt-4
            "
          >
            <div>
              <p className="text-xs text-slate-400">
                Disponibles
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {disponibles}
              </p>

              <p className="text-xs text-slate-500">
                {articulo.unidad || "unidad(es)"}
              </p>
            </div>

            <button
              type="button"
              onClick={manejarAgregar}
              disabled={agotado}
              className="
                inline-flex min-h-11 items-center
                justify-center gap-2 rounded-2xl
                bg-[#3483FA] px-5 py-3
                text-sm font-semibold text-white
                shadow-sm transition
                hover:-translate-y-0.5
                hover:bg-[#2968C8]
                hover:shadow-md
                disabled:cursor-not-allowed
                disabled:bg-slate-300
                disabled:shadow-none
              "
            >
              {agotado ? (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Agotado
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Agregar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}