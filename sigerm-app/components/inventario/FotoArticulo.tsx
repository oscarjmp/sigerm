"use client";

import Image from "next/image";
import { Package2 } from "lucide-react";

type FotoArticuloProps = {
  imagen: string | null;
  nombre: string;
  prioridad?: boolean;
  onClick?: () => void;
};

export default function FotoArticulo({
  imagen,
  nombre,
  prioridad = false,
  onClick,
}: FotoArticuloProps) {
  const contenido = imagen ? (
    <Image
      src={imagen}
      alt={`Fotografía de ${nombre}`}
      fill
      priority={prioridad}
      loading={prioridad ? "eager" : "lazy"}
      sizes="
        (max-width: 640px) 100vw,
        (max-width: 1280px) 50vw,
        25vw
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
        flex-col items-center
        justify-center
        px-6 text-center
        text-slate-400
      "
    >
      <div
        className="
          flex h-20 w-20
          items-center justify-center
          rounded-3xl
          bg-white/80
          shadow-sm
        "
      >
        <Package2
          aria-hidden="true"
          className="h-10 w-10"
        />
      </div>

      <p
        className="
          mt-4 text-sm
          font-bold text-slate-600
        "
      >
        Sin fotografía
      </p>

      <p
        className="
          mt-1 text-xs
          leading-5 text-slate-500
        "
      >
        Agrega una imagen desde la edición
        del artículo.
      </p>
    </div>
  );

  const clasesContenedor = `
    group relative
    block h-full w-full
    overflow-hidden
    bg-slate-100
    text-left
  `;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ver detalle de ${nombre}`}
        className={clasesContenedor}
      >
        {contenido}

        <span
          className="
            pointer-events-none
            absolute inset-x-0 bottom-0
            translate-y-2
            bg-gradient-to-t
            from-black/65
            via-black/25
            to-transparent
            px-5 pb-4 pt-14
            text-sm font-bold
            text-white opacity-0
            transition-all duration-300
            group-hover:translate-y-0
            group-hover:opacity-100
          "
        >
          Ver detalle
        </span>
      </button>
    );
  }

  return (
    <div className={clasesContenedor}>
      {contenido}
    </div>
  );
}