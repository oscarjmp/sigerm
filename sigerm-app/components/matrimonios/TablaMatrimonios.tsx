"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Grid2X2,
  List,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import MatrimonioModal from "@/components/matrimonios/MatrimonioModal";
import MatrimoniosCards from "@/components/matrimonios/MatrimoniosCards";

import { supabase } from "@/lib/supabase/client";

import type { Matrimonio } from "@/types/matrimonio";

type TablaMatrimoniosProps = {
  matrimonios: Matrimonio[];
  usuarioActualId: string | null;
  esAdministrador: boolean;
};

type VistaMatrimonios = "album" | "tabla";

type FotoMatrimonioProps = {
  matrimonio: Matrimonio;
  variante: "escritorio" | "movil";
};

type FragmentMinisterioProps = {
  ministerio: string;
  lista: Matrimonio[];
  eliminandoId: string | null;
  usuarioActualId: string | null;
  esAdministrador: boolean;
  onEliminar: (
    matrimonio: Matrimonio,
  ) => Promise<void>;
};

type EncabezadoMinisterioProps = {
  ministerio: string;
  cantidad: number;
};

type BadgeMinisterioProps = {
  children: string;
};

type DatoContactoProps = {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
  ajustarTexto?: boolean;
};

function normalizarTexto(
  valor: string | null | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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

function FotoMatrimonio({
  matrimonio,
  variante,
}: FotoMatrimonioProps) {
  const esMovil = variante === "movil";

  if (esMovil) {
    return (
      <div
        className="
          group relative
          aspect-[4/3]
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
              (max-width: 1024px) 50vw,
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

        <div
          className="
            absolute inset-x-4 bottom-4
            rounded-2xl
            bg-white/90
            px-4 py-3
            shadow-lg
            backdrop-blur-md
          "
        >
          <p className="line-clamp-1 text-sm font-black text-slate-900">
            {matrimonio.esposo}
          </p>

          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
            y {matrimonio.esposa}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        group relative
        h-24 w-32 shrink-0
        overflow-hidden
        rounded-2xl
        bg-slate-100
        shadow-sm
        ring-1 ring-slate-200
      "
    >
      {matrimonio.foto ? (
        <Image
          src={matrimonio.foto}
          alt={`Fotografía de ${matrimonio.esposo} y ${matrimonio.esposa}`}
          fill
          sizes="128px"
          className="
            object-cover object-center
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />
      ) : (
        <div
          aria-label="Matrimonio sin fotografía"
          className="
            flex h-full w-full
            items-center justify-center
            bg-gradient-to-br
            from-blue-100
            via-white
            to-amber-100
            text-xl font-black
            text-slate-700
          "
        >
          {obtenerIniciales(
            matrimonio.esposo,
            matrimonio.esposa,
          )}
        </div>
      )}
    </div>
  );
}

export default function TablaMatrimonios({
  matrimonios,
  usuarioActualId,
  esAdministrador,
}: TablaMatrimoniosProps) {
  const router = useRouter();

  const [vista, setVista] =
    useState<VistaMatrimonios>("album");

  const [busqueda, setBusqueda] =
    useState("");

  const [eliminandoId, setEliminandoId] =
    useState<string | null>(null);

  const matrimoniosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    if (!texto) {
      return matrimonios;
    }

    return matrimonios.filter((matrimonio) => {
      const campos = [
        matrimonio.esposo,
        matrimonio.esposa,
        matrimonio.telefono,
        matrimonio.email,
        matrimonio.ministerio,
      ];

      return campos.some((campo) =>
        normalizarTexto(campo).includes(texto),
      );
    });
  }, [busqueda, matrimonios]);

  const matrimoniosAgrupados = useMemo(() => {
    return matrimoniosFiltrados.reduce<
      Record<string, Matrimonio[]>
    >((grupos, matrimonio) => {
      const ministerio = obtenerMinisterio(
        matrimonio.ministerio,
      );

      if (!grupos[ministerio]) {
        grupos[ministerio] = [];
      }

      grupos[ministerio].push(matrimonio);

      return grupos;
    }, {});
  }, [matrimoniosFiltrados]);

  async function eliminarMatrimonio(
    matrimonio: Matrimonio,
  ) {
    const autorizado =
      puedeAdministrarMatrimonio(
        matrimonio,
        usuarioActualId,
        esAdministrador,
      );

    if (!autorizado) {
      window.alert(
        "No cuenta con autorización para eliminar este matrimonio.",
      );
      return;
    }

    const confirmado = window.confirm(
      `¿Desea eliminar el matrimonio "${matrimonio.esposo} y ${matrimonio.esposa}"?`,
    );

    if (!confirmado) {
      return;
    }

    setEliminandoId(matrimonio.id);

    try {
      const { error } = await supabase
        .from("matrimonios")
        .delete()
        .eq("id", matrimonio.id);

      if (error) {
        throw new Error(error.message);
      }

      window.alert(
        "Matrimonio eliminado correctamente.",
      );

      router.refresh();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el matrimonio.";

      window.alert(mensaje);
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <>
      <section
        className="
          mb-6 rounded-3xl
          border border-slate-200
          bg-white p-4
          shadow-sm
          sm:p-5
        "
      >
        <div
          className="
            flex flex-col gap-4
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="buscar-matrimonios"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Buscar matrimonios
            </label>

            <div className="relative">
              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute left-4 top-1/2
                  h-5 w-5
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                id="buscar-matrimonios"
                type="search"
                autoComplete="off"
                placeholder="Buscar por nombre, teléfono, correo o ministerio..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                className="
                  min-h-12 w-full
                  rounded-2xl border
                  border-slate-300
                  bg-slate-50
                  py-3 pl-12 pr-4
                  text-sm text-slate-800
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-[#3483FA]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-100
                "
              />
            </div>
          </div>

          <div
            className="
              inline-flex w-full
              rounded-2xl
              bg-slate-100 p-1
              lg:w-auto
            "
          >
            <button
              type="button"
              onClick={() => setVista("album")}
              aria-pressed={vista === "album"}
              className={`
                inline-flex flex-1
                items-center justify-center
                gap-2 rounded-xl
                px-5 py-2.5
                text-sm font-bold
                transition-all
                lg:flex-none
                ${
                  vista === "album"
                    ? "bg-white text-[#3483FA] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <Grid2X2
                className="h-4 w-4"
                aria-hidden="true"
              />

              Álbum visual
            </button>

            <button
              type="button"
              onClick={() => setVista("tabla")}
              aria-pressed={vista === "tabla"}
              className={`
                inline-flex flex-1
                items-center justify-center
                gap-2 rounded-xl
                px-5 py-2.5
                text-sm font-bold
                transition-all
                lg:flex-none
                ${
                  vista === "tabla"
                    ? "bg-white text-[#3483FA] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <List
                className="h-4 w-4"
                aria-hidden="true"
              />

              Vista tabla
            </button>
          </div>
        </div>

        <div
          className="
            mt-3 flex flex-col
            gap-2 text-sm
            text-slate-500
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p>
            Mostrando{" "}
            <span className="font-bold text-slate-900">
              {matrimoniosFiltrados.length}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-900">
              {matrimonios.length}
            </span>{" "}
            matrimonios
          </p>

          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="
                min-h-11 text-left
                font-semibold text-blue-600
                transition
                hover:text-blue-700
              "
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      </section>

      {vista === "album" && (
        <MatrimoniosCards
          matrimonios={matrimoniosFiltrados}
          eliminandoId={eliminandoId}
          usuarioActualId={usuarioActualId}
          esAdministrador={esAdministrador}
          onEliminar={eliminarMatrimonio}
        />
      )}

      {vista === "tabla" && (
        <>
          <section
            className="
              hidden w-full overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white shadow-sm
              lg:block
            "
          >
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[33%]" />
                <col className="w-[14%]" />
                <col className="w-[21%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </colgroup>

              <thead
                className="
                  bg-gradient-to-r
                  from-slate-50
                  via-white
                  to-blue-50/40
                "
              >
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Matrimonio
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Teléfono
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Correo
                  </th>

                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ministerio
                  </th>

                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(
                  matrimoniosAgrupados,
                ).map(([ministerio, lista]) => (
                  <FragmentMinisterio
                    key={ministerio}
                    ministerio={ministerio}
                    lista={lista}
                    eliminandoId={eliminandoId}
                    usuarioActualId={usuarioActualId}
                    esAdministrador={esAdministrador}
                    onEliminar={eliminarMatrimonio}
                  />
                ))}
              </tbody>
            </table>

            {matrimoniosFiltrados.length ===
              0 && <EstadoVacio />}
          </section>

          <section className="space-y-7 lg:hidden">
            {Object.entries(
              matrimoniosAgrupados,
            ).map(([ministerio, lista]) => (
              <div key={ministerio}>
                <EncabezadoMinisterio
                  ministerio={ministerio}
                  cantidad={lista.length}
                />

                <div
                  className="
                    mt-4 grid
                    grid-cols-1 gap-5
                    md:grid-cols-2
                  "
                >
                  {lista.map((matrimonio) => {
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
                          transition-all
                          duration-300
                          hover:-translate-y-1
                          hover:shadow-xl
                        "
                      >
                        <FotoMatrimonio
                          matrimonio={matrimonio}
                          variante="movil"
                        />

                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                          <div className="space-y-3">
                            <DatoContacto
                              icono={
                                <Phone className="h-4 w-4" />
                              }
                              etiqueta="Teléfono"
                              valor={
                                matrimonio.telefono ||
                                "Sin teléfono"
                              }
                            />

                            <DatoContacto
                              icono={
                                <Mail className="h-4 w-4" />
                              }
                              etiqueta="Correo"
                              valor={
                                matrimonio.email ||
                                "Sin correo"
                              }
                              ajustarTexto
                            />
                          </div>

                          <div className="mt-4">
                            <BadgeMinisterio>
                              {obtenerMinisterio(
                                matrimonio.ministerio,
                              )}
                            </BadgeMinisterio>
                          </div>

                          {puedeAdministrar ? (
                            <div
                              className="
                                mt-auto grid
                                grid-cols-1 gap-3
                                pt-6
                                sm:grid-cols-2
                              "
                            >
                              <MatrimonioModal
                                matrimonio={matrimonio}
                                trigger={
                                  <button
                                    type="button"
                                    className="
                                      inline-flex min-h-12
                                      w-full items-center
                                      justify-center gap-2
                                      rounded-2xl
                                      bg-[#3483FA]
                                      px-5 py-3
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
                                  eliminarMatrimonio(
                                    matrimonio,
                                  )
                                }
                                disabled={eliminando}
                                className="
                                  inline-flex min-h-12
                                  w-full items-center
                                  justify-center gap-2
                                  rounded-2xl
                                  bg-red-500
                                  px-5 py-3
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
                            <SoloLectura />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}

            {matrimoniosFiltrados.length ===
              0 && <EstadoVacio />}
          </section>
        </>
      )}
    </>
  );
}

function FragmentMinisterio({
  ministerio,
  lista,
  eliminandoId,
  usuarioActualId,
  esAdministrador,
  onEliminar,
}: FragmentMinisterioProps) {
  return (
    <>
      <tr className="border-y border-slate-200 bg-slate-50">
        <td colSpan={5} className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="
                  text-xs font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-blue-600
                "
              >
                Ministerio
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-800">
                {ministerio}
              </h2>
            </div>

            <span
              className="
                rounded-full border
                border-slate-200
                bg-white px-3 py-1
                text-sm font-medium
                text-slate-600
                shadow-sm
              "
            >
              {lista.length}{" "}
              {lista.length === 1
                ? "matrimonio"
                : "matrimonios"}
            </span>
          </div>
        </td>
      </tr>

      {lista.map((matrimonio) => {
        const eliminando =
          eliminandoId === matrimonio.id;

        const puedeAdministrar =
          puedeAdministrarMatrimonio(
            matrimonio,
            usuarioActualId,
            esAdministrador,
          );

        return (
          <tr
            key={matrimonio.id}
            className="
              border-b border-slate-200
              transition-all
              duration-300
              hover:bg-blue-50/60
              hover:shadow-[inset_4px_0_0_#3483FA]
            "
          >
            <td className="px-5 py-5 align-middle">
              <div className="flex min-w-0 items-center gap-4">
                <FotoMatrimonio
                  matrimonio={matrimonio}
                  variante="escritorio"
                />

                <div className="min-w-0">
                  <h3
                    className="
                      truncate text-lg
                      font-bold leading-tight
                      text-slate-900
                      xl:text-xl
                    "
                  >
                    {matrimonio.esposo}
                  </h3>

                  <p
                    className="
                      mt-1 truncate
                      text-sm font-semibold
                      text-slate-500
                      xl:text-base
                    "
                  >
                    y {matrimonio.esposa}
                  </p>
                </div>
              </div>
            </td>

            <td className="px-4 py-5 align-middle">
              <DatoContacto
                icono={
                  <Phone className="h-4 w-4" />
                }
                etiqueta="Teléfono"
                valor={
                  matrimonio.telefono ||
                  "Sin teléfono"
                }
              />
            </td>

            <td className="px-4 py-5 align-middle">
              <DatoContacto
                icono={
                  <Mail className="h-4 w-4" />
                }
                etiqueta="Correo"
                valor={
                  matrimonio.email ||
                  "Sin correo"
                }
                ajustarTexto
              />
            </td>

            <td className="px-4 py-5 align-middle">
              <BadgeMinisterio>
                {obtenerMinisterio(
                  matrimonio.ministerio,
                )}
              </BadgeMinisterio>
            </td>

            <td className="px-4 py-5 align-middle">
              {puedeAdministrar ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <MatrimonioModal
                    matrimonio={matrimonio}
                    trigger={
                      <button
                        type="button"
                        className="
                          inline-flex min-h-11
                          items-center
                          justify-center gap-2
                          rounded-2xl
                          bg-[#3483FA]
                          px-3 py-2
                          text-sm font-semibold
                          text-white shadow-sm
                          transition-all
                          duration-300
                          hover:-translate-y-0.5
                          hover:bg-[#2968C8]
                          hover:shadow-md
                        "
                      >
                        <Pencil className="h-4 w-4" />

                        <span className="hidden xl:inline">
                          Editar
                        </span>
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
                      px-3 py-2
                      text-sm font-semibold
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

                    <span className="hidden 2xl:inline">
                      {eliminando
                        ? "Eliminando..."
                        : "Eliminar"}
                    </span>
                  </button>
                </div>
              ) : (
                <SoloLectura compacto />
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function EncabezadoMinisterio({
  ministerio,
  cantidad,
}: EncabezadoMinisterioProps) {
  return (
    <div
      className="
        flex items-center
        justify-between gap-4
        rounded-2xl
        border border-slate-200
        bg-gradient-to-r
        from-slate-50
        via-white
        to-blue-50/40
        px-4 py-4
        shadow-sm
      "
    >
      <div>
        <p
          className="
            text-xs font-semibold
            uppercase
            tracking-[0.16em]
            text-blue-600
          "
        >
          Ministerio
        </p>

        <h2 className="mt-1 font-bold text-slate-800">
          {ministerio}
        </h2>
      </div>

      <span
        className="
          rounded-full
          border border-slate-200
          bg-white px-3 py-1
          text-xs font-semibold
          text-slate-600
          shadow-sm
        "
      >
        {cantidad}
      </span>
    </div>
  );
}

function BadgeMinisterio({
  children,
}: BadgeMinisterioProps) {
  return (
    <span
      className="
        inline-flex max-w-full
        items-center gap-2
        rounded-full
        border border-blue-100
        bg-blue-50
        px-3 py-1.5
        text-xs font-semibold
        text-blue-700
      "
    >
      <Users className="h-3.5 w-3.5 shrink-0" />

      <span className="truncate">
        {children}
      </span>
    </span>
  );
}

function DatoContacto({
  icono,
  etiqueta,
  valor,
  ajustarTexto = false,
}: DatoContactoProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        aria-hidden="true"
        className="
          mt-0.5 flex
          h-8 w-8 shrink-0
          items-center justify-center
          rounded-xl
          bg-slate-100
          text-slate-500
        "
      >
        {icono}
      </span>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {etiqueta}
        </p>

        <p
          title={valor}
          className={`
            mt-0.5 text-sm
            font-medium text-slate-700
            ${
              ajustarTexto
                ? "break-all"
                : "break-words"
            }
          `}
        >
          {valor}
        </p>
      </div>
    </div>
  );
}

function SoloLectura({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  return (
    <div
      className={`
        inline-flex items-center
        justify-center gap-2
        rounded-2xl
        bg-slate-100
        text-slate-500
        ${
          compacto
            ? "px-3 py-2 text-xs"
            : "mt-auto w-full px-4 py-3 text-sm"
        }
      `}
    >
      <LockKeyhole
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />

      <span className="font-semibold">
        Solo lectura
      </span>
    </div>
  );
}

function EstadoVacio() {
  return (
    <div className="p-10 text-center">
      <div
        className="
          mx-auto flex h-16 w-16
          items-center justify-center
          rounded-full bg-slate-100
        "
      >
        <Users className="h-7 w-7 text-slate-400" />
      </div>

      <h2 className="mt-4 text-lg font-bold text-slate-800">
        No se encontraron matrimonios
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Ajusta la búsqueda para consultar otros
        registros.
      </p>
    </div>
  );
}