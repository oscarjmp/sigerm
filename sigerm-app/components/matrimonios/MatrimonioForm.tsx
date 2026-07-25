"use client";

import type {
  ChangeEvent,
  FormEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Camera,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import NuevoMinisterioModal from "@/components/matrimonios/NuevoMinisterioModal";

import { notificar } from "@/lib/notificaciones";
import {
  actualizarMatrimonio,
  guardarMatrimonio,
} from "@/lib/services/matrimonios";
import { obtenerMinisterios } from "@/lib/services/ministerios";
import { supabase } from "@/lib/supabase/client";
import { subirImagen } from "@/lib/storage/imagenes";

import type { Matrimonio } from "@/types/matrimonio";

type Props = {
  cerrar: () => void;
  matrimonio?: Matrimonio;
};

type Ministerio = {
  id: string;
  nombre: string;
};

function limpiarTelefono(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 10);
}

export default function MatrimonioForm({
  cerrar,
  matrimonio,
}: Props) {
  const router = useRouter();

  const [esposo, setEsposo] = useState(
    matrimonio?.esposo ?? "",
  );

  const [esposa, setEsposa] = useState(
    matrimonio?.esposa ?? "",
  );

  const [telefono, setTelefono] = useState(
    matrimonio?.telefono ?? "",
  );

  const [email, setEmail] = useState(
    matrimonio?.email ?? "",
  );

  const [direccion, setDireccion] = useState(
    matrimonio?.direccion ?? "",
  );

  const [ministerio, setMinisterio] = useState(
    matrimonio?.ministerio ?? "",
  );

  const [ministerios, setMinisterios] = useState<
    Ministerio[]
  >([]);

  const [
    mostrarNuevoMinisterio,
    setMostrarNuevoMinisterio,
  ] = useState(false);

  const [foto, setFoto] =
    useState<File | null>(null);

  const [preview, setPreview] = useState(
    matrimonio?.foto ?? "",
  );

  const [guardando, setGuardando] =
    useState(false);

  const cargarMinisterios =
    useCallback(async () => {
      try {
        const { data, error } =
          await obtenerMinisterios();

        if (error) {
          throw new Error(error.message);
        }

        setMinisterios(
          (data ?? []) as Ministerio[],
        );
      } catch (error) {
        console.error(
          "Error al consultar ministerios:",
          error,
        );

        notificar.error(
          "No fue posible cargar los ministerios.",
        );
      }
    }, []);

  useEffect(() => {
    void cargarMinisterios();
  }, [cargarMinisterios]);

  /*
   * Libera la URL temporal creada para la
   * previsualización de la fotografía.
   */
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function seleccionarFoto(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      notificar.advertencia(
        "Seleccione un archivo de imagen válido.",
      );
      event.target.value = "";
      return;
    }

    const limiteBytes = 5 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
      notificar.advertencia(
        "La fotografía no debe superar los 5 MB.",
      );
      event.target.value = "";
      return;
    }

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
  }

  async function obtenerUsuarioActualId(): Promise<
    string | null
  > {
    const {
      data: { user },
      error: errorAutenticacion,
    } = await supabase.auth.getUser();

    if (errorAutenticacion) {
      throw new Error(
        errorAutenticacion.message,
      );
    }

    if (!user) {
      return null;
    }

    const {
      data: usuario,
      error: errorUsuario,
    } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorUsuario) {
      throw new Error(errorUsuario.message);
    }

    return usuario?.id ?? null;
  }

  async function guardar() {
    const esposoLimpio = esposo.trim();
    const esposaLimpia = esposa.trim();
    const ministerioLimpio =
      ministerio.trim();

    if (!esposoLimpio) {
      notificar.advertencia(
        "Capture el nombre del esposo.",
      );
      return;
    }

    if (!esposaLimpia) {
      notificar.advertencia(
        "Capture el nombre de la esposa.",
      );
      return;
    }

    if (!ministerioLimpio) {
      notificar.advertencia(
        "Seleccione un ministerio.",
      );
      return;
    }

    const correoLimpio = email
      .trim()
      .toLowerCase();

    if (
      correoLimpio &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correoLimpio,
      )
    ) {
      notificar.advertencia(
        "Capture un correo electrónico válido.",
      );
      return;
    }

    setGuardando(true);

    try {
      let fotoUrl =
        matrimonio?.foto ?? null;

      if (foto) {
        fotoUrl = await subirImagen(
          "matrimonios",
          foto,
        );
      }

      /*
       * Al editar se conserva el propietario.
       * Al crear se asigna el usuario conectado.
       */
      const usuarioId =
        matrimonio?.usuario_id ??
        (await obtenerUsuarioActualId());

      if (!usuarioId && !matrimonio) {
        throw new Error(
          "No fue posible identificar al usuario que registrará el matrimonio.",
        );
      }

      const datos = {
        esposo:
          esposoLimpio.toLocaleUpperCase(
            "es-MX",
          ),
        esposa:
          esposaLimpia.toLocaleUpperCase(
            "es-MX",
          ),
        telefono: telefono.trim(),
        email: correoLimpio,
        direccion: direccion.trim(),
        ministerio: ministerioLimpio,
        foto: fotoUrl,
        activo: matrimonio?.activo ?? true,
        usuario_id: usuarioId,
      };

      const resultado = matrimonio
        ? await actualizarMatrimonio(
            matrimonio.id,
            datos,
          )
        : await guardarMatrimonio(datos);

      if (resultado.error) {
        throw new Error(
          resultado.error.message,
        );
      }

      notificar.exito(
        matrimonio
          ? "Matrimonio actualizado correctamente."
          : "Matrimonio registrado correctamente.",
      );

      cerrar();
      router.refresh();
    } catch (error) {
      console.error(
        "Error al guardar el matrimonio:",
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : "No fue posible guardar el matrimonio.";

      notificar.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  function enviarFormulario(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void guardar();
  }

  return (
    <>
      <form
        onSubmit={enviarFormulario}
        className="space-y-6"
      >
        {/* Fotografía */}
        <section
          className="
            rounded-3xl border
            border-slate-200
            bg-gradient-to-br
            from-slate-50
            via-white
            to-blue-50/50
            p-5
          "
        >
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">
                Fotografía del matrimonio
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Formatos de imagen de hasta 5 MB.
              </p>
            </div>

            <div
              className="
                relative h-40 w-40
                overflow-hidden
                rounded-full
                border-4 border-white
                bg-slate-100
                shadow-xl
                ring-1 ring-slate-200
              "
            >
              {preview ? (
                <Image
                  src={preview}
                  alt={`Fotografía de ${
                    esposo || "esposo"
                  } y ${
                    esposa || "esposa"
                  }`}
                  fill
                  sizes="160px"
                  className="object-cover object-center"
                />
              ) : (
                <div
                  className="
                    flex h-full w-full
                    items-center justify-center
                    bg-gradient-to-br
                    from-blue-100
                    via-white
                    to-amber-100
                  "
                >
                  <UsersRound
                    aria-hidden="true"
                    className="h-14 w-14 text-slate-400"
                  />
                </div>
              )}
            </div>

            <label
              htmlFor="foto-matrimonio"
              className="
                inline-flex min-h-11
                cursor-pointer items-center
                justify-center gap-2
                rounded-2xl
                bg-gradient-to-r
                from-[#2968F2]
                to-[#3483FA]
                px-5 py-3
                text-sm font-bold
                text-white
                shadow-md
                transition-all duration-300
                hover:-translate-y-0.5
                hover:shadow-lg
              "
            >
              <Camera
                aria-hidden="true"
                className="h-5 w-5"
              />

              Seleccionar fotografía
            </label>

            <input
              id="foto-matrimonio"
              type="file"
              accept="image/*"
              onChange={seleccionarFoto}
              disabled={guardando}
              className="hidden"
            />
          </div>
        </section>

        {/* Nombres */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CampoFormulario
            id="nombre-esposo"
            etiqueta="Nombre del esposo"
            icono={
              <UserRound className="h-5 w-5" />
            }
            requerido
          >
            <input
              id="nombre-esposo"
              type="text"
              value={esposo}
              onChange={(event) =>
                setEsposo(
                  event.target.value.toLocaleUpperCase(
                    "es-MX",
                  ),
                )
              }
              disabled={guardando}
              placeholder="NOMBRE DEL ESPOSO"
              required
              className={claseCampo}
            />
          </CampoFormulario>

          <CampoFormulario
            id="nombre-esposa"
            etiqueta="Nombre de la esposa"
            icono={
              <UserRound className="h-5 w-5" />
            }
            requerido
          >
            <input
              id="nombre-esposa"
              type="text"
              value={esposa}
              onChange={(event) =>
                setEsposa(
                  event.target.value.toLocaleUpperCase(
                    "es-MX",
                  ),
                )
              }
              disabled={guardando}
              placeholder="NOMBRE DE LA ESPOSA"
              required
              className={claseCampo}
            />
          </CampoFormulario>
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CampoFormulario
            id="telefono-matrimonio"
            etiqueta="Teléfono"
            icono={
              <Phone className="h-5 w-5" />
            }
          >
            <input
              id="telefono-matrimonio"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={telefono}
              maxLength={10}
              onChange={(event) =>
                setTelefono(
                  limpiarTelefono(
                    event.target.value,
                  ),
                )
              }
              disabled={guardando}
              placeholder="2461234567"
              className={claseCampo}
            />
          </CampoFormulario>

          <CampoFormulario
            id="correo-matrimonio"
            etiqueta="Correo electrónico"
            icono={
              <Mail className="h-5 w-5" />
            }
          >
            <input
              id="correo-matrimonio"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={guardando}
              placeholder="correo@ejemplo.com"
              className={claseCampo}
            />
          </CampoFormulario>
        </div>

        {/* Dirección */}
        <CampoFormulario
          id="direccion-matrimonio"
          etiqueta="Dirección"
          icono={
            <MapPin className="h-5 w-5" />
          }
        >
          <textarea
            id="direccion-matrimonio"
            rows={4}
            value={direccion}
            onChange={(event) =>
              setDireccion(event.target.value)
            }
            disabled={guardando}
            placeholder="Dirección completa"
            className={`${claseCampo} resize-none`}
          />
        </CampoFormulario>

        {/* Ministerio */}
        <CampoFormulario
          id="ministerio-matrimonio"
          etiqueta="Ministerio"
          icono={
            <UsersRound className="h-5 w-5" />
          }
          requerido
        >
          <select
            id="ministerio-matrimonio"
            value={ministerio}
            disabled={guardando}
            required
            onChange={(event) => {
              const valor = event.target.value;

              if (valor === "__NUEVO__") {
                setMostrarNuevoMinisterio(
                  true,
                );
                return;
              }

              setMinisterio(valor);
            }}
            className={claseCampo}
          >
            <option value="">
              Seleccione un ministerio...
            </option>

            {ministerios.map(
              (ministerioItem) => (
                <option
                  key={ministerioItem.id}
                  value={
                    ministerioItem.nombre
                  }
                >
                  {ministerioItem.nombre}
                </option>
              ),
            )}

            <option value="__NUEVO__">
              ➕ Agregar nuevo ministerio...
            </option>
          </select>
        </CampoFormulario>

        {/* Acciones */}
        <div
          className="
            flex flex-col-reverse
            justify-end gap-3
            border-t border-slate-100
            pt-5
            sm:flex-row
          "
        >
          <button
            type="button"
            disabled={guardando}
            onClick={cerrar}
            className="
              inline-flex min-h-12
              items-center justify-center
              gap-2 rounded-2xl
              border border-slate-200
              bg-white px-6 py-3
              text-sm font-bold
              text-slate-700
              shadow-sm
              transition-all
              hover:border-slate-300
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <X
              aria-hidden="true"
              className="h-5 w-5"
            />

            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="
              inline-flex min-h-12
              items-center justify-center
              gap-2 rounded-2xl
              bg-gradient-to-r
              from-[#2968F2]
              to-[#3483FA]
              px-6 py-3
              text-sm font-black
              text-white
              shadow-[0_12px_28px_rgba(52,131,250,0.28)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:shadow-[0_17px_38px_rgba(52,131,250,0.36)]
              disabled:cursor-not-allowed
              disabled:opacity-60
              disabled:hover:translate-y-0
            "
          >
            {guardando ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 animate-spin"
              />
            ) : (
              <Save
                aria-hidden="true"
                className="h-5 w-5"
              />
            )}

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

const claseCampo = `
  min-h-12 w-full
  rounded-2xl border
  border-slate-300
  bg-slate-50
  px-4 py-3
  text-sm text-slate-900
  outline-none
  transition-all
  placeholder:text-slate-400
  focus:border-[#3483FA]
  focus:bg-white
  focus:ring-4
  focus:ring-blue-100
  disabled:cursor-not-allowed
  disabled:opacity-70
`;

type CampoFormularioProps = {
  id: string;
  etiqueta: string;
  icono: React.ReactNode;
  requerido?: boolean;
  children: React.ReactNode;
};

function CampoFormulario({
  id,
  etiqueta,
  icono,
  requerido = false,
  children,
}: CampoFormularioProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="
          mb-2 flex items-center
          gap-2 text-sm font-bold
          text-slate-700
        "
      >
        <span
          aria-hidden="true"
          className="text-[#3483FA]"
        >
          {icono}
        </span>

        {etiqueta}

        {requerido && (
          <span className="text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}