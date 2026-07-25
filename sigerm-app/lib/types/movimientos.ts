/**
 * Tipos y contratos utilizados por el Kardex de SIGERM.
 *
 * Este archivo no realiza consultas a Supabase.
 * Únicamente define los tipos compartidos por repositorios,
 * servicios y componentes.
 */

export const TIPOS_MOVIMIENTO = [
  "ALTA",
  "ENTRADA",
  "SALIDA",
  "PRESTAMO",
  "DEVOLUCION",
  "AJUSTE",
  "CAMBIO_ESTADO",
  "CAMBIO_UBICACION",
  "CAMBIO_FOTO",
  "BAJA",
  "REACTIVACION",
] as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface MetadataMovimiento {
  origen?: string;
  operacion?: string;

  estado_anterior?: string | null;
  estado_nuevo?: string | null;

  ubicacion_anterior?: string | null;
  ubicacion_nueva?: string | null;

  foto_anterior?: string | null;
  foto_nueva?: string | null;

  activo_anterior?: boolean | null;
  activo_nuevo?: boolean | null;

  cantidad_solicitada?: number;
  cantidad_devuelta?: number;

  folio_prestamo?: string | null;
  solicitante?: string | null;
  responsable?: string | null;

  codigo_articulo?: string | null;
  nombre_articulo?: string | null;
  descripcion_articulo?: string | null;

  [clave: string]: unknown;
}

export interface Movimiento {
  id: string;
  articulo_id: string;
  prestamo_id: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  usuario: string | null;
  observaciones: string | null;
  usuario_id: string | null;
  existencia_anterior: number | null;
  existencia_nueva: number | null;
  motivo: string | null;
  referencia: string | null;
  metadata: MetadataMovimiento;
  diferencia: number | null;
}

export interface CrearMovimientoInput {
  articulo_id: string;
  tipo: TipoMovimiento;
  cantidad: number;

  prestamo_id?: string | null;
  usuario?: string | null;
  observaciones?: string | null;

  existencia_anterior?: number | null;
  existencia_nueva?: number | null;

  motivo?: string | null;
  referencia?: string | null;

  metadata?: MetadataMovimiento;
}

export interface FiltrosMovimientos {
  articuloId?: string;
  prestamoId?: string;
  usuarioId?: string;

  tipo?: TipoMovimiento;
  tipos?: TipoMovimiento[];

  fechaDesde?: string;
  fechaHasta?: string;

  referencia?: string;
  motivo?: string;

  pagina?: number;
  limite?: number;

  orden?: "asc" | "desc";
}

export interface ResultadoMovimientos {
  movimientos: Movimiento[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ArticuloMovimiento {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number;
  disponibles: number | null;
  unidad: string | null;
  estado: string | null;
  ubicacion: string | null;
  imagen: string | null;
  activo: boolean;
}

export interface PrestamoMovimiento {
  id: string;
  folio: string | null;
  responsable: string | null;
  solicitante: string | null;
  fecha_prestamo: string | null;
  fecha_devolucion: string | null;
  estado: string | null;
}

export interface UsuarioMovimiento {
  id: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  email: string;
}

export interface MovimientoConRelaciones extends Movimiento {
  articulo: ArticuloMovimiento | null;
  prestamo: PrestamoMovimiento | null;
  usuario_responsable: UsuarioMovimiento | null;
}

export function esTipoMovimiento(
  valor: string,
): valor is TipoMovimiento {
  return TIPOS_MOVIMIENTO.includes(valor as TipoMovimiento);
}

export function movimientoModificaExistencias(
  tipo: TipoMovimiento,
): boolean {
  return [
    "ALTA",
    "ENTRADA",
    "SALIDA",
    "PRESTAMO",
    "DEVOLUCION",
    "AJUSTE",
  ].includes(tipo);
}

export function movimientoEsAdministrativo(
  tipo: TipoMovimiento,
): boolean {
  return [
    "CAMBIO_ESTADO",
    "CAMBIO_UBICACION",
    "CAMBIO_FOTO",
    "BAJA",
    "REACTIVACION",
  ].includes(tipo);
}

export function obtenerEtiquetaMovimiento(
  tipo: TipoMovimiento,
): string {
  const etiquetas: Record<TipoMovimiento, string> = {
    ALTA: "Alta de artículo",
    ENTRADA: "Entrada de inventario",
    SALIDA: "Salida de inventario",
    PRESTAMO: "Préstamo",
    DEVOLUCION: "Devolución",
    AJUSTE: "Ajuste de existencia",
    CAMBIO_ESTADO: "Cambio de estado",
    CAMBIO_UBICACION: "Cambio de ubicación",
    CAMBIO_FOTO: "Cambio de fotografía",
    BAJA: "Baja de artículo",
    REACTIVACION: "Reactivación de artículo",
  };

  return etiquetas[tipo];
}