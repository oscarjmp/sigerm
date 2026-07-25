"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { TODOS_LOS_ROLES, type NombreRol } from "@/lib/constants/roles";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import type { Permiso } from "@/lib/permissions/permissions";
import { crearUsuarioRepository } from "@/lib/repositories/usuario.repository";
import { supabase } from "@/lib/supabase/client";
import type { UsuarioConRol } from "@/lib/types/usuario";

type AuthContextValue = {
  authUser: User | null;
  usuario: UsuarioConRol | null;
  rol: NombreRol | null;
  cargando: boolean;
  estaAutenticado: boolean;
  cuentaActiva: boolean;
  tienePerfil: boolean;
  puede: (permiso: Permiso) => boolean;
  recargarUsuario: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

export const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

function obtenerNombreRol(
  usuario: UsuarioConRol | null,
): NombreRol | null {
  const nombreRol = usuario?.roles?.nombre;

  if (
    nombreRol &&
    TODOS_LOS_ROLES.includes(nombreRol as NombreRol)
  ) {
    return nombreRol as NombreRol;
  }

  return null;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [authUser, setAuthUser] =
    useState<User | null>(null);

  const [usuario, setUsuario] =
    useState<UsuarioConRol | null>(null);

  const [cargando, setCargando] = useState(true);

  const usuarioRepository = useMemo(
    () => crearUsuarioRepository(supabase),
    [],
  );

  const limpiarAutenticacion = useCallback(() => {
    setAuthUser(null);
    setUsuario(null);
  }, []);

  const cargarPerfil = useCallback(
    async (user: User | null) => {
      if (!user) {
        limpiarAutenticacion();
        return;
      }

      setAuthUser(user);

      const perfil =
        await usuarioRepository.obtenerPorAuthId(
          user.id,
        );

      if (!perfil) {
        console.error(
          "El usuario autenticado no tiene un perfil registrado en public.usuarios.",
        );

        limpiarAutenticacion();

        await supabase.auth.signOut();

        return;
      }

      if (!perfil.activo) {
        console.warn(
          "Se bloqueó el acceso porque la cuenta está inactiva.",
        );

        limpiarAutenticacion();

        await supabase.auth.signOut();

        return;
      }

      setUsuario(perfil);
    },
    [
      limpiarAutenticacion,
      usuarioRepository,
    ],
  );

  const recargarUsuario =
    useCallback(async () => {
      setCargando(true);

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw new Error(
            `No fue posible obtener la sesión: ${error.message}`,
          );
        }

        await cargarPerfil(user);
      } finally {
        setCargando(false);
      }
    }, [cargarPerfil]);

  useEffect(() => {
    let montado = true;

    async function iniciarAutenticacion() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (montado) {
          await cargarPerfil(user);
        }
      } catch (error) {
        console.error(
          "Error al cargar la autenticación:",
          error,
        );

        if (montado) {
          limpiarAutenticacion();
        }
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    }

    void iniciarAutenticacion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCargando(true);

        void cargarPerfil(
          session?.user ?? null,
        ).finally(() => {
          if (montado) {
            setCargando(false);
          }
        });
      },
    );

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, [
    cargarPerfil,
    limpiarAutenticacion,
  ]);

  const rol = useMemo(
    () => obtenerNombreRol(usuario),
    [usuario],
  );

  const tienePerfil = Boolean(usuario);

  const cuentaActiva = Boolean(
    usuario?.activo,
  );

  const estaAutenticado = Boolean(
    authUser &&
      usuario &&
      usuario.activo &&
      rol,
  );

  const puede = useCallback(
    (permiso: Permiso): boolean => {
      if (
        cargando ||
        !estaAutenticado ||
        !rol
      ) {
        return false;
      }

      return tienePermiso(rol, permiso);
    },
    [
      cargando,
      estaAutenticado,
      rol,
    ],
  );

  const cerrarSesion =
    useCallback(async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw new Error(
          `No fue posible cerrar la sesión: ${error.message}`,
        );
      }

      limpiarAutenticacion();

      window.location.replace("/login");
    }, [limpiarAutenticacion]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      usuario,
      rol,
      cargando,
      estaAutenticado,
      cuentaActiva,
      tienePerfil,
      puede,
      recargarUsuario,
      cerrarSesion,
    }),
    [
      authUser,
      usuario,
      rol,
      cargando,
      estaAutenticado,
      cuentaActiva,
      tienePerfil,
      puede,
      recargarUsuario,
      cerrarSesion,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}