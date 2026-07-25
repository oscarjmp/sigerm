import type { Movimiento } from "@/components/kardex/types";
import {
  formatearFecha,
  formatearNumero,
  normalizarTexto,
  obtenerCategoriaArticulo,
  obtenerCodigoArticulo,
  obtenerDiferencia,
  obtenerNombreArticulo,
  obtenerReferencia,
  obtenerSolicitante,
  obtenerUsuario,
} from "@/components/kardex/utils";

type TablaKardexProps = {
  movimientos: Movimiento[];
  onSeleccionarArticulo: (articuloId: string) => void;
};

function TipoMovimiento({ tipo }: { tipo: string }) {
  const tipoNormalizado = tipo.toUpperCase();

  if (
    tipoNormalizado === "ALTA" ||
    tipoNormalizado === "ENTRADA"
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        {tipoNormalizado}
      </span>
    );
  }

  if (tipoNormalizado === "PRESTAMO") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        PRÉSTAMO
      </span>
    );
  }

  if (tipoNormalizado === "DEVOLUCION") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        DEVOLUCIÓN
      </span>
    );
  }

  if (
    tipoNormalizado === "SALIDA" ||
    tipoNormalizado === "BAJA"
  ) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        {tipoNormalizado}
      </span>
    );
  }

  if (tipoNormalizado === "AJUSTE") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        AJUSTE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      <span className="h-2 w-2 rounded-full bg-slate-500" />
      {tipoNormalizado || "SIN TIPO"}
    </span>
  );
}

function DiferenciaMovimiento({
  diferencia,
}: {
  diferencia: number;
}) {
  const clase =
    diferencia > 0
      ? "font-bold text-emerald-600"
      : diferencia < 0
        ? "font-bold text-rose-600"
        : "font-bold text-slate-500";

  return (
    <span className={clase}>
      {diferencia > 0 ? "+" : ""}
      {new Intl.NumberFormat("es-MX").format(diferencia)}
    </span>
  );
}

export default function TablaKardex({
  movimientos,
  onSeleccionarArticulo,
}: TablaKardexProps) {
  if (movimientos.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          No se encontraron movimientos
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Ajusta los filtros para consultar otros registros del Kardex.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-8 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:block">
        <div className="max-h-[650px] overflow-auto">
          <table className="w-full min-w-[1450px]">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr>
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Fecha
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Tipo
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Artículo
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Categoría
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Anterior
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Movimiento
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nueva
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Referencia
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Solicitante
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Usuario
                </th>
              </tr>
            </thead>

            <tbody>
              {movimientos.map((movimiento) => {
                const diferencia =
                  obtenerDiferencia(movimiento);

                return (
                  <tr
                    key={movimiento.id}
                    className="border-t border-slate-200 transition hover:bg-blue-50/40"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatearFecha(movimiento.fecha)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <TipoMovimiento
                        tipo={movimiento.tipo}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          onSeleccionarArticulo(
                            movimiento.articulo_id,
                          )
                        }
                        className="group text-left"
                      >
                        <span className="block font-semibold text-blue-700 transition group-hover:text-blue-900 group-hover:underline">
                          {obtenerNombreArticulo(
                            movimiento,
                          )}
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          {obtenerCodigoArticulo(
                            movimiento,
                          )}
                        </span>
                      </button>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {obtenerCategoriaArticulo(
                        movimiento,
                      )}
                    </td>

                    <td className="px-4 py-4 text-center font-semibold text-slate-700">
                      {formatearNumero(
                        movimiento.existencia_anterior,
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <DiferenciaMovimiento
                        diferencia={diferencia}
                      />
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-slate-900">
                      {formatearNumero(
                        movimiento.existencia_nueva,
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-blue-600">
                        {obtenerReferencia(
                          movimiento,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {normalizarTexto(
                          movimiento.motivo,
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {obtenerSolicitante(
                        movimiento,
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm font-medium text-slate-700">
                      {obtenerUsuario(movimiento)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-4 xl:hidden">
        {movimientos.map((movimiento) => {
          const diferencia =
            obtenerDiferencia(movimiento);

          return (
            <article
              key={movimiento.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatearFecha(movimiento.fecha)}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onSeleccionarArticulo(
                        movimiento.articulo_id,
                      )
                    }
                    className="group mt-2 text-left"
                  >
                    <span className="block text-lg font-bold text-blue-700 transition group-hover:text-blue-900 group-hover:underline">
                      {obtenerNombreArticulo(
                        movimiento,
                      )}
                    </span>

                    <span className="mt-1 block text-sm text-slate-500">
                      {obtenerCodigoArticulo(
                        movimiento,
                      )}{" "}
                      ·{" "}
                      {obtenerCategoriaArticulo(
                        movimiento,
                      )}
                    </span>
                  </button>
                </div>

                <TipoMovimiento tipo={movimiento.tipo} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">
                    Anterior
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {formatearNumero(
                      movimiento.existencia_anterior,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">
                    Movimiento
                  </p>

                  <p className="mt-1">
                    <DiferenciaMovimiento
                      diferencia={diferencia}
                    />
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">
                    Nueva
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatearNumero(
                      movimiento.existencia_nueva,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Referencia
                  </p>

                  <p className="font-semibold text-blue-600">
                    {obtenerReferencia(movimiento)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Solicitante
                  </p>

                  <p className="font-semibold text-slate-800">
                    {obtenerSolicitante(
                      movimiento,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Motivo
                  </p>

                  <p className="font-semibold text-slate-800">
                    {normalizarTexto(
                      movimiento.motivo,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Usuario
                  </p>

                  <p className="font-semibold text-slate-800">
                    {obtenerUsuario(movimiento)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}