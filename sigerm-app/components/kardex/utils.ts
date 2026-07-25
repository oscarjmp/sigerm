import type {
  Movimiento,
  ResumenKardex,
} from "@/components/kardex/types";

export function normalizarTexto(
  valor: string | null | undefined,
): string {
  const texto = valor?.trim();

  return texto || "Sin información";
}

export function normalizarBusqueda(
  valor: string | null | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function formatearFecha(fecha: string): string {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(valor);
}

export function formatearNumero(
  valor: number | null,
): string {
  if (valor === null) {
    return "—";
  }

  return new Intl.NumberFormat("es-MX").format(valor);
}

export function obtenerNombreArticulo(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.articulos?.nombre ??
      movimiento.metadata?.nombre_articulo,
  );
}

export function obtenerCodigoArticulo(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.articulos?.codigo ??
      movimiento.metadata?.codigo_articulo,
  );
}

export function obtenerCategoriaArticulo(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.articulos?.categoria ??
      movimiento.metadata?.categoria_articulo,
  );
}

export function obtenerReferencia(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.referencia ??
      movimiento.prestamos?.folio,
  );
}

export function obtenerUsuario(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.usuario ??
      movimiento.usuarios?.nombre ??
      movimiento.metadata?.responsable,
  );
}

export function obtenerSolicitante(
  movimiento: Movimiento,
): string {
  return normalizarTexto(
    movimiento.metadata?.solicitante,
  );
}

export function obtenerDiferencia(
  movimiento: Movimiento,
): number {
  if (typeof movimiento.diferencia === "number") {
    return movimiento.diferencia;
  }

  const tipo = movimiento.tipo.toUpperCase();

  if (
    tipo === "PRESTAMO" ||
    tipo === "SALIDA" ||
    tipo === "BAJA"
  ) {
    return -Math.abs(movimiento.cantidad);
  }

  return Math.abs(movimiento.cantidad);
}

export function calcularResumen(
  movimientos: Movimiento[],
): ResumenKardex {
  const totalMovimientos = movimientos.length;

  const diferencias = movimientos.map(
    obtenerDiferencia,
  );

  const totalEntradas = diferencias
    .filter((diferencia) => diferencia > 0)
    .reduce(
      (acumulado, diferencia) =>
        acumulado + diferencia,
      0,
    );

  const totalSalidas = Math.abs(
    diferencias
      .filter((diferencia) => diferencia < 0)
      .reduce(
        (acumulado, diferencia) =>
          acumulado + diferencia,
        0,
      ),
  );

  const prestamosRegistrados = movimientos.filter(
    (movimiento) =>
      movimiento.tipo.toUpperCase() === "PRESTAMO",
  ).length;

  const devolucionesRegistradas =
    movimientos.filter(
      (movimiento) =>
        movimiento.tipo.toUpperCase() ===
        "DEVOLUCION",
    ).length;

  const articulosConMovimiento = new Set(
    movimientos.map(
      (movimiento) => movimiento.articulo_id,
    ),
  ).size;

  return {
    totalMovimientos,
    totalEntradas,
    totalSalidas,
    prestamosRegistrados,
    devolucionesRegistradas,
    articulosConMovimiento,
  };
}