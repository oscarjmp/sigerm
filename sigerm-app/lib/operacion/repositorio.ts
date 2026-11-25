import { z } from "zod";
import { encuentroSchema, participanteSchema, equipoSchema, configuracionSchema, idSchema, participanteEdicionSchema, equipoEdicionSchema } from "./modelos";
import type { ClienteOperacion, ContratoOperacion, Resultado } from "./contrato";

const id = z.uuid();
const nullable = z.string().nullable();
const base = { id, created_at: nullable };
export const filas = {
  encuentros: z.object({ ...base, nombre: z.string(), numero: z.number().int(), fecha_inicio: nullable, fecha_fin: nullable, sede: nullable, estado: nullable })
    .transform(r => ({ id: r.id, createdAt: r.created_at, nombre: r.nombre, numero: r.numero, fechaInicio: r.fecha_inicio, fechaTermino: r.fecha_fin, sede: r.sede, estado: r.estado })),
  participantes: z.object({ ...base, encuentro_id: id.nullable(), matrimonio_id: id.nullable(), habitacion: nullable, observaciones: nullable })
    .transform(r => ({ id: r.id, createdAt: r.created_at, encuentroId: r.encuentro_id, matrimonioId: r.matrimonio_id, habitacion: r.habitacion, observaciones: r.observaciones })),
  equipos_servicio: z.object({ ...base, encuentro_id: id.nullable(), usuario_id: id.nullable(), area: nullable, cargo: nullable })
    .transform(r => ({ id: r.id, createdAt: r.created_at, encuentroId: r.encuentro_id, usuarioId: r.usuario_id, area: r.area ?? "", cargo: r.cargo ?? "" })),
  configuracion: z.object({ ...base, organizacion: nullable, parroquia: nullable, ciudad: nullable, estado: nullable, pais: nullable })
    .transform(r => ({ id: r.id, createdAt: r.created_at, organizacion: r.organizacion ?? "", parroquia: r.parroquia, ciudad: r.ciudad, estado: r.estado, pais: r.pais })),
};
export const columnas = {
  encuentros: "id, nombre, numero, fecha_inicio, fecha_fin, sede, estado, created_at",
  participantes: "id, encuentro_id, matrimonio_id, habitacion, observaciones, created_at",
  equipos_servicio: "id, encuentro_id, usuario_id, area, cargo, created_at",
  configuracion: "id, organizacion, parroquia, ciudad, estado, pais, created_at",
} as const;
type Tabla = keyof typeof filas;
export function mensajeError(error: unknown): string {
  const codigo = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["42501", "PGRST301", "PGRST302"].includes(codigo)) return "Acceso denegado. Tu perfil no dispone de autorización en la base de datos.";
  if (codigo === "23505") return "Ya existe un registro con esos datos. Revisa las inscripciones duplicadas.";
  if (codigo === "23503") return "La referencia no existe o se incumple una restricci\u00f3n de integridad.";
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(codigo)) return "El esquema disponible no coincide con el contrato. Es necesaria la revisión con Claude.";
  return "No fue posible completar la operación. Intenta nuevamente.";
}
function invalido<T>(error: z.ZodError): Resultado<T> {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) campos[String(issue.path[0] ?? "_")] ??= issue.message;
  return { ok: false, mensaje: "Revisa los campos indicados.", campos };
}
export function crearRepositorio(cliente: ClienteOperacion, generarId: () => string = () => crypto.randomUUID()): ContratoOperacion {
  async function listar<S extends z.ZodType>(tabla: Tabla, schema: S): Promise<Resultado<z.output<S>[]>> {
    try {
      const registros: z.output<S>[] = [];
      const vistos = new Set<string>();
      let total: number | undefined;
      for (let offset = 0; ; ) {
        const { data, error, count } = await cliente.from(tabla).select(columnas[tabla], { count: "exact" }).order("id").range(offset, offset + 499);
        if (error) return { ok: false, mensaje: mensajeError(error) };
        if (typeof count === "number") {
          if (total !== undefined && count !== total) return { ok: false, mensaje: "Los datos cambiaron durante la consulta. Actualiza el directorio." };
          total = count;
        }
        const resultado = z.array(schema).safeParse(data);
        if (!resultado.success) return { ok: false, mensaje: "La respuesta no coincide con el contrato de datos." };
        for (const registro of resultado.data) {
          const registroId = (registro as { id: string }).id;
          if (vistos.has(registroId)) return { ok: false, mensaje: "Los datos cambiaron durante la consulta. Actualiza el directorio." };
          vistos.add(registroId);
        }
        registros.push(...resultado.data);
        if (!resultado.data.length) {
          if (count !== null && offset < count) return { ok: false, mensaje: "La consulta devolvió información incompleta." };
          break;
        }
        offset += resultado.data.length;
        if (count !== null ? offset >= count : resultado.data.length < 500) break;
      }
      return { ok: true, valor: registros };
    } catch { return { ok: false, mensaje: mensajeError(null) }; }
  }
  async function guardar<S extends z.ZodType>(tabla: Tabla, schema: S, payload: Record<string, unknown>, registroId?: string): Promise<Resultado<z.output<S>>> {
    try {
      if (registroId !== undefined && !idSchema.safeParse(registroId).success) return { ok: false, mensaje: "Identificador inválido." };
      const nuevoId = registroId === undefined && tabla !== "encuentros" ? generarId() : undefined;
      const contenido = nuevoId ? { ...payload, id: nuevoId } : payload;
      const consulta = registroId === undefined
        ? cliente.from(tabla).insert(contenido)
        : cliente.from(tabla).update(payload).eq("id", registroId);
      const { data, error } = await consulta.select(columnas[tabla]);
      if (error) return { ok: false, mensaje: error.code ? mensajeError(error) : "No se pudo confirmar el guardado. Actualiza el directorio antes de reintentar para evitar duplicados." };
      if (!Array.isArray(data) || data.length !== 1) return { ok: false, mensaje: "No se confirmó el guardado de un registro. Puede no existir o no tener permisos para modificarlo." };
      const resultado = schema.safeParse(data[0]);
      if (!resultado.success) return { ok: false, mensaje: "El servidor respondió sin un registro válido. Recarga antes de reintentar; el cambio podría haberse guardado." };
      const esperado = registroId ?? nuevoId;
      if (esperado !== undefined && (resultado.data as { id: string }).id !== esperado) return { ok: false, mensaje: "La respuesta no corresponde al registro solicitado." };
      return { ok: true, valor: resultado.data };
    } catch { return { ok: false, mensaje: "No se pudo confirmar el guardado. Actualiza el directorio antes de reintentar para evitar duplicados." }; }
  }
  async function existe(tabla: "encuentros" | "matrimonios" | "usuarios", registroId: string, activo = false): Promise<boolean> {
    let consulta = cliente.from(tabla).select("id").eq("id", registroId);
    if (activo) consulta = consulta.eq("activo", true);
    const { data, error } = await consulta.maybeSingle();
    if (error) throw error;
    return data?.id === registroId;
  }
  return {
    listarEncuentros: () => listar("encuentros", filas.encuentros),
    listarParticipantes: () => listar("participantes", filas.participantes),
    listarServicio: () => listar("equipos_servicio", filas.equipos_servicio),
    listarConfiguraciones: () => listar("configuracion", filas.configuracion),
    async guardarEncuentro(datos, registroId) {
      const parsed = encuentroSchema.safeParse(datos);
      if (!parsed.success) return invalido(parsed.error);
      const d = parsed.data;
      return guardar("encuentros", filas.encuentros, { nombre: d.nombre, fecha_inicio: d.fechaInicio, fecha_fin: d.fechaTermino, sede: d.sede,
        ...(registroId === undefined && d.estado === null ? {} : { estado: d.estado }) }, registroId);
    },
    async guardarParticipante(datos, registroId) {
      if (registroId !== undefined && !idSchema.safeParse(registroId).success) return { ok: false, mensaje: "Identificador inválido." };
      const parsed = (registroId === undefined ? participanteSchema : participanteEdicionSchema).safeParse(datos);
      if (!parsed.success) return invalido(parsed.error);
      const d = parsed.data;
      if (!Object.keys(d).length) return { ok: false, mensaje: "No hay cambios para guardar." };
      try {
        if (d.encuentroId !== undefined && !await existe("encuentros", d.encuentroId)) return { ok: false, mensaje: "El encuentro no existe o no es accesible." };
        if (d.matrimonioId !== undefined && !await existe("matrimonios", d.matrimonioId, true)) return { ok: false, mensaje: "El matrimonio activo no existe o no es accesible." };
        if (d.encuentroId !== undefined || d.matrimonioId !== undefined) {
          let encuentroId: string | null | undefined = d.encuentroId;
          let matrimonioId: string | null | undefined = d.matrimonioId;
          if (registroId !== undefined && (encuentroId === undefined || matrimonioId === undefined)) {
            const { data, error } = await cliente.from("participantes").select("id, encuentro_id, matrimonio_id").eq("id", registroId).maybeSingle();
            if (error) return { ok: false, mensaje: mensajeError(error) };
            const actual = z.object({ id, encuentro_id: id.nullable(), matrimonio_id: id.nullable() }).safeParse(data);
            if (!actual.success || actual.data.id !== registroId) return { ok: false, mensaje: "El registro histórico no existe o no es accesible." };
            encuentroId ??= actual.data.encuentro_id;
            matrimonioId ??= actual.data.matrimonio_id;
          }
          if (encuentroId && matrimonioId) {
            let consulta = cliente.from("participantes").select("id").eq("encuentro_id", encuentroId).eq("matrimonio_id", matrimonioId);
            if (registroId !== undefined) consulta = consulta.neq("id", registroId);
            const { data, error } = await consulta.limit(1);
            if (error) return { ok: false, mensaje: mensajeError(error) };
            if (!Array.isArray(data)) return { ok: false, mensaje: "No fue posible comprobar inscripciones duplicadas." };
            if (data.length) return { ok: false, mensaje: "El matrimonio ya está inscrito en este encuentro." };
          }
        }
      } catch (error) { return { ok: false, mensaje: mensajeError(error) }; }
      const payload: Record<string, unknown> = {};
      if (d.encuentroId !== undefined) payload.encuentro_id = d.encuentroId;
      if (d.matrimonioId !== undefined) payload.matrimonio_id = d.matrimonioId;
      if (d.habitacion !== undefined) payload.habitacion = d.habitacion;
      if (d.observaciones !== undefined) payload.observaciones = d.observaciones;
      return guardar("participantes", filas.participantes, payload, registroId);
    },
    async guardarServicio(datos, registroId) {
      if (registroId !== undefined && !idSchema.safeParse(registroId).success) return { ok: false, mensaje: "Identificador inválido." };
      const parsed = (registroId === undefined ? equipoSchema : equipoEdicionSchema).safeParse(datos);
      if (!parsed.success) return invalido(parsed.error);
      const d = parsed.data;
      if (!Object.keys(d).length) return { ok: false, mensaje: "No hay cambios para guardar." };
      try {
        if (d.encuentroId !== undefined && !await existe("encuentros", d.encuentroId)) return { ok: false, mensaje: "El encuentro no existe o no es accesible." };
        if (d.usuarioId !== undefined && !await existe("usuarios", d.usuarioId, true)) return { ok: false, mensaje: "El usuario activo no existe o no es accesible." };
      } catch (error) { return { ok: false, mensaje: mensajeError(error) }; }
      const payload: Record<string, unknown> = {};
      if (d.encuentroId !== undefined) payload.encuentro_id = d.encuentroId;
      if (d.usuarioId !== undefined) payload.usuario_id = d.usuarioId;
      if (d.area !== undefined) payload.area = d.area;
      if (d.cargo !== undefined) payload.cargo = d.cargo;
      return guardar("equipos_servicio", filas.equipos_servicio, payload, registroId);
    },
    async guardarConfiguracion(datos, registroId) {
      const parsed = configuracionSchema.safeParse(datos);
      if (!parsed.success) return invalido(parsed.error);
      return guardar("configuracion", filas.configuracion, parsed.data, registroId);
    },
  };
}
