import {
  Activity,
  AlertTriangle,
  Boxes,
  Package2,
  TrendingUp,
} from "lucide-react";

import DashboardCliente from "@/components/dashboard/DashboardCliente";
import type {
  ActividadDashboard,
  AlertaInventario,
  ArticuloMasPrestado,
  MovimientoMensual,
  ResumenDashboard,
} from "@/components/dashboard/types";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";

export type DashboardBuilderProps = {
  resumen: ResumenDashboard;
  movimientosMensuales: MovimientoMensual[];
  topArticulos: ArticuloMasPrestado[];
  actividades: ActividadDashboard[];
  alertas: AlertaInventario[];
};

export function DashboardBuilder({
  resumen,
  movimientosMensuales,
  topArticulos,
  actividades,
  alertas,
}: DashboardBuilderProps) {
  return (
    <div className="space-y-8">
      <section
        aria-label="Indicadores principales"
        className="
          grid grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
          xl:gap-6
        "
      >
        <StatCard
          titulo="Artículos"
          valor={resumen.totalArticulos.toLocaleString(
            "es-MX",
          )}
          descripcion="Registros del inventario"
          color="blue"
          icono={
            <Package2
              aria-hidden="true"
              className="h-6 w-6"
            />
          }
        />

        <StatCard
          titulo="Disponibles"
          valor={resumen.disponibles.toLocaleString(
            "es-MX",
          )}
          descripcion={`De ${resumen.existenciaTotal.toLocaleString(
            "es-MX",
          )} existencias`}
          color="green"
          icono={
            <Boxes
              aria-hidden="true"
              className="h-6 w-6"
            />
          }
        />

        <StatCard
          titulo="Préstamos activos"
          valor={resumen.prestamosActivos.toLocaleString(
            "es-MX",
          )}
          descripcion="Pendientes de devolución"
          color="yellow"
          icono={
            <Activity
              aria-hidden="true"
              className="h-6 w-6"
            />
          }
        />

        <StatCard
          titulo="Sin disponibilidad"
          valor={resumen.articulosSinDisponibilidad.toLocaleString(
            "es-MX",
          )}
          descripcion="Requieren atención"
          color="red"
          icono={
            <AlertTriangle
              aria-hidden="true"
              className="h-6 w-6"
            />
          }
        />
      </section>

      <SectionCard
        titulo="Inteligencia operativa"
        descripcion="Indicadores, gráficas, alertas y actividad reciente del sistema."
        icono={
          <TrendingUp
            aria-hidden="true"
            className="h-5 w-5"
          />
        }
        contenidoClassName="p-0 sm:p-0"
      >
        <DashboardCliente
          resumen={resumen}
          movimientosMensuales={
            movimientosMensuales
          }
          topArticulos={topArticulos}
          actividades={actividades}
          alertas={alertas}
        />
      </SectionCard>
    </div>
  );
}

export default DashboardBuilder;