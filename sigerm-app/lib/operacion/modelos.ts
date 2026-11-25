import { z } from "zod";

// Contrato provisional recibido en SIGERM-FUNCTIONAL-DEV-02; contraste CSV pendiente.
export const ESTADOS_ENCUENTRO = ["Planeación", "Programado", "En curso", "Concluido", "Cancelado"] as const;
export const idSchema = z.uuid("Identificador inválido.");
const texto = (max: number) => z.string().trim().min(1, "Este campo es obligatorio.").max(max, "El texto es demasiado largo.");
const opcional = (max: number) => z.string().trim().max(max, "El texto es demasiado largo.").nullable().transform(v => v || null);
const fecha = z.union([z.literal(""), z.iso.date("Introduce una fecha válida."), z.null()]).transform(v => v || null);
export const encuentroSchema = z.object({
  nombre: texto(150), fechaInicio: fecha, fechaTermino: fecha, sede: opcional(200), estado: opcional(30),
}).refine(d => !d.fechaInicio || !d.fechaTermino || d.fechaTermino >= d.fechaInicio,
  { message: "El término debe ser igual o posterior al inicio.", path: ["fechaTermino"] });
export const participanteSchema = z.object({
  encuentroId: idSchema, matrimonioId: idSchema, habitacion: opcional(20),
  observaciones: opcional(4000),
});
export const equipoSchema = z.object({
  encuentroId: idSchema, usuarioId: idSchema, area: texto(100), cargo: texto(100),
});
export const participanteEdicionSchema = participanteSchema.partial();
export const equipoEdicionSchema = equipoSchema.partial();
export const configuracionSchema = z.object({
  organizacion: texto(200), parroquia: opcional(200), ciudad: opcional(100),
  estado: opcional(100), pais: opcional(100),
});
export type Encuentro = z.output<typeof encuentroSchema> & { id: string; numero: number; createdAt: string | null };
export type Participante = Omit<z.output<typeof participanteSchema>, "encuentroId" | "matrimonioId"> & { id: string; encuentroId: string | null; matrimonioId: string | null; createdAt: string | null };
export type AsignacionServicio = Omit<z.output<typeof equipoSchema>, "encuentroId" | "usuarioId"> & { id: string; encuentroId: string | null; usuarioId: string | null; createdAt: string | null };
export type Configuracion = z.output<typeof configuracionSchema> & { id: string; createdAt: string | null };
export type MatrimonioOpcion = { id: string; esposo: string | null; esposa: string | null; activo: boolean | null };
export type UsuarioOpcion = { id: string; nombre: string | null; apellido_paterno: string | null; apellido_materno: string | null; activo: boolean | null };
export type EstadoDatos<T> = { estado: "disponible"; datos: T } | { estado: "pendiente" | "error"; mensaje: string };
export type Modulo = "encuentros" | "participantes" | "equipos" | "configuracion";
export type DatosFormulario = Record<string, string | number | null>;
export type Catalogos = {
  matrimonios: EstadoDatos<MatrimonioOpcion[]>; ministerios: EstadoDatos<string[]>;
  usuarios: EstadoDatos<UsuarioOpcion[]>;
};
export type OperacionDatos = {
  encuentros: EstadoDatos<Encuentro[]>; participantes: EstadoDatos<Participante[]>;
  equipos: EstadoDatos<AsignacionServicio[]>; configuraciones: EstadoDatos<Configuracion[]>;
};
export const datosPendientes: OperacionDatos = {
  encuentros: { estado: "pendiente", mensaje: "Encuentros no disponibles en esta vista." },
  participantes: { estado: "pendiente", mensaje: "Inscripciones no disponibles en esta vista." },
  equipos: { estado: "pendiente", mensaje: "Servicio no disponible en esta vista." },
  configuraciones: { estado: "pendiente", mensaje: "Configuraciones no disponibles en esta vista." },
};
export function nombreMatrimonio(m: MatrimonioOpcion) { return [m.esposo, m.esposa].filter(Boolean).join(" y ") || "Matrimonio sin nombre"; }
export function nombreUsuario(u: UsuarioOpcion) { return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ") || "Usuario sin nombre"; }
export function normalizarBusqueda(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim(); }
export function filtrarEncuentros(datos: Encuentro[], buscar: string, estado: string, desde = "", hasta = "") {
  if (desde && hasta && desde > hasta) return [];
  return datos.filter(e => (!estado || e.estado === estado)
    && (!desde || Boolean((e.fechaTermino ?? e.fechaInicio) && (e.fechaTermino ?? e.fechaInicio)! >= desde))
    && (!hasta || Boolean((e.fechaInicio ?? e.fechaTermino) && (e.fechaInicio ?? e.fechaTermino)! <= hasta))
    && normalizarBusqueda([e.numero, e.nombre, e.sede].join(" ")).includes(normalizarBusqueda(buscar)));
}
export function validarInscripcion(d: z.output<typeof participanteSchema>, encuentros: Encuentro[], matrimonios: MatrimonioOpcion[], filas: Participante[], excluirId?: string): string | null {
  if (!encuentros.some(e => e.id === d.encuentroId)) return "Selecciona un encuentro existente.";
  if (!matrimonios.some(m => m.id === d.matrimonioId && m.activo)) return "Selecciona un matrimonio activo.";
  if (filas.some(p => p.id !== excluirId && p.encuentroId === d.encuentroId && p.matrimonioId === d.matrimonioId)) return "El matrimonio ya está inscrito.";
  return null;
}
