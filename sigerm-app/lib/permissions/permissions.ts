export const PERMISOS = {
  VER_DASHBOARD: "ver_dashboard",

  VER_INVENTARIO: "ver_inventario",
VER_CATALOGO: "ver_catalogo",
CREAR_ARTICULO: "crear_articulo",
  EDITAR_ARTICULO: "editar_articulo",
  DESACTIVAR_ARTICULO: "desactivar_articulo",

  VER_PRESTAMOS: "ver_prestamos",
  CREAR_PRESTAMO: "crear_prestamo",
  EDITAR_PRESTAMO: "editar_prestamo",
  REGISTRAR_DEVOLUCION: "registrar_devolucion",

  VER_KARDEX: "ver_kardex",

  VER_ENCUENTROS: "ver_encuentros",
  CREAR_ENCUENTRO: "crear_encuentro",
  EDITAR_ENCUENTRO: "editar_encuentro",

  VER_MATRIMONIOS: "ver_matrimonios",
  CREAR_MATRIMONIO: "crear_matrimonio",
  EDITAR_MATRIMONIO: "editar_matrimonio",

  VER_SERVIDORES: "ver_servidores",
  CREAR_SERVIDOR: "crear_servidor",
  EDITAR_SERVIDOR: "editar_servidor",

  VER_REPORTES: "ver_reportes",

  ADMINISTRAR_USUARIOS: "administrar_usuarios",
  ADMINISTRAR_CONFIGURACION:
    "administrar_configuracion",
} as const;

export type Permiso =
  (typeof PERMISOS)[keyof typeof PERMISOS];