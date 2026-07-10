'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Articulo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  estado: string;
  imagen: string | null;
};

type Props = {
  articulos: Articulo[];
};

export default function TablaInventario({ articulos }: Props) {

  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");

  const articulosFiltrados = articulos.filter((articulo) => {

    const texto = busqueda.toLowerCase();

    return (
      articulo.codigo.toLowerCase().includes(texto) ||
      articulo.nombre.toLowerCase().includes(texto) ||
      articulo.categoria.toLowerCase().includes(texto)
    );

  });

  async function eliminarArticulo(id: string) {

    if (!confirm("¿Desea eliminar este artículo?")) return;

    const { error } = await supabase
      .from("articulos")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Artículo eliminado.");

    router.refresh();

  }

  return (

    <>

      <div className="mb-5">

        <input
          type="text"
          placeholder="🔍 Buscar por código, nombre o categoría..."
          value={busqueda}
          onChange={(e)=>setBusqueda(e.target.value)}
          className="w-full border rounded-xl p-3 shadow-sm"
        />

      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="p-4">Foto</th>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">Nombre</th>
              <th className="text-left p-4">Categoría</th>
              <th className="text-left p-4">Cantidad</th>
              <th className="text-left p-4">Estado</th>
              <th className="text-center p-4">Acciones</th>

            </tr>

          </thead>

          <tbody>

            {articulosFiltrados.map((articulo)=>(

              <tr
                key={articulo.id}
                className="border-t hover:bg-slate-50"
              >

                <td className="p-4">

                  {articulo.imagen ? (

                    <Image
                      src={articulo.imagen}
                      alt={articulo.nombre}
                      width={70}
                      height={70}
                      className="rounded-lg object-cover"
                    />

                  ) : (

                    <div className="w-[70px] h-[70px] bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">

                      Sin foto

                    </div>

                  )}

                </td>

                <td>{articulo.codigo}</td>

                <td>{articulo.nombre}</td>

                <td>{articulo.categoria}</td>

                <td>{articulo.cantidad}</td>

                <td>

                  {articulo.estado==="Bueno" && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      🟢 Bueno
                    </span>
                  )}

                  {articulo.estado==="Regular" && (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      🟡 Regular
                    </span>
                  )}

                  {articulo.estado==="Malo" && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
                      🔴 Malo
                    </span>
                  )}

                </td>

                <td>

                  <div className="flex justify-center gap-2">

                    <Link
                      href={`/inventario/editar/${articulo.id}`}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                    >
                      Editar
                    </Link>

                    <button
                      onClick={()=>eliminarArticulo(articulo.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      Eliminar
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </>

  );

}