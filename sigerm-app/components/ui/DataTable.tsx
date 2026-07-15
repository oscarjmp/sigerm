"use client";

import React, { useMemo, useState } from "react";

type Columna<T> = {
  key: keyof T | string;
  titulo: string;
  render?: (fila: T) => React.ReactNode;
};

type Props<T> = {
  data: T[];
  columns: Columna<T>[];
  buscarEn?: (keyof T)[];
  mensajeVacio?: string;
  agruparPor?: keyof T;
  tituloGrupo?: (
    valor: any,
    cantidad: number
  ) => React.ReactNode;
};

export default function DataTable<
  T extends Record<string, any>
>({
  data,
  columns,
  buscarEn = [],
  mensajeVacio = "No existen registros.",
  agruparPor,
  tituloGrupo,
}: Props<T>) {

  const [buscar, setBuscar] =
    useState("");

  const [gruposAbiertos, setGruposAbiertos] =
    useState<Record<string, boolean>>({});

  const registros = useMemo(() => {

    if (!buscar.trim()) return data;

    const texto = buscar.toLowerCase();

    return data.filter((fila) =>
      buscarEn.some((campo) =>
        String(fila[campo] ?? "")
          .toLowerCase()
          .includes(texto)
      )
    );

  }, [buscar, data, buscarEn]);

  const grupos = useMemo(() => {

    if (!agruparPor) return null;

    const mapa = new Map<any, T[]>();

    registros.forEach((fila) => {

      const llave =
        fila[agruparPor] ?? "Sin grupo";

      if (!mapa.has(llave)) {

        mapa.set(llave, []);

      }

      mapa.get(llave)!.push(fila);

    });

    return Array.from(mapa.entries());

  }, [registros, agruparPor]);

  function cambiarGrupo(
    grupo: string
  ) {

    setGruposAbiertos((anterior) => ({

      ...anterior,

      [grupo]: !anterior[grupo],

    }));

  }

  function pintarFila(
    fila: T,
    indice: number
  ) {

    return (

      <tr
        key={fila.id ?? indice}
        className="
          border-t
          hover:bg-slate-50
          transition-all
        "
      >

        {columns.map((columna) => (

          <td
            key={String(columna.key)}
            className="px-6 py-4"
          >

            {columna.render
              ? columna.render(fila)
              : String(
                  fila[columna.key] ?? "-"
                )}

          </td>

        ))}

      </tr>

    );

  }

 return (

  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

    {/* Barra superior */}

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 border-b">

      <input
        type="text"
        placeholder="🔍 Buscar..."
        value={buscar}
        onChange={(e) =>
          setBuscar(e.target.value)
        }
        className="
          w-full
          md:w-96
          rounded-xl
          border
          border-gray-300
          px-4
          py-3
          focus:outline-none
          focus:ring-2
          focus:ring-[#3483FA]
        "
      />

      <span className="text-sm text-gray-500">

        {registros.length} registro(s)

      </span>

    </div>

    {/* Tabla */}

    <div className="overflow-x-auto">

      <table className="min-w-full">

        <thead className="bg-gray-100">

          <tr>

            {columns.map((columna) => (

              <th
                key={String(columna.key)}
                className="text-left px-6 py-4"
              >

                {columna.titulo}

              </th>

            ))}

          </tr>

        </thead>

<tbody>

  {registros.length === 0 ? (

    <tr>

      <td
        colSpan={columns.length}
        className="text-center py-16 text-gray-400"
      >

        {mensajeVacio}

      </td>

    </tr>

  ) : grupos ? (

    grupos.map(([grupo, filas]) => {

      const abierto =
        gruposAbiertos[String(grupo)] ?? true;

      return (

        <React.Fragment
          key={String(grupo)}
        >

          <tr
            className="
              bg-slate-100
              cursor-pointer
              hover:bg-slate-200
              transition
            "
            onClick={() =>
              cambiarGrupo(String(grupo))
            }
          >

            <td
              colSpan={columns.length}
              className="px-6 py-4"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <span className="text-lg">

                    {abierto ? "▼" : "▶"}

                  </span>

                  <span className="font-bold text-slate-700">

                    {tituloGrupo
                      ? tituloGrupo(
                          grupo,
                          filas.length
                        )
                      : `${grupo} (${filas.length})`}

                  </span>

                </div>

              </div>

            </td>

          </tr>

          {abierto &&
            filas.map(pintarFila)}

        </React.Fragment>

      );

    })

  ) : (

    registros.map(pintarFila)

  )}

</tbody>
        </table>

      </div>

    </div>

  );

}