import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  Database,
} from "lucide-react";

import RequirePermission from "@/components/auth/RequirePermission";
import DashboardBuilder from "@/components/dashboard/DashboardBuilder";
import type {
  ActividadDashboard,
  AlertaInventario,
  ArticuloDashboard,
  ArticuloMasPrestado,
  MovimientoDashboard,
  MovimientoMensual,
  PrestamoDashboard,
  ResumenDashboard,
} from "@/components/dashboard/types";
import MainLayout from "@/components/layout/MainLayout";
import SigermHero from "@/components/ui/SigermHero";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function normalizarTexto(
  valor: string | null | undefined,
): string {
  return valor?.trim() || "";
}

function normalizarEstado(
  valor: string | null | undefined,
): string {
  return normalizarTexto(valor).toUpperCase();
}

function obtenerNumero(
  valor: number | null | undefined,
): number {
  if (
    typeof valor !== "number" ||
    Number.isNaN(valor)
  ) {
    return 0;
  }

  return Math.max(valor, 0);
}

function obtenerDiferencia(
  movimiento: MovimientoDashboard,
): number {
  if (typeof movimiento.diferencia === "number") {
    return movimiento.diferencia;
  }

  const cantidad = Math.abs(
    obtenerNumero(movimiento.cantidad),
  );

  const tipo = normalizarEstado(movimiento.tipo);

  if (
    tipo === "PRESTAMO" ||
    tipo === "SALIDA" ||
    tipo === "BAJA"
  ) {
    return -cantidad;
  }

  if (
    tipo === "DEVOLUCION" ||
    tipo === "ALTA" ||
    tipo === "ENTRADA"
  ) {
    return cantidad;
  }

  return 0;
}

function obtenerNombreArticulo(
  movimiento: MovimientoDashboard,
): string {
  return (
    normalizarTexto(
      movimiento.articulos?.nombre,
    ) ||
    normalizarTexto(
      movimiento.metadata?.nombre_articulo,
    ) ||
    "Artículo sin nombre"
  );
}

function obtenerCodigoArticulo(
  movimiento: MovimientoDashboard,
): string {
  return (
    normalizarTexto(
      movimiento.articulos?.codigo,
    ) ||
    normalizarTexto(
      movimiento.metadata?.codigo_articulo,
    ) ||
    "SIN-CÓDIGO"
  );
}

function obtenerCategoriaArticulo(
  movimiento: MovimientoDashboard,
): string {
  return (
    normalizarTexto(
      movimiento.articulos?.categoria,
    ) ||
    normalizarTexto(
      movimiento.metadata?.categoria_articulo,
    ) ||
    "SIN CATEGORÍA"
  );
}

function obtenerUsuarioMovimiento(
  movimiento: MovimientoDashboard,
): string {
  return (
    normalizarTexto(movimiento.usuario) ||
    normalizarTexto(
      movimiento.metadata?.responsable,
    ) ||
    "Sin información"
  );
}

function obtenerSolicitanteMovimiento(
  movimiento: MovimientoDashboard,
): string {
  return (
    normalizarTexto(
      movimiento.metadata?.solicitante,
    ) || "Sin información"
  );
}

function crearClaveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function construirMovimientosMensuales(
  movimientos: MovimientoDashboard[],
): MovimientoMensual[] {
  const hoy = new Date();

  const meses = Array.from(
    { length: 12 },
    (_, indice) => {
      const fecha = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - (11 - indice),
        1,
      );

      return {
        clave: crearClaveMes(fecha),
        mes: `${MESES_CORTOS[fecha.getMonth()]} ${String(
          fecha.getFullYear(),
        ).slice(-2)}`,
        entradas: 0,
        salidas: 0,
      };
    },
  );

  const porMes = new Map(
    meses.map((mes) => [mes.clave, mes]),
  );

  movimientos.forEach((movimiento) => {
    const fecha = new Date(movimiento.fecha);

    if (Number.isNaN(fecha.getTime())) {
      return;
    }

    const registroMes = porMes.get(
      crearClaveMes(fecha),
    );

    if (!registroMes) {
      return;
    }

    const diferencia =
      obtenerDiferencia(movimiento);

    if (diferencia > 0) {
      registroMes.entradas += diferencia;
    }

    if (diferencia < 0) {
      registroMes.salidas += Math.abs(
        diferencia,
      );
    }
  });

  return meses.map(
    ({ mes, entradas, salidas }) => ({
      mes,
      entradas,
      salidas,
    }),
  );
}

