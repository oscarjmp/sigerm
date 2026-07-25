type IndicadorExistenciasProps = {
  cantidad: number | null;
  disponibles: number | null;
};

function normalizarNumero(
  valor: number | null,
): number {
  return Math.max(valor ?? 0, 0);
}

export default function IndicadorExistencias({
  cantidad,
  disponibles,
}: IndicadorExistenciasProps) {
  const total = normalizarNumero(cantidad);
  const disponiblesActuales = Math.min(
    normalizarNumero(disponibles),
    total,
  );

  const prestados = Math.max(
    total - disponiblesActuales,
    0,
  );

  const porcentajeDisponible =
    total > 0
      ? Math.round(
          (disponiblesActuales / total) * 100,
        )
      : 0;

  const claseBarra =
    porcentajeDisponible === 0
      ? "bg-rose-500"
      : porcentajeDisponible <= 25
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
            {disponiblesActuales}
            <span className="ml-1 text-sm font-medium text-slate-500">
              de {total}
            </span>
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            disponiblesActuales > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {disponiblesActuales > 0
            ? "Disponible"
            : "Sin existencias"}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${claseBarra}`}
          style={{
            width: `${porcentajeDisponible}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {porcentajeDisponible}% disponible
        </span>

        <span>
          {prestados} prestados
        </span>
      </div>
    </section>
  );
}