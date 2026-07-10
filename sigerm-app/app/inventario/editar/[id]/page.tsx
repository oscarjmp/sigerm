import ArticuloForm from "@/components/inventario/ArticuloForm";
import MainLayout from "@/components/layout/MainLayout";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: articulo } = await supabase
    .from("articulos")
    .select("*")
    .eq("id", id)
    .single();

  if (!articulo) {
    notFound();
  }

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Editar artículo
        </h1>
      </div>

      <ArticuloForm articulo={articulo} />
    </MainLayout>
  );
}