import MainLayout from "@/components/layout/MainLayout";
import PrestamoForm from "@/components/prestamos/PrestamoForm";
import TablaPrestamos from "@/components/prestamos/TablaPrestamos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PrestamosPage() {

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Artículos disponibles
  const { data: articulos } = await supabase
    .from("articulos")
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      cantidad
    `)
    .gt("cantidad", 0)
    .order("nombre");

  // Préstamos registrados
const { data: prestamos } = await supabase
  .from("prestamos")
  .select(`
    id,
    folio,
    responsable,
    solicitante,
    fecha_prestamo,
    fecha_devolucion,
    estado,
    observaciones,
    detalle_prestamo (
      id,
      cantidad,
      articulos (
        id,
        codigo,
        nombre
      )
    )
  `)
  .order("created_at", {
    ascending: false,
  });

  return (

    <MainLayout>

      <div className="flex items-center justify-between mb-8">

        <div>

<h1 className="text-4xl font-bold text-slate-800">
  Movimientos de Inventario
</h1>

<p className="text-gray-500 mt-2">
  Registro y control de préstamos y salidas de artículos.
</p>

        </div>

      </div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

  <div className="bg-white rounded-2xl shadow p-5">

    <p className="text-sm text-gray-500">
      Artículos disponibles
    </p>

    <p className="text-3xl font-bold text-[#3483FA]">
      {articulos?.length ?? 0}
    </p>

  </div>
<div className="bg-white rounded-2xl shadow p-5">

  <p className="text-sm text-gray-500">
    Préstamos registrados
  </p>

  <p className="text-3xl font-bold text-emerald-600">
    {prestamos?.length ?? 0}
  </p>

</div>

<div className="bg-white rounded-2xl shadow p-5">

  <p className="text-sm text-gray-500">
    Préstamos pendientes
  </p>

  <p className="text-3xl font-bold text-amber-600">
    {
      prestamos?.filter(
        (p) => p.estado === "PRESTADO"
      ).length ?? 0
    }
  </p>

</div>
</div>
      <PrestamoForm
        articulos={articulos ?? []}
      />

      <div className="mt-10">

   <TablaPrestamos
  prestamos={(prestamos ?? []) as any}
/>

      </div>

    </MainLayout>

  );

}