function construirTopArticulos(
  movimientos: MovimientoDashboard[],
): ArticuloMasPrestado[] {
  const agrupados = new Map<
    string,
    ArticuloMasPrestado
  >();

  movimientos.forEach((movimiento) => {
    if (
      normalizarEstado(movimiento.tipo) !==
      "PRESTAMO"
    ) {
      return;
    }

    const articuloId = movimiento.articulo_id;

    if (!articuloId) {
      return;
    }

    const unidades = Math.abs(
      obtenerDiferencia(movimiento) ||
        obtenerNumero(movimiento.cantidad),
    );

    const actual = agrupados.get(articuloId);

    if (actual) {
      actual.unidadesPrestadas += unidades;
      actual.movimientos += 1;
      return;
    }

    agrupados.set(articuloId, {
      articuloId,
      codigo:
        obtenerCodigoArticulo(movimiento),
      nombre:
        obtenerNombreArticulo(movimiento),
      categoria:
        obtenerCategoriaArticulo(movimiento),
      imagen:
        movimiento.articulos?.imagen ?? null,
      unidadesPrestadas: unidades,
      movimientos: 1,
    });
  });

  return Array.from(agrupados.values())
    .sort(
      (a, b) =>
        b.unidadesPrestadas -
          a.unidadesPrestadas ||
        b.movimientos - a.movimientos,
    )
    .slice(0, 5);
}

function construirActividadReciente(
  movimientos: MovimientoDashboard[],
): ActividadDashboard[] {
  return movimientos.slice(0, 8).map(
    (movimiento) => ({
      id: movimiento.id,
      articuloId: movimiento.articulo_id,
      tipo: movimiento.tipo,
      articulo:
        obtenerNombreArticulo(movimiento),
      codigo:
        obtenerCodigoArticulo(movimiento),
      referencia:
        normalizarTexto(
          movimiento.referencia,
        ) || "Sin referencia",
      usuario:
        obtenerUsuarioMovimiento(movimiento),
      solicitante:
        obtenerSolicitanteMovimiento(
          movimiento,
        ),
      diferencia:
        obtenerDiferencia(movimiento),
      fecha: movimiento.fecha,
    }),
  );
}

function determinarNivelAlerta(
  cantidad: number,
  disponibles: number,
): AlertaInventario["nivel"] | null {
  if (disponibles <= 0) {
    return "agotado";
  }

  const porcentaje =
    cantidad > 0
      ? disponibles / cantidad
      : disponibles > 0
        ? 1
        : 0;

  if (
    disponibles <= 2 ||
    porcentaje <= 0.1
  ) {
    return "critico";
  }

  if (
    disponibles <= 5 ||
    porcentaje <= 0.25
  ) {
    return "bajo";
  }

  return null;
}

