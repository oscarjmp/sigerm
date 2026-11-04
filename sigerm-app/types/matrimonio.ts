export interface Matrimonio {
  id: string;
  esposo: string;
  esposa: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ministerio: string | null;
  foto: string | null;
  activo: boolean;
  created_at: string;
}

/**
 * Columnas que consulta y utiliza el módulo de gestión de matrimonios
 * (tabla, modal y formulario). Debe coincidir con COLUMNAS_GESTION
 * de app/matrimonios/page.tsx.
 */
export type MatrimonioVista = Omit<Matrimonio, "created_at">;