import TablaInventario from "@/components/inventario/TablaInventario";
import NuevoArticuloModal from "@/components/inventario/NuevoArticuloModal";
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
      (suma, articulo) => suma + articulo.cantidad,
      0
    ) ?? 0;

  const articulosMalos =
    articulos?.filter(
      (a) => a.estado === "Malo"
    ).length ?? 0;

  return (

    <MainLayout>

      {/* Encabezado */}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 mb-8">

        <h1 className="text-3xl md:text-4xl font-bold">
          Inventario
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">

          <NuevoArticuloModal />

          <a
            href="/reportes/inventario"
            target="_blank"
            className="
              bg-[#3483FA]
              hover:bg-[#2968C8]
              text-white
              font-medium
              text-center
              px-6
              py-3
              rounded-xl
              shadow-md
              hover:shadow-lg
              transition-all
            "
          >
            Reporte Inventario
          </a>

        </div>

      </div>

      {/* Tarjetas */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500 text-sm md:text-base">
            📦 Artículos
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mt-3">
            {totalArticulos}
          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500 text-sm md:text-base">
            📂 Categorías
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mt-3">
            {totalCategorias}
          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500 text-sm md:text-base">
            🧮 Existencias
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mt-3">
            {totalExistencias}
          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500 text-sm md:text-base">
            ⚠ Estado Malo
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-red-600">
            {articulosMalos}
          </h2>

        </div>

      </div>

      {/* Tabla */}

      <div className="overflow-x-auto">

        <TablaInventario
          articulos={articulos ?? []}
        />

      </div>

    </MainLayout>

  );

}