function construirAlertas(
  articulos: ArticuloDashboard[],
): AlertaInventario[] {
  return articulos
    .map((articulo) => {
      const cantidad = obtenerNumero(
        articulo.cantidad,
      );

      const disponibles = Math.min(
        obtenerNumero(
          articulo.disponibles,
        ),
        cantidad,
      );

      const nivel = determinarNivelAlerta(
        cantidad,
        disponibles,
      );

      if (!nivel) {
        return null;
      }

      return {
        id: articulo.id,
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        categoria:
          normalizarTexto(
            articulo.categoria,
          ) || "SIN CATEGORÍA",
        cantidad,
        disponibles,
        imagen: articulo.imagen,
        nivel,
      } satisfies AlertaInventario;
    })
    .filter(
      (
        alerta,
      ): alerta is AlertaInventario =>
        alerta !== null,
    )
    .sort((a, b) => {
      const prioridad = {
        agotado: 0,
        critico: 1,
        bajo: 2,
      };

      return (
        prioridad[a.nivel] -
          prioridad[b.nivel] ||
        a.disponibles - b.disponibles
      );
    })
    .slice(0, 8);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/login");
  }

  const [
    articulosResultado,
    prestamosResultado,
    movimientosResultado,
  ] = await Promise.all([
    supabase
      .from("articulos")
      .select(`
        id,
        codigo,
        nombre,
        categoria,
        cantidad,
        disponibles,
        estado,
        imagen
      `)
      .order("nombre", {
        ascending: true,
      }),

    supabase
      .from("prestamos")
      .select(`
        id,
        folio,
        estado,
        solicitante,
        responsable,
        fecha_prestamo,
        fecha_devolucion
      `)
      .order("fecha_prestamo", {
        ascending: false,
      }),

    supabase
      .from("movimientos")
      .select(`
        id,
        articulo_id,
        tipo,
        cantidad,
        diferencia,
        fecha,
        referencia,
        usuario,
        motivo,
        metadata,
        articulos!movimientos_articulo_fk (
          codigo,
          nombre,
          categoria,
          imagen
        )
      `)
      .order("fecha", {
        ascending: false,
      })
      .limit(2000),
  ]);

  const errores = [
    articulosResultado.error
      ? `Inventario: ${articulosResultado.error.message}`
      : null,
    prestamosResultado.error
      ? `Préstamos: ${prestamosResultado.error.message}`
      : null,
    movimientosResultado.error
      ? `Kardex: ${movimientosResultado.error.message}`
      : null,
  ].filter(
    (mensaje): mensaje is string =>
      mensaje !== null,
  );

  const articulos =
    (articulosResultado.data ??
      []) as ArticuloDashboard[];

  const prestamos =
    (prestamosResultado.data ??
      []) as PrestamoDashboard[];

  const movimientos =
    (movimientosResultado.data ??
      []) as unknown as MovimientoDashboard[];

  const categorias = new Set(
    articulos
      .map((articulo) =>
        normalizarTexto(
          articulo.categoria,
        ),
      )
      .filter(Boolean),
  );

  const existenciaTotal =
    articulos.reduce(
      (total, articulo) =>
        total +
        obtenerNumero(
          articulo.cantidad,
        ),
      0,
    );

  const disponibles = articulos.reduce(
    (total, articulo) =>
      total +
      Math.min(
        obtenerNumero(
          articulo.disponibles,
        ),
        obtenerNumero(
          articulo.cantidad,
        ),
      ),
    0,
  );

  const prestadosActualmente = Math.max(
    existenciaTotal - disponibles,
    0,
  );

  const prestamosActivos =
    prestamos.filter(
      (prestamo) =>
        normalizarEstado(
          prestamo.estado,
        ) === "PRESTADO",
    ).length;

  const prestamosDevueltos =
    prestamos.filter(
      (prestamo) =>
        normalizarEstado(
          prestamo.estado,
        ) === "DEVUELTO",
    ).length;

  const articulosMalEstado =
    articulos.filter(
      (articulo) =>
        normalizarEstado(
          articulo.estado,
        ) === "MALO",
    ).length;

  const articulosSinDisponibilidad =
    articulos.filter(
      (articulo) =>
        obtenerNumero(
          articulo.disponibles,
        ) <= 0,
    ).length;

  const resumen: ResumenDashboard = {
    totalArticulos: articulos.length,
    totalCategorias: categorias.size,
    existenciaTotal,
    disponibles,
    prestadosActualmente,
    prestamosActivos,
    prestamosDevueltos,
    articulosMalEstado,
    articulosSinDisponibilidad,
    movimientosRegistrados:
      movimientos.length,
  };

  const movimientosMensuales =
    construirMovimientosMensuales(
      movimientos,
    );

  const topArticulos =
    construirTopArticulos(movimientos);

  const actividades =
    construirActividadReciente(
      movimientos,
    );

  const alertas =
    construirAlertas(articulos);

  return (
    <MainLayout>
      <RequirePermission
        permiso={PERMISOS.VER_DASHBOARD}
      >
        <div className="space-y-8">
          <SigermHero
            etiqueta="Centro de inteligencia"
            titulo="Dashboard Ejecutivo SIGERM"
            descripcion="Consulta indicadores, movimientos, alertas y rotación del inventario en tiempo real desde Supabase."
            icono={
              <BarChart3
                className="h-4 w-4"
                aria-hidden="true"
              />
            }
            mensajeInferior="Información operativa actualizada automáticamente."
            indicadores={
              <div
                className="
                  grid grid-cols-2
                  gap-3 rounded-2xl
                  bg-white/10 p-4
                  backdrop-blur-sm
                "
              >
                <div
                  className="
                    rounded-2xl
                    bg-white/10 p-4
                    text-center
                  "
                >
                  <Database
                    className="
                      mx-auto h-6 w-6
                      text-[#FFD54F]
                    "
                    aria-hidden="true"
                  />

                  <p className="mt-2 text-2xl font-black">
                    {movimientos.length.toLocaleString(
                      "es-MX",
                    )}
                  </p>

                  <p className="mt-1 text-xs text-blue-100">
                    Movimientos
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-white/10 p-4
                    text-center
                  "
                >
                  <Activity
                    className="
                      mx-auto h-6 w-6
                      text-[#FFD54F]
                    "
                    aria-hidden="true"
                  />

                  <p className="mt-2 text-sm font-bold">
                    Operación activa
                  </p>

                  <p className="mt-1 text-xs text-blue-100">
                    Datos en tiempo real
                  </p>
                </div>
              </div>
            }
          />

          {errores.length > 0 && (
            <section
              role="alert"
              className="
                rounded-3xl border
                border-amber-200
                bg-amber-50 p-5
                shadow-sm
              "
            >
              <h2 className="font-bold text-amber-800">
                Algunas fuentes no pudieron consultarse
              </h2>

              <ul className="mt-3 space-y-1 text-sm text-amber-700">
                {errores.map((mensaje) => (
                  <li key={mensaje}>
                    • {mensaje}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DashboardBuilder
            resumen={resumen}
            movimientosMensuales={
              movimientosMensuales
            }
            topArticulos={topArticulos}
            actividades={actividades}
            alertas={alertas}
          />
        </div>
      </RequirePermission>
    </MainLayout>
  );
}