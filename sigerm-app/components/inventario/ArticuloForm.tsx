'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { notificar } from "@/lib/notificaciones";

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
  cerrar?: () => void;
};

export default function ArticuloForm({
  articulo,
  cerrar,
}: Props) {

  const router = useRouter();

  const [codigo, setCodigo] = useState(
    articulo?.codigo ?? ""
  );

  const [nombre, setNombre] = useState(
    articulo?.nombre ?? ""
  );

  const [categoria, setCategoria] = useState(
    articulo?.categoria ?? ""
  );

  const [cantidad, setCantidad] = useState(
    articulo?.cantidad ?? 1
  );

  const [estado, setEstado] = useState(
    articulo?.estado ?? "Bueno"
  );

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string>(articulo?.imagen ?? "");

  const [guardando, setGuardando] =
    useState(false);

  async function obtenerCodigoAutomatico(
    categoriaSeleccionada: string
  ) {

    if (articulo) return;

    if (!categoriaSeleccionada) {

      setCodigo("");

      return;

    }

    const { data, error } =
      await supabase.rpc(
        "generar_codigo_articulo",
        {
          categoria: categoriaSeleccionada,
        }
      );

    if (error) {

      notificar.error(error.message);

      return;

    }

    if (data) {

      setCodigo(data);

    }

  }

  async function guardarArticulo() {

    if (!codigo || !nombre) {

      notificar.advertencia(
        "Código y nombre son obligatorios."
      );

      return;

    }

    setGuardando(true);

    let urlImagen = articulo?.imagen ?? "";
        if (imagen) {

      const nombreArchivo =
        `${Date.now()}-${imagen.name}`;

      const { error: uploadError } =
        await supabase.storage
          .from("articulos")
          .upload(nombreArchivo, imagen);

      if (uploadError) {

        notificar.error(uploadError.message);

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

          nombre: nombre.toUpperCase(),

          categoria: categoria.toUpperCase(),

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

          nombre: nombre.toUpperCase(),

          categoria: categoria.toUpperCase(),

          cantidad,

          estado,

          imagen: urlImagen,

        }));

    }

    setGuardando(false);

    if (error) {

      notificar.error(error.message);

      return;

    }

    notificar.exito(

      articulo
        ? "Artículo actualizado correctamente."
        : "Artículo registrado correctamente."

    );

    if (articulo) {

      router.push("/inventario");

      return;

    }

    cerrar?.();

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
          type="text"
          value={codigo}
          readOnly
          placeholder="Código automático"
          className="
            border
            rounded-lg
            p-3
            bg-gray-100
            text-gray-700
            cursor-not-allowed
          "
        />

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) =>
            setNombre(
              e.target.value.toUpperCase()
            )
          }
          className="
            border
            rounded-lg
            p-3
          "
        />

        <select
          value={categoria}
          onChange={async (e) => {

            const valor = e.target.value;

            setCategoria(valor);

            await obtenerCodigoAutomatico(valor);

          }}
          className="
            border
            rounded-lg
            p-3
          "
        >
          <option value="">
            Seleccione...
          </option>

          <option>Religiosos</option>
          <option>Alimentos</option>
          <option>Papelería</option>
          <option>Didácticos</option>
          <option>Mobiliario</option>
          <option>Electrónicos</option>
          <option>Audio y Video</option>
          <option>Decoración</option>
          <option>Cocina</option>
          <option>Limpieza</option>
          <option>Otros</option>

        </select>
                <input
          type="number"
          value={cantidad}
          min={1}
          onChange={(e) =>
            setCantidad(Number(e.target.value))
          }
          className="
            border
            rounded-lg
            p-3
          "
        />

        <select
          value={estado}
          onChange={(e) =>
            setEstado(e.target.value)
          }
          className="
            border
            rounded-lg
            p-3
          "
        >
          <option>Bueno</option>
          <option>Regular</option>
          <option>Malo</option>
        </select>

        <label
          className="
            col-span-2
            border-2
            border-dashed
            border-blue-300
            rounded-xl
            p-10
            text-center
            cursor-pointer
            hover:border-blue-500
            hover:bg-blue-50
            transition
          "
        >

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {

              const archivo =
                e.target.files?.[0];

              if (!archivo) return;

              setImagen(archivo);

              setPreview(
                URL.createObjectURL(archivo)
              );

            }}
          />

          <div className="text-6xl">

            📷

          </div>

          <p className="mt-4 font-semibold text-slate-700">

            Arrastra una imagen aquí

          </p>

          <p className="text-gray-500">

            o haz clic para seleccionarla

          </p>

        </label>

        {preview && (

          <div className="col-span-2 flex justify-center mt-4">

            <img
              src={preview}
              alt="Vista previa"
              className="
                w-72
                h-72
                object-cover
                rounded-2xl
                shadow-xl
                border-4
                border-white
              "
            />

          </div>

        )}

      </div>
            <div className="flex gap-4 mt-6">

        <button
          type="button"
          onClick={guardarArticulo}
          disabled={guardando}
          className="
            bg-[#3483FA]
            hover:bg-[#2968C8]
            disabled:bg-blue-300
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
          {guardando
            ? "Guardando..."
            : articulo
              ? "Actualizar"
              : "Guardar artículo"}
        </button>

        <button
          type="button"
          onClick={() => {

            if (guardando) return;

            if (cerrar) {

              cerrar();

            } else {

              router.push("/inventario");

            }

          }}
          className="
            bg-white
            border
            border-gray-300
            text-gray-700
            font-medium
            px-6
            py-3
            rounded-xl
            hover:bg-gray-100
            transition-all
            duration-200
          "
        >
          Cancelar
        </button>

      </div>

    </div>

  );

}