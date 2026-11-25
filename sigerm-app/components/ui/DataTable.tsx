"use client";
import React, { useMemo, useState } from "react";
import SearchInput from "./SearchInput";

type Columna<T> = {
  key: keyof T | string;
  titulo: string;
  render?: (fila: T) => React.ReactNode;
};
type Props<T> = {
  data: T[];
  columns: Columna<T>[];
  buscarEn?: (keyof T)[];
  mensajeVacio?: string;
  agruparPor?: keyof T;
  tituloGrupo?: (valor: unknown, cantidad: number) => React.ReactNode;
  titulo?: string;
  mostrarBuscador?: boolean;
};
function normalizar(valor: unknown) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}
export default function DataTable<T extends object>({
  data, columns, buscarEn = [], mensajeVacio = "No existen registros.",
  agruparPor, tituloGrupo, titulo = "Directorio", mostrarBuscador = true,
}: Props<T>) {
  const [buscar, setBuscar] = useState("");
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const registros = useMemo(() => {
    const texto = normalizar(buscar);
    if (!texto) return data;
    return data.filter(fila => {
      const campos = buscarEn.length ? buscarEn : Object.keys(fila) as (keyof T)[];
      return campos.some(campo => normalizar(fila[campo]).includes(texto));
    });
  }, [buscar, buscarEn, data]);
  const grupos = useMemo(() => {
    if (!agruparPor) return null;
    const mapa = new Map<unknown, T[]>();
    for (const fila of registros) {
      const llave = fila[agruparPor] ?? "Sin grupo";
      const filas = mapa.get(llave) ?? [];
      filas.push(fila);
      mapa.set(llave, filas);
    }
    return [...mapa.entries()];
  }, [registros, agruparPor]);
  function pintarFila(fila: T, indice: number) {
    return <tr key={(fila as { id?: string | number }).id ?? indice} className="border-t hover:bg-slate-50">
      {columns.map(columna => <td key={String(columna.key)} className="max-w-xs break-words px-4 py-4 text-sm sm:px-6">
        {columna.render ? columna.render(fila) : String((fila as Record<string, unknown>)[String(columna.key)] ?? "—")}
      </td>)}
    </tr>;
  }
  return <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      {mostrarBuscador && <SearchInput aria-label={"Buscar en " + titulo.toLocaleLowerCase("es")} placeholder="Buscar…" value={buscar} onChange={e => setBuscar(e.target.value)} />}
      <p role="status" aria-live="polite" className="text-sm text-slate-500">{registros.length} registro(s)</p>
    </div>
    <div role="region" aria-label={titulo} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-500">
      <table className="min-w-full">
        <caption className="sr-only">{titulo}</caption>
        <thead className="bg-slate-100"><tr>{columns.map(columna => <th scope="col" key={String(columna.key)} className="px-4 py-4 text-left text-sm sm:px-6">{columna.titulo}</th>)}</tr></thead>
        <tbody>{!registros.length ? <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">{mensajeVacio}</td></tr>
          : grupos ? grupos.map(([grupo, filas], indice) => {
            const llave = typeof grupo + ":" + String(grupo) + ":" + indice;
            const abierto = gruposAbiertos[llave] ?? true;
            return <React.Fragment key={llave}>
              <tr className="border-t bg-slate-100"><td colSpan={columns.length}>
                <button type="button" aria-expanded={abierto} onClick={() => setGruposAbiertos(actual => ({ ...actual, [llave]: !abierto }))}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left font-bold text-slate-700 hover:bg-slate-200 focus-visible:outline-2 sm:px-6">
                  <span aria-hidden="true">{abierto ? "▼" : "▶"}</span>
                  {tituloGrupo ? tituloGrupo(grupo, filas.length) : String(grupo) + " (" + filas.length + ")"}
                </button>
              </td></tr>
              {abierto && filas.map(pintarFila)}
            </React.Fragment>;
          }) : registros.map(pintarFila)}</tbody>
      </table>
    </div>
  </div>;
}
