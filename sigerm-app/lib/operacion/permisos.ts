import { PERMISOS } from "@/lib/permissions/permissions";
export const rutasOperacion = { encuentros: "/encuentros", participantes: "/participantes", equipos: "/equipos-servicio", configuracion: "/configuracion" } as const;
export const lecturaOperacion = {
  encuentros: PERMISOS.VER_ENCUENTROS, participantes: PERMISOS.VER_ENCUENTROS,
  equipos: PERMISOS.VER_SERVIDORES, configuracion: PERMISOS.ADMINISTRAR_CONFIGURACION,
} as const;
// Participantes depende del encuentro: usa permisos de crear/editar encuentro.
// Claude debe confirmar esta asociación sin modificar la matriz compartida desde Codex.
export const escrituraOperacion = {
  encuentros: [PERMISOS.CREAR_ENCUENTRO, PERMISOS.EDITAR_ENCUENTRO],
  participantes: [PERMISOS.CREAR_ENCUENTRO, PERMISOS.EDITAR_ENCUENTRO],
  equipos: [PERMISOS.CREAR_SERVIDOR, PERMISOS.EDITAR_SERVIDOR],
  configuracion: [PERMISOS.ADMINISTRAR_CONFIGURACION, PERMISOS.ADMINISTRAR_CONFIGURACION],
} as const;

// Integracion futura en Sidebar: las cuatro entradas exigen Administrador,
// ademas del permiso existente. No ampliar la matriz de roles compartida.
export const navegacionOperacion = [
  { nombre: "Encuentros", href: rutasOperacion.encuentros, permiso: lecturaOperacion.encuentros, soloAdministrador: true },
  { nombre: "Participantes", href: rutasOperacion.participantes, permiso: lecturaOperacion.participantes, soloAdministrador: true },
  { nombre: "Equipos de servicio", href: rutasOperacion.equipos, permiso: lecturaOperacion.equipos, soloAdministrador: true },
  { nombre: "Configuracion", href: rutasOperacion.configuracion, permiso: lecturaOperacion.configuracion, soloAdministrador: true },
] as const;
