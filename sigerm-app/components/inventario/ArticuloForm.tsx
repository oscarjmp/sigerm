'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Articulo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  estado: string;
  imagen: string;
};

type Props = {
  articulo?: Articulo;
};

export default function ArticuloForm({ articulo }: Props) {

  const router = useRouter();

  const [codigo, setCodigo] = useState(articulo?.codigo ?? "");
  const [nombre, setNombre] = useState(articulo?.nombre ?? "");
  const [categoria, setCategoria] = useState(articulo?.categoria ?? "");
  const [cantidad, setCantidad] = useState(articulo?.cantidad ?? 1);
  const [estado, setEstado] = useState(articulo?.estado ?? "Bueno");

  const [imagen, setImagen] = useState<File | null>(null);

  const [guardando, setGuardando] = useState(false);

  async function guardarArticulo() {

    if (!codigo || !nombre) {
      alert("Código y nombre son obligatorios.");
      return;
    }

    setGuardando(true);

    let urlImagen = articulo?.imagen ?? "";

    if (imagen) {

      const nombreArchivo =
        Date.now() + "-" + imagen.name;

      const { error: uploadError } =
        await supabase.storage
          .from("articulos")
          .upload(nombreArchivo, imagen);

      if (uploadError) {
        alert(uploadError.message);
        setGuardando(false);
        return;
      }

      urlImagen = supabase.storage
        .from("articulos")
        .getPublicUrl(nombreArchivo)
        .data.publicUrl;
    }

    let error;

    if (articulo) {

      ({ error } = await supabase
        .from("articulos")
        .update({
          codigo,
          nombre,
          categoria,
          cantidad,
          estado,
          imagen: urlImagen,
        })
        .eq("id", articulo.id));

    } else {

      ({ error } = await supabase
        .from("articulos")
        .insert({
          codigo,
          nombre,
          categoria,
          cantidad,
          estado,
          imagen: urlImagen,
        }));

    }

    setGuardando(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      articulo
        ? "Artículo actualizado correctamente."
        : "Artículo registrado correctamente."
    );

    router.push("/inventario");
    router.refresh();

  }

  return (

    <div className="bg-white rounded-xl shadow-lg p-6">

      <h2 className="text-2xl font-bold mb-6">

        {articulo
          ? "Editar artículo"
          : "Nuevo artículo"}

      </h2>

      <div className="grid grid-cols-2 gap-4">

        <input
          placeholder="Código"
          value={codigo}
          onChange={(e)=>setCodigo(e.target.value)}
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e)=>setNombre(e.target.value)}
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Categoría"
          value={categoria}
          onChange={(e)=>setCategoria(e.target.value)}
          className="border rounded-lg p-3"
        />

        <input
          type="number"
          value={cantidad}
          onChange={(e)=>setCantidad(Number(e.target.value))}
          className="border rounded-lg p-3"
        />

        <select
          value={estado}
          onChange={(e)=>setEstado(e.target.value)}
          className="border rounded-lg p-3"
        >
          <option>Bueno</option>
          <option>Regular</option>
          <option>Malo</option>
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={(e)=>
            setImagen(
              e.target.files
                ? e.target.files[0]
                : null
            )
          }
          className="border rounded-lg p-3"
        />

      </div>

      <div className="flex gap-4 mt-6">

        <button
          onClick={guardarArticulo}
          disabled={guardando}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          {guardando
            ? "Guardando..."
            : articulo
              ? "Actualizar"
              : "Guardar artículo"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/inventario")}
          className="bg-gray-300 px-6 py-3 rounded-lg"
        >
          Cancelar
        </button>

      </div>

    </div>

  );

}