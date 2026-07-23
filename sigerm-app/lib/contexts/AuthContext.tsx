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

import { supabase } from "@/lib/supabase/client";
import { crearUsuarioRepository } from "@/lib/repositories/usuario.repository";
import type { UsuarioConRol } from "@/lib/types/usuario";
import {
  TODOS_LOS_ROLES,
  type NombreRol,
} from "@/lib/constants/roles";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import type { Permiso } from "@/lib/permissions/permissions";

type AuthContextValue = {
  authUser: User | null;
  usuario: UsuarioConRol | null;
  rol: NombreRol | null;
  cargando: boolean;
  estaAutenticado: boolean;
  puede: (permiso: Permiso) => boolean;
  recargarUsuario: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<UsuarioConRol | null>(null);
  const [cargando, setCargando] = useState(true);

  const usuarioRepository = useMemo(
    () => crearUsuarioRepository(supabase),
    [],
  );

  const cargarPerfil = useCallback(
    async (user: User | null) => {
      setAuthUser(user);

      if (!user) {
        setUsuario(null);
        return;
      }

      const perfil = await usuarioRepository.obtenerPorAuthId(
        user.id,
      );

      setUsuario(perfil);
    },
    [usuarioRepository],
  );

  const recargarUsuario = useCallback(async () => {
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
  }, [cargarPerfil]);

  useEffect(() => {
    let activo = true;

    async function iniciarAutenticacion() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (activo) {
          await cargarPerfil(user);
        }
      } catch (error) {
        console.error(
          "Error al cargar la autenticación:",
          error,
        );

        if (activo) {
          setAuthUser(null);
          setUsuario(null);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void iniciarAutenticacion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void cargarPerfil(session?.user ?? null).finally(() => {
          setCargando(false);
        });
      },
    );

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  const rol = obtenerNombreRol(usuario);

  const puede = useCallback(
    (permiso: Permiso) => tienePermiso(rol, permiso),
    [rol],
  );

  const cerrarSesion = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(
        `No fue posible cerrar la sesión: ${error.message}`,
      );
    }

    setAuthUser(null);
    setUsuario(null);

    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      usuario,
      rol,
      cargando,
      estaAutenticado: Boolean(authUser),
      puede,
      recargarUsuario,
      cerrarSesion,
    }),
    [
      authUser,
      usuario,
      rol,
      cargando,
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