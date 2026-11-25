import type { SupabaseClient } from "@supabase/supabase-js";
import type { Encuentro, Participante, AsignacionServicio, Configuracion } from "./modelos";
export type Resultado<T> = { ok: true; valor: T; aviso?: string } | { ok: false; mensaje: string; campos?: Record<string, string> };
export type RegistroOperacion = Encuentro | Participante | AsignacionServicio | Configuracion;
export type ClienteOperacion = Pick<SupabaseClient, "from">;
export interface ContratoOperacion {
  listarEncuentros(): Promise<Resultado<Encuentro[]>>;
  listarParticipantes(): Promise<Resultado<Participante[]>>;
  listarServicio(): Promise<Resultado<AsignacionServicio[]>>;
  listarConfiguraciones(): Promise<Resultado<Configuracion[]>>;
  guardarEncuentro(datos: unknown, id?: string): Promise<Resultado<Encuentro>>;
  guardarParticipante(datos: unknown, id?: string): Promise<Resultado<Participante>>;
  guardarServicio(datos: unknown, id?: string): Promise<Resultado<AsignacionServicio>>;
  guardarConfiguracion(datos: unknown, id?: string): Promise<Resultado<Configuracion>>;
}
