"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import InventarioCards from "@/components/inventario/InventarioCards";
import InventarioDetalle from "@/components/inventario/InventarioDetalle";
import TablaInventario from "@/components/inventario/TablaInventario";
import type {
  ArticuloInventario,
  VistaInventario,
} from "@/components/inventario/types";

import { useAuth } from "@/lib/hooks/useAuth";
import { PERMISOS } from "@/lib/permissions/permissions";
import { supabase } from "@/lib/supabase/client";

type InventarioClienteProps = {
  articulos: ArticuloInventario[];
};

function normalizarTexto(valor: string | null): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obtenerCategoria(categoria: string | null): string {
  const valor = categoria?.trim();

  return valor || "SIN CATEGORÍA";
}

export default function InventarioCliente({
  articulos,
}: InventarioClienteProps) {
  const router = useRouter();
  const { puede } = useAuth();

  const [vista, setVista] =
    useState<VistaInventario>("catalogo");

  const [busqueda, setBusqueda] = useState("");

  const [
    articuloSeleccionado,
    setArticuloSeleccionado,
  ] = useState<ArticuloInventario | null>(null);

  const [eliminandoId, setEliminandoId] =
    useState<string | null>(null);

  const puedeEditar = puede(
    PERMISOS.EDITAR_ARTICULO,
  );

  const puedeEliminar = puede(
    PERMISOS.DESACTIVAR_ARTICULO,
  );

  const articulosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    if (!texto) {
      return articulos;
    }

    return articulos.filter((articulo) => {
      const datosBusqueda = [
        articulo.codigo,
        articulo.nombre,
        obtenerCategoria(articulo.categoria),
        articulo.estado,
        articulo.ubicacion,
        articulo.unidad,
      ];

      return datosBusqueda.some((valor) =>
        normalizarTexto(valor).includes(texto),
      );
    });
  }, [articulos, busqueda]);

  async function eliminarArticulo(
    articulo: ArticuloInventario,
  ) {
    if (!puedeEliminar) {
      window.alert(
        "No cuenta con permiso para eliminar artículos.",
      );
      return;
    }

    const confirmado = window.confirm(
      `¿Desea eliminar el artículo "${articulo.nombre}"?`,
    );

    if (!confirmado) {
      return;
    }

    setEliminandoId(articulo.id);

    try {
      const { error } = await supabase
        .from("articulos")
        .delete()
        .eq("id", articulo.id);

      if (error) {
        throw new Error(error.message);
      }

      if (
        articuloSeleccionado?.id === articulo.id
      ) {
        setArticuloSeleccionado(null);
      }

      window.alert(
        "Artículo eliminado correctamente.",
      );

      router.refresh();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el artículo.";

      window.alert(mensaje);
    } finally {
      setEliminandoId(null);
    }
  }

  function abrirDetalle(
    articulo: ArticuloInventario,
  ) {
    setArticuloSeleccionado(articulo);
  }

  function cerrarDetalle() {
    setArticuloSeleccionado(null);
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Presentación del inventario
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Alterna entre la consulta tradicional y el
              catálogo con fotografías grandes.
            </p>
          </div>

          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 lg:w-auto">
            <button
              type="button"
              onClick={() => setVista("tabla")}
              aria-pressed={vista === "tabla"}
              className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition lg:flex-none ${
                vista === "tabla"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vista tabla
            </button>

            <button
              type="button"
              onClick={() => setVista("catalogo")}
              aria-pressed={vista === "catalogo"}
              className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition lg:flex-none ${
                vista === "catalogo"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Catálogo visual
            </button>
          </div>
        </div>

        {vista === "catalogo" && (
          <div className="mt-5">
            <label
              htmlFor="buscar-catalogo-inventario"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Buscar artículos
            </label>

            <input
              id="buscar-catalogo-inventario"
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por código, nombre, categoría, estado o ubicación..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando{" "}
                <span className="font-bold text-slate-900">
                  {articulosFiltrados.length}
                </span>{" "}
                de{" "}
                <span className="font-bold text-slate-900">
                  {articulos.length}
                </span>{" "}
                artículos
              </p>

              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="text-left font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {vista === "tabla" ? (
        <TablaInventario articulos={articulos} />
      ) : (
        <InventarioCards
          articulos={articulosFiltrados}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          eliminandoId={eliminandoId}
          onEliminar={eliminarArticulo}
          onVerDetalle={abrirDetalle}
        />
      )}

      <InventarioDetalle
        articulo={articuloSeleccionado}
        abierto={articuloSeleccionado !== null}
        puedeEditar={puedeEditar}
        onCerrar={cerrarDetalle}
      />
    </>
  );
}