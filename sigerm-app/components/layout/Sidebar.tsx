"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  HandHelping,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Package2,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Users,
  Warehouse,
} from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  PERMISOS,
  type Permiso,
} from "@/lib/permissions/permissions";

type IconoMenu = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

type MenuItem = {
  name: string;
  href: string;
  icon: IconoMenu;
  permiso: Permiso;
};

const menus: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permiso: PERMISOS.VER_DASHBOARD,
  },
  {
    name: "Inventario",
    href: "/inventario",
    icon: Package2,
    permiso: PERMISOS.VER_INVENTARIO,
  },
  {
    name: "Catálogo",
    href: "/catalogo",
    icon: ShoppingBag,
    permiso: PERMISOS.VER_CATALOGO,
  },
  {
    name: "Préstamos",
    href: "/prestamos",
    icon: HandHelping,
    permiso: PERMISOS.VER_PRESTAMOS,
  },
  {
    name: "Kardex",
    href: "/kardex",
    icon: Warehouse,
    permiso: PERMISOS.VER_KARDEX,
  },
  {
    name: "Encuentros",
    href: "/encuentros",
    icon: HeartHandshake,
    permiso: PERMISOS.VER_ENCUENTROS,
  },
  {
    name: "Matrimonios",
    href: "/matrimonios",
    icon: Users,
    permiso: PERMISOS.VER_MATRIMONIOS,
  },
  {
    name: "Servidores",
    href: "/servidores",
    icon: UserCheck,
    permiso: PERMISOS.VER_SERVIDORES,
  },
  {
    name: "Reportes",
    href: "/reportes/inventario",
    icon: ClipboardList,
    permiso: PERMISOS.VER_REPORTES,
  },
  {
    name: "Usuarios",
    href: "/administracion/usuarios",
    icon: ShieldCheck,
    permiso: PERMISOS.ADMINISTRAR_USUARIOS,
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
    permiso:
      PERMISOS.ADMINISTRAR_CONFIGURACION,
  },
];

