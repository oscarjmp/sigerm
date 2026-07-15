import MainLayout from "@/components/layout/MainLayout";
import MatrimonioModal from "@/components/matrimonios/MatrimonioModal";
import TablaMatrimonios from "@/components/matrimonios/TablaMatrimonios";
import { createClient } from "@/lib/supabase/server";

export default async function MatrimoniosPage() {

  const supabase = await createClient();

  const { data: matrimonios } = await supabase
    .from("matrimonios")
    .select("*")
    .order("esposo");

  const totalMatrimonios = matrimonios?.length ?? 0;

  const matrimoniosActivos =
    matrimonios?.filter((m) => m.activo).length ?? 0;

  const totalMinisterios = new Set(
    matrimonios?.map((m) => m.ministerio)
  ).size;

  return (

    <MainLayout>

      {/* Encabezado */}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 mb-8">

        <h1 className="text-3xl md:text-4xl font-bold">
          Matrimonios
        </h1>

       <MatrimonioModal />

      </div>

      {/* Tarjetas */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            👫 Matrimonios
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMatrimonios}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            ✅ Activos
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {matrimoniosActivos}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            ❤️ Ministerios
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMinisterios}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            📱 Contactos
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMatrimonios}

          </h2>

        </div>

      </div>

      {/* Tabla */}

      <div className="overflow-x-auto">

        <TablaMatrimonios

          matrimonios={matrimonios ?? []}

        />

      </div>

    </MainLayout>

  );

}