"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/hooks/useAuth";
import { PERMISOS } from "@/lib/permissions/permissions";
import { supabase } from "@/lib/supabase/client";
import type { ArticuloInventario } from "@/components/inventario/types";


type Props = {
  articulos: ArticuloInventario[];
};

function obtenerCategoria(categoria: string | null): string {
  const valor = categoria?.trim();

  return valor || "SIN CATEGORÍA";
}

function obtenerCantidad(cantidad: number | null): number {
  return cantidad ?? 0;
}

export default function TablaInventario({
  articulos,
}: Props) {
  const router = useRouter();

  const { puede } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [eliminandoId, setEliminandoId] =
    useState<string | null>(null);

  const puedeEditar = puede(
    PERMISOS.EDITAR_ARTICULO,
  );

  const puedeEliminar = puede(
    PERMISOS.DESACTIVAR_ARTICULO,
  );

  const articulosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return articulos;
    }

    return articulos.filter((articulo) => {
      const codigo =
        articulo.codigo?.toLowerCase() ?? "";

      const nombre =
        articulo.nombre?.toLowerCase() ?? "";

      const categoria = obtenerCategoria(
        articulo.categoria,
      ).toLowerCase();

      return (
        codigo.includes(texto) ||
        nombre.includes(texto) ||
        categoria.includes(texto)
      );
    });
  }, [articulos, busqueda]);

  const articulosAgrupados = useMemo(() => {
    return articulosFiltrados.reduce<
      Record<string, ArticuloInventario[]>
    >((grupos, articulo) => {
      const categoria = obtenerCategoria(
        articulo.categoria,
      );

      if (!grupos[categoria]) {
        grupos[categoria] = [];
      }

      grupos[categoria].push(articulo);

      return grupos;
    }, {});
  }, [articulosFiltrados]);

  async function eliminarArticulo(
    articulo: ArticuloInventario,
  ) {
    if (!puedeEliminar) {
      window.alert(
        "No cuenta con permiso para eliminar artículos.",
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Desea eliminar el artículo "${articulo.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    setEliminandoId(articulo.id);

    try {
      const { error } = await supabase
        .from("articulos")
        .delete()
        .eq("id", articulo.id);

      if (error) {
        throw new Error(error.message);
      }

      window.alert(
        "Artículo eliminado correctamente.",
      );

      router.refresh();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el artículo.";

      window.alert(mensaje);
    } finally {
      setEliminandoId(null);
    }
  }

  function renderEstado(
    estado: string | null,
  ) {
    const estadoNormalizado =
      estado?.trim() || "Sin estado";

    if (estadoNormalizado === "Bueno") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Bueno
        </span>
      );
    }

    if (estadoNormalizado === "Regular") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Regular
        </span>
      );
    }

    if (estadoNormalizado === "Malo") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Malo
        </span>
      );
    }

    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
        {estadoNormalizado}
      </span>
    );
  }

  const existenAcciones =
    puedeEditar || puedeEliminar;

  return (
    <>
      <div className="mb-5">
        <input
          type="search"
          placeholder="🔍 Buscar por código, nombre o categoría..."
          value={busqueda}
          onChange={(event) =>
            setBusqueda(event.target.value)
          }
          className="
            w-full rounded-xl border
            border-slate-300 p-3 shadow-sm
            outline-none transition
            focus:border-blue-500
            focus:ring-4 focus:ring-blue-100
          "
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4">
                  Foto
                </th>

                <th className="p-4 text-left">
                  Código
                </th>

                <th className="p-4 text-left">
                  Nombre
                </th>

                <th className="p-4 text-left">
                  Categoría
                </th>

                <th className="p-4 text-center">
                  Cantidad
                </th>

                <th className="p-4 text-center">
                  Estado
                </th>

                <th className="p-4 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(
                articulosAgrupados,
              ).map(([categoria, lista]) => (
                <React.Fragment key={categoria}>
                  <tr className="border-b border-gray-300 bg-gray-100 text-slate-700">
                    <td
                      colSpan={7}
                      className="p-4 text-base font-bold uppercase tracking-wide md:text-lg"
                    >
                      📂 {categoria}

                      <span className="ml-2 text-xs font-normal text-gray-500 md:text-sm">
                        {lista.length} artículos ·{" "}
                        {lista.reduce(
                          (suma, articulo) =>
                            suma +
                            obtenerCantidad(
                              articulo.cantidad,
                            ),
                          0,
                        )}{" "}
                        existencias
                      </span>
                    </td>
                  </tr>

                  {lista.map((articulo) => (
                    <tr
                      key={articulo.id}
                      className="border-t transition-colors hover:bg-slate-50"
                    >
                      <td className="p-4">
                        {articulo.imagen ? (
                          <Image
                            src={articulo.imagen}
                            alt={articulo.nombre}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 text-center text-xs text-gray-500">
                            Sin foto
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-medium">
                        {articulo.codigo}
                      </td>

                      <td className="p-4 font-medium">
                        {articulo.nombre}
                      </td>

                      <td className="p-4">
                        {obtenerCategoria(
                          articulo.categoria,
                        )}
                      </td>

                      <td className="p-4 text-center font-semibold">
                        {obtenerCantidad(
                          articulo.cantidad,
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {renderEstado(
                          articulo.estado,
                        )}
                      </td>

                      <td className="p-4">
                        {existenAcciones ? (
                          <div className="flex justify-center gap-2">
                            {puedeEditar && (
                              <Link
                                href={`/inventario/editar/${articulo.id}`}
                                className="
                                  rounded-xl bg-[#3483FA]
                                  px-3 py-2 text-sm
                                  font-medium text-white
                                  shadow-sm transition-all
                                  hover:bg-[#2968C8]
                                "
                              >
                                Editar
                              </Link>
                            )}

                            {puedeEliminar && (
                              <button
                                type="button"
                                onClick={() =>
                                  eliminarArticulo(
                                    articulo,
                                  )
                                }
                                disabled={
                                  eliminandoId ===
                                  articulo.id
                                }
                                className="
                                  rounded-xl bg-red-500
                                  px-3 py-2 text-sm
                                  font-medium text-white
                                  shadow-sm transition-all
                                  hover:bg-red-600
                                  disabled:cursor-not-allowed
                                  disabled:bg-red-300
                                "
                              >
                                {eliminandoId ===
                                articulo.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-center text-sm text-slate-400">
                            Solo lectura
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {articulosFiltrados.length ===
                0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-slate-400"
                  >
                    No se encontraron artículos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 space-y-4 md:hidden">
        {Object.entries(
          articulosAgrupados,
        ).map(([categoria, lista]) => (
          <div key={categoria}>
            <div className="mb-3 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700">
              📂 {categoria}
            </div>

            {lista.map((articulo) => (
              <div
                key={articulo.id}
                className="mb-4 rounded-2xl bg-white p-4 shadow-md"
              >
                <div className="flex gap-4">
                  {articulo.imagen ? (
                    <Image
                      src={articulo.imagen}
                      alt={articulo.nombre}
                      width={90}
                      height={90}
                      className="h-[90px] w-[90px] rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-xl bg-gray-200 text-center text-sm text-gray-500">
                      Sin foto
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">
                      {articulo.nombre}
                    </h3>

                    <p className="text-sm text-gray-500">
                      Código: {articulo.codigo}
                    </p>

                    <p className="text-sm">
                      Categoría:{" "}
                      {obtenerCategoria(
                        articulo.categoria,
                      )}
                    </p>

                    <p className="text-sm">
                      Cantidad:{" "}
                      <strong>
                        {obtenerCantidad(
                          articulo.cantidad,
                        )}
                      </strong>
                    </p>

                    <div className="mt-2">
                      {renderEstado(
                        articulo.estado,
                      )}
                    </div>
                  </div>
                </div>

                {existenAcciones && (
                  <div
                    className={`mt-5 grid gap-3 ${
                      puedeEditar &&
                      puedeEliminar
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {puedeEditar && (
                      <Link
                        href={`/inventario/editar/${articulo.id}`}
                        className="rounded-xl bg-blue-500 py-3 text-center font-medium text-white"
                      >
                        Editar
                      </Link>
                    )}

                    {puedeEliminar && (
                      <button
                        type="button"
                        onClick={() =>
                          eliminarArticulo(
                            articulo,
                          )
                        }
                        disabled={
                          eliminandoId ===
                          articulo.id
                        }
                        className="
                          rounded-xl bg-red-500
                          py-3 font-medium text-white
                          disabled:cursor-not-allowed
                          disabled:bg-red-300
                        "
                      >
                        {eliminandoId ===
                        articulo.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    )}
                  </div>
                )}

                {!existenAcciones && (
                  <p className="mt-5 text-center text-sm text-slate-400">
                    Consulta de solo lectura
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}

        {articulosFiltrados.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-slate-400 shadow">
            No se encontraron artículos.
          </div>
        )}
      </div>
    </>
  );
}