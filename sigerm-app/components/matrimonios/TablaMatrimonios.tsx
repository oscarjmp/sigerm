'use client';

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

import MatrimonioModal from "./MatrimonioModal";

import type { Matrimonio } from "@/types/matrimonio";



type Props = {
  matrimonios: Matrimonio[];
};

export default function TablaMatrimonios({
  matrimonios,
}: Props) {

  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");

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

  async function eliminarMatrimonio(
    id: string
  ) {

    if (
      !confirm(
        "¿Desea eliminar este matrimonio?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("matrimonios")
      .delete()
      .eq("id", id);

    if (error) {

      alert(error.message);

      return;

    }

    router.refresh();

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

                          <span className="text-[15px] font-normal text-slate-800">

                            {matrimonio.esposo} y {matrimonio.esposa}

                          </span>

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

                        <div className="flex justify-center gap-2">

                          <MatrimonioModal
                            
                            matrimonio={matrimonio}
                            trigger={
                              <button
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

                          <button
                            onClick={() =>
                              eliminarMatrimonio(matrimonio.id)
                            }
                            className="
                              bg-red-500
                              hover:bg-red-600
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
                            Eliminar
                          </button>

                        </div>

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
                className="
                  bg-white
                  rounded-2xl
                  shadow-md
                  p-5
                  mb-4
                "
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

                    <h3 className="text-base font-medium text-slate-800">

                      {matrimonio.esposo} y {matrimonio.esposa}

                    </h3>

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

                <div className="grid grid-cols-2 gap-3 mt-5">

                  <MatrimonioModal
                    matrimonio={matrimonio}
                    trigger={

                      <button
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

                  <button
                    onClick={() =>
                      eliminarMatrimonio(
                        matrimonio.id
                      )
                    }
                    className="
                      bg-red-500
                      hover:bg-red-600
                      text-white
                      rounded-xl
                      py-3
                      text-sm
                      font-medium
                      transition-all
                    "
                  >

                    Eliminar

                  </button>

                </div>

              </div>

            ))}

          </div>

        )

      )}

    </div>

  </>

);

}