import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  History,
  PackageSearch,
} from "lucide-react";

import RequirePermission from "@/components/auth/RequirePermission";
import KardexCliente from "@/components/kardex/KardexCliente";
import type { Movimiento } from "@/components/kardex/types";
import MainLayout from "@/components/layout/MainLayout";
import SigermHero from "@/components/ui/SigermHero";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

function normalizarTipo(
  tipo: string | null | undefined,
): string {
  return tipo?.trim().toUpperCase() || "";
}

function obtenerCantidadSegura(
  cantidad: number | null | undefined,
): number {
  if (
    typeof cantidad !== "number" ||
    Number.isNaN(cantidad)
  ) {
    return 0;
  }

  return Math.abs(cantidad);
}

export default async function KardexPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movimientos")
    .select(`
      id,
      articulo_id,
      prestamo_id,
      tipo,
      cantidad,
      fecha,
      usuario,
      observaciones,
      usuario_id,
      existencia_anterior,
      existencia_nueva,
      motivo,
      referencia,
      metadata,
      diferencia,
      articulos!movimientos_articulo_fk (
        codigo,
        nombre,
        categoria,
        imagen,
        cantidad,
        disponibles
      ),
      prestamos!movimientos_prestamo_fk (
        folio
      ),
      usuarios!movimientos_usuario_fk (
        nombre,
        email
      )
    `)
    .order("fecha", {
      ascending: false,
    })
    .limit(500);

  const movimientos =
    (data ?? []) as unknown as Movimiento[];

  const totalMovimientos = movimientos.length;

  const totalEntradas = movimientos.reduce(
    (total, movimiento) => {
      const tipo = normalizarTipo(
        movimiento.tipo,
      );

      if (
        tipo === "ALTA" ||
        tipo === "ENTRADA" ||
        tipo === "DEVOLUCION"
      ) {
        return (
          total +
          obtenerCantidadSegura(
            movimiento.cantidad,
          )
        );
      }

      return total;
    },
    0,
  );

  const totalSalidas = movimientos.reduce(
    (total, movimiento) => {
      const tipo = normalizarTipo(
        movimiento.tipo,
      );

      if (
        tipo === "SALIDA" ||
        tipo === "PRESTAMO" ||
        tipo === "BAJA"
      ) {
        return (
          total +
          obtenerCantidadSegura(
            movimiento.cantidad,
          )
        );
      }

      return total;
    },
    0,
  );

  const totalPrestamos = movimientos.filter(
    (movimiento) =>
      normalizarTipo(movimiento.tipo) ===
      "PRESTAMO",
  ).length;

  return (
    <MainLayout>
      <RequirePermission
        permiso={PERMISOS.VER_KARDEX}
      >
        <div className="space-y-8">
          <SigermHero
            etiqueta="Control de inventario"
            titulo="Kardex de movimientos"
            descripcion="Consulta, filtra y audita las altas, préstamos, devoluciones, salidas y ajustes realizados en el inventario de SIGERM."
            icono={
              <History
                aria-hidden="true"
                className="h-4 w-4"
              />
            }
            mensajeInferior="Trazabilidad completa de los movimientos registrados en Supabase."
            indicadores={
              <div
                className="
                  grid grid-cols-2
                  gap-3 rounded-2xl
                  bg-white/10 p-4
                  backdrop-blur-sm
                  sm:grid-cols-4
                  xl:grid-cols-2
                "
              >
                <IndicadorHero
                  etiqueta="Movimientos"
                  valor={totalMovimientos}
                  icono={
                    <Database className="h-5 w-5" />
                  }
                />

                <IndicadorHero
                  etiqueta="Préstamos"
                  valor={totalPrestamos}
                  icono={
                    <Activity className="h-5 w-5" />
                  }
                />

                <IndicadorHero
                  etiqueta="Entradas"
                  valor={totalEntradas}
                  icono={
                    <ArrowDownToLine className="h-5 w-5" />
                  }
                />

                <IndicadorHero
                  etiqueta="Salidas"
                  valor={totalSalidas}
                  icono={
                    <ArrowUpFromLine className="h-5 w-5" />
                  }
                />
              </div>
            }
          />

          {error ? (
            <section
              role="alert"
              className="
                overflow-hidden
                rounded-3xl
                border border-red-200
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  flex flex-col gap-4
                  bg-gradient-to-r
                  from-red-50
                  via-white
                  to-orange-50
                  p-6
                  sm:flex-row
                  sm:items-start
                "
              >
                <div
                  className="
                    flex h-14 w-14
                    shrink-0 items-center
                    justify-center
                    rounded-2xl
                    bg-red-100
                    text-red-600
                  "
                >
                  <PackageSearch
                    aria-hidden="true"
                    className="h-7 w-7"
                  />
                </div>

                <div>
                  <h2
                    className="
                      text-xl font-black
                      text-red-700
                    "
                  >
                    No fue posible cargar el Kardex
                  </h2>

                  <p
                    className="
                      mt-2 text-sm
                      leading-6 text-red-600
                    "
                  >
                    {error.message}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section
              className="
                overflow-hidden
                rounded-3xl
                border border-slate-200
                bg-white
                shadow-sm
              "
            >
              <header
                className="
                  flex flex-col gap-4
                  border-b border-slate-100
                  bg-gradient-to-r
                  from-slate-50
                  via-white
                  to-blue-50/40
                  px-5 py-5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  sm:px-6
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex h-11 w-11
                      shrink-0 items-center
                      justify-center
                      rounded-2xl
                      bg-blue-50
                      text-[#3483FA]
                      shadow-sm
                    "
                  >
                    <History
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </div>

                  <div>
                    <p
                      className="
                        text-xs font-bold
                        uppercase
                        tracking-[0.16em]
                        text-[#3483FA]
                      "
                    >
                      Auditoría operativa
                    </p>

                    <h2
                      className="
                        mt-2 text-xl
                        font-black
                        tracking-tight
                        text-slate-900
                        sm:text-2xl
                      "
                    >
                      Historial de movimientos
                    </h2>

                    <p
                      className="
                        mt-1 text-sm
                        leading-6
                        text-slate-500
                      "
                    >
                      Filtra y consulta la trazabilidad
                      completa del inventario.
                    </p>
                  </div>
                </div>

                <div
                  className="
                    inline-flex w-fit
                    items-center gap-2
                    rounded-full
                    bg-blue-50
                    px-4 py-2
                    text-sm font-bold
                    text-[#3483FA]
                  "
                >
                  <Database
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  {totalMovimientos.toLocaleString(
                    "es-MX",
                  )}{" "}
                  movimientos cargados
                </div>
              </header>

              <div className="p-4 sm:p-6">
                <KardexCliente
                  movimientos={movimientos}
                />
              </div>
            </section>
          )}
        </div>
      </RequirePermission>
    </MainLayout>
  );
}

type IndicadorHeroProps = {
  etiqueta: string;
  valor: number;
  icono: React.ReactNode;
};

function IndicadorHero({
  etiqueta,
  valor,
  icono,
}: IndicadorHeroProps) {
  return (
    <div
      className="
        rounded-2xl
        bg-white/10 p-3
        text-center
        backdrop-blur-sm
      "
    >
      <div
        className="
          mx-auto flex h-8 w-8
          items-center justify-center
          rounded-xl
          bg-white/10
          text-[#FFD54F]
        "
      >
        {icono}
      </div>

      <p
        className="
          mt-2 text-xl
          font-black text-white
        "
      >
        {valor.toLocaleString("es-MX")}
      </p>

      <p
        className="
          mt-1 text-[11px]
          text-blue-100
        "
      >
        {etiqueta}
      </p>
    </div>
  );
}