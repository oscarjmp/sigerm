"use client";

import { useState } from "react";
import ArticuloForm from "./ArticuloForm";

export default function NuevoArticuloModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg font-semibold transition"
      >
        ➕ Nuevo artículo
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            {/* Encabezado */}

            <div className="flex items-center justify-between border-b px-6 py-5">

              <h2 className="text-2xl font-bold text-slate-800">
                📦 Nuevo artículo
              </h2>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-red-600 text-3xl transition"
              >
                ×
              </button>

            </div>

            {/* Formulario */}

            <div className="p-6">

              <ArticuloForm
                cerrar={() => setOpen(false)}
              />

            </div>

          </div>

        </div>
      )}
    </>
  );
}