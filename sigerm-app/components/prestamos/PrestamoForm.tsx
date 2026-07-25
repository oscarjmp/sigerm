"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { obtenerMatrimonios } from "@/lib/services/matrimonios";
import { supabase } from "@/lib/supabase/client";

type Articulo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number;
  disponibles: number;
  activo?: boolean | null;
};

type ArticuloPrestamo = {
  articulo_id: string;
  codigo: string;
  nombre: string;
  disponibles: number;
  cantidad: number;
};

type Matrimonio = {
  id: string;
  esposo: string;
  esposa: string;
  telefono: string | null;
  email: string | null;
  ministerio: string | null;
  activo?: boolean | null;
};

type PrestamoRpcResponse = {
  success: boolean;
  prestamo: {
    id: string;
    folio: string;
    responsable: string;
    solicitante: string | null;
    estado: string;
    fecha_prestamo: string | null;
    fecha_devolucion: string | null;
  };
  detalles: unknown[];
  movimientos: unknown[];
  resumen: {
    total_articulos: number;
    total_unidades: number;
  };
};

type PrestamoFormProps = {
  articulos: Articulo[];
};

const RESPONSABLE_PREDETERMINADO =
  "OSCAR Y SANDRA";

function obtenerFechaActual(): string {
  return new Date().toISOString().split("T")[0];
}

