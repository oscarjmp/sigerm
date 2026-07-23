export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface Usuario {
  id: string;
  auth_id: string | null;

  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;

  email: string;
  telefono: string | null;

  activo: boolean;

  rol_id: string | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface UsuarioConRol extends Usuario {
  roles: Rol | null;
}

export interface UsuarioFormulario {
  nombre: string;

  apellido_paterno: string;

  apellido_materno: string;

  email: string;

  telefono: string;

  password: string;

  rol_id: string;

  activo: boolean;
}