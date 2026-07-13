'use client';

import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
};

export default function Header({
  onMenuClick,
}: Props) {
  return (

    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm">

      <div className="flex items-center gap-4">

        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>

        <div>

          <h1 className="text-2xl font-bold text-slate-800">
            SIGERM
          </h1>

        </div>

      </div>

      <div className="hidden md:block text-gray-600 font-medium">

        Administrador

      </div>

    </header>

  );

}