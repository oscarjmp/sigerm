'use client';

import Image from "next/image";
import Link from "next/link";

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
  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col shadow-xl">

      {/* Encabezado */}

      <div className="p-6 border-b border-slate-700 flex flex-col items-center">

        <Image
          src="/logo.png"
          alt="SIGERM"
          width={110}
          height={110}
          priority
          className="mb-4"
        />

        <h1 className="text-2xl font-bold tracking-wide">
          SIGERM
        </h1>

        <p className="text-center text-xs text-slate-400 mt-2 leading-5">
          Sistema Integral de Gestión para
          <br />
          Encuentros de Renovación Matrimonial
        </p>

      </div>

      {/* Menú */}

      <nav className="flex-1 py-4">

        {menus.map((item) => {

          const Icon = item.icon;

          return (

            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-6 py-4 hover:bg-slate-800 transition-colors duration-200"
            >

              <Icon size={20} />

              <span>{item.name}</span>

            </Link>

          );

        })}

      </nav>

      {/* Pie */}

      <div className="border-t border-slate-700 p-6">

        <button className="flex items-center gap-3 text-red-300 hover:text-white transition">

          <LogOut size={20} />

          Cerrar sesión

        </button>

      </div>

    </aside>
  );
}