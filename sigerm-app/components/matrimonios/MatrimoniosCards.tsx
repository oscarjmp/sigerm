"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Trash2,
  Users,
} from "lucide-react";

import MatrimonioModal from "@/components/matrimonios/MatrimonioModal";

import type { Matrimonio } from "@/types/matrimonio";

type MatrimoniosCardsProps = {
  matrimonios: Matrimonio[];
  eliminandoId: string | null;
  usuarioActualId: string | null;
  esAdministrador: boolean;
  onEliminar: (
    matrimonio: Matrimonio,
  ) => Promise<void>;
};

type DatoProps = {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
};

function obtenerMinisterio(
  ministerio: string | null | undefined,
): string {
  return ministerio?.trim() || "SIN MINISTERIO";
}

function obtenerIniciales(
  esposo: string,
  esposa: string,
): string {
  const inicialEsposo =
    esposo.trim().charAt(0).toUpperCase();

  const inicialEsposa =
    esposa.trim().charAt(0).toUpperCase();

  return (
    `${inicialEsposo}${inicialEsposa}` || "MR"
  );
}

function puedeAdministrarMatrimonio(
  matrimonio: Matrimonio,
  usuarioActualId: string | null,
  esAdministrador: boolean,
): boolean {
  if (esAdministrador) {
    return true;
  }

  if (!usuarioActualId) {
    return false;
  }

  return (
    matrimonio.usuario_id === usuarioActualId
  );
}

export default function MatrimoniosCards({
  matrimonios,
  eliminandoId,
  usuarioActualId,
  esAdministrador,
  onEliminar,
}: MatrimoniosCardsProps) {
  if (matrimonios.length === 0) {
    return (
      <div
        className="
          rounded-3xl border
          border-slate-200
          bg-white px-6 py-14
          text-center shadow-sm
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
          <Users
            aria-hidden="true"
            className="h-8 w-8"
          />
        </div>

        <h2 className="mt-5 text-xl font-black text-slate-800">
          No se encontraron matrimonios
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ajusta la búsqueda para consultar otros
          registros.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Álbum de matrimonios"
      className="
        grid grid-cols-1 gap-5
        sm:grid-cols-2
        xl:grid-cols-3
        2xl:grid-cols-4
      "
    >
      {matrimonios.map((matrimonio) => {
        const eliminando =
          eliminandoId === matrimonio.id;

        const puedeAdministrar =
          puedeAdministrarMatrimonio(
            matrimonio,
            usuarioActualId,
            esAdministrador,
          );

        return (
          <article
            key={matrimonio.id}
            className="
              group flex h-full
              flex-col overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white shadow-sm
              transition-all duration-300
              hover:-translate-y-1
              hover:shadow-xl
            "
          >
            <div
              className="
                relative aspect-[4/3]
                w-full overflow-hidden
                bg-slate-100
              "
            >
              {matrimonio.foto ? (
                <Image
                  src={matrimonio.foto}
                  alt={`Fotografía de ${matrimonio.esposo} y ${matrimonio.esposa}`}
                  fill
                  sizes="
                    (max-width: 640px) 100vw,
                    (max-width: 1280px) 50vw,
                    33vw
                  "
                  className="
                    object-cover object-center
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
                    bg-gradient-to-br
                    from-blue-100
                    via-white
                    to-amber-100
                  "
                >
                  <div
                    className="
                      flex h-24 w-24
                      items-center justify-center
                      rounded-full
                      bg-white/90
                      text-3xl font-black
                      text-slate-700
                      shadow-xl
                      backdrop-blur-sm
                    "
                  >
                    {obtenerIniciales(
                      matrimonio.esposo,
                      matrimonio.esposa,
                    )}
                  </div>
                </div>
              )}

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute inset-0
                  bg-gradient-to-t
                  from-black/55
                  via-transparent
                  to-transparent
                "
              />

              <span
                className="
                  absolute right-3 top-3
                  max-w-[70%] truncate
                  rounded-full
                  bg-white/90
                  px-3 py-1.5
                  text-xs font-bold
                  text-[#3483FA]
                  shadow-sm
                  backdrop-blur-md
                "
              >
                {obtenerMinisterio(
                  matrimonio.ministerio,
                )}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h2 className="line-clamp-1 text-xl font-black text-slate-900">
                {matrimonio.esposo}
              </h2>

              <p className="mt-1 line-clamp-1 text-base font-semibold text-slate-500">
                y {matrimonio.esposa}
              </p>

              <div className="mt-5 space-y-3">
                <Dato
                  icono={
                    <Phone className="h-4 w-4" />
                  }
                  etiqueta="Teléfono"
                  valor={
                    matrimonio.telefono ||
                    "Sin teléfono"
                  }
                />

                <Dato
                  icono={
                    <Mail className="h-4 w-4" />
                  }
                  etiqueta="Correo"
                  valor={
                    matrimonio.email ||
                    "Sin correo"
                  }
                />
              </div>

              {puedeAdministrar ? (
                <div
                  className="
                    mt-auto grid
                    grid-cols-2 gap-3
                    pt-6
                  "
                >
                  <MatrimonioModal
                    matrimonio={matrimonio}
                    trigger={
                      <button
                        type="button"
                        className="
                          inline-flex min-h-11
                          items-center justify-center
                          gap-2 rounded-2xl
                          bg-[#3483FA]
                          px-4 py-3
                          text-sm font-bold
                          text-white shadow-sm
                          transition-all
                          duration-300
                          hover:-translate-y-0.5
                          hover:bg-[#2968C8]
                          hover:shadow-md
                        "
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onEliminar(matrimonio)
                    }
                    disabled={eliminando}
                    className="
                      inline-flex min-h-11
                      items-center justify-center
                      gap-2 rounded-2xl
                      bg-red-500
                      px-4 py-3
                      text-sm font-bold
                      text-white shadow-sm
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:bg-red-600
                      hover:shadow-md
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <Trash2 className="h-4 w-4" />

                    {eliminando
                      ? "Eliminando..."
                      : "Eliminar"}
                  </button>
                </div>
              ) : (
                <div
                  className="
                    mt-auto flex min-h-11
                    items-center justify-center
                    gap-2 rounded-2xl
                    bg-slate-100
                    px-4 py-3
                    pt-3
                    text-sm font-semibold
                    text-slate-500
                  "
                >
                  <LockKeyhole
                    className="h-4 w-4"
                    aria-hidden="true"
                  />

                  Consulta de solo lectura
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: DatoProps) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-xl
          bg-slate-100
          text-slate-500
        "
      >
        {icono}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {etiqueta}
        </p>

        <p
          title={valor}
          className="
            mt-0.5 truncate
            text-sm font-semibold
            text-slate-700
          "
        >
          {valor}
        </p>
      </div>
    </div>
  );
}