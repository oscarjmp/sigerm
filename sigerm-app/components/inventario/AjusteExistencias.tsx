'use client';

import { useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase/client";
import { notificar } from "@/lib/notificaciones";
import {
  ajustarInventario,
  nuevaClaveOperacion,
} from "@/lib/inventario/ajusteExistencias";
import {
  ETIQUETA_SITUACION,
  MENSAJE_ERROR_AJUSTE,
  MOTIVOS_AJUSTE,
  clasificarExistencias,
  normalizarExistencias,
  simularAjuste,
  validarAjuste,
} from "@/lib/inventario/existencias";

type Props = {
  articulo: {
    id: string;
    cantidad: number;
    disponibles?: number | null;
    activo?: boolean | null;
  };
  /** Unidades en préstamos PRESTADO pendientes de devolución. */
  prestamosReales: number;
  /** Se invoca tras un ajuste aplicado o un conflicto, para recargar datos. */
  alActualizar?: () => void;
};

function Cifra({ titulo, valor, tono }: { titulo: string; valor: number; tono: string }) {
  return (
    <div className={`rounded-xl p-3 ${tono}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}

/**
 * Ajuste y conciliación de inventario, solo para Administrador (lo exige
 * la base de datos). Registra existencia física; la disponibilidad se
 * recalcula respetando los préstamos reales vigentes.
 */
export default function AjusteExistencias({
  articulo,
  prestamosReales,
  alActualizar,
}: Props) {
  const actual = normalizarExistencias(articulo, prestamosReales);
  const situacion = clasificarExistencias(articulo);

  const [abierto, setAbierto] = useState(false);
  const [nueva, setNueva] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [clave, setClave] = useState(() => nuevaClaveOperacion());

  const existenciaNueva = nueva.trim() === "" ? Number.NaN : Number(nueva);
  const hayValor = nueva.trim() !== "";
  const errores = hayValor
    ? validarAjuste({ actual: articulo, prestamosReales, existenciaNueva, motivo, observaciones })
    : [];
  const vista =
    hayValor && Number.isInteger(existenciaNueva) && existenciaNueva >= 0
      ? simularAjuste(articulo, prestamosReales, existenciaNueva)
      : null;
  const listo = hayValor && errores.length === 0 && !procesando;

  /* Cambiar los datos es otra operación: nueva clave. Reintentar sin cambios reutiliza la clave. */
  function cambiar<T>(setter: (v: T) => void) {
    return (valor: T) => {
      setter(valor);
      setClave(nuevaClaveOperacion());
    };
  }

  function prellenarConciliacion() {
    cambiar(setNueva)(String(actual.cantidad));
    setMotivo("CONTEO_FISICO");
  }

  async function aplicar() {
    if (!listo) return;

    setProcesando(true);

    try {
      const r = await ajustarInventario(supabase, {
        articuloId: articulo.id,
        existenciaEsperada: actual.cantidad,
        disponiblesEsperados: actual.disponibles,
        existenciaNueva,
        motivo,
        observaciones,
        claveOperacion: clave,
      });

      if (r.estado === "aplicado") {
        notificar.exito(
          r.yaAplicado
            ? "Este ajuste ya se había registrado; no se duplicó."
            : `Inventario ajustado: existencia ${r.existenciaAnterior} → ${r.existenciaNueva}, disponibles ${r.disponibles}.`,
        );
        setNueva("");
        setMotivo("");
        setObservaciones("");
        setClave(nuevaClaveOperacion());
        setAbierto(false);
        alActualizar?.();
        return;
      }

      notificar.error(r.mensaje);

      if (r.estado === "conflicto") alActualizar?.();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section
      id="ajuste-inventario"
      aria-label="Ajustar inventario"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Inventario</h3>
          <p className="text-sm text-slate-500">{ETIQUETA_SITUACION[situacion]}</p>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold tracking-wide text-white sm:w-auto"
        >
          {abierto ? "CERRAR" : "AJUSTAR INVENTARIO"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra titulo="Existencia" valor={actual.cantidad} tono="bg-slate-50 text-slate-900" />
        <Cifra titulo="Disponibles" valor={actual.disponibles} tono="bg-emerald-50 text-emerald-800" />
        <Cifra titulo="En préstamos" valor={prestamosReales} tono="bg-blue-50 text-blue-800" />
        <Cifra
          titulo="Por conciliar"
          valor={actual.porConciliar ?? 0}
          tono={(actual.porConciliar ?? 0) !== 0 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-500"}
        />
      </div>

      {(actual.porConciliar ?? 0) !== 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          El registro da por prestadas {actual.comprometidas} unidades, pero solo hay {prestamosReales} en
          préstamos vigentes. Hay {actual.porConciliar} sin préstamo que las justifique.
          {abierto ? null : " Use «AJUSTAR INVENTARIO» para conciliarlas."}
          {abierto && (
            <button
              type="button"
              onClick={prellenarConciliacion}
              className="mt-2 block font-semibold underline"
            >
              Conciliar con la existencia actual ({actual.cantidad})
            </button>
          )}
        </div>
      )}

      {prestamosReales > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          {prestamosReales} unidades están en préstamos vigentes. Su regreso se registra como devolución, no
          como ajuste.{" "}
          <Link href="/prestamos" className="font-semibold text-blue-700 underline">
            Ir a Préstamos
          </Link>
        </p>
      )}

      {abierto && (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Existencia física total
            <input
              type="number"
              inputMode="numeric"
              min={prestamosReales}
              step={1}
              value={nueva}
              onChange={(e) => cambiar(setNueva)(e.target.value)}
              placeholder={String(actual.cantidad)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-lg"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Incluye las unidades prestadas. Puede ser 0. Disponibles = existencia − préstamos vigentes.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Motivo
            <select
              value={motivo}
              onChange={(e) => cambiar(setMotivo)(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option value="">Seleccione…</option>
              {MOTIVOS_AJUSTE.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Observaciones {motivo === "OTRO" ? "(obligatorias)" : "(opcional)"}
            <textarea
              value={observaciones}
              maxLength={500}
              rows={2}
              onChange={(e) => cambiar(setObservaciones)(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>

          {vista && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Existencia: <strong>{vista.existenciaAnterior}</strong> → <strong>{vista.existenciaNueva}</strong> (
                {vista.diferenciaExistencia >= 0 ? "+" : ""}
                {vista.diferenciaExistencia})
              </p>
              <p>
                Disponibles: <strong>{vista.disponiblesAnteriores}</strong> →{" "}
                <strong>{Math.max(vista.disponiblesNuevos, 0)}</strong>
              </p>
            </div>
          )}

          {errores.length > 0 && (
            <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-red-700">
              {errores.map((e) => (
                <li key={e}>{MENSAJE_ERROR_AJUSTE[e]}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={aplicar}
            disabled={!listo}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:bg-slate-300 sm:w-auto"
          >
            {procesando ? "Aplicando..." : "Aplicar ajuste"}
          </button>
        </div>
      )}
    </section>
  );
}
