import { PERMISOS } from "@/lib/permissions/permissions";
import { requerirPermiso } from "@/lib/auth/requerirPermiso";
import ArticuloForm from "@/components/inventario/ArticuloForm";
import MainLayout from "@/components/layout/MainLayout";
import { createClient } from "@/lib/supabase/server";
import { cargarPrestamosReales } from "@/lib/inventario/prestamosReales";
import { notFound } from "next/navigation";

export default async function EditarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requerirPermiso(PERMISOS.EDITAR_ARTICULO, "/inventario/editar");

  const supabase = await createClient();

  const { data: articulo } = await supabase
    .from("articulos")
    .select("*")
    .eq("id", id)
    .single();

  if (!articulo) {
    notFound();
  }

  // Préstamos reales vigentes del artículo (null si no se pudieron consultar).
  const prestamos = await cargarPrestamosReales(supabase, id);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Editar artículo
        </h1>
      </div>

      <ArticuloForm
        articulo={articulo}
        prestamosReales={prestamos ? prestamos.get(id) ?? 0 : null}
      />
    </MainLayout>
  );
}
