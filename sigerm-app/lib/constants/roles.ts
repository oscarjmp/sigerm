export const ROLES = {
  ADMINISTRADOR: "Administrador",
  COORDINADOR: "Coordinador",
  INVENTARIO: "Inventario",
  SECRETARIA: "Secretaría",
  TESORERIA: "Tesorería",
} as const;

export type NombreRol = (typeof ROLES)[keyof typeof ROLES];

export const TODOS_LOS_ROLES: NombreRol[] = Object.values(ROLES);