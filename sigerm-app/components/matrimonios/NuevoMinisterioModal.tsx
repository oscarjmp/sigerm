"use client";

import { useState } from "react";

import { guardarMinisterio } from "@/lib/services/ministerios";
import { notificar } from "@/lib/notificaciones";

type Props = {
  open: boolean;
  onClose: () => void;
  onGuardado: (nombre: string) => void;
};

export default function NuevoMinisterioModal({
  open,
  onClose,
  onGuardado,
}: Props) {

  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  async function guardar() {

    if (!nombre.trim()) {

      notificar.advertencia(
        "Capture el nombre del ministerio."
      );

      return;

    }

    setGuardando(true);

    const { error } = await guardarMinisterio(nombre);

    setGuardando(false);

    if (error) {

      notificar.error(error.message);

      return;

    }

    notificar.exito(
      "Ministerio agregado correctamente."
    );

    setNombre("");

  onGuardado(nombre.toUpperCase());

onClose();

  }

  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        <div className="border-b px-6 py-5">

          <h2 className="text-xl font-bold">

            ➕ Nuevo Ministerio

          </h2>

        </div>

        <div className="p-6">

          <label className="block mb-2 font-medium">

            Nombre

          </label>

          <input
            type="text"
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value.toUpperCase())
            }
            className="
              w-full
              rounded-xl
              border
              border-gray-300
              px-4
              py-3
            "
          />

        </div>

        <div className="flex justify-end gap-3 p-6 border-t">

          <button
            onClick={onClose}
            className="
              px-5
              py-3
              rounded-xl
              border
            "
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            disabled={guardando}
            className="
              bg-[#3483FA]
              text-white
              px-5
              py-3
              rounded-xl
            "
          >
            {guardando
              ? "Guardando..."
              : "Guardar"}
          </button>

        </div>

      </div>

    </div>

  );

}