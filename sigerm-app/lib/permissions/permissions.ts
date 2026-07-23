export const PERMISOS = {
  VER_DASHBOARD: "ver_dashboard",

  VER_INVENTARIO: "ver_inventario",
  CREAR_ARTICULO: "crear_articulo",
  EDITAR_ARTICULO: "editar_articulo",
  DESACTIVAR_ARTICULO: "desactivar_articulo",

  VER_PRESTAMOS: "ver_prestamos",
  CREAR_PRESTAMO: "crear_prestamo",
  EDITAR_PRESTAMO: "editar_prestamo",
  REGISTRAR_DEVOLUCION: "registrar_devolucion",

  VER_MATRIMONIOS: "ver_matrimonios",
  CREAR_MATRIMONIO: "crear_matrimonio",
  EDITAR_MATRIMONIO: "editar_matrimonio",

  VER_ENCUENTROS: "ver_encuentros",
  VER_SERVIDORES: "ver_servidores",

  VER_REPORTES: "ver_reportes",
  ADMINISTRAR_USUARIOS: "administrar_usuarios",
  ADMINISTRAR_CONFIGURACION: "administrar_configuracion",
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];