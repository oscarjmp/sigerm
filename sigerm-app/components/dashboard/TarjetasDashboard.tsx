"use client";

import {
  Package,
  Boxes,
  Archive,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import type { ResumenDashboard } from "./types";

type Props = {
  resumen: ResumenDashboard;
};

const tarjetas = [
  {
    key: "totalArticulos",
    titulo: "Artículos",
    color: "text-blue-600",
    icono: Package,
  },
  {
    key: "totalCategorias",
    titulo: "Categorías",
    color: "text-violet-600",
    icono: Boxes,
  },
  {
    key: "disponibles",
    titulo: "Disponibles",
    color: "text-green-600",
    icono: CheckCircle2,
  },
  {
    key: "prestamosActivos",
    titulo: "Préstamos activos",
    color: "text-amber-600",
    icono: ClipboardList,
  },
  {
    key: "existenciaTotal",
    titulo: "Existencia total",
    color: "text-cyan-600",
    icono: Archive,
  },
  {
    key: "articulosSinDisponibilidad",
    titulo: "Sin existencias",
    color: "text-red-600",
    icono: AlertTriangle,
  },
] as const;

export default function TarjetasDashboard({
  resumen,
}: Props) {
  return (
    <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {tarjetas.map((tarjeta) => {
        const Icono = tarjeta.icono;

        const valor =
          resumen[
            tarjeta.key as keyof ResumenDashboard
          ] as number;

        return (
          <article
            key={tarjeta.key}
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {tarjeta.titulo}
                </p>

                <h2
                  className={`mt-3 text-4xl font-bold ${tarjeta.color}`}
                >
                  {valor.toLocaleString("es-MX")}
                </h2>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4">
                <Icono
                  size={30}
                  className={tarjeta.color}
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}