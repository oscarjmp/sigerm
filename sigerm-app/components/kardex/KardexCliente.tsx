"use client";

import { useMemo, useState } from "react";

import BarraFiltros from "@/components/kardex/BarraFiltros";
import TablaKardex from "@/components/kardex/TablaKardex";
import TarjetasResumen from "@/components/kardex/TarjetasResumen";
import TimelineArticulo from "@/components/kardex/TimelineArticulo";
import type {
  FiltrosKardex,
  Movimiento,
  OpcionesFiltrosKardex,
} from "@/components/kardex/types";
import {
  calcularResumen,
  normalizarBusqueda,
  obtenerCategoriaArticulo,
  obtenerCodigoArticulo,
  obtenerNombreArticulo,
  obtenerReferencia,
  obtenerSolicitante,
  obtenerUsuario,
} from "@/components/kardex/utils";

type KardexClienteProps = {
  movimientos: Movimiento[];
};

const FILTROS_INICIALES: FiltrosKardex = {
  busqueda: "",
  tipo: "",
  categoria: "",
  usuario: "",
  fechaDesde: "",
  fechaHasta: "",
};

function obtenerFechaLocal(fecha: string): string {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "";
  }

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(valor);

  const anio =
    partes.find((parte) => parte.type === "year")
      ?.value ?? "";

  const mes =
    partes.find((parte) => parte.type === "month")
      ?.value ?? "";

  const dia =
    partes.find((parte) => parte.type === "day")
      ?.value ?? "";

  if (!anio || !mes || !dia) {
    return "";
  }

  return `${anio}-${mes}-${dia}`;
}

function obtenerOpciones(
  movimientos: Movimiento[],
): OpcionesFiltrosKardex {
  const tipos = Array.from(
    new Set(
      movimientos
        .map((movimiento) =>
          movimiento.tipo.trim().toUpperCase(),
        )
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const categorias = Array.from(
    new Set(
      movimientos
        .map(obtenerCategoriaArticulo)
        .filter(
          (categoria) =>
            categoria !== "Sin información",
        ),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const usuarios = Array.from(
    new Set(
      movimientos
        .map(obtenerUsuario)
        .filter(
          (usuario) => usuario !== "Sin información",
        ),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));

  return {
    tipos,
    categorias,
    usuarios,
  };
}

export default function KardexCliente({
  movimientos,
}: KardexClienteProps) {
  const [filtros, setFiltros] =
    useState<FiltrosKardex>(FILTROS_INICIALES);

  const [
    articuloSeleccionadoId,
    setArticuloSeleccionadoId,
  ] = useState<string | null>(null);

  const opciones = useMemo(
    () => obtenerOpciones(movimientos),
    [movimientos],
  );

  const movimientosFiltrados = useMemo(() => {
    const busqueda =
      normalizarBusqueda(filtros.busqueda);

    return movimientos.filter((movimiento) => {
      const tipoMovimiento =
        movimiento.tipo.trim().toUpperCase();

      const categoria =
        obtenerCategoriaArticulo(movimiento);

      const usuario = obtenerUsuario(movimiento);

      const fechaLocal = obtenerFechaLocal(
        movimiento.fecha,
      );

      const cumpleBusqueda =
        !busqueda ||
        [
          obtenerNombreArticulo(movimiento),
          obtenerCodigoArticulo(movimiento),
          categoria,
          obtenerReferencia(movimiento),
          obtenerSolicitante(movimiento),
          usuario,
          movimiento.motivo,
          movimiento.observaciones,
          movimiento.tipo,
        ].some((valor) =>
          normalizarBusqueda(valor).includes(busqueda),
        );

      const cumpleTipo =
        !filtros.tipo ||
        tipoMovimiento === filtros.tipo;

      const cumpleCategoria =
        !filtros.categoria ||
        categoria === filtros.categoria;

      const cumpleUsuario =
        !filtros.usuario ||
        usuario === filtros.usuario;

      const cumpleFechaDesde =
        !filtros.fechaDesde ||
        (fechaLocal &&
          fechaLocal >= filtros.fechaDesde);

      const cumpleFechaHasta =
        !filtros.fechaHasta ||
        (fechaLocal &&
          fechaLocal <= filtros.fechaHasta);

      return (
        cumpleBusqueda &&
        cumpleTipo &&
        cumpleCategoria &&
        cumpleUsuario &&
        cumpleFechaDesde &&
        cumpleFechaHasta
      );
    });
  }, [filtros, movimientos]);

  const resumen = useMemo(
    () => calcularResumen(movimientosFiltrados),
    [movimientosFiltrados],
  );

  function actualizarFiltro(
    campo: keyof FiltrosKardex,
    valor: string,
  ) {
    setFiltros((filtrosActuales) => ({
      ...filtrosActuales,
      [campo]: valor,
    }));
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
  }

  function seleccionarArticulo(
    articuloId: string,
  ) {
    setArticuloSeleccionadoId(articuloId);
  }

  function cerrarTimeline() {
    setArticuloSeleccionadoId(null);
  }

  return (
    <>
      <TarjetasResumen resumen={resumen} />

      <BarraFiltros
        filtros={filtros}
        opciones={opciones}
        onChange={actualizarFiltro}
        onLimpiar={limpiarFiltros}
      />

      <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          Mostrando{" "}
          <span className="font-bold text-slate-900">
            {movimientosFiltrados.length}
          </span>{" "}
          de{" "}
          <span className="font-bold text-slate-900">
            {movimientos.length}
          </span>{" "}
          movimientos
        </p>

        {movimientosFiltrados.length !==
          movimientos.length && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Mostrar todos
          </button>
        )}
      </div>

      <TablaKardex
        movimientos={movimientosFiltrados}
        onSeleccionarArticulo={seleccionarArticulo}
      />

      <TimelineArticulo
        abierto={articuloSeleccionadoId !== null}
        movimientos={movimientos}
        articuloId={articuloSeleccionadoId}
        onCerrar={cerrarTimeline}
      />
    </>
  );
}