export default function PrestamoForm({
  articulos,
}: PrestamoFormProps) {
  const router = useRouter();

  const [matrimonios, setMatrimonios] =
    useState<Matrimonio[]>([]);

  const [matrimonioId, setMatrimonioId] =
    useState("");

  const [ministerio, setMinisterio] =
    useState("");

  const [responsable, setResponsable] = useState(
    RESPONSABLE_PREDETERMINADO,
  );

  const [solicitante, setSolicitante] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [correo, setCorreo] = useState("");

  const [fechaDevolucion, setFechaDevolucion] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [
    articuloSeleccionado,
    setArticuloSeleccionado,
  ] = useState("");

  const [
    cantidadArticulo,
    setCantidadArticulo,
  ] = useState(1);

  const [detalle, setDetalle] = useState<
    ArticuloPrestamo[]
  >([]);

  const [guardando, setGuardando] =
    useState(false);

  const [
    cargandoMatrimonios,
    setCargandoMatrimonios,
  ] = useState(true);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarMatrimonios() {
      setCargandoMatrimonios(true);

      try {
        const { data, error } =
          await obtenerMatrimonios();

        if (error) {
          throw new Error(error.message);
        }

        if (!componenteActivo) {
          return;
        }

        const registros = (
          (data ?? []) as Matrimonio[]
        )
          .filter(
            (matrimonio) =>
              matrimonio.activo !== false,
          )
          .sort((a, b) => {
            const nombreA =
              `${a.esposo} ${a.esposa}`;

            const nombreB =
              `${b.esposo} ${b.esposa}`;

            return nombreA.localeCompare(
              nombreB,
              "es",
            );
          });

        setMatrimonios(registros);
      } catch (error) {
        if (!componenteActivo) {
          return;
        }

        const mensaje =
          error instanceof Error
            ? error.message
            : "No fue posible cargar los matrimonios.";

        window.alert(mensaje);
      } finally {
        if (componenteActivo) {
          setCargandoMatrimonios(false);
        }
      }
    }

    void cargarMatrimonios();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const articulosDisponibles = useMemo(() => {
    return articulos
      .filter(
        (articulo) =>
          articulo.activo !== false &&
          articulo.disponibles > 0,
      )
      .sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es",
        ),
      );
  }, [articulos]);

  const totalUnidades = useMemo(() => {
    return detalle.reduce(
      (total, articulo) =>
        total + articulo.cantidad,
      0,
    );
  }, [detalle]);

  function seleccionarMatrimonio(id: string) {
    setMatrimonioId(id);

    if (!id) {
      setSolicitante("");
      setTelefono("");
      setCorreo("");
      setMinisterio("");
      return;
    }

    const matrimonio = matrimonios.find(
      (item) => item.id === id,
    );

    if (!matrimonio) {
      setSolicitante("");
      setTelefono("");
      setCorreo("");
      setMinisterio("");
      return;
    }

    setSolicitante(
      `${matrimonio.esposo} Y ${matrimonio.esposa}`,
    );

    setTelefono(matrimonio.telefono ?? "");
    setCorreo(matrimonio.email ?? "");
    setMinisterio(
      matrimonio.ministerio ?? "",
    );
  }

  function agregarArticulo() {
    if (!articuloSeleccionado) {
      window.alert(
        "Seleccione un artículo.",
      );
      return;
    }

    const articulo = articulosDisponibles.find(
      (item) =>
        item.id === articuloSeleccionado,
    );

    if (!articulo) {
      window.alert(
        "El artículo seleccionado no está disponible.",
      );
      return;
    }

    if (
      !Number.isInteger(cantidadArticulo) ||
      cantidadArticulo <= 0
    ) {
      window.alert(
        "La cantidad debe ser un número entero mayor que cero.",
      );
      return;
    }

    if (
      cantidadArticulo > articulo.disponibles
    ) {
      window.alert(
        `Solo existen ${articulo.disponibles} unidades disponibles.`,
      );
      return;
    }

    const yaFueAgregado = detalle.some(
      (item) =>
        item.articulo_id === articulo.id,
    );

    if (yaFueAgregado) {
      window.alert(
        "Este artículo ya fue agregado al préstamo.",
      );
      return;
    }

    setDetalle((detalleActual) => [
      ...detalleActual,
      {
        articulo_id: articulo.id,
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        disponibles:
          articulo.disponibles,
        cantidad: cantidadArticulo,
      },
    ]);

    setArticuloSeleccionado("");
    setCantidadArticulo(1);
  }

  function eliminarArticulo(
    articuloId: string,
  ) {
    setDetalle((detalleActual) =>
      detalleActual.filter(
        (articulo) =>
          articulo.articulo_id !==
          articuloId,
      ),
    );
  }

  function limpiarFormulario() {
    setResponsable(
      RESPONSABLE_PREDETERMINADO,
    );
    setMatrimonioId("");
    setSolicitante("");
    setTelefono("");
    setCorreo("");
    setMinisterio("");
    setFechaDevolucion("");
    setObservaciones("");
    setArticuloSeleccionado("");
    setCantidadArticulo(1);
    setDetalle([]);
  }

  function validarFormulario(): boolean {
    if (!responsable.trim()) {
      window.alert(
        "Capture el responsable que entrega el material.",
      );
      return false;
    }

    if (!matrimonioId) {
      window.alert(
        "Seleccione el matrimonio solicitante.",
      );
      return false;
    }

    if (!solicitante.trim()) {
      window.alert(
        "No fue posible determinar el solicitante.",
      );
      return false;
    }

    if (!fechaDevolucion) {
      window.alert(
        "Capture la fecha estimada de devolución.",
      );
      return false;
    }

    if (detalle.length === 0) {
      window.alert(
        "Agregue al menos un artículo.",
      );
      return false;
    }

    return true;
  }

  async function guardarPrestamo() {
    if (guardando) {
      return;
    }

    if (!validarFormulario()) {
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        responsable: responsable.trim(),
        matrimonio_id: matrimonioId,
        solicitante: solicitante.trim(),
        telefono:
          telefono.trim() || null,
        correo: correo.trim() || null,

        /*
         * Estos valores se mantienen para conservar
         * compatibilidad con la función RPC actual,
         * aunque ya no se capturan en el formulario.
         */
        tipo_evento: null,
        evento: null,
        lugar: null,

        fecha_devolucion:
          fechaDevolucion || null,

        observaciones:
          observaciones.trim() || null,

        autorizado_por:
          responsable.trim(),

        recibido_por:
          solicitante.trim(),

        articulos: detalle.map((item) => ({
          articulo_id: item.articulo_id,
          cantidad: item.cantidad,
        })),
      };

      const { data, error } =
        await supabase.rpc(
          "registrar_prestamo",
          {
            p_prestamo: payload,
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          "La base de datos no devolvió el préstamo registrado.",
        );
      }

      const resultado =
        data as PrestamoRpcResponse;

      if (
        !resultado.success ||
        !resultado.prestamo?.folio
      ) {
        throw new Error(
          "La respuesta del registro de préstamo no es válida.",
        );
      }

      window.alert(
        [
          "Préstamo registrado correctamente.",
          `Folio: ${resultado.prestamo.folio}`,
          `Artículos diferentes: ${resultado.resumen.total_articulos}`,
          `Unidades prestadas: ${resultado.resumen.total_unidades}`,
        ].join("\n"),
      );

      limpiarFormulario();
      router.refresh();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible registrar el préstamo.";

      window.alert(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Nuevo préstamo
          </h2>

          <p className="mt-1 text-slate-500">
            Registre la entrega temporal de
            artículos del inventario.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-5 py-3 text-left sm:text-right">
          <p className="text-sm text-slate-500">
            Folio
          </p>

          <p className="text-lg font-bold text-blue-600">
            Se generará al guardar
          </p>
        </div>
      </div>

      {/* Datos generales */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="responsable"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Responsable que entrega el material
          </label>

          <input
            id="responsable"
            type="text"
            placeholder="Nombre del responsable"
            value={responsable}
            onChange={(event) =>
              setResponsable(
                event.target.value.toUpperCase(),
              )
            }
            className="
              min-h-12 w-full rounded-2xl
              border border-slate-300
              bg-slate-50 px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="matrimonio"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Matrimonio solicitante
          </label>

          <select
            id="matrimonio"
            value={matrimonioId}
            onChange={(event) =>
              seleccionarMatrimonio(
                event.target.value,
              )
            }
            disabled={cargandoMatrimonios}
            className="
              min-h-12 w-full rounded-2xl
              border border-slate-300
              bg-white px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
              disabled:bg-slate-100
            "
          >
            <option value="">
              {cargandoMatrimonios
                ? "Cargando matrimonios..."
                : "Seleccione un matrimonio..."}
            </option>

            {matrimonios.map(
              (matrimonio) => (
                <option
                  key={matrimonio.id}
                  value={matrimonio.id}
                >
                  {matrimonio.esposo} y{" "}
                  {matrimonio.esposa}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Datos del matrimonio */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-700">
            Información del matrimonio
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                Teléfono
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {telefono || "Sin teléfono"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Correo
              </p>

              <p className="mt-1 break-all font-medium text-slate-800">
                {correo || "Sin correo"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Ministerio
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {ministerio ||
                  "Sin ministerio"}
              </p>
            </div>
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label
            htmlFor="fechaDevolucion"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Fecha estimada de devolución
          </label>

          <input
            id="fechaDevolucion"
            type="date"
            value={fechaDevolucion}
            min={obtenerFechaActual()}
            onChange={(event) =>
              setFechaDevolucion(
                event.target.value,
              )
            }
            className="
              min-h-12 w-full rounded-2xl
              border border-slate-300
              bg-white px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
          />
        </div>

        {/* Observaciones */}
        <div>
          <label
            htmlFor="observaciones"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Observaciones
          </label>

          <textarea
            id="observaciones"
            placeholder="Observaciones del préstamo"
            value={observaciones}
            onChange={(event) =>
              setObservaciones(
                event.target.value.toUpperCase(),
              )
            }
            className="
              min-h-12 w-full resize-y
              rounded-2xl border
              border-slate-300
              bg-white px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
            rows={3}
          />
        </div>
      </div>

      <hr className="my-8 border-slate-200" />

      {/* Artículos */}
      <h3 className="mb-4 text-xl font-bold text-slate-800">
        Artículos del préstamo
      </h3>

      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
          <label
            htmlFor="articulo"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Artículo
          </label>

          <select
            id="articulo"
            value={articuloSeleccionado}
            onChange={(event) =>
              setArticuloSeleccionado(
                event.target.value,
              )
            }
            className="
              min-h-12 w-full rounded-2xl
              border border-slate-300
              bg-white px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
          >
            <option value="">
              Seleccione un artículo...
            </option>

            {articulosDisponibles.map(
              (articulo) => (
                <option
                  key={articulo.id}
                  value={articulo.id}
                >
                  {articulo.codigo} -{" "}
                  {articulo.nombre} (
                  {articulo.disponibles} disponibles)
                </option>
              ),
            )}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="cantidadArticulo"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Cantidad
          </label>

          <input
            id="cantidadArticulo"
            type="number"
            min={1}
            step={1}
            value={cantidadArticulo}
            onChange={(event) =>
              setCantidadArticulo(
                Number(event.target.value),
              )
            }
            className="
              min-h-12 w-full rounded-2xl
              border border-slate-300
              bg-white px-4 py-3
              outline-none transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
          />
        </div>

        <div className="md:col-span-3">
          <button
            type="button"
            onClick={agregarArticulo}
            className="
              min-h-12 w-full
              rounded-2xl bg-[#3483FA]
              px-5 py-3
              font-semibold text-white
              shadow-sm transition
              hover:-translate-y-0.5
              hover:bg-[#2968C8]
              hover:shadow-md
            "
          >
            Agregar al préstamo
          </button>
        </div>
      </div>

      {/* Tabla escritorio */}
      <div className="mt-8 hidden overflow-hidden rounded-2xl border border-slate-200 sm:block">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[38%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
          </colgroup>

          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">
                Código
              </th>

              <th className="p-4 text-left">
                Artículo
              </th>

              <th className="p-4 text-center">
                Disponibles
              </th>

              <th className="p-4 text-center">
                Cantidad
              </th>

              <th className="p-4 text-center">
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {detalle.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-slate-400"
                >
                  Seleccione un artículo, indique
                  la cantidad y presione “Agregar al
                  préstamo”.
                </td>
              </tr>
            ) : (
              detalle.map((item) => (
                <tr
                  key={item.articulo_id}
                  className="border-t border-slate-200 transition hover:bg-slate-50"
                >
                  <td className="break-words p-4 font-medium">
                    {item.codigo}
                  </td>

                  <td className="break-words p-4">
                    {item.nombre}
                  </td>

                  <td className="p-4 text-center">
                    {item.disponibles}
                  </td>

                  <td className="p-4 text-center font-semibold">
                    {item.cantidad}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        eliminarArticulo(
                          item.articulo_id,
                        )
                      }
                      className="
                        min-h-11 rounded-xl
                        bg-red-500 px-4 py-2
                        font-semibold text-white
                        transition hover:bg-red-600
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

      {/* Tarjetas móvil */}
      <div className="mt-6 space-y-3 sm:hidden">
        {detalle.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
            Seleccione un artículo, indique la cantidad
            y agréguelo al préstamo.
          </div>
        ) : (
          detalle.map((item) => (
            <article
              key={item.articulo_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {item.codigo}
              </p>

              <h4 className="mt-1 font-bold text-slate-800">
                {item.nombre}
              </h4>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400">
                    Disponibles
                  </p>

                  <p className="font-bold text-slate-800">
                    {item.disponibles}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Cantidad
                  </p>

                  <p className="font-bold text-slate-800">
                    {item.cantidad}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  eliminarArticulo(
                    item.articulo_id,
                  )
                }
                className="mt-4 min-h-12 w-full rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600"
              >
                Eliminar artículo
              </button>
            </article>
          ))
        )}
      </div>

      {/* Resumen y acciones */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-slate-500">
            Total de unidades:
            <span className="ml-2 font-bold text-blue-600">
              {totalUnidades}
            </span>
          </p>

          <p className="text-sm text-slate-400">
            {detalle.length} artículo(s)
            diferentes
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={limpiarFormulario}
            disabled={guardando}
            className="
              min-h-12 rounded-2xl
              bg-slate-200 px-6 py-3
              font-semibold text-slate-700
              transition hover:bg-slate-300
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Limpiar
          </button>

          <button
            type="button"
            disabled={guardando}
            onClick={() => {
              void guardarPrestamo();
            }}
            className="
              min-h-12 rounded-2xl
              bg-[#3483FA] px-8 py-3
              font-semibold text-white
              shadow-sm transition
              hover:-translate-y-0.5
              hover:bg-[#2968C8]
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:bg-slate-400
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