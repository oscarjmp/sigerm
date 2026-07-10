import ArticuloForm from "@/components/inventario/ArticuloForm";
import TablaInventario from "@/components/inventario/TablaInventario";
import MainLayout from "@/components/layout/MainLayout";
import { createClient } from "@/lib/supabase/server";

export default async function InventarioPage() {
  const supabase = await createClient();

  const { data: articulos } = await supabase
    .from("articulos")
    .select("*")
    .order("nombre");
const totalArticulos = articulos?.length ?? 0;

const totalCategorias = new Set(
  articulos?.map((a) => a.categoria)
).size;

const totalExistencias =
  articulos?.reduce(
    (suma, a) => suma + a.cantidad,
    0
  ) ?? 0;

const articulosMalos =
  articulos?.filter(
    (a) => a.estado === "Malo"
  ).length ?? 0;

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <div className="flex justify-between items-center mb-8">

  <h1 className="text-3xl font-bold">

    Inventario

  </h1>

  <a
    href="/reportes/inventario"
    target="_blank"
    className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg"
  >

    📄 Reporte Inventario

  </a>

</div>
      </div>

      {/*<ArticuloForm />*/}
<div className="grid grid-cols-4 gap-6 mb-8">

  <div className="bg-white rounded-xl shadow p-6">

    <p className="text-gray-500">
      📦 Artículos
    </p>

    <h2 className="text-4xl font-bold mt-2">
      {totalArticulos}
    </h2>

  </div>

  <div className="bg-white rounded-xl shadow p-6">

    <p className="text-gray-500">
      📂 Categorías
    </p>

    <h2 className="text-4xl font-bold mt-2">
      {totalCategorias}
    </h2>

  </div>

  <div className="bg-white rounded-xl shadow p-6">

    <p className="text-gray-500">
      🧮 Existencias
    </p>

    <h2 className="text-4xl font-bold mt-2">
      {totalExistencias}
    </h2>

  </div>

  <div className="bg-white rounded-xl shadow p-6">

    <p className="text-gray-500">
      ⚠ Estado Malo
    </p>

    <h2 className="text-4xl font-bold text-red-600 mt-2">
      {articulosMalos}
    </h2>

  </div>

</div>
      <TablaInventario
        articulos={articulos ?? []}
      />
    </MainLayout>
  );
}