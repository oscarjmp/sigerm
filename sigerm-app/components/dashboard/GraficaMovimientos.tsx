"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MovimientoMensual } from "@/components/dashboard/types";

type GraficaMovimientosProps = {
  datos: MovimientoMensual[];
};

export default function GraficaMovimientos({
  datos,
}: GraficaMovimientosProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
          Comportamiento mensual
        </p>

        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Entradas y salidas
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Comparativo de unidades incorporadas y retiradas del inventario.
        </p>
      </div>

      {datos.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl bg-slate-50 px-6 text-center text-sm text-slate-500">
          No hay movimientos suficientes para generar la gráfica.
        </div>
      ) : (
        <div className="h-[340px] w-full sm:h-[380px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={datos}
              margin={{
                top: 12,
                right: 10,
                left: -10,
                bottom: 0,
              }}
              barCategoryGap="22%"
              barGap={6}
            >
              <CartesianGrid
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={{
                  fill: "#64748B",
                }}
                minTickGap={12}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                allowDecimals={false}
                tick={{
                  fill: "#64748B",
                }}
              />

              <Tooltip
                cursor={{
                  fill: "rgba(52, 131, 250, 0.06)",
                }}
                formatter={(valor, nombre) => [
                  Number(valor).toLocaleString(
                    "es-MX",
                  ),
                  String(nombre),
                ]}
                labelFormatter={(etiqueta) =>
                  `Mes: ${etiqueta}`
                }
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  boxShadow:
                    "0 16px 35px rgba(15, 23, 42, 0.14)",
                  padding: "14px 16px",
                }}
                labelStyle={{
                  color: "#0F172A",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
                itemStyle={{
                  fontWeight: 600,
                }}
              />

              <Legend
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{
                  paddingTop: "18px",
                  fontSize: "13px",
                  color: "#475569",
                }}
              />

              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="#00A650"
                radius={[10, 10, 0, 0]}
                maxBarSize={44}
              />

              <Bar
                dataKey="salidas"
                name="Salidas"
                fill="#3483FA"
                radius={[10, 10, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}