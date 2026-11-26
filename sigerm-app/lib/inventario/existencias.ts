/**
 * Reglas puras de existencias, compartidas por Dashboard, Inventario,
 * Catálogo, Préstamos, Kardex y Reportes.
 *
 * - cantidad:          existencia física total registrada.
 * - disponibles:       unidades que pueden prestarse ahora.
 * - comprometidas:     cantidad - disponibles (lo que el registro da por
 *                      prestado).
 * - prestamosReales:   unidades en préstamos PRESTADO pendientes de
 *                      devolución (detalle de préstamos). Es la verdad.
 * - porConciliar:      comprometidas - prestamosReales. Si no es 0, el
 *                      registro tiene una diferencia sin préstamo que la
 *                      justifique (p. ej. A008, A009).
 * - activo:            el artículo está de alta. Desactivar NO es agotarse.
 */

export type SituacionExistencias =
  | "inactivo"
  | "agotado"
  | "sin_disponibilidad"
  | "disponible";

export type ExistenciasArticulo = {
  cantidad?: number | null;
  disponibles?: number | null;
  activo?: boolean | null;
};

function entero(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor)
    ? Math.max(Math.trunc(valor), 0)
    : 0;
}

export function normalizarExistencias(
  articulo: ExistenciasArticulo,
  prestamosReales?: number | null,
) {
  const cantidad = entero(articulo.cantidad);
  const disponibles = Math.min(entero(articulo.disponibles), cantidad);
  const comprometidas = cantidad - disponibles;
  const reales =
    prestamosReales === undefined || prestamosReales === null
      ? null
      : entero(prestamosReales);

  return {
    cantidad,
    disponibles,
    comprometidas,
    prestamosReales: reales,
    porConciliar: reales === null ? null : comprometidas - reales,
  };
}

/**
 * inactivo           → dado de baja (independiente de sus existencias).
 * agotado            → activo y con existencia total 0.
 * sin_disponibilidad → activo, con existencias, pero ninguna disponible.
 * disponible         → activo y con al menos una unidad disponible.
 */
export function clasificarExistencias(
  articulo: ExistenciasArticulo,
): SituacionExistencias {
  if (articulo.activo === false) return "inactivo";

  const { cantidad, disponibles } = normalizarExistencias(articulo);

  if (cantidad === 0) return "agotado";
  if (disponibles === 0) return "sin_disponibilidad";

  return "disponible";
}

export const ETIQUETA_SITUACION: Record<SituacionExistencias, string> = {
  inactivo: "Inactivo",
  agotado: "Agotado",
  sin_disponibilidad: "Sin disponibilidad",
  disponible: "Disponible",
};

/** Porcentaje disponible (0–100, entero). Con existencia 0 devuelve 0. */
export function porcentajeDisponible(articulo: ExistenciasArticulo): number {
  const { cantidad, disponibles } = normalizarExistencias(articulo);

  return cantidad > 0 ? Math.round((disponibles / cantidad) * 100) : 0;
}

/** Porcentaje seguro para totales: 0 si el denominador es 0. */
export function porcentaje(parte: number, total: number): number {
  return total > 0 && Number.isFinite(parte)
    ? Math.round((Math.max(parte, 0) / total) * 100)
    : 0;
}

/** Suma de unidades en préstamos PRESTADO por artículo. */
export function prestamosRealesPorArticulo(
  detalles: {
    articulo_id: string | null;
    cantidad: number | null;
    prestamos?: { estado?: string | null } | { estado?: string | null }[] | null;
  }[],
): Map<string, number> {
  const mapa = new Map<string, number>();

  for (const d of detalles) {
    const prestamo = Array.isArray(d.prestamos) ? d.prestamos[0] : d.prestamos;
    if (!d.articulo_id || prestamo?.estado?.toUpperCase() !== "PRESTADO") continue;
    mapa.set(d.articulo_id, (mapa.get(d.articulo_id) ?? 0) + entero(d.cantidad));
  }

  return mapa;
}

/**
 * Totales de inventario para Dashboard y Reportes. Solo cuentan artículos
 * activos (los inactivos se informan aparte). "Prestados" proviene de los
 * préstamos reales; si no se pudieron consultar (null), se usa la resta
 * registrada y se indica con prestadosConfirmados = false.
 */
