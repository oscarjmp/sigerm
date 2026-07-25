"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthChangeEvent,
  Session,
  User,
} from "@supabase/supabase-js";

import {
  TODOS_LOS_ROLES,
  type NombreRol,
} from "@/lib/constants/roles";
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

  const montadoRef = useRef(true);

  const usuarioRepository = useMemo(
    () => crearUsuarioRepository(supabase),
    [],
  );

  const limpiarAutenticacion = useCallback(() => {
    if (!montadoRef.current) {
      return;
    }

    setAuthUser(null);
    setUsuario(null);
  }, []);

  const cargarPerfil = useCallback(
    async (user: User | null) => {
      if (!montadoRef.current) {
        return;
      }

      if (!user) {
        limpiarAutenticacion();
        return;
      }

      setAuthUser(user);

      try {
        const perfil =
          await usuarioRepository.obtenerPorAuthId(
            user.id,
          );

        if (!montadoRef.current) {
          return;
        }

        if (!perfil) {
          console.warn(
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
      } catch (error) {
        console.error(
          "No fue posible cargar el perfil del usuario:",
          error,
        );

        limpiarAutenticacion();

        throw error;
      }
    },
    [
      limpiarAutenticacion,
      usuarioRepository,
    ],
  );

  const cargarSesionActual = useCallback(
    async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new Error(
          `No fue posible obtener la sesión: ${error.message}`,
        );
      }

      await cargarPerfil(
        session?.user ?? null,
      );
    },
    [cargarPerfil],
  );

  const recargarUsuario =
    useCallback(async () => {
      if (montadoRef.current) {
        setCargando(true);
      }

      try {
        await cargarSesionActual();
      } finally {
        if (montadoRef.current) {
          setCargando(false);
        }
      }
    }, [cargarSesionActual]);

  useEffect(() => {
    montadoRef.current = true;

    async function iniciarAutenticacion() {
      try {
        await cargarSesionActual();
      } catch (error) {
        console.error(
          "Error al cargar la autenticación:",
          error,
        );

        limpiarAutenticacion();
      } finally {
        if (montadoRef.current) {
          setCargando(false);
        }
      }
    }

    void iniciarAutenticacion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (
        _event: AuthChangeEvent,
        session: Session | null,
      ) => {
        if (montadoRef.current) {
          setCargando(true);
        }

        void cargarPerfil(
          session?.user ?? null,
        )
          .catch((error) => {
            console.error(
              "Error al actualizar la autenticación:",
              error,
            );
          })
          .finally(() => {
            if (montadoRef.current) {
              setCargando(false);
            }
          });
      },
    );

    return () => {
      montadoRef.current = false;
      subscription.unsubscribe();
    };
  }, [
    cargarPerfil,
    cargarSesionActual,
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
      cuentaActiva &&
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

      return tienePermiso(
        rol,
        permiso,
      );
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