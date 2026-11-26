'use client';

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
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

type BorradorArticulo = {
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  estado: string;
};

const PREFIJO_BORRADOR = "sigerm:borrador-articulo:";

type FotoSubida = {
  nombre: string;
  url: string;
};

type FiltroIgualdad = {
  eq(columna: string, valor: string | number): FiltroIgualdad;
  is(columna: string, valor: null): FiltroIgualdad;
};

/*
 * Añade a la consulta una condición por cada campo editable con el valor
 * original del artículo (las columnas ya tienen SELECT para authenticated).
 */
function condicionarAlOriginal<T extends FiltroIgualdad>(
  consulta: T,
  original: Articulo,
): T {
  const campos: [string, string | number | null | undefined][] = [
    ["codigo", original.codigo],
    ["nombre", original.nombre],
    ["categoria", original.categoria],
    ["cantidad", original.cantidad],
    ["estado", original.estado],
    ["imagen", original.imagen],
  ];

  let q: FiltroIgualdad = consulta;

  for (const [columna, valor] of campos) {
    q = valor == null
      ? q.is(columna, null)
      : q.eq(columna, valor);
  }

  return q as T;
}

/*
 * sessionStorage puede no existir o lanzar (modo privado, almacenamiento
 * bloqueado); en ese caso simplemente no hay borrador.
 */
function guardarBorrador(clave: string, borrador: BorradorArticulo) {
  try {
    window.sessionStorage.setItem(clave, JSON.stringify(borrador));
  } catch {
    // Sin almacenamiento disponible: no se puede conservar el borrador.
  }
}

function borrarBorrador(clave: string) {
  try {
    window.sessionStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento disponible.
  }
}

