import { redirect } from "next/navigation";
import {
  Package2,
  Search,
  ShoppingBag,
} from "lucide-react";

import PermissionGuard from "@/components/auth/PermissionGuard";
import TarjetaArticulo, {
  type ArticuloCatalogo,
} from "@/components/catalogo/TarjetaArticulo";
import MainLayout from "@/components/layout/MainLayout";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

function obtenerCategoria(
  categoria: string | null,
): string {
  const valor = categoria?.trim();

  return valor || "SIN CATEGORÍA";
}

function obtenerDisponibles(
  disponibles: number | null,
): number {
  return Math.max(disponibles ?? 0, 0);
}

export default async function CatalogoPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("articulos")
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      descripcion,
      cantidad,
      disponibles,
      unidad,
      estado,
      imagen,
      ubicacion,
      activo
    `)
    .eq("activo", true)
    .order("categoria", {
      ascending: true,
      nullsFirst: false,
    })
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error al consultar el catálogo:",
      error.message,
    );
  }

  const articulos = (data ?? []) as ArticuloCatalogo[];

  const totalArticulos = articulos.length;

  const totalDisponibles = articulos.reduce(
    (total, articulo) =>
      total +
      obtenerDisponibles(articulo.disponibles),
    0,
  );

  const categorias = new Set(
    articulos.map((articulo) =>
      obtenerCategoria(articulo.categoria),
    ),
  );

  const totalCategorias = categorias.size;

  return (
    <PermissionGuard
      permiso={PERMISOS.VER_CATALOGO}
    >
      <MainLayout>
        <div className="space-y-8">
          {/* Encabezado principal */}
          <section
            className="
              overflow-hidden rounded-3xl
              bg-gradient-to-r
              from-[#1E3A5F]
              via-[#25517D]
              to-[#3483FA]
              p-5 text-white
              shadow-xl
              sm:p-8
            "
          >
            <div
              className="
                flex flex-col gap-6
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div className="min-w-0">
                <div
                  className="
                    inline-flex items-center
                    gap-2 rounded-full
                    bg-white/15 px-4 py-2
                    text-sm font-semibold
                    backdrop-blur-sm
                  "
                >
                  <ShoppingBag className="h-4 w-4" />

                  <span>Catálogo SIGERM</span>
                </div>

                <h1
                  className="
                    mt-5 text-3xl font-bold
                    tracking-tight
                    sm:text-4xl
                  "
                >
                  Artículos disponibles
                </h1>

                <p
                  className="
                    mt-3 max-w-2xl
                    text-sm leading-7
                    text-blue-100
                    sm:text-base
                  "
                >
                  Explora el inventario disponible para
                  los encuentros y actividades de
                  Renovación Matrimonial.
                </p>
              </div>

              <div
                className="
                  grid w-full grid-cols-3
                  gap-2 rounded-2xl
                  bg-white/10 p-3
                  backdrop-blur-sm
                  sm:gap-3 sm:p-4
                  lg:w-auto
                "
              >
                <IndicadorCatalogo
                  etiqueta="Artículos"
                  valor={totalArticulos}
                />

                <IndicadorCatalogo
                  etiqueta="Categorías"
                  valor={totalCategorias}
                />

                <IndicadorCatalogo
                  etiqueta="Disponibles"
                  valor={totalDisponibles}
                />
              </div>
            </div>
          </section>

          {/* Buscador visual */}
          <section
            className="
              rounded-3xl border
              border-slate-200
              bg-white p-4
              shadow-sm
              sm:p-5
            "
          >
            <div className="relative">
              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute left-4 top-1/2
                  h-5 w-5
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <label
                htmlFor="buscar-catalogo"
                className="sr-only"
              >
                Buscar artículos en el catálogo
              </label>

              <input
                id="buscar-catalogo"
                name="buscar-catalogo"
                type="search"
                autoComplete="off"
                placeholder="Buscar por nombre, código o categoría..."
                className="
                  min-h-12 w-full
                  rounded-2xl border
                  border-slate-300
                  bg-slate-50
                  py-3 pl-12 pr-4
                  text-sm text-slate-900
                  outline-none transition
                  placeholder:text-slate-400
                  focus:border-blue-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-100
                  sm:text-base
                "
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Próximamente este buscador permitirá filtrar
              los artículos en tiempo real.
            </p>
          </section>

          {/* Mensaje de error */}
          {error && (
            <div
              role="alert"
              className="
                rounded-2xl border
                border-red-200
                bg-red-50 p-4
                text-sm text-red-700
              "
            >
              No fue posible consultar completamente el
              catálogo: {error.message}
            </div>
          )}

          {/* Contenido del catálogo */}
          {articulos.length === 0 ? (
            <section
              className="
                rounded-3xl border
                border-slate-200
                bg-white px-5 py-12
                text-center shadow-sm
                sm:p-12
              "
            >
              <Package2
                aria-hidden="true"
                className="
                  mx-auto h-12 w-12
                  text-slate-300
                "
              />

              <h2
                className="
                  mt-4 text-xl font-bold
                  text-slate-700
                "
              >
                No hay artículos disponibles
              </h2>

              <p
                className="
                  mx-auto mt-2 max-w-md
                  text-sm leading-6
                  text-slate-500
                  sm:text-base
                "
              >
                Los artículos activos del inventario
                aparecerán automáticamente en esta sección.
              </p>
            </section>
          ) : (
            <section
              aria-label="Listado de artículos"
              className="
                grid grid-cols-1
                gap-5
                sm:grid-cols-2
                xl:grid-cols-3
                2xl:grid-cols-4
              "
            >
              {articulos.map((articulo) => (
                <TarjetaArticulo
                  key={articulo.id}
                  articulo={articulo}
                />
              ))}
            </section>
          )}
        </div>
      </MainLayout>
    </PermissionGuard>
  );
}

type IndicadorCatalogoProps = {
  etiqueta: string;
  valor: number;
};

function IndicadorCatalogo({
  etiqueta,
  valor,
}: IndicadorCatalogoProps) {
  return (
    <div
      className="
        min-w-0 rounded-xl
        px-1 py-2 text-center
        sm:min-w-20 sm:px-2
      "
    >
      <p
        className="
          truncate text-xl font-bold
          sm:text-3xl
        "
      >
        {valor.toLocaleString("es-MX")}
      </p>

      <p
        className="
          mt-1 truncate
          text-[10px] text-blue-100
          sm:text-xs
        "
      >
        {etiqueta}
      </p>
    </div>
  );
}