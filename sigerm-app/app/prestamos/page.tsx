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

          <h1 className="text-4xl font-bold">
            Préstamos
          </h1>

          <p className="text-gray-500 mt-2">
            Administración de préstamos de artículos
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