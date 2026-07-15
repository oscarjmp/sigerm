"use client";

import { ReactNode, useState } from "react";
import type { Matrimonio } from "@/types/matrimonio";
import MatrimonioForm from "./MatrimonioForm";

type Props = {
  matrimonio?: Matrimonio;
  trigger?: ReactNode;
};

export default function MatrimonioModal({
  matrimonio,
  trigger,
}: Props) {

  const [open, setOpen] = useState(false);

  return (
    <>
{trigger ? (

  <div
    onClick={() => setOpen(true)}
    className="inline-block cursor-pointer"
  >
    {trigger}
  </div>

) : (

  <button
    onClick={() => setOpen(true)}
    className="
      bg-[#3483FA]
      hover:bg-[#2968C8]
      text-white
      font-medium
      px-6
      py-3
      rounded-xl
      shadow-md
      hover:shadow-lg
      transition-all
      duration-200
    "
  >
    + Nuevo Matrimonio
  </button>

)}

      {open && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            {/* Encabezado */}

            <div className="flex items-center justify-between border-b px-6 py-5">

              <h2 className="text-2xl font-bold text-slate-800">

                {matrimonio
                  ? "✏️ Editar Matrimonio"
                  : "👫 Nuevo Matrimonio"}

              </h2>

              <button
                onClick={() => setOpen(false)}
                className="
                  text-gray-500
                  hover:text-red-600
                  text-3xl
                  transition
                "
              >
                ×
              </button>

            </div>

            {/* Formulario */}

            <div className="p-6">

              <MatrimonioForm
                matrimonio={matrimonio}
                cerrar={() => setOpen(false)}
              />

            </div>

          </div>

        </div>

      )}

    </>
  );

}