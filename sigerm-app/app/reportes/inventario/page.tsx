import Image from "next/image";

import PermissionGuard from "@/components/auth/PermissionGuard";
import BotonImprimir from "@/components/reportes/BotonImprimir";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

type ArticuloReporte = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number | null;
  estado: string | null;
  imagen: string | null;
};

function obtenerCategoria(
  categoria: string | null,
): string {
  const categoriaLimpia = categoria?.trim();

  return categoriaLimpia || "SIN CATEGORÍA";
}

function obtenerCantidad(
  cantidad: number | null,
): number {
  return cantidad ?? 0;
}

function obtenerClaseEstado(
  estado: string | null,
): string {
  switch (estado?.trim().toLowerCase()) {
    case "bueno":
      return "font-semibold text-green-700";

    case "regular":
      return "font-semibold text-yellow-700";

    case "malo":
      return "font-semibold text-red-700";

    default:
      return "font-semibold text-slate-600";
  }
}

export default async function ReporteInventario() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("articulos")
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      cantidad,
      estado,
      imagen
    `)
    .order("categoria", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error al consultar el reporte de inventario:",
      error.message,
    );
  }

  const articulos =
    (data ?? []) as ArticuloReporte[];

  const totalArticulos = articulos.length;

  const totalExistencias = articulos.reduce(
    (total, articulo) =>
      total + obtenerCantidad(articulo.cantidad),
    0,
  );

  const categorias = articulos.reduce<
    Record<string, ArticuloReporte[]>
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

  const categoriasOrdenadas = Object.entries(
    categorias,
  ).sort(([categoriaA], [categoriaB]) =>
    categoriaA.localeCompare(
      categoriaB,
      "es",
      {
        sensitivity: "base",
      },
    ),
  );

  const totalCategorias =
    categoriasOrdenadas.length;

  const fechaActual = new Date();

  const fechaExtendida =
    fechaActual.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const fechaCorta =
    fechaActual.toLocaleDateString("es-MX");

  return (
    <PermissionGuard
      permiso={PERMISOS.VER_REPORTES}
    >
      <div className="min-h-screen bg-white p-4 md:p-10">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              SIGERM
            </h1>

            <p className="mt-2 leading-7 text-gray-600">
              Sistema Integral de Gestión para
              <br className="hidden md:block" />
              Encuentros de Renovación Matrimonial
            </p>
          </div>

          <div className="print:hidden">
            <BotonImprimir />
          </div>
        </div>

        <hr className="mb-8" />

        <h2 className="mb-2 text-2xl font-bold md:text-4xl">
          REPORTE GENERAL DE INVENTARIO
        </h2>

        <p className="mb-8 text-gray-600">
          Fecha: {fechaExtendida}
        </p>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">
            No fue posible consultar completamente el
            inventario: {error.message}
          </div>
        )}

        <div className="mb-10 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Categorías
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-800 md:text-3xl">
              {totalCategorias}
            </h3>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Artículos
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-800 md:text-3xl">
              {totalArticulos}
            </h3>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Existencias
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-800 md:text-3xl">
              {totalExistencias}
            </h3>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Reporte generado
            </p>

            <h3 className="mt-2 text-base font-bold text-slate-800 md:text-lg">
              {fechaCorta}
            </h3>
          </div>
        </div>

        {categoriasOrdenadas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
            No existen artículos para generar el
            reporte.
          </div>
        ) : (
          categoriasOrdenadas.map(
            ([categoria, lista]) => {
              const totalCategoria =
                lista.reduce(
                  (total, articulo) =>
                    total +
                    obtenerCantidad(
                      articulo.cantidad,
                    ),
                  0,
                );

              return (
                <section
                  key={categoria}
                  className="mb-10 print:break-inside-avoid"
                >
                  <div className="rounded-t-xl border border-gray-200 bg-gray-100 px-5 py-4">
                    <h3 className="text-xl font-bold text-gray-800 md:text-2xl">
                      📁 {categoria.toUpperCase()}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {lista.length} artículo(s)
                      {" • "}
                      {totalCategoria} existencia(s)
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="mb-8 w-full min-w-[700px] rounded-b-xl border border-gray-200">
                      <thead className="bg-gray-50 print:table-header-group">
                        <tr>
                          <th className="border p-3 text-center">
                            Foto
                          </th>

                          <th className="border p-3 text-left">
                            Código
                          </th>

                          <th className="border p-3 text-left">
                            Nombre
                          </th>

                          <th className="border p-3 text-center">
                            Cantidad
                          </th>

                          <th className="border p-3 text-center">
                            Estado
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {lista.map((articulo) => (
                          <tr
                            key={articulo.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="border p-3 text-center">
                              {articulo.imagen ? (
                                <Image
                                  src={articulo.imagen}
                                  alt={articulo.nombre}
                                  width={64}
                                  height={64}
                                  className="mx-auto h-12 w-12 rounded-lg border object-cover md:h-16 md:w-16"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Sin imagen
                                </span>
                              )}
                            </td>

                            <td className="border p-3">
                              {articulo.codigo}
                            </td>

                            <td className="border p-3">
                              {articulo.nombre}
                            </td>

                            <td className="border p-3 text-center">
                              {obtenerCantidad(
                                articulo.cantidad,
                              )}
                            </td>

                            <td className="border p-3 text-center">
                              <span
                                className={obtenerClaseEstado(
                                  articulo.estado,
                                )}
                              >
                                {articulo.estado ??
                                  "Sin estado"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr className="bg-gray-50 font-semibold">
                          <td
                            colSpan={3}
                            className="border p-3 text-right"
                          >
                            Total de la categoría
                          </td>

                          <td className="border p-3 text-center">
                            {totalCategoria}
                          </td>

                          <td className="border p-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              );
            },
          )
        )}

        <div className="mt-10 flex justify-end">
          <div className="text-right">
            <h3 className="text-xl font-bold md:text-2xl">
              Total de artículos: {totalArticulos}
            </h3>

            <h3 className="mt-2 text-xl font-bold md:text-2xl">
              Total de existencias:{" "}
              {totalExistencias}
            </h3>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}