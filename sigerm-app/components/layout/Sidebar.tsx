"use client";

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
  UserCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { PERMISOS, type Permiso } from "@/lib/permissions/permissions";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
    name: "Préstamos",
    href: "/prestamos",
    icon: HandHelping,
    permiso: PERMISOS.VER_PRESTAMOS,
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
    href: "/reportes",
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
    permiso: PERMISOS.ADMINISTRAR_CONFIGURACION,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { puede, cargando, cerrarSesion } = useAuth();

  const menusPermitidos = cargando
    ? []
    : menus.filter((item) => puede(item.permiso));

  async function manejarCierreSesion() {
    try {
      await cerrarSesion();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la sesión.";

      alert(mensaje);
    }
  }

  return (
    <aside className="flex min-h-screen w-72 flex-col bg-[#1E3A5F] text-white shadow-2xl">
      <div className="flex flex-col items-center border-b border-white/10 bg-gradient-to-b from-[#24476F] to-[#1E3A5F] p-8">
        <Image
          src="/logo.png"
          alt="SIGERM"
          width={105}
          height={105}
          priority
          className="h-auto w-[105px] drop-shadow-xl"
        />

        <h1 className="mt-5 text-3xl font-bold tracking-wide">
          SIGERM
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-blue-100">
          Sistema Integral de Gestión
          <br />
          para Encuentros de
          <br />
          Renovación Matrimonial
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {cargando && (
          <div className="px-4 py-3 text-sm text-blue-100">
            Cargando menú...
          </div>
        )}

        {!cargando &&
          menusPermitidos.map((item) => {
            const Icon = item.icon;

            const activo =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`
                  flex items-center gap-4 rounded-xl px-4 py-3
                  transition-all duration-300
                  ${
                    activo
                      ? "bg-[#FFD54F] text-slate-900 shadow-lg"
                      : "text-white hover:bg-[#2C537E]"
                  }
                `}
              >
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-lg
                    ${activo ? "bg-white" : "bg-white/10"}
                  `}
                >
                  <Icon size={20} />
                </div>

                <span className="font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-white/10 p-5">
        <button
          type="button"
          onClick={manejarCierreSesion}
          className="
            group flex w-full items-center justify-between
            rounded-2xl px-4 py-3
            transition-all duration-300
            hover:bg-red-500/15 hover:shadow-lg
          "
        >
          <div className="flex items-center gap-4">
            <div
              className="
                flex h-11 w-11 items-center justify-center
                rounded-xl bg-red-500/15
                transition-all duration-300
                group-hover:bg-red-500
              "
            >
              <LogOut
                size={20}
                className="
                  text-red-300
                  transition-all
                  group-hover:text-white
                "
              />
            </div>

            <span
              className="
                font-semibold text-red-200
                transition-all
                group-hover:text-white
              "
            >
              Cerrar sesión
            </span>
          </div>

          <span
            className="
              translate-x-2 text-red-300 opacity-0
              transition-all
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