import Link from "next/link";

import Can from "@/components/auth/Can";
import RequirePermission from "@/components/auth/RequirePermission";
import NuevoArticuloModal from "@/components/inventario/NuevoArticuloModal";
import TablaInventario, {
  type ArticuloInventario,
} from "@/components/inventario/TablaInventario";
import MainLayout from "@/components/layout/MainLayout";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function InventarioPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("articulos")
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      cantidad,
      estado,
      imagen
    `)
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error al consultar el inventario:",
      error.message,
    );
  }

  const articulos =
    (data ?? []) as ArticuloInventario[];

  const totalArticulos = articulos.length;

  const categoriasValidas = articulos
    .map((articulo) =>
      articulo.categoria?.trim(),
    )
    .filter(
      (categoria): categoria is string =>
        Boolean(categoria),
    );

  const totalCategorias =
    new Set(categoriasValidas).size;

  const totalExistencias =
    articulos.reduce(
      (total, articulo) =>
        total + (articulo.cantidad ?? 0),
      0,
    );

  const articulosMalos =
    articulos.filter(
      (articulo) =>
        articulo.estado
          ?.trim()
          .toLowerCase() === "malo",
    ).length;

  return (
    <MainLayout>
      <RequirePermission
        permiso={PERMISOS.VER_INVENTARIO}
      >
        <div className="space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                Inventario
              </h1>

              <p className="mt-2 text-slate-500">
                Consulta y administra los artículos disponibles en SIGERM.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Can
                permiso={PERMISOS.CREAR_ARTICULO}
              >
                <NuevoArticuloModal />
              </Can>

              <Can
                permiso={PERMISOS.VER_REPORTES}
              >
                <Link
                  href="/reportes/inventario"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    rounded-xl bg-[#3483FA]
                    px-6 py-3 text-center
                    font-medium text-white
                    shadow-md transition-all
                    hover:bg-[#2968C8]
                    hover:shadow-lg
                  "
                >
                  Reporte Inventario
                </Link>
              </Can>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              No fue posible consultar el inventario:{" "}
              {error.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <p className="text-sm text-gray-500 md:text-base">
                📦 Artículos
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                {totalArticulos}
              </h2>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <p className="text-sm text-gray-500 md:text-base">
                📂 Categorías
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                {totalCategorias}
              </h2>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <p className="text-sm text-gray-500 md:text-base">
                🧮 Existencias
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                {totalExistencias}
              </h2>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <p className="text-sm text-gray-500 md:text-base">
                ⚠ Estado malo
              </p>

              <h2 className="mt-3 text-3xl font-bold text-red-600 md:text-4xl">
                {articulosMalos}
              </h2>
            </div>
          </div>

          <TablaInventario
            articulos={articulos}
          />
        </div>
      </RequirePermission>
    </MainLayout>
  );
}