function rutaActiva(
  pathname: string,
  href: string,
): boolean {
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const {
    puede,
    cargando,
    estaAutenticado,
    cerrarSesion,
  } = useAuth();

  const menusPermitidos =
    !cargando && estaAutenticado
      ? menus.filter((item) =>
          puede(item.permiso),
        )
      : [];

  async function manejarCierreSesion() {
    try {
      await cerrarSesion();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la sesión.";

      window.alert(mensaje);
    }
  }

  return (
    <aside
      className="
        relative flex h-screen w-72
        shrink-0 flex-col overflow-hidden
        border-r border-white/10
        bg-[linear-gradient(180deg,#173A63_0%,#234B77_48%,#3B82F6_100%)]
        text-white
        shadow-[18px_0_45px_rgba(30,58,95,0.20)]
        transition-all duration-500
      "
    >
      {/* Luces ambientales */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-24 -top-36
          h-72 w-72 rounded-full
          bg-blue-400/30 blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -bottom-28 -left-24
          h-72 w-72 rounded-full
          bg-cyan-300/20 blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute left-1/2 top-1/3
          h-48 w-48 -translate-x-1/2
          rounded-full bg-white/5 blur-3xl
        "
      />

      {/* Identidad institucional */}
      <div
        className="
          relative z-10 shrink-0
          overflow-hidden
          border-b border-white/10
          bg-gradient-to-b
          from-white/10
          via-white/5
          to-transparent
          px-6 pb-7 pt-6
          backdrop-blur-xl
        "
      >
        <div className="relative flex flex-col items-center">
          <div
            className="
              flex h-28 w-28
              items-center justify-center
              rounded-full
              bg-white/10
              ring-1 ring-white/20
              shadow-[0_18px_40px_rgba(15,23,42,0.22)]
              backdrop-blur-xl
            "
          >
            <Image
              src="/logo.png"
              alt="Logotipo de SIGERM"
              width={100}
              height={100}
              priority
              className="
                h-auto w-[100px]
                object-contain
                drop-shadow-2xl
              "
              style={{
                width: "100px",
                height: "auto",
              }}
            />
          </div>

          <h1
            className="
              mt-4 text-3xl font-black
              tracking-wide text-white
              drop-shadow-sm
            "
          >
            SIGERM
          </h1>

          <div
            className="
              mt-2 h-1 w-14
              rounded-full
              bg-gradient-to-r
              from-[#FFD54F]
              to-[#FFC933]
              shadow-[0_0_18px_rgba(255,213,79,0.45)]
            "
          />

          <p
            className="
              mt-4 text-center
              text-sm leading-6
              text-blue-50
            "
          >
            Sistema Integral de Gestión
            <br />
            para Encuentros de
            <br />
            Renovación Matrimonial
          </p>
        </div>
      </div>

      {/* Menú principal */}
      <nav
        aria-label="Menú principal"
        className="
          relative z-10
          min-h-0 flex-1
          space-y-2
          overflow-y-auto
          overscroll-contain
          px-4 py-5
          pr-3
          [scrollbar-color:rgba(255,255,255,0.45)_rgba(255,255,255,0.08)]
          [scrollbar-width:thin]
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:rounded-full
          [&::-webkit-scrollbar-track]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-white/40
          hover:[&::-webkit-scrollbar-thumb]:bg-white/60
        "
      >
        {cargando && (
          <div
            className="
              flex items-center gap-3
              rounded-2xl
              border border-white/10
              bg-white/8 px-4 py-4
              text-sm text-blue-50
              backdrop-blur-md
            "
          >
            <span
              className="
                h-4 w-4 animate-spin
                rounded-full
                border-2 border-white/30
                border-t-white
              "
            />

            Cargando menú...
          </div>
        )}

        {!cargando &&
          estaAutenticado &&
          menusPermitidos.length === 0 && (
            <div
              className="
                rounded-2xl
                border border-white/10
                bg-white/8
                px-4 py-4
                text-sm leading-6
                text-blue-50
                backdrop-blur-md
              "
            >
              No tiene módulos asignados.
            </div>
          )}

        {menusPermitidos.map((item) => {
          const Icon = item.icon;
          const activo = rutaActiva(
            pathname,
            item.href,
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                activo ? "page" : undefined
              }
              className={`
                group relative
                flex min-h-14
                items-center gap-4
                overflow-hidden
                rounded-2xl
                px-4 py-3
                transition-all
                duration-300
                focus-visible:outline-none
                focus-visible:ring-4
                focus-visible:ring-[#FFD54F]/30
                ${
                  activo
                    ? `
                      bg-gradient-to-r
                      from-[#FFD54F]
                      to-[#FFC933]
                      text-slate-900
                      shadow-[0_12px_35px_rgba(255,200,0,0.35)]
                    `
                    : `
                      text-white
                      hover:translate-x-1
                      hover:bg-white/12
                      hover:backdrop-blur-md
                      hover:shadow-lg
                    `
                }
              `}
            >
              {activo && (
                <span
                  aria-hidden="true"
                  className="
                    absolute inset-y-3 left-0
                    w-1 rounded-r-full
                    bg-[#3483FA]
                    shadow-[0_0_14px_rgba(52,131,250,0.75)]
                  "
                />
              )}

              <div
                className={`
                  relative z-10
                  flex h-10 w-10
                  shrink-0 items-center
                  justify-center
                  rounded-xl
                  backdrop-blur-md
                  transition-all
                  duration-300
                  ${
                    activo
                      ? `
                        scale-105
                        bg-white
                        text-[#1E3A5F]
                        shadow-sm
                      `
                      : `
                        bg-white/12
                        text-white
                        group-hover:scale-105
                        group-hover:bg-white/18
                      `
                  }
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                />
              </div>

              <span
                className="
                  relative z-10
                  truncate
                  font-semibold
                  tracking-[0.01em]
                "
              >
                {item.name}
              </span>

              {activo && (
                <span
                  aria-hidden="true"
                  className="
                    relative z-10
                    ml-auto h-2.5 w-2.5
                    shrink-0 rounded-full
                    bg-[#3483FA]
                    shadow-[0_0_18px_rgba(96,165,250,0.95)]
                  "
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Cierre de sesión */}
      <div
        className="
          relative z-10 shrink-0
          border-t border-white/10
          bg-white/5
          p-4
          backdrop-blur-xl
        "
      >
        <button
          type="button"
          onClick={manejarCierreSesion}
          disabled={cargando}
          className="
            group flex min-h-14
            w-full items-center
            justify-between
            rounded-2xl
            border border-transparent
            px-4 py-3
            text-left
            transition-all
            duration-300
            hover:border-red-300/20
            hover:bg-red-500/20
            hover:shadow-lg
            focus-visible:outline-none
            focus-visible:ring-4
            focus-visible:ring-red-300/20
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="
                flex h-10 w-10
                shrink-0 items-center
                justify-center
                rounded-xl
                bg-red-500/15
                backdrop-blur-md
                transition-all
                duration-300
                group-hover:scale-105
                group-hover:bg-red-500
                group-hover:shadow-md
              "
            >
              <LogOut
                size={20}
                strokeWidth={2}
                className="
                  text-red-200
                  transition-colors
                  group-hover:text-white
                "
              />
            </div>

            <span
              className="
                truncate font-semibold
                text-red-100
                transition-colors
                group-hover:text-white
              "
            >
              Cerrar sesión
            </span>
          </div>

          <span
            aria-hidden="true"
            className="
              translate-x-2
              text-lg text-red-200
              opacity-0
              transition-all
              duration-300
              group-hover:translate-x-0
              group-hover:opacity-100
            "
          >
            →
          </span>
        </button>
      </div>
    </aside>
  );
}