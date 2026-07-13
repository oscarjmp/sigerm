'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  HeartHandshake,
  HandHelping,
  Users,
  UserCheck,
  ClipboardList,
  Settings,
  LogOut,
  Package2,
} from "lucide-react";

const menus = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inventario",
    href: "/inventario",
    icon: Package2,
  },
  {
    name: "Préstamos",
    href: "/prestamos",
    icon: HandHelping,
  },
  {
    name: "Encuentros",
    href: "/encuentros",
    icon: HeartHandshake,
  },
  {
    name: "Matrimonios",
    href: "/matrimonios",
    icon: Users,
  },
  {
    name: "Servidores",
    href: "/servidores",
    icon: UserCheck,
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: ClipboardList,
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

export default function Sidebar() {

  const pathname = usePathname();

  return (

    <aside className="w-72 min-h-screen bg-[#1E3A5F] text-white flex flex-col shadow-2xl">

      {/* Logo */}

      <div className="p-8 border-b border-white/10 flex flex-col items-center bg-gradient-to-b from-[#24476F] to-[#1E3A5F]">

        <Image
          src="/logo.png"
          alt="SIGERM"
          width={105}
          height={105}
          priority
          className="drop-shadow-xl"
        />

        <h1 className="mt-5 text-3xl font-bold tracking-wide">
          SIGERM
        </h1>

        <p className="mt-3 text-center text-sm text-blue-100 leading-6">
          Sistema Integral de Gestión
          <br />
          para Encuentros de
          <br />
          Renovación Matrimonial
        </p>

      </div>

      {/* Menú */}

      <nav className="flex-1 px-4 py-6 space-y-2">

        {menus.map((item) => {

          const Icon = item.icon;

          const activo =
            pathname === item.href;

          return (

            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center
                gap-4
                px-4
                py-3
                rounded-xl
                transition-all
                duration-300

                ${
                  activo
                    ? "bg-[#FFD54F] text-slate-900 shadow-lg"
                    : "hover:bg-[#2C537E] text-white"
                }
              `}
            >

              <div
                className={`
                  w-10
                  h-10
                  rounded-lg
                  flex
                  items-center
                  justify-center

                  ${
                    activo
                      ? "bg-white"
                      : "bg-white/10"
                  }
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

      {/* Pie */}

      <div className="border-t border-white/10 p-5">

        <button
          className="
            w-full
            flex
            items-center
            gap-3
            rounded-xl
            px-4
            py-3
            text-red-200
            hover:bg-red-500
            hover:text-white
            transition-all
          "
        >

          <LogOut size={20} />

          <span>

            Cerrar sesión

          </span>

        </button>

      </div>

    </aside>

  );

}