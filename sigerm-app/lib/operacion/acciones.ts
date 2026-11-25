"use server";
import { revalidatePath } from "next/cache";
import { requerirAdministradorOperacion } from "./autorizacion";
import { createClient } from "@/lib/supabase/server";
import { crearRepositorio, mensajeError } from "./repositorio";
import { rutasOperacion, escrituraOperacion } from "./permisos";
import type { Modulo } from "./modelos";
import type { Resultado, RegistroOperacion } from "./contrato";

export async function guardarOperacion(modulo: Modulo, datos: unknown, id?: string): Promise<Resultado<RegistroOperacion>> {
  if (!Object.hasOwn(rutasOperacion, modulo)) return { ok: false, mensaje: "Módulo inválido." };
  // Fuera de try/catch: preserva las redirecciones de sesión o acceso denegado.
  await requerirAdministradorOperacion(escrituraOperacion[modulo][id === undefined ? 0 : 1], rutasOperacion[modulo]);
  let resultado: Resultado<RegistroOperacion>;
  try {
    const repo = crearRepositorio(await createClient());
    switch (modulo) {
      case "encuentros": resultado = await repo.guardarEncuentro(datos, id); break;
      case "participantes": resultado = await repo.guardarParticipante(datos, id); break;
      case "equipos": resultado = await repo.guardarServicio(datos, id); break;
      case "configuracion": resultado = await repo.guardarConfiguracion(datos, id); break;
    }
  } catch (error) { return { ok: false, mensaje: mensajeError(error) }; }
  if (resultado.ok) {
    try {
      for (const ruta of Object.values(rutasOperacion)) revalidatePath(ruta);
    } catch {
      return { ...resultado, aviso: "Guardado confirmado. Recarga la página para actualizar los directorios." };
    }
  }
  return resultado;
}
