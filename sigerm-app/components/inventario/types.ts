export type ArticuloInventario = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number | null;
  disponibles: number | null;
  estado: string | null;
  imagen: string | null;
  ubicacion: string | null;
  unidad: string | null;
  activo: boolean | null;
};

export type VistaInventario =
  | "tabla"
  | "catalogo";

export type FiltrosInventario = {
  busqueda: string;
  categoria: string;
  estado: string;
  disponibilidad: string;
};