function leerBorradorCrudo(clave: string): string | null {
  try {
    return window.sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

// sessionStorage no notifica cambios en la misma pestaña; tras recuperar o
// descartar, el componente oculta el aviso con su propio estado.
const suscribirSinCambios = () => () => {};

function parsearBorrador(crudo: string | null): BorradorArticulo | null {
  try {
    if (!crudo) return null;

    const valor: unknown = JSON.parse(crudo);
    if (!valor || typeof valor !== "object") return null;

    const b = valor as Record<string, unknown>;
    if (
      typeof b.codigo !== "string" ||
      typeof b.nombre !== "string" ||
      typeof b.categoria !== "string" ||
      typeof b.cantidad !== "number" ||
      !Number.isFinite(b.cantidad) ||
      typeof b.estado !== "string"
    ) {
      return null;
    }

    return {
      codigo: b.codigo,
      nombre: b.nombre,
      categoria: b.categoria,
      cantidad: b.cantidad,
      estado: b.estado,
    };
  } catch {
    return null;
  }
}

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

  /*
   * Borrador local de los datos capturados (sin la fotografía, que no
   * puede serializarse). Se guarda antes de enviar al usuario a iniciar
   * sesión y se recupera al volver a abrir el mismo formulario.
   */
  const claveBorrador =
    `${PREFIJO_BORRADOR}${articulo?.id ?? "nuevo"}`;

  const borradorCrudo = useSyncExternalStore(
    suscribirSinCambios,
    () => leerBorradorCrudo(claveBorrador),
    () => null,
  );

  const [borradorResuelto, setBorradorResuelto] =
    useState(false);

  const borrador = borradorResuelto
    ? null
    : parsearBorrador(borradorCrudo);

  function recuperarBorrador() {

    if (!borrador) return;

    setCodigo(borrador.codigo);
    setNombre(borrador.nombre);
    setCategoria(borrador.categoria);
    setCantidad(borrador.cantidad);
    setEstado(borrador.estado);

    borrarBorrador(claveBorrador);
    setBorradorResuelto(true);

    notificar.info(
      "Se recuperaron los datos capturados. Si había elegido una fotografía, selecciónela de nuevo."
    );

  }

  function descartarBorrador() {

    borrarBorrador(claveBorrador);
    setBorradorResuelto(true);

  }

  async function sesionValida(): Promise<boolean> {

    /*
     * getUser() valida el token contra Supabase Auth. Si caducó y no se
     * renovó automáticamente (frecuente en móviles tras inactividad), se
     * intenta renovar de forma explícita una sola vez.
     */
    const { data } = await supabase.auth.getUser();

    if (data?.user) return true;

    const { data: renovada } =
      await supabase.auth.refreshSession();

    return Boolean(renovada?.user);

  }

  /*
   * Retira la fotografía subida en ESTE intento (nombre único, subida sin
   * sobrescribir: nunca es la imagen anterior del artículo) solo si se
   * confirma que ningún artículo la referencia. Ante cualquier duda
   * (p. ej. la red falló después de que la base de datos aplicara el
   * cambio, o no se puede comprobar) se conserva: es preferible una
   * fotografía huérfana a un artículo con la imagen rota.
   */
  async function eliminarFotoHuerfana(foto: FotoSubida) {

    const { data: referencias, error: errorConsulta } =
      await supabase
        .from("articulos")
        .select("id")
        .eq("imagen", foto.url)
        .limit(1);

    if (errorConsulta || !referencias || referencias.length > 0) {
      console.warn(
        "[inventario] Se conserva la fotografía: está en uso o no se pudo comprobar.",
      );
      return;
    }

    const { error } = await supabase.storage
      .from("articulos")
      .remove([foto.nombre]);

    if (error) {
      console.error(
        "[inventario] No fue posible retirar la fotografía no utilizada.",
        { mensaje: error.message },
      );
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

    let fotoSubida: FotoSubida | null = null;

    try {

      /*
       * Sin sesión válida la petición viajaría como "anon", que no tiene
       * privilegios sobre articulos ("permission denied for table
       * articulos"). Se conserva lo capturado y se pide iniciar sesión,
       * antes de subir ninguna fotografía.
       */
      if (!(await sesionValida())) {

        guardarBorrador(claveBorrador, {
          codigo,
          nombre,
          categoria,
          cantidad,
          estado,
        });

        notificar.error(
          "Su sesión expiró. Sus datos se conservaron: inicie sesión nuevamente y vuelva a abrir el artículo para guardarlos."
        );

        router.push(
          `/login?redirectTo=${encodeURIComponent(
            articulo
              ? `/inventario/editar/${articulo.id}`
              : "/inventario"
          )}`
        );

        return;

      }

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

          return;

        }

        urlImagen = supabase.storage
          .from("articulos")
          .getPublicUrl(nombreArchivo)
          .data.publicUrl;

        fotoSubida = { nombre: nombreArchivo, url: urlImagen };

      }

      const datos = {

        codigo,

        nombre: nombre.toUpperCase(),

        categoria: categoria.toUpperCase(),

        cantidad,

        estado,

        imagen: urlImagen,

      };

      /*
       * Se pide el id de vuelta para confirmar que se afectó exactamente
       * un registro: con RLS, una escritura no autorizada puede afectar
       * 0 filas sin devolver error.
       */
      /*
       * Control de concurrencia optimista: la actualización solo se
       * aplica si el artículo conserva los valores con los que se abrió
       * el formulario. Si otra persona lo modificó entretanto, se afecta
       * 0 filas y no se sobrescriben sus cambios.
       */
      const { data: filas, error } = articulo
        ? await condicionarAlOriginal(
            supabase
              .from("articulos")
              .update(datos)
              .eq("id", articulo.id),
            articulo,
          ).select("id")
        : await supabase
            .from("articulos")
            .insert(datos)
            .select("id");

      if (!error && articulo && filas && filas.length === 0) {

        const { data: vigente } = await supabase
          .from("articulos")
          .select("id")
          .eq("id", articulo.id)
          .maybeSingle();

        if (vigente) {

          if (fotoSubida) {
            await eliminarFotoHuerfana(fotoSubida);
            fotoSubida = null;
          }

          guardarBorrador(claveBorrador, {
            codigo,
            nombre,
            categoria,
            cantidad,
            estado,
          });

          notificar.error(
            "Otra persona modificó este artículo mientras usted lo editaba. Sus cambios no se guardaron para no sobrescribir los de ella; siguen en pantalla y se conservaron. Recargue la página para ver la versión actual y recuperar sus datos."
          );

          return;

        }

      }

      if (error || !filas || filas.length !== 1) {

        if (fotoSubida) {
          await eliminarFotoHuerfana(fotoSubida);
          fotoSubida = null;
        }

        notificar.error(
          error?.code === "42501"
            ? "No fue posible guardar: su sesión no tiene permisos para modificar artículos. Sus datos siguen en pantalla; cierre sesión, vuelva a iniciarla e intente de nuevo."
            : error
              ? error.message
              : "No fue posible guardar el artículo. Verifique sus permisos e intente de nuevo."
        );

        return;

      }

      fotoSubida = null;

    } catch (errorInesperado) {

      /*
       * Resultado AMBIGUO (p. ej. se perdió la conexión): la escritura
       * pudo haberse confirmado en el servidor, incluso después de este
       * punto. La fotografía subida NUNCA se retira aquí, porque su uso
       * no puede descartarse; a lo sumo queda una fotografía sin usar.
       * Solo se retira ante un fallo definitivo (error devuelto por la
       * base de datos o 0 filas confirmadas), más arriba.
       */
      if (fotoSubida) {
        console.warn(
          "[inventario] Resultado incierto: se conserva la fotografía subida.",
        );
      }

      notificar.error(
        errorInesperado instanceof Error
          ? `No fue posible guardar el artículo: ${errorInesperado.message}`
          : "No fue posible guardar el artículo."
      );

      return;

    } finally {

      setGuardando(false);

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

      {borrador && (

        <div
          role="status"
          className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >

          <p className="mb-3">
            Hay datos capturados en un intento anterior que no se
            guardaron (por ejemplo, porque la sesión expiró).
          </p>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={recuperarBorrador}
              className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
            >
              Recuperar datos
            </button>

            <button
              type="button"
              onClick={descartarBorrador}
              className="rounded-lg border border-amber-400 px-4 py-2 font-semibold hover:bg-amber-100"
            >
              Descartar
            </button>

          </div>

        </div>

      )}

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

            <Image
              width={288}
              height={288}
              unoptimized
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