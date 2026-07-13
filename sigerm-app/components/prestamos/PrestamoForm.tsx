'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Articulo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
};

type ArticuloPrestamo = {
  articulo_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
};

type Props = {
  articulos: Articulo[];
};

export default function PrestamoForm({ articulos }: Props) {

  const router = useRouter();

  //==============================
  // DATOS DEL PRÉSTAMO
  //==============================

  const [folio, setFolio] = useState("");

  const [responsable, setResponsable] = useState("");

  const [solicitante, setSolicitante] = useState("");

  const [telefono, setTelefono] = useState("");

  const [correo, setCorreo] = useState("");

  const [tipoEvento, setTipoEvento] = useState("");

  const [evento, setEvento] = useState("");

  const [lugar, setLugar] = useState("");

  const [fechaDevolucion, setFechaDevolucion] = useState("");

  const [observaciones, setObservaciones] = useState("");

  //==============================
  // ARTÍCULO TEMPORAL
  //==============================

  const [articuloSeleccionado, setArticuloSeleccionado] = useState("");

  const [cantidadArticulo, setCantidadArticulo] = useState(1);

  //==============================
  // CARRITO
  //==============================

  const [detalle, setDetalle] = useState<ArticuloPrestamo[]>([]);

  //==============================
  // CARGANDO
  //==============================

  const [guardando, setGuardando] = useState(false);

  //==============================
  // OBTENER FOLIO
  //==============================

  useEffect(() => {

    obtenerFolio();

  }, []);

  async function obtenerFolio() {

    const { data, error } = await supabase.rpc(
      "generar_folio_prestamo"
    );

    if (!error && data) {

      setFolio(data);

    }

  }
  //==============================
  // AGREGAR ARTÍCULO AL PRÉSTAMO
  //==============================

  function agregarArticulo() {

    if (!articuloSeleccionado) {

      alert("Seleccione un artículo.");

      return;

    }

    const articulo = articulos.find(
      (a) => a.id === articuloSeleccionado
    );

    if (!articulo) return;

    if (cantidadArticulo <= 0) {

      alert("La cantidad debe ser mayor a cero.");

      return;

    }

    if (cantidadArticulo > articulo.cantidad) {

      alert(
        `Solo existen ${articulo.cantidad} unidades disponibles.`
      );

      return;

    }

    const existe = detalle.find(
      (d) => d.articulo_id === articulo.id
    );

    if (existe) {

      alert("Este artículo ya fue agregado.");

      return;

    }

    setDetalle([

      ...detalle,

      {

        articulo_id: articulo.id,

        codigo: articulo.codigo,

        nombre: articulo.nombre,

        cantidad: cantidadArticulo,

      },

    ]);

    setArticuloSeleccionado("");

    setCantidadArticulo(1);

  }

  //==============================
  // ELIMINAR ARTÍCULO
  //==============================

  function eliminarArticulo(id: string) {

    setDetalle(

      detalle.filter(

        (articulo) => articulo.articulo_id !== id

      )

    );

  }

  //==============================
  // TOTAL DE ARTÍCULOS
  //==============================

  const totalArticulos = detalle.reduce(

    (total, articulo) => total + articulo.cantidad,

    0

  );
//==============================
// GUARDAR PRÉSTAMO
//==============================

async function guardarPrestamo() {

  if (!responsable) {
    alert("Capture el responsable.");
    return;
  }

  if (!solicitante) {
    alert("Capture el solicitante.");
    return;
  }

  if (detalle.length === 0) {
    alert("Agregue al menos un artículo.");
    return;
  }

  setGuardando(true);

  //==============================
  // GUARDAR CABECERA
  //==============================

  const { data: prestamo, error } = await supabase
    .from("prestamos")
    .insert({
      folio,
      responsable: responsable.toUpperCase(),
      solicitante: solicitante.toUpperCase(),
      telefono,
      correo,
      tipo_evento: tipoEvento,
      evento: evento.toUpperCase(),
      lugar: lugar.toUpperCase(),
      fecha_devolucion:
        fechaDevolucion || null,
      observaciones:
        observaciones.toUpperCase(),
      estado: "PRESTADO",
    })
    .select()
    .single();

  if (error) {

    setGuardando(false);

    alert(error.message);

    return;

  }

  //==============================
  // GUARDAR DETALLE
  //==============================

  for (const item of detalle) {

    const articulo = articulos.find(
      (a) => a.id === item.articulo_id
    );

    if (!articulo) continue;

   // detalle

const { error: errorDetalle } = await supabase
  .from("detalle_prestamo")
  .insert({
    prestamo_id: prestamo.id,
    articulo_id: item.articulo_id,
    cantidad: item.cantidad,
  });

if (errorDetalle) {
  console.log(JSON.stringify(errorDetalle, null, 2));
  alert(JSON.stringify(errorDetalle, null, 2));
  setGuardando(false);
  return;
}

    // inventario

    await supabase
      .from("articulos")
      .update({

        cantidad:
          articulo.cantidad -
          item.cantidad,

      })
      .eq("id", item.articulo_id);

    // movimientos

    await supabase
      .from("movimientos")
      .insert({

        articulo_id: item.articulo_id,

        prestamo_id: prestamo.id,

        tipo: "SALIDA",

        cantidad: item.cantidad,

        usuario: responsable,

        observaciones:
          "PRÉSTAMO " + folio,

      });

  }

  alert("Préstamo registrado correctamente.");

  setGuardando(false);

  router.refresh();

  //==============================
  // LIMPIAR FORMULARIO
  //==============================

  setResponsable("");
  setSolicitante("");
  setTelefono("");
  setCorreo("");
  setEvento("");
  setLugar("");
  setTipoEvento("");
  setFechaDevolucion("");
  setObservaciones("");

  setDetalle([]);

  setArticuloSeleccionado("");

  setCantidadArticulo(1);

  obtenerFolio();

}
  return (

    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

      <div className="flex items-center justify-between mb-8">

        <div>

          <h2 className="text-3xl font-bold text-slate-800">
            Nuevo préstamo
          </h2>

          <p className="text-gray-500 mt-1">
            Registro de préstamo de artículos
          </p>

        </div>

        <div className="text-right">

          <p className="text-sm text-gray-500">
            Folio
          </p>

          <p className="text-2xl font-bold text-blue-600">
            {folio}
          </p>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-5">

        <input
          placeholder="Responsable"
          value={responsable}
          onChange={(e) =>
            setResponsable(e.target.value.toUpperCase())
          }
          className="border rounded-xl p-3"
        />

        <input
          placeholder="Solicitante"
          value={solicitante}
          onChange={(e) =>
            setSolicitante(e.target.value.toUpperCase())
          }
          className="border rounded-xl p-3"
        />

        <input
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) =>
            setTelefono(e.target.value)
          }
          className="border rounded-xl p-3"
        />

        <input
          placeholder="Correo"
          value={correo}
          onChange={(e) =>
            setCorreo(e.target.value)
          }
          className="border rounded-xl p-3"
        />

        <select
          value={tipoEvento}
          onChange={(e) =>
            setTipoEvento(e.target.value)
          }
          className="border rounded-xl p-3"
        >

          <option value="">
            Tipo de evento
          </option>

          <option>ENCUENTRO</option>

          <option>PRE-ENCUENTRO</option>

          <option>POST-ENCUENTRO</option>

          <option>RETIRO</option>

          <option>OTRO</option>

        </select>

        <input
          placeholder="Evento"
          value={evento}
          onChange={(e) =>
            setEvento(e.target.value.toUpperCase())
          }
          className="border rounded-xl p-3"
        />

        <input
          placeholder="Lugar"
          value={lugar}
          onChange={(e) =>
            setLugar(e.target.value.toUpperCase())
          }
          className="border rounded-xl p-3"
        />

        <input
          type="date"
          value={fechaDevolucion}
          onChange={(e) =>
            setFechaDevolucion(e.target.value)
          }
          className="border rounded-xl p-3"
        />

        <textarea
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) =>
            setObservaciones(
              e.target.value.toUpperCase()
            )
          }
          className="border rounded-xl p-3 col-span-2"
          rows={3}
        />

      </div>

      <hr className="my-8" />      <h3 className="text-xl font-semibold mb-4 text-slate-700">
        Artículos del préstamo
      </h3>

      <div className="grid grid-cols-12 gap-4 items-end">

        <div className="col-span-7">

          <label className="block text-sm font-medium mb-2">
            Artículo
          </label>

          <select
            value={articuloSeleccionado}
            onChange={(e) =>
              setArticuloSeleccionado(e.target.value)
            }
            className="w-full border rounded-xl p-3"
          >

            <option value="">
              Seleccione un artículo...
            </option>

            {articulos.map((articulo) => (

              <option
                key={articulo.id}
                value={articulo.id}
              >
                {articulo.codigo} - {articulo.nombre} ({articulo.cantidad})
              </option>

            ))}

          </select>

        </div>

        <div className="col-span-2">

          <label className="block text-sm font-medium mb-2">
            Cantidad
          </label>

          <input
            type="number"
            min={1}
            value={cantidadArticulo}
            onChange={(e) =>
              setCantidadArticulo(Number(e.target.value))
            }
            className="w-full border rounded-xl p-3"
          />

        </div>

        <div className="col-span-3">

          <button
            type="button"
            onClick={agregarArticulo}
            className="
              w-full
              bg-[#3483FA]
              hover:bg-[#2968C8]
              text-white
              font-medium
              rounded-xl
              p-3
              transition
            "
          >
            + Agregar artículo
          </button>

        </div>

      </div>

      <div className="mt-8 overflow-hidden rounded-xl border">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="text-left p-4">
                Código
              </th>

              <th className="text-left p-4">
                Artículo
              </th>

              <th className="text-center p-4">
                Cantidad
              </th>

              <th className="text-center p-4">
                Acción
              </th>

            </tr>

          </thead>

          <tbody>            
            {detalle.length === 0 ? (

              <tr>

                <td
                  colSpan={4}
                  className="text-center p-8 text-gray-400"
                >

                  No hay artículos agregados.

                </td>

              </tr>

            ) : (

              detalle.map((item) => (

                <tr
                  key={item.articulo_id}
                  className="border-t hover:bg-slate-50"
                >

                  <td className="p-4 font-medium">
                    {item.codigo}
                  </td>

                  <td className="p-4">
                    {item.nombre}
                  </td>

                  <td className="text-center p-4">
                    {item.cantidad}
                  </td>

                  <td className="text-center p-4">

                    <button
                      type="button"
                      onClick={() =>
                        eliminarArticulo(item.articulo_id)
                      }
                      className="
                        bg-red-500
                        hover:bg-red-600
                        text-white
                        px-4
                        py-2
                        rounded-xl
                        transition
                      "
                    >
                      Eliminar
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      <div className="flex justify-between items-center mt-6">

        <div>

          <p className="text-gray-500">

            Total de artículos:

            <span className="font-bold text-blue-600 ml-2">

              {totalArticulos}

            </span>

          </p>

          <p className="text-sm text-gray-400">

            {detalle.length} artículo(s) diferentes

          </p>

        </div>        <div className="flex gap-3">

          <button
            type="button"
            onClick={() => {

              setResponsable("");
              setSolicitante("");
              setTelefono("");
              setCorreo("");
              setTipoEvento("");
              setEvento("");
              setLugar("");
              setFechaDevolucion("");
              setObservaciones("");

              setArticuloSeleccionado("");
              setCantidadArticulo(1);
              setDetalle([]);

              obtenerFolio();

            }}
            className="
              bg-gray-200
              hover:bg-gray-300
              text-slate-700
              font-medium
              px-6
              py-3
              rounded-xl
              transition
            "
          >
            Limpiar
          </button>

          <button
            type="button"
            disabled={guardando}
            onClick={guardarPrestamo}
            className="
              bg-[#3483FA]
              hover:bg-[#2968C8]
              disabled:bg-gray-400
              text-white
              font-medium
              px-8
              py-3
              rounded-xl
              shadow-sm
              transition
            "
          >
            {guardando
              ? "Guardando..."
              : "Guardar préstamo"}
          </button>

        </div>

      </div>

    </div>

  );

}