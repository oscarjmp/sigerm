import MainLayout from "@/components/layout/MainLayout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: encuentros } = await supabase
    .from("encuentros")
    .select("*", { count: "exact", head: true });

  const { count: matrimonios } = await supabase
    .from("matrimonios")
    .select("*", { count: "exact", head: true });

  const { count: servidores } = await supabase
    .from("usuarios")
    .select("*", { count: "exact", head: true });

  const { data: articulos } = await supabase
    .from("articulos")
    .select("*");

  const { data: prestamos } = await supabase
    .from("prestamos")
    .select("*");

  const prestamosActivos =
    prestamos?.filter((p) => p.estado === "Prestado").length ?? 0;

  const prestamosDevueltos =
    prestamos?.filter((p) => p.estado === "Devuelto").length ?? 0;

  const existencias =
    articulos?.reduce(
      (total, articulo) => total + articulo.cantidad,
      0
    ) ?? 0;

  const totalArticulos = articulos?.length ?? 0;

  const totalCategorias = new Set(
    articulos?.map((a) => a.categoria)
  ).size;

  const articulosMalos =
    articulos?.filter((a) => a.estado === "Malo").length ?? 0;

  const articulosConFoto =
    articulos?.filter((a) => a.imagen).length ?? 0;

  return (
    <MainLayout>

      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        Dashboard SIGERM
      </h1>

      {/* Tarjetas principales */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">❤️ Encuentros</p>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-pink-600">
            {encuentros ?? 0}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">👨‍👩‍👧 Matrimonios</p>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-blue-600">
            {matrimonios ?? 0}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">🙋 Servidores</p>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-green-600">
            {servidores ?? 0}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">📦 Inventario</p>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-orange-600">
            {totalArticulos}
          </h2>
        </div>

      </div>

      {/* Tarjetas secundarias */}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-8">

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">📋 Préstamos activos</p>
          <h2 className="text-4xl font-bold mt-3 text-orange-600">
            {prestamosActivos}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">✅ Devueltos</p>
          <h2 className="text-4xl font-bold mt-3 text-green-600">
            {prestamosDevueltos}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">📦 Existencias</p>
          <h2 className="text-4xl font-bold mt-3 text-blue-600">
            {existencias}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">📂 Categorías</p>
          <h2 className="text-4xl font-bold mt-3">
            {totalCategorias}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">📸 Con fotografía</p>
          <h2 className="text-4xl font-bold mt-3">
            {articulosConFoto}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500">⚠ En mal estado</p>
          <h2 className="text-4xl font-bold mt-3 text-red-600">
            {articulosMalos}
          </h2>
        </div>

      </div>

      {/* Bienvenida */}

      <div className="bg-white rounded-xl shadow-lg p-8 mt-8">

        <h2 className="text-2xl font-bold mb-4">
          Bienvenido a SIGERM
        </h2>

        <p className="text-gray-600 leading-8">
          Sistema Integral de Gestión para Encuentros de Renovación Matrimonial.
        </p>

        <p className="text-gray-600 mt-4">
          Desde este panel podrás administrar el inventario, préstamos,
          encuentros, matrimonios, servidores y generar reportes.
        </p>

      </div>

    </MainLayout>
  );
}