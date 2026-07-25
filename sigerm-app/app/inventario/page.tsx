import Link from "next/link";
import {
  Boxes,
  CircleCheckBig,
  FileText,
  Layers3,
  Package2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import Can from "@/components/auth/Can";
import RequirePermission from "@/components/auth/RequirePermission";
import InventarioCliente from "@/components/inventario/InventarioCliente";
import NuevoArticuloModal from "@/components/inventario/NuevoArticuloModal";
import type { ArticuloInventario } from "@/components/inventario/types";
import MainLayout from "@/components/layout/MainLayout";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

function obtenerNumeroSeguro(
  valor: number | null | undefined,
): number {
  return Math.max(valor ?? 0, 0);
}

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
      disponibles,
      estado,
      imagen,
      ubicacion,
      unidad,
      activo
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

  const articulosActivos = articulos.filter(
    (articulo) => articulo.activo !== false,
  );

  const totalArticulos =
    articulosActivos.length;

  const categoriasValidas =
    articulosActivos
      .map((articulo) =>
        articulo.categoria?.trim(),
      )
      .filter(
        (categoria): categoria is string =>
          Boolean(categoria),
      );

  const totalCategorias = new Set(
    categoriasValidas,
  ).size;

  const totalExistencias =
    articulosActivos.reduce(
      (total, articulo) =>
        total +
        obtenerNumeroSeguro(
          articulo.cantidad,
        ),
      0,
    );

  const totalDisponibles =
    articulosActivos.reduce(
      (total, articulo) =>
        total +
        obtenerNumeroSeguro(
          articulo.disponibles,
        ),
      0,
    );

  const articulosMalos =
    articulosActivos.filter(
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
          {/* Encabezado premium */}
          <section
            className="
              relative overflow-hidden
              rounded-3xl
              bg-gradient-to-r
              from-[#1E3A5F]
              via-[#285B91]
              to-[#3483FA]
              p-5 text-white
              shadow-xl
              sm:p-8
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute -right-16 -top-20
                h-52 w-52 rounded-full
                bg-white/10 blur-3xl
              "
            />

            <div
              aria-hidden="true"
              className="
                absolute -bottom-24 left-1/3
                h-48 w-48 rounded-full
                bg-[#FFD54F]/10 blur-3xl
              "
            />

            <div
              className="
                relative flex flex-col
                gap-7
                xl:flex-row
                xl:items-center
                xl:justify-between
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
                  <Package2 className="h-4 w-4" />

                  Inventario SIGERM
                </div>

                <h1
                  className="
                    mt-5 text-3xl font-black
                    tracking-tight
                    sm:text-4xl
                  "
                >
                  Control de inventario
                </h1>

                <p
                  className="
                    mt-3 max-w-2xl
                    text-sm leading-7
                    text-blue-100
                    sm:text-base
                  "
                >
                  Consulta, administra y controla todos
                  los artículos disponibles para los
                  encuentros y actividades de Renovación
                  Matrimonial.
                </p>

                <div
                  className="
                    mt-5 inline-flex
                    items-center gap-2
                    rounded-2xl
                    bg-white/10
                    px-4 py-3
                    text-sm text-blue-50
                    backdrop-blur-sm
                  "
                >
                  <Sparkles className="h-4 w-4 text-[#FFD54F]" />

                  Información actualizada desde Supabase
                </div>
              </div>

              <div
                className="
                  flex w-full flex-col
                  gap-3
                  sm:flex-row
                  xl:w-auto
                  xl:justify-end
                "
              >
                <Can
                  permiso={
                    PERMISOS.CREAR_ARTICULO
                  }
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
                      inline-flex min-h-12
                      w-full items-center
                      justify-center gap-2
                      rounded-2xl
                      border border-white/20
                      bg-white/15
                      px-5 py-3
                      text-sm font-bold
                      text-white
                      shadow-sm
                      backdrop-blur-sm
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:bg-white
                      hover:text-[#1E3A5F]
                      hover:shadow-lg
                      focus-visible:outline-none
                      focus-visible:ring-4
                      focus-visible:ring-white/30
                      sm:w-auto
                    "
                  >
                    <FileText className="h-5 w-5" />

                    Reporte de inventario
                  </Link>
                </Can>
              </div>
            </div>
          </section>

          {/* Mensaje de error */}
          {error && (
            <section
              role="alert"
              className="
                rounded-3xl border
                border-red-200
                bg-red-50 p-5
                text-sm text-red-700
                shadow-sm
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-10 w-10
                    shrink-0 items-center
                    justify-center
                    rounded-2xl
                    bg-red-100
                    text-red-600
                  "
                >
                  <TriangleAlert className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold">
                    No fue posible consultar el
                    inventario
                  </p>

                  <p className="mt-1 leading-6">
                    {error.message}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Indicadores */}
          <section
            aria-label="Resumen del inventario"
            className="
              grid grid-cols-1
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
              xl:gap-6
            "
          >
            <IndicadorInventario
              etiqueta="Artículos"
              valor={totalArticulos}
              detalle="Registros activos"
              icono={
                <Package2 className="h-6 w-6" />
              }
              claseValor="text-[#2968F2]"
              claseIcono="bg-blue-50 text-[#2968F2]"
            />

            <IndicadorInventario
              etiqueta="Categorías"
              valor={totalCategorias}
              detalle="Clasificaciones registradas"
              icono={
                <Layers3 className="h-6 w-6" />
              }
              claseValor="text-violet-600"
              claseIcono="bg-violet-50 text-violet-600"
            />

            <IndicadorInventario
              etiqueta="Disponibles"
              valor={totalDisponibles}
              detalle={`De ${totalExistencias.toLocaleString(
                "es-MX",
              )} existencias`}
              icono={
                <CircleCheckBig className="h-6 w-6" />
              }
              claseValor="text-emerald-600"
              claseIcono="bg-emerald-50 text-emerald-600"
            />

            <IndicadorInventario
              etiqueta="En mal estado"
              valor={articulosMalos}
              detalle="Requieren atención"
              icono={
                <TriangleAlert className="h-6 w-6" />
              }
              claseValor="text-red-600"
              claseIcono="bg-red-50 text-red-600"
            />
          </section>

          {/* Contenido principal */}
          <section
            className="
              overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex flex-col gap-3
                border-b border-slate-100
                bg-gradient-to-r
                from-slate-50
                to-white
                px-5 py-5
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
              "
            >
              <div>
                <div
                  className="
                    flex items-center gap-2
                    text-xs font-bold
                    uppercase
                    tracking-[0.18em]
                    text-[#3483FA]
                  "
                >
                  <Boxes className="h-4 w-4" />

                  Administración
                </div>

                <h2
                  className="
                    mt-2 text-xl font-black
                    text-slate-900
                    sm:text-2xl
                  "
                >
                  Artículos registrados
                </h2>

                <p
                  className="
                    mt-1 text-sm
                    leading-6 text-slate-500
                  "
                >
                  Busca, filtra, consulta y administra
                  el inventario de SIGERM.
                </p>
              </div>

              <div
                className="
                  inline-flex w-fit
                  items-center gap-2
                  rounded-full
                  bg-blue-50
                  px-4 py-2
                  text-sm font-bold
                  text-[#2968F2]
                "
              >
                <Package2 className="h-4 w-4" />

                {totalArticulos.toLocaleString(
                  "es-MX",
                )}{" "}
                artículos
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <InventarioCliente
                articulos={articulos}
              />
            </div>
          </section>
        </div>
      </RequirePermission>
    </MainLayout>
  );
}

type IndicadorInventarioProps = {
  etiqueta: string;
  valor: number;
  detalle: string;
  icono: React.ReactNode;
  claseValor: string;
  claseIcono: string;
};

function IndicadorInventario({
  etiqueta,
  valor,
  detalle,
  icono,
  claseValor,
  claseIcono,
}: IndicadorInventarioProps) {
  return (
    <article
      className="
        group relative
        overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white p-5
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute -right-12 -top-12
          h-28 w-28 rounded-full
          bg-slate-50
          transition-transform
          duration-500
          group-hover:scale-125
        "
      />

      <div
        className="
          relative flex
          items-start justify-between
          gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-sm font-semibold
              text-slate-500
              sm:text-base
            "
          >
            {etiqueta}
          </p>

          <p
            className={`
              mt-3 text-3xl
              font-black tracking-tight
              sm:text-4xl
              ${claseValor}
            `}
          >
            {valor.toLocaleString("es-MX")}
          </p>

          <p
            className="
              mt-2 text-xs
              leading-5 text-slate-500
            "
          >
            {detalle}
          </p>
        </div>

        <div
          className={`
            relative flex
            h-13 w-13
            shrink-0 items-center
            justify-center
            rounded-2xl
            shadow-sm
            transition-transform
            duration-300
            group-hover:rotate-3
            group-hover:scale-105
            ${claseIcono}
          `}
        >
          {icono}
        </div>
      </div>
    </article>
  );
}