export function resumirInventario(
  articulos: (ExistenciasArticulo & { id: string })[],
  prestamosReales: Map<string, number> | null,
) {
  let existenciaTotal = 0;
  let disponibles = 0;
  let prestados = 0;
  let porConciliar = 0;
  let articulosPorConciliar = 0;
  let agotados = 0;
  let sinDisponibilidad = 0;
  let inactivos = 0;
  let activos = 0;

  for (const a of articulos) {
    if (a.activo === false) {
      inactivos++;
      continue;
    }

    activos++;
    const n = normalizarExistencias(a, prestamosReales ? prestamosReales.get(a.id) ?? 0 : null);
    existenciaTotal += n.cantidad;
    disponibles += n.disponibles;
    prestados += n.prestamosReales ?? n.comprometidas;

    if (n.porConciliar) {
      porConciliar += Math.abs(n.porConciliar);
      articulosPorConciliar++;
    }

    const s = clasificarExistencias(a);
    if (s === "agotado") agotados++;
    if (s === "sin_disponibilidad") sinDisponibilidad++;
  }

  return {
    articulosActivos: activos,
    articulosInactivos: inactivos,
    existenciaTotal,
    disponibles,
    prestadosActualmente: prestados,
    prestadosConfirmados: prestamosReales !== null,
    unidadesPorConciliar: porConciliar,
    articulosPorConciliar,
    articulosAgotados: agotados,
    articulosSinDisponibilidad: sinDisponibilidad,
    porcentajeDisponible: porcentaje(disponibles, existenciaTotal),
  };
}

export const MOTIVOS_AJUSTE = [
  { valor: "CONTEO_FISICO", etiqueta: "Conciliación por conteo físico" },
  { valor: "CORRECCION_REGISTRO", etiqueta: "Corrección de registro" },
  { valor: "NUEVA_ADQUISICION", etiqueta: "Nueva adquisición" },
  { valor: "CONSUMO_ENTREGA", etiqueta: "Consumo o entrega definitiva" },
  { valor: "BAJA_DANO", etiqueta: "Baja por daño" },
  { valor: "BAJA_PERDIDA", etiqueta: "Baja por pérdida" },
  { valor: "OTRO", etiqueta: "Otro motivo justificado" },
] as const;

export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number]["valor"];

export type ErrorAjuste =
  | "no_entero"
  | "negativa"
  | "menor_que_prestamos"
  | "sin_cambio"
  | "sin_motivo"
  | "observaciones_requeridas"
  | "observaciones_largas";

export const MENSAJE_ERROR_AJUSTE: Record<ErrorAjuste, string> = {
  no_entero: "La existencia debe ser un número entero.",
  negativa: "La existencia no puede ser negativa.",
  menor_que_prestamos:
    "La existencia no puede ser menor que las unidades en préstamos vigentes. Registre primero su devolución.",
  sin_cambio: "El inventario ya coincide con los valores indicados.",
  sin_motivo: "Seleccione el motivo del ajuste.",
  observaciones_requeridas:
    "Para «Otro motivo» describa la justificación (al menos 5 caracteres).",
  observaciones_largas: "Las observaciones no pueden superar 500 caracteres.",
};

/**
 * Resultado de un ajuste: la disponibilidad se recalcula como
 * existencia - préstamos reales (igual que la base de datos).
 */
export function simularAjuste(
  actual: ExistenciasArticulo,
  prestamosReales: number,
  existenciaNueva: number,
) {
  const antes = normalizarExistencias(actual, prestamosReales);

  return {
    existenciaAnterior: antes.cantidad,
    existenciaNueva,
    disponiblesAnteriores: antes.disponibles,
    disponiblesNuevos: existenciaNueva - (antes.prestamosReales ?? 0),
    diferenciaExistencia: existenciaNueva - antes.cantidad,
    porConciliarAntes: antes.porConciliar ?? 0,
  };
}

/** Validación en el cliente, idéntica a la de la base de datos (que decide). */
export function validarAjuste(entrada: {
  actual: ExistenciasArticulo;
  prestamosReales: number;
  existenciaNueva: number;
  motivo: string;
  observaciones: string;
}): ErrorAjuste[] {
  const errores: ErrorAjuste[] = [];
  const nueva = entrada.existenciaNueva;

  if (!Number.isInteger(nueva)) {
    errores.push("no_entero");
  } else if (nueva < 0) {
    errores.push("negativa");
  } else {
    const r = simularAjuste(entrada.actual, entrada.prestamosReales, nueva);
    if (nueva < Math.max(entrada.prestamosReales, 0)) errores.push("menor_que_prestamos");
    else if (r.diferenciaExistencia === 0 && r.disponiblesNuevos === r.disponiblesAnteriores) {
      errores.push("sin_cambio");
    }
  }

  if (!MOTIVOS_AJUSTE.some((m) => m.valor === entrada.motivo)) errores.push("sin_motivo");

  const obs = entrada.observaciones.trim();
  if (entrada.motivo === "OTRO" && obs.length < 5) errores.push("observaciones_requeridas");
  if (obs.length > 500) errores.push("observaciones_largas");

  return errores;
}
