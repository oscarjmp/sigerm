"use client";

import ActividadReciente from "@/components/dashboard/ActividadReciente";
import AlertasInventario from "@/components/dashboard/AlertasInventario";
import GraficaMovimientos from "@/components/dashboard/GraficaMovimientos";
import TarjetasDashboard from "@/components/dashboard/TarjetasDashboard";
import TopArticulos from "@/components/dashboard/TopArticulos";

import type {
  ActividadDashboard,
  AlertaInventario,
  ArticuloMasPrestado,
  MovimientoMensual,
  ResumenDashboard,
} from "@/components/dashboard/types";

type DashboardClienteProps = {
  resumen: ResumenDashboard;
  movimientosMensuales: MovimientoMensual[];
  topArticulos: ArticuloMasPrestado[];
  actividades: ActividadDashboard[];
  alertas: AlertaInventario[];
};

export default function DashboardCliente({
  resumen,
  movimientosMensuales,
  topArticulos,
  actividades,
  alertas,
}: DashboardClienteProps) {
  return (
    <div className="space-y-8">
      <TarjetasDashboard resumen={resumen} />

      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[1.5fr_1fr]">
        <GraficaMovimientos
          datos={movimientosMensuales}
        />

        <TopArticulos
          articulos={topArticulos}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[1.15fr_1fr]">
        <ActividadReciente
          actividades={actividades}
        />

        <AlertasInventario
          alertas={alertas}
        />
      </div>
    </div>
  );
}