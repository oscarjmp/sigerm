'use client';
import React from "react";
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
const articulosAgrupados = articulosFiltrados.reduce(
  (grupos, articulo) => {

    const categoria = articulo.categoria || "SIN CATEGORÍA";

    if (!grupos[categoria]) {
      grupos[categoria] = [];
    }

    grupos[categoria].push(articulo);

    return grupos;

  },
  {} as Record<string, Articulo[]>
);
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

  {Object.entries(articulosAgrupados).map(([categoria, lista]) => (

    <React.Fragment key={categoria}>

      <tr className="bg-gray-100 text-slate-700 border-b border-gray-300">

        <td
          colSpan={7}
          className="p-4 text-lg font-bold uppercase tracking-wide"
        >
          📂 {categoria}

          <span className="ml-3 text-sm font-normal text-gray-500">
            {lista.length} artículos •{" "}
            {lista.reduce((suma, a) => suma + a.cantidad, 0)} existencias
          </span>

        </td>

      </tr>

      {lista.map((articulo) => (

        <tr
          key={articulo.id}
          className="border-t hover:bg-slate-50 transition-colors"
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

          <td className="font-medium">
            {articulo.codigo}
          </td>

          <td className="font-medium">
            {articulo.nombre}
          </td>

          <td>
            {articulo.categoria}
          </td>

          <td className="text-center font-semibold">
            {articulo.cantidad}
          </td>

          <td className="text-center">

            {articulo.estado === "Bueno" && (

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  bg-emerald-50
                  text-emerald-700
                  border
                  border-emerald-100
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-medium
                "
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                Bueno
              </span>

            )}

            {articulo.estado === "Regular" && (

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  bg-amber-50
                  text-amber-700
                  border
                  border-amber-100
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-medium
                "
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                Regular
              </span>

            )}

            {articulo.estado === "Malo" && (

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  bg-rose-50
                  text-rose-700
                  border
                  border-rose-100
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-medium
                "
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                Malo
              </span>

            )}

          </td>

          <td>

            <div className="flex justify-center gap-2">

              <Link
                href={`/inventario/editar/${articulo.id}`}
                className="
                  bg-[#3483FA]
                  hover:bg-[#2968C8]
                  text-white
                  font-medium
                  px-4
                  py-2
                  rounded-xl
                  shadow-sm
                  transition-all
                  duration-200
                "
              >
                Editar
              </Link>

              <button
                onClick={() => eliminarArticulo(articulo.id)}
                className="
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  font-medium
                  px-4
                  py-2
                  rounded-xl
                  shadow-sm
                  transition-all
                  duration-200
                "
              >
                Eliminar
              </button>

            </div>

          </td>

        </tr>

      ))}

    </React.Fragment>

  ))}

</tbody>

        </table>

      </div>

    </>

  );

}