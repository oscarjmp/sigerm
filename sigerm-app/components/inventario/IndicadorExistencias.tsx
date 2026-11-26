import {
  ETIQUETA_SITUACION,
  clasificarExistencias,
  normalizarExistencias,
  porcentajeDisponible,
} from "@/lib/inventario/existencias";

type IndicadorExistenciasProps = {
  cantidad: number | null;
  disponibles: number | null;
  activo?: boolean | null;
  /** Unidades en préstamos vigentes reales; si no se conocen, se omite. */
  prestamosReales?: number | null;
};

const CLASE_SITUACION = {
  disponible: "bg-emerald-100 text-emerald-700",
  sin_disponibilidad: "bg-rose-100 text-rose-700",
  agotado: "bg-red-100 text-red-700",
  inactivo: "bg-slate-200 text-slate-600",
} as const;

export default function IndicadorExistencias({
  cantidad,
  disponibles,
  activo,
  prestamosReales,
}: IndicadorExistenciasProps) {
  const articulo = { cantidad, disponibles, activo };
  const n = normalizarExistencias(articulo, prestamosReales);
  const situacion = clasificarExistencias(articulo);
  const porcentaje = porcentajeDisponible(articulo);
  const prestados = n.prestamosReales ?? n.comprometidas;

  const claseBarra =
    porcentaje === 0
      ? "bg-rose-500"
      : porcentaje <= 25
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <section className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Disponibilidad
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {n.disponibles}
            <span className="ml-1 text-sm font-medium text-slate-500">
              de {n.cantidad}
            </span>
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${CLASE_SITUACION[situacion]}`}
        >
          {ETIQUETA_SITUACION[situacion]}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${claseBarra}`}
          style={{
            width: `${porcentaje}%`,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {porcentaje}% disponible
        </span>

        <span>
          {prestados} en préstamos
          {n.porConciliar ? (
            <span className="ml-2 font-semibold text-amber-700">
              · {Math.abs(n.porConciliar)} por conciliar
            </span>
          ) : null}
        </span>
      </div>
    </section>
  );
}
