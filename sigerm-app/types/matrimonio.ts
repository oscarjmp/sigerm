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