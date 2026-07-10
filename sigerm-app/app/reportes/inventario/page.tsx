import { createClient } from "@/lib/supabase/server";
import BotonImprimir from "@/components/reportes/BotonImprimir";

export default async function ReporteInventario() {

  const supabase = await createClient();

  const { data: articulos } = await supabase
    .from("articulos")
    .select("*")
    .order("nombre");

  const totalArticulos = articulos?.length ?? 0;

  const totalExistencias =
    articulos?.reduce(
      (total, articulo) => total + articulo.cantidad,
      0
    ) ?? 0;

  return (

    <div className="min-h-screen bg-white p-10">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h1 className="text-4xl font-bold">
            SIGERM
          </h1>

          <p className="text-gray-600">
            Sistema Integral de Gestión para
            Encuentros de Renovación Matrimonial
          </p>

        </div>

        <BotonImprimir />

      </div>

      <hr className="mb-8" />

      <h2 className="text-3xl font-bold mb-2">
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

      <table className="w-full border border-gray-300">

        <thead>

          <tr className="bg-slate-200">

            <th className="border p-3 text-left">
              Código
            </th>

            <th className="border p-3 text-left">
              Nombre
            </th>

            <th className="border p-3 text-left">
              Categoría
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

          {articulos?.map((articulo) => (

            <tr
              key={articulo.id}
              className="hover:bg-slate-50"
            >

              <td className="border p-3">
                {articulo.codigo}
              </td>

              <td className="border p-3">
                {articulo.nombre}
              </td>

              <td className="border p-3">
                {articulo.categoria}
              </td>

              <td className="border p-3 text-center">
                {articulo.cantidad}
              </td>

              <td className="border p-3 text-center">
                {articulo.estado}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

      <div className="flex justify-end mt-10">

        <div className="text-right">

          <h3 className="text-xl font-bold">

            Total de artículos:

            {" "}

            {totalArticulos}

          </h3>

          <h3 className="text-xl font-bold mt-2">

            Total de existencias:

            {" "}

            {totalExistencias}

          </h3>

        </div>

      </div>

    </div>

  );

}