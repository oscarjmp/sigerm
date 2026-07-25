"use client";

import type {
  FiltrosKardex,
  OpcionesFiltrosKardex,
} from "@/components/kardex/types";

type BarraFiltrosProps = {
  filtros: FiltrosKardex;
  opciones: OpcionesFiltrosKardex;
  onChange: (
    campo: keyof FiltrosKardex,
    valor: string,
  ) => void;
  onLimpiar: () => void;
};

export default function BarraFiltros({
  filtros,
  opciones,
  onChange,
  onLimpiar,
}: BarraFiltrosProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label
            htmlFor="busqueda-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Buscar
          </label>

          <input
            id="busqueda-kardex"
            type="search"
            value={filtros.busqueda}
            onChange={(event) =>
              onChange("busqueda", event.target.value)
            }
            placeholder="Artículo, código, folio, solicitante..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="tipo-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tipo
          </label>

          <select
            id="tipo-kardex"
            value={filtros.tipo}
            onChange={(event) =>
              onChange("tipo", event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos</option>

            {opciones.tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="categoria-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Categoría
          </label>

          <select
            id="categoria-kardex"
            value={filtros.categoria}
            onChange={(event) =>
              onChange("categoria", event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas</option>

            {opciones.categorias.map((categoria) => (
              <option
                key={categoria}
                value={categoria}
              >
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="usuario-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Usuario
          </label>

          <select
            id="usuario-kardex"
            value={filtros.usuario}
            onChange={(event) =>
              onChange("usuario", event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos</option>

            {opciones.usuarios.map((usuario) => (
              <option
                key={usuario}
                value={usuario}
              >
                {usuario}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onLimpiar}
            className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:max-w-2xl">
        <div>
          <label
            htmlFor="fecha-desde-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Fecha inicial
          </label>

          <input
            id="fecha-desde-kardex"
            type="date"
            value={filtros.fechaDesde}
            onChange={(event) =>
              onChange("fechaDesde", event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="fecha-hasta-kardex"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Fecha final
          </label>

          <input
            id="fecha-hasta-kardex"
            type="date"
            value={filtros.fechaHasta}
            onChange={(event) =>
              onChange("fechaHasta", event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </section>
  );
}