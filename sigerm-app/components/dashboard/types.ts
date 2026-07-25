export type ArticuloDashboard = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number | null;
  disponibles: number | null;
  estado: string | null;
  imagen: string | null;
};

export type MetadataMovimientoDashboard = {
  codigo_articulo?: string | null;
  nombre_articulo?: string | null;
  categoria_articulo?: string | null;
  solicitante?: string | null;
  responsable?: string | null;
  existencia_total?: number | null;
  [key: string]: unknown;
};

export type MovimientoDashboard = {
  id: string;
  articulo_id: string;
  tipo: string;
  cantidad: number;
  diferencia: number | null;
  fecha: string;
  referencia: string | null;
  usuario: string | null;
  motivo: string | null;
  metadata: MetadataMovimientoDashboard | null;
  articulos: {
    codigo: string | null;
    nombre: string | null;
    categoria: string | null;
    imagen: string | null;
  } | null;
};

export type PrestamoDashboard = {
  id: string;
  folio: string;
  estado: string;
  solicitante: string | null;
  responsable: string | null;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
};

export type ResumenDashboard = {
  totalArticulos: number;
  totalCategorias: number;
  existenciaTotal: number;
  disponibles: number;
  prestadosActualmente: number;
  prestamosActivos: number;
  prestamosDevueltos: number;
  articulosMalEstado: number;
  articulosSinDisponibilidad: number;
  movimientosRegistrados: number;
};

export type MovimientoMensual = {
  mes: string;
  entradas: number;
  salidas: number;
};

export type ArticuloMasPrestado = {
  articuloId: string;
  codigo: string;
  nombre: string;
  categoria: string;
  imagen: string | null;
  unidadesPrestadas: number;
  movimientos: number;
};

export type ActividadDashboard = {
  id: string;
  articuloId: string;
  tipo: string;
  articulo: string;
  codigo: string;
  referencia: string;
  usuario: string;
  solicitante: string;
  diferencia: number;
  fecha: string;
};

export type AlertaInventario = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  disponibles: number;
  imagen: string | null;
  nivel: "agotado" | "critico" | "bajo";
};