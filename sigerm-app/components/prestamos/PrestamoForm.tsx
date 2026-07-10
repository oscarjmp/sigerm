'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Articulo = {
  id: string;
  nombre: string;
  cantidad: number;
};

type Props = {
  articulos: Articulo[];
};

export default function PrestamoForm({
  articulos,
}: Props) {

  const router = useRouter();

  const [persona, setPersona] = useState("");
  const [articuloId, setArticuloId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");

  async function guardarPrestamo() {

    if (!persona || !articuloId) {
      alert("Complete toda la información.");
      return;
    }

    const articulo = articulos.find(
      a => a.id === articuloId
    );

    if (!articulo) return;

    if (cantidad > articulo.cantidad) {
      alert("No hay existencias suficientes.");
      return;
    }

    const { error } = await supabase
      .from("prestamos")
      .insert({
        persona,
        articulo_id: articuloId,
        cantidad,
        observaciones,
        estado: "Prestado"
      });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("articulos")
      .update({
        cantidad: articulo.cantidad - cantidad
      })
      .eq("id", articuloId);

    alert("Préstamo registrado.");

    router.refresh();

    setPersona("");
    setArticuloId("");
    setCantidad(1);
    setObservaciones("");

  }

  return (

    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">

      <h2 className="text-2xl font-bold mb-6">

        Nuevo préstamo

      </h2>

      <div className="grid grid-cols-2 gap-4">

        <input
          placeholder="Nombre de la persona"
          value={persona}
          onChange={(e)=>setPersona(e.target.value)}
          className="border rounded-lg p-3"
        />

        <select
          value={articuloId}
          onChange={(e)=>setArticuloId(e.target.value)}
          className="border rounded-lg p-3"
        >

          <option value="">
            Seleccione un artículo
          </option>

          {articulos.map((a)=>(
            <option
              key={a.id}
              value={a.id}
            >
              {a.nombre} ({a.cantidad})
            </option>
          ))}

        </select>

        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e)=>setCantidad(Number(e.target.value))}
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e)=>setObservaciones(e.target.value)}
          className="border rounded-lg p-3"
        />

      </div>

      <button
        onClick={guardarPrestamo}
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        Registrar préstamo
      </button>

    </div>

  );

}