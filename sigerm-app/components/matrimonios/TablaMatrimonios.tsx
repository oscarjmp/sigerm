'use client';

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import Can from "@/components/auth/Can";
import { useAuth } from "@/lib/hooks/useAuth";
import { notificar } from "@/lib/notificaciones";
import { PERMISOS } from "@/lib/permissions/permissions";
import { cambiarEstadoMatrimonio } from "@/lib/services/matrimonios";

import MatrimonioModal from "./MatrimonioModal";

import type { MatrimonioVista as Matrimonio } from "@/types/matrimonio";



type Props = {
  matrimonios: Matrimonio[];
};

export default function TablaMatrimonios({
  matrimonios,
}: Props) {

  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");

  const [procesandoId, setProcesandoId] =
    useState<string | null>(null);

  // Mientras se revalida la sesión no se permiten cambios de estado.
  const { cargando } = useAuth();

  const accionesBloqueadas =
    procesandoId !== null || cargando;

  const matrimoniosFiltrados = matrimonios.filter(
    (matrimonio) => {

      const texto = busqueda.toLowerCase();

      return (

        matrimonio.esposo
          .toLowerCase()
          .includes(texto) ||

        matrimonio.esposa
          .toLowerCase()
          .includes(texto) ||

        (matrimonio.telefono ?? "")
          .toLowerCase()
          .includes(texto) ||

        (matrimonio.email ?? "")
          .toLowerCase()
          .includes(texto) ||

(matrimonio.ministerio ?? "")
  .toLowerCase()
  .includes(texto)

      );

    }
  );

  const matrimoniosAgrupados =
    matrimoniosFiltrados.reduce(

      (grupos, matrimonio) => {

        const ministerio =
          matrimonio.ministerio || "SIN MINISTERIO";

        if (!grupos[ministerio]) {

          grupos[ministerio] = [];

        }

        grupos[ministerio].push(matrimonio);

        return grupos;

      },

      {} as Record<string, Matrimonio[]>

    );

  // Desactivación / reactivación lógica. No existe eliminación física.
  async function cambiarEstado(
    matrimonio: Matrimonio,
    activar: boolean
  ) {

    if (accionesBloqueadas) {
      return;
    }

    const nombre =
      `${matrimonio.esposo} y ${matrimonio.esposa}`;

    const mensaje = activar
      ? `¿Desea reactivar a ${nombre}?\n\n` +
        "Volverá a estar disponible en el selector de préstamos."
      : `¿Desea desactivar a ${nombre}?\n\n` +
        "Dejará de aparecer en el selector de préstamos. " +
        "Su información y su historial de préstamos se conservarán.";

    if (!window.confirm(mensaje)) {
      return;
    }

    setProcesandoId(matrimonio.id);

    try {

      const { error } =
        await cambiarEstadoMatrimonio(
          matrimonio.id,
          activar
        );

      if (error) {

        notificar.error(error.message);

        return;

      }

      notificar.exito(
        activar
          ? "Matrimonio reactivado correctamente."
          : "Matrimonio desactivado correctamente."
      );

      router.refresh();

    } finally {

      setProcesandoId(null);

    }

  }

  return (  <>

    {/* Buscador */}

    <div className="mb-5">

      <input
        type="text"
        placeholder="🔍 Buscar por nombre, teléfono, correo o ministerio..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="
          w-full
          rounded-xl
          border
          border-gray-300
          bg-white
          px-4
          py-3
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-[#3483FA]
        "
      />

    </div>

    {/* Vista escritorio */}

    <div className="bg-white rounded-xl shadow overflow-hidden">

      <div className="hidden lg:block overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-slate-50 border-b border-slate-200">

            <tr>

              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium text-slate-500">
                Matrimonio
              </th>

              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium text-slate-500">
                Teléfono
              </th>

              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium text-slate-500">
                Correo
              </th>

              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium text-slate-500">
                Ministerio
              </th>

              <th className="text-center px-5 py-3 text-xs uppercase tracking-wider font-medium text-slate-500">
                Acciones
              </th>

            </tr>

          </thead>

          <tbody>

            {Object.entries(matrimoniosAgrupados).map(

              ([ministerio, lista]) => (

                <React.Fragment key={ministerio}>

                  <tr className="bg-slate-50 border-y border-slate-200">

                    <td
                      colSpan={5}
                      className="px-5 py-4"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="text-xs uppercase tracking-widest text-slate-500">

                            Ministerio

                          </p>

                          <h2 className="text-lg font-medium text-slate-800">

                            {ministerio}

                          </h2>

                        </div>

                        <span
                          className="
                            bg-white
                            border
                            border-slate-200
                            rounded-full
                            px-3
                            py-1
                            text-sm
                            text-slate-600
                          "
                        >

                          {lista.length} matrimonio(s)

                        </span>

                      </div>

                    </td>

                  </tr>

                  {lista.map((matrimonio) => (

                    <tr
                      key={matrimonio.id}
                      className="
                        border-b
                        hover:bg-slate-50
                        transition-colors
                      "
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div
  className="
    w-12
    h-12
    rounded-full
    overflow-hidden
    bg-amber-100
    shrink-0
    border
    border-slate-200
  "
>
  {matrimonio.foto ? (
    <Image
      src={matrimonio.foto}
      alt={`${matrimonio.esposo} y ${matrimonio.esposa}`}
      width={48}
      height={48}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center font-semibold text-slate-700">
      {matrimonio.esposo.charAt(0)}
      {matrimonio.esposa.charAt(0)}
    </div>
  )}
</div>

                          <div className="flex flex-col items-start gap-1">

                            <span
                              className={`text-[15px] font-normal ${
                                matrimonio.activo
                                  ? "text-slate-800"
                                  : "text-slate-500"
                              }`}
                            >

                              {matrimonio.esposo} y {matrimonio.esposa}

                            </span>

                            <EtiquetaEstado activo={matrimonio.activo} />

                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-slate-600">

                        {matrimonio.telefono || "-"}

                      </td>

                      <td className="px-5 py-4 text-slate-600">

                        {matrimonio.email || "-"}

                      </td>

                      <td className="px-5 py-4">

                        <span
                          className="
                            inline-flex
                            items-center
                            rounded-full
                            bg-slate-100
                            border
                            border-slate-200
                            px-3
                            py-1
                            text-xs
                            text-slate-600
                          "
                        >

                          {matrimonio.ministerio}

                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <Can
                          permiso={PERMISOS.EDITAR_MATRIMONIO}
                          conservarDuranteRevalidacion
                          fallback={
                            <span className="block text-center text-sm text-slate-400">
                              —
                            </span>
                          }
                        >

                        <div className="flex justify-center gap-2">

                          <MatrimonioModal

                            matrimonio={matrimonio}
                            trigger={
                              <button
                                type="button"
                                className="
                                  bg-[#3483FA]
                                  hover:bg-[#2968C8]
                                  text-white
                                  font-medium
                                  px-3
                                  py-2
                                  text-sm
                                  rounded-xl
                                  shadow-sm
                                  transition-all
                                  duration-200
                                "
                              >
                                Editar
                              </button>
                            }
                          />

                          <BotonEstado
                            activo={matrimonio.activo}
                            procesando={procesandoId === matrimonio.id}
                            deshabilitado={accionesBloqueadas}
                            onClick={() =>
                              cambiarEstado(
                                matrimonio,
                                !matrimonio.activo
                              )
                            }
                            className="px-3 py-2 shadow-sm"
                          />

                        </div>

                        </Can>

                      </td>

                    </tr>

                  ))}

                </React.Fragment>

              )

            )}

          </tbody>

        </table>

      </div>

    </div>
        {/* Vista móvil */}

    <div className="lg:hidden space-y-4 mt-6">

      {Object.entries(matrimoniosAgrupados).map(

        ([ministerio, lista]) => (

          <div key={ministerio}>

            <div
              className="
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                px-4
                py-3
                mb-3
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">

                  Ministerio

                </p>

                <h3 className="font-medium text-slate-700">

                  {ministerio}

                </h3>

              </div>

              <span
                className="
                  bg-white
                  border
                  border-slate-200
                  rounded-full
                  px-3
                  py-1
                  text-xs
                  text-slate-600
                "
              >

                {lista.length}

              </span>

            </div>

            {lista.map((matrimonio) => (

              <div
                key={matrimonio.id}
                className={`
                  rounded-2xl
                  shadow-md
                  p-5
                  mb-4
                  ${
                    matrimonio.activo
                      ? "bg-white"
                      : "bg-slate-50 border border-slate-200"
                  }
                `}
              >

                <div className="flex gap-4">

                <div
  className="
    w-14
    h-14
    rounded-full
    overflow-hidden
    border
    border-slate-200
    bg-amber-100
    shrink-0
  "
>
  {matrimonio.foto ? (
    <Image
      src={matrimonio.foto}
      alt={`${matrimonio.esposo} y ${matrimonio.esposa}`}
      width={56}
      height={56}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center font-semibold text-slate-700">
      {matrimonio.esposo.charAt(0)}
      {matrimonio.esposa.charAt(0)}
    </div>
  )}
</div>

                  <div className="flex-1">

                    <h3
                      className={`text-base font-medium ${
                        matrimonio.activo
                          ? "text-slate-800"
                          : "text-slate-500"
                      }`}
                    >

                      {matrimonio.esposo} y {matrimonio.esposa}

                    </h3>

                    <div className="mt-1">

                      <EtiquetaEstado activo={matrimonio.activo} />

                    </div>

                    <p className="text-sm text-slate-500 mt-2">

                      📞 {matrimonio.telefono || "-"}

                    </p>

                    <p className="text-sm text-slate-500">

                      ✉ {matrimonio.email || "-"}

                    </p>

                    <div className="mt-3">

                      <span
                        className="
                          inline-flex
                          rounded-full
                          bg-slate-100
                          border
                          border-slate-200
                          px-3
                          py-1
                          text-xs
                          text-slate-600
                        "
                      >

                        {matrimonio.ministerio}

                      </span>

                    </div>

                  </div>

                </div>

                <Can
                  permiso={PERMISOS.EDITAR_MATRIMONIO}
                  conservarDuranteRevalidacion
                >

                <div className="grid grid-cols-2 gap-3 mt-5">

                  <MatrimonioModal
                    matrimonio={matrimonio}
                    trigger={

                      <button
                        type="button"
                        className="
                          bg-[#3483FA]
                          hover:bg-[#2968C8]
                          text-white
                          rounded-xl
                          py-3
                          text-sm
                          font-medium
                          transition-all
                          w-full
                        "
                      >

                        Editar

                      </button>

                    }
                  />

                  <BotonEstado
                    activo={matrimonio.activo}
                    procesando={procesandoId === matrimonio.id}
                    deshabilitado={accionesBloqueadas}
                    onClick={() =>
                      cambiarEstado(
                        matrimonio,
                        !matrimonio.activo
                      )
                    }
                    className="w-full py-3"
                  />

                </div>

                </Can>

              </div>

            ))}

          </div>

        )

      )}

    </div>

  </>

);

}

function EtiquetaEstado({
  activo,
}: {
  activo: boolean;
}) {

  return activo ? (

    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Activo
    </span>

  ) : (

    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      Inactivo
    </span>

  );

}

function BotonEstado({
  activo,
  procesando,
  deshabilitado,
  onClick,
  className = "",
}: {
  activo: boolean;
  procesando: boolean;
  deshabilitado: boolean;
  onClick: () => void;
  className?: string;
}) {

  const etiqueta = procesando
    ? activo
      ? "Desactivando..."
      : "Reactivando..."
    : activo
      ? "Desactivar"
      : "Reactivar";

  return (

    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-busy={procesando}
      className={`
        ${
          activo
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-emerald-600 hover:bg-emerald-700"
        }
        text-white
        font-medium
        text-sm
        rounded-xl
        transition-all
        duration-200
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${className}
      `}
    >
      {etiqueta}
    </button>

  );

}