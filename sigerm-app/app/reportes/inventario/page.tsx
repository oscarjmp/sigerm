import { createClient } from "@/lib/supabase/server";
import BotonImprimir from "@/components/reportes/BotonImprimir";

export default async function ReporteInventario() {
  const supabase = await createClient();

  const { data: articulos } = await supabase
    .from("articulos")
    .select("*")
    .order("categoria")
    .order("nombre");

  const totalArticulos = articulos?.length ?? 0;

  const totalExistencias =
    articulos?.reduce(
      (total, articulo) => total + articulo.cantidad,
      0
    ) ?? 0;

  const categorias: Record<string, any[]> = {};

  (articulos ?? []).forEach((articulo) => {
    if (!categorias[articulo.categoria]) {
      categorias[articulo.categoria] = [];
    }

    categorias[articulo.categoria].push(articulo);
  });

  const totalCategorias = Object.keys(categorias).length;

  return (
    <div className="min-h-screen bg-white p-4 md:p-10">

      {/* Encabezado */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">

        <div>

          <h1 className="text-3xl md:text-4xl font-bold">
            SIGERM
          </h1>

          <p className="text-gray-600 mt-2 leading-7">
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

      <h2 className="text-2xl md:text-4xl font-bold mb-2">
        REPORTE GENERAL DE INVENTARIO
      </h2>

      <p className="text-gray-600 mb-8">

        Fecha:

        {" "}

        {new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}

      </p>

      {/* Tarjetas */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Categorías
          </p>

          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">
            {totalCategorias}
          </h3>

        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Artículos
          </p>

          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">
            {totalArticulos}
          </h3>

        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Existencias
          </p>

          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">
            {totalExistencias}
          </h3>

        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Reporte generado
          </p>

          <h3 className="text-base md:text-lg font-bold text-slate-800 mt-2">
            {new Date().toLocaleDateString("es-MX")}
          </h3>

        </div>

      </div>

      {Object.entries(categorias)
        .sort(([a], [b]) => a.localeCompare(b, "es"))
        .map(([categoria, lista]) => {

          const totalCategoria = lista.reduce(
            (total, articulo) => total + articulo.cantidad,
            0
          );

          return (

            <div
              key={categoria}
              className="mb-10 print:break-inside-avoid"
            >

              <div className="bg-gray-100 border border-gray-200 px-5 py-4 rounded-t-xl">

                <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                  📁 {categoria.toUpperCase()}
                </h3>

                <p className="text-sm text-gray-500 mt-1">

                  {lista.length} artículo(s)

                  {" • "}

                  {totalCategoria} existencia(s)

                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="min-w-[700px] w-full border border-gray-200 rounded-b-xl mb-8">

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

                            <img
                              src={articulo.imagen}
                              alt={articulo.nombre}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg mx-auto border"
                            />

                          ) : (

                            <span className="text-gray-400 text-sm">
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
                          {articulo.cantidad}
                        </td>

                        <td className="border p-3 text-center">

                          <span
                            className={
                              articulo.estado === "Bueno"
                                ? "text-green-700 font-semibold"
                                : articulo.estado === "Regular"
                                ? "text-yellow-700 font-semibold"
                                : "text-red-700 font-semibold"
                            }
                          >
                            {articulo.estado}
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
                        Totales de la categoría
                      </td>

                      <td className="border p-3 text-center">
                        {totalCategoria}
                      </td>

                      <td className="border p-3"></td>

                    </tr>

                  </tfoot>

                </table>

              </div>

            </div>

          );

        })}

      <div className="flex justify-end mt-10">

        <div className="text-right">

          <h3 className="text-xl md:text-2xl font-bold">

            Total de artículos: {totalArticulos}

          </h3>

          <h3 className="text-xl md:text-2xl font-bold mt-2">

            Total de existencias: {totalExistencias}

          </h3>

        </div>

      </div>

    </div>

  );

}