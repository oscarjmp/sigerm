import { createClient } from "@/lib/supabase/server";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import { PERMISOS } from "@/lib/permissions/permissions";
import type { PerfilAutorizado } from "@/lib/auth/requerirPermiso";
import type { Catalogos, Modulo, OperacionDatos, EstadoDatos } from "./modelos";
import { datosPendientes } from "./modelos";
import { crearRepositorio, mensajeError } from "./repositorio";
import type { Resultado } from "./contrato";
function fuente<T>(r: Resultado<T>): EstadoDatos<T> {
  return r.ok ? { estado: "disponible", datos: r.valor } : { estado: "error", mensaje: r.mensaje };
}
export async function cargarDatos(perfil: PerfilAutorizado, modulo: Modulo): Promise<OperacionDatos> {
  const resultado = { ...datosPendientes };
  const repo = crearRepositorio(await createClient());
  const tareas: Promise<void>[] = [];
  if (tienePermiso(perfil.rol, PERMISOS.VER_ENCUENTROS) && modulo !== "configuracion") {
    tareas.push(repo.listarEncuentros().then(r => { resultado.encuentros = fuente(r); }));
    if (modulo !== "equipos") tareas.push(repo.listarParticipantes().then(r => { resultado.participantes = fuente(r); }));
  }
  if (tienePermiso(perfil.rol, PERMISOS.VER_SERVIDORES) && (modulo === "equipos" || modulo === "encuentros")) {
    tareas.push(repo.listarServicio().then(r => { resultado.equipos = fuente(r); }));
  }
  if (modulo === "configuracion" && tienePermiso(perfil.rol, PERMISOS.ADMINISTRAR_CONFIGURACION)) {
    tareas.push(repo.listarConfiguraciones().then(r => { resultado.configuraciones = fuente(r); }));
  }
  await Promise.all(tareas);
  return resultado;
}
export async function cargarCatalogos(perfil: PerfilAutorizado, modulo: Modulo): Promise<Catalogos> {
  const resultado: Catalogos = {
    matrimonios: { estado: "pendiente", mensaje: "Directorio de matrimonios no disponible para esta vista." },
    usuarios: { estado: "pendiente", mensaje: "Directorio de usuarios no disponible para esta vista." },
    ministerios: { estado: "pendiente", mensaje: "Catálogo de ministerios no requerido." },
  };
  const cliente = await createClient();
  // Sin datos de contacto, roles, auth_id ni información privada adicional.
  if (["participantes", "encuentros"].includes(modulo) && tienePermiso(perfil.rol, PERMISOS.VER_MATRIMONIOS)) {
    try {
      const registros = [];
      for (let offset = 0; ; ) {
        const { data, error, count } = await cliente.from("matrimonios").select("id, esposo, esposa, activo", { count: "exact" }).order("id").range(offset, offset + 499);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error();
        registros.push(...data);
        offset += data.length;
        if (count !== null ? offset >= count : data.length < 500) break;
        if (!data.length) throw new Error();
      }
      resultado.matrimonios = { estado: "disponible", datos: registros };
    } catch (error) { resultado.matrimonios = { estado: "error", mensaje: mensajeError(error) }; }
  }
  if (["equipos", "encuentros"].includes(modulo) && tienePermiso(perfil.rol, PERMISOS.VER_SERVIDORES)) {
    try {
      const registros = [];
      for (let offset = 0; ; ) {
        const { data, error, count } = await cliente.from("usuarios").select("id, nombre, apellido_paterno, apellido_materno, activo", { count: "exact" }).order("id").range(offset, offset + 499);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error();
        registros.push(...data);
        offset += data.length;
        if (count !== null ? offset >= count : data.length < 500) break;
        if (!data.length) throw new Error();
      }
      resultado.usuarios = { estado: "disponible", datos: registros };
    } catch (error) { resultado.usuarios = { estado: "error", mensaje: mensajeError(error) }; }
  }
  if (modulo === "configuracion") {
    try {
      const nombres: string[] = [];
      for (let offset = 0; ; ) {
        const { data, error, count } = await cliente.from("ministerios").select("nombre", { count: "exact" }).order("nombre").range(offset, offset + 499);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error();
        for (const r of data) if (typeof r.nombre === "string" && r.nombre.trim()) nombres.push(r.nombre.trim());
        offset += data.length;
        if (count !== null ? offset >= count : data.length < 500) break;
        if (!data.length) throw new Error();
      }
      resultado.ministerios = { estado: "disponible", datos: [...new Set(nombres)] };
    } catch (error) { resultado.ministerios = { estado: "error", mensaje: mensajeError(error) }; }
  }
  return resultado;
}
