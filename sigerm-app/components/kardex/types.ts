export type ArticuloRelacionado = {
  codigo: string | null;
  nombre: string | null;
  categoria: string | null;
  imagen: string | null;
  cantidad: number | null;
  disponibles: number | null;
};

export type PrestamoRelacionado = {
  folio: string | null;
};

export type UsuarioRelacionado = {
  nombre: string | null;
  email: string | null;
};

export type MetadataMovimiento = {
  codigo_articulo?: string | null;
  nombre_articulo?: string | null;
  categoria_articulo?: string | null;
  solicitante?: string | null;
  responsable?: string | null;
  modulo?: string | null;
  operacion?: string | null;
  disponibles_anteriores?: number | null;
  disponibles_nuevos?: number | null;
  existencia_total?: number | null;
  [key: string]: unknown;
};

export type Movimiento = {
  id: string;
  articulo_id: string;
  prestamo_id: string | null;
  tipo: string;
  cantidad: number;
  fecha: string;
  usuario: string | null;
  observaciones: string | null;
  usuario_id: string | null;
  existencia_anterior: number | null;
  existencia_nueva: number | null;
  motivo: string | null;
  referencia: string | null;
  metadata: MetadataMovimiento | null;
  diferencia: number | null;
  articulos: ArticuloRelacionado | null;
  prestamos: PrestamoRelacionado | null;
  usuarios: UsuarioRelacionado | null;
};

export type FiltrosKardex = {
  busqueda: string;
  tipo: string;
  categoria: string;
  usuario: string;
  fechaDesde: string;
  fechaHasta: string;
};

export type OpcionesFiltrosKardex = {
  tipos: string[];
  categorias: string[];
  usuarios: string[];
};

export type ResumenKardex = {
  totalMovimientos: number;
  totalEntradas: number;
  totalSalidas: number;
  prestamosRegistrados: number;
  devolucionesRegistradas: number;
  articulosConMovimiento: number;
};