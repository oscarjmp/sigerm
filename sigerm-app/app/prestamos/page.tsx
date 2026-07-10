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

  // Inventario disponible
  const { data: articulos } = await supabase
    .from("articulos")
    .select("id,nombre,cantidad")
    .gt("cantidad", 0)
    .order("nombre");

  // Préstamos registrados
 const { data: prestamos } = await supabase
  .from("prestamos")
  .select(`
    id,
    persona,
    cantidad,
    estado,
    observaciones,
    articulo_id,
    articulos!inner(
      nombre,
      cantidad
    )
  `);

  return (

    <MainLayout>

      <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">
          Préstamos de artículos
        </h1>

      </div>

      <PrestamoForm
        articulos={articulos ?? []}
      />

     <TablaPrestamos
  prestamos={(prestamos ?? []) as any}
/>

    </MainLayout>

  );

}