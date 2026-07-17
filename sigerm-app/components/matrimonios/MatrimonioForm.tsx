"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { subirImagen } from "@/lib/storage/imagenes";
import { notificar } from "@/lib/notificaciones";

import {
  guardarMatrimonio,
  actualizarMatrimonio,
} from "@/lib/services/matrimonios";

import {
  obtenerMinisterios,
} from "@/lib/services/ministerios";

import type { Matrimonio } from "@/types/matrimonio";

import NuevoMinisterioModal from "./NuevoMinisterioModal";

type Props = {
  cerrar: () => void;
  matrimonio?: Matrimonio;
};

export default function MatrimonioForm({
  cerrar,
  matrimonio,
}: Props) {

  const router = useRouter();

  const [esposo, setEsposo] = useState(
    matrimonio?.esposo ?? ""
  );

  const [esposa, setEsposa] = useState(
    matrimonio?.esposa ?? ""
  );

  const [telefono, setTelefono] = useState(
    matrimonio?.telefono ?? ""
  );

  const [email, setEmail] = useState(
    matrimonio?.email ?? ""
  );

  const [direccion, setDireccion] = useState(
    matrimonio?.direccion ?? ""
  );

  const [ministerio, setMinisterio] = useState(
    matrimonio?.ministerio ?? ""
  );

  const [ministerios, setMinisterios] = useState<
    {
      id: string;
      nombre: string;
    }[]
  >([]);

  const [
    mostrarNuevoMinisterio,
    setMostrarNuevoMinisterio,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

    const [foto, setFoto] = useState<File | null>(null);

const [preview, setPreview] = useState(
  matrimonio?.foto ?? ""
);
  async function cargarMinisterios() {

    const { data } =
      await obtenerMinisterios();

    if (data) {

      setMinisterios(data);

    }

  }

  useEffect(() => {

    cargarMinisterios();

  }, []);
function seleccionarFoto(
  e: ChangeEvent<HTMLInputElement>
) {

  const archivo = e.target.files?.[0];

  if (!archivo) return;

  setFoto(archivo);

  setPreview(URL.createObjectURL(archivo));

}
  async function guardar() {

    if (!esposo.trim()) {

      notificar.advertencia(
        "Capture el nombre del esposo."
      );

      return;

    }

    if (!esposa.trim()) {

      notificar.advertencia(
        "Capture el nombre de la esposa."
      );

      return;

    }

    if (!ministerio) {

      notificar.advertencia(
        "Seleccione un ministerio."
      );

      return;

    }

setGuardando(true);

let error;

let fotoUrl = matrimonio?.foto ?? null;

if (foto) {

  try {

    fotoUrl = await subirImagen(
      "matrimonios",
      foto
    );

  } catch (e: any) {

  console.error(e);

  notificar.error(
    e.message ?? "No fue posible subir la fotografía."
  );

  setGuardando(false);

  return;

}

}

const datos = {

  esposo: esposo.toUpperCase(),

  esposa: esposa.toUpperCase(),

  telefono,

  email,

  direccion,

  ministerio,

  foto: fotoUrl,

  activo: true,

};
    if (matrimonio) {

      ({ error } =
        await actualizarMatrimonio(
          matrimonio.id,
          datos
        ));

    } else {

      ({ error } =
        await guardarMatrimonio(
          datos
        ));

    }

    setGuardando(false);

    if (error) {

      notificar.error(error.message);

      return;

    }

    notificar.exito(

      matrimonio
        ? "Matrimonio actualizado correctamente."
        : "Matrimonio registrado correctamente."

    );

    cerrar();

    router.refresh();

  }

  return (
    <>
  <form
    onSubmit={(e) => {

      e.preventDefault();

      guardar();

    }}
    className="space-y-6"
  >
{/* Fotografía */}

<div className="flex flex-col items-center gap-4">

  <label className="text-lg font-semibold text-slate-700">
    Fotografía del matrimonio
  </label>

  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-slate-200 bg-slate-100 flex items-center justify-center">

    {preview ? (

      <Image
        src={preview}
        alt="Fotografía"
        width={160}
        height={160}
        className="w-full h-full object-cover"
      />

    ) : (

      <div className="text-5xl">
        👥
      </div>

    )}

  </div>

  <label
    htmlFor="foto"
    className="
      cursor-pointer
      bg-[#3483FA]
      hover:bg-[#2968C8]
      text-white
      px-5
      py-2
      rounded-xl
      shadow
      transition-all
    "
  >
    📷 Seleccionar fotografía
  </label>

  <input
    id="foto"
    type="file"
    accept="image/*"
    onChange={seleccionarFoto}
    className="hidden"
  />

</div>
    {/* Primera fila */}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      <div>

        <label className="block mb-2 font-medium text-slate-700">
          Nombre del esposo *
        </label>

        <input
          type="text"
          value={esposo}
          onChange={(e) =>
            setEsposo(
              e.target.value.toUpperCase()
            )
          }
          placeholder="Nombre del esposo"
          className="
            w-full
            rounded-xl
            border
            border-gray-300
            px-4
            py-3
            focus:outline-none
            focus:ring-2
            focus:ring-[#3483FA]
            transition-all
          "
        />

      </div>

      <div>

        <label className="block mb-2 font-medium text-slate-700">
          Nombre de la esposa *
        </label>

        <input
          type="text"
          value={esposa}
          onChange={(e) =>
            setEsposa(
              e.target.value.toUpperCase()
            )
          }
          placeholder="Nombre de la esposa"
          className="
            w-full
            rounded-xl
            border
            border-gray-300
            px-4
            py-3
            focus:outline-none
            focus:ring-2
            focus:ring-[#3483FA]
            transition-all
          "
        />

      </div>

    </div>

    {/* Segunda fila */}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      <div>

        <label className="block mb-2 font-medium text-slate-700">
          Teléfono
        </label>

        <input
          type="tel"
          value={telefono}
          maxLength={10}
          onChange={(e) =>
            setTelefono(e.target.value)
          }
          placeholder="2461234567"
          className="
            w-full
            rounded-xl
            border
            border-gray-300
            px-4
            py-3
            focus:outline-none
            focus:ring-2
            focus:ring-[#3483FA]
            transition-all
          "
        />

      </div>

      <div>

        <label className="block mb-2 font-medium text-slate-700">
          Correo electrónico
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="correo@ejemplo.com"
          className="
            w-full
            rounded-xl
            border
            border-gray-300
            px-4
            py-3
            focus:outline-none
            focus:ring-2
            focus:ring-[#3483FA]
            transition-all
          "
        />

      </div>

    </div>

       {/* Dirección */}

    <div>

      <label className="block mb-2 font-medium text-slate-700">
        Dirección
      </label>

      <textarea
        rows={4}
        value={direccion}
        onChange={(e) =>
          setDireccion(e.target.value)
        }
        placeholder="Dirección completa"
        className="
          w-full
          rounded-xl
          border
          border-gray-300
          px-4
          py-3
          resize-none
          focus:outline-none
          focus:ring-2
          focus:ring-[#3483FA]
          transition-all
        "
      />

    </div>

    {/* Ministerio */}

    <div>

      <label className="block mb-2 font-medium text-slate-700">
        Ministerio *
      </label>

      <select
        value={ministerio}
        onChange={(e) => {

          const valor = e.target.value;

          if (valor === "__NUEVO__") {

            setMostrarNuevoMinisterio(true);

            return;

          }

          setMinisterio(valor);

        }}
        className="
          w-full
          rounded-xl
          border
          border-gray-300
          px-4
          py-3
          focus:outline-none
          focus:ring-2
          focus:ring-[#3483FA]
          transition-all
        "
      >

        <option value="">
          Seleccione un ministerio...
        </option>

        {ministerios.map((m) => (

          <option
            key={m.id}
            value={m.nombre}
          >
            {m.nombre}
          </option>

        ))}

        <option value="__NUEVO__">
          ➕ Agregar nuevo ministerio...
        </option>

      </select>

    </div>

    {/* Botones */}

    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">

      <button
        type="button"
        disabled={guardando}
        onClick={() => {

          if (guardando) return;

          cerrar();

        }}
        className="
          px-6
          py-3
          rounded-xl
          border
          border-gray-300
          bg-white
          text-gray-700
          font-medium
          hover:bg-gray-100
          disabled:opacity-50
          transition-all
        "
      >
        Cancelar
      </button>

      <button
        type="submit"
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
        "
      >

        {guardando

          ? "Guardando..."

          : matrimonio

            ? "Actualizar matrimonio"

            : "Guardar matrimonio"}

      </button>

    </div>

  </form>

  <NuevoMinisterioModal
    open={mostrarNuevoMinisterio}
    onClose={() =>
      setMostrarNuevoMinisterio(false)
    }
    onGuardado={async (nombre) => {

     await cargarMinisterios();

setMinisterio(nombre);

setMostrarNuevoMinisterio(false);

    }}
  />

  </>

);
}