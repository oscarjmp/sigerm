"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HeartHandshake,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";

function obtenerMensajeError(
  mensaje: string,
): string {
  const error = mensaje.toLowerCase();

  if (
    error.includes("invalid login credentials")
  ) {
    return "El correo electrónico o la contraseña son incorrectos.";
  }

  if (error.includes("email not confirmed")) {
    return "Debe confirmar su correo electrónico antes de iniciar sesión.";
  }

  if (error.includes("too many requests")) {
    return "Se realizaron demasiados intentos. Espere unos minutos y vuelva a intentarlo.";
  }

  if (error.includes("network")) {
    return "No fue posible conectarse con el servidor. Verifique su conexión a internet.";
  }

  return mensaje;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");

  async function iniciarSesion(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const correoNormalizado =
      email.trim().toLowerCase();

    if (!correoNormalizado) {
      setError(
        "Ingrese su correo electrónico.",
      );
      return;
    }

    if (!password) {
      setError("Ingrese su contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: errorInicioSesion } =
        await supabase.auth.signInWithPassword({
          email: correoNormalizado,
          password,
        });

      if (errorInicioSesion) {
        throw new Error(
          errorInicioSesion.message,
        );
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (errorDesconocido) {
      const mensaje =
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No fue posible iniciar sesión.";

      setError(obtenerMensajeError(mensaje));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="
        relative min-h-screen
        overflow-hidden
        bg-[linear-gradient(135deg,#EEF5FF_0%,#F8FAFC_45%,#FFFFFF_100%)]
      "
    >
      {/* Luces decorativas */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-32 -top-32
          h-96 w-96 rounded-full
          bg-blue-300/30 blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -bottom-40 -right-32
          h-[28rem] w-[28rem]
          rounded-full
          bg-cyan-200/30 blur-3xl
        "
      />

      <div
        className="
          relative mx-auto grid
          min-h-screen w-full
          max-w-[1600px]
          grid-cols-1
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >
        {/* Presentación institucional */}
        <section
          className="
            relative hidden
            overflow-hidden
            bg-[linear-gradient(145deg,#4A0F18_0%,#7A1B2A_48%,#A12638_100%)]
            p-12 text-white
            lg:flex lg:flex-col
            lg:justify-between
            xl:p-16
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute -right-32 -top-28
              h-96 w-96 rounded-full
              bg-white/10 blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              absolute -bottom-28 -left-24
              h-80 w-80 rounded-full
              bg-rose-300/20 blur-3xl
            "
          />

          <div className="relative">
            <div
              className="
                inline-flex items-center
                gap-3 rounded-full
                border border-white/15
                bg-white/10
                px-4 py-2
                text-sm font-bold
                backdrop-blur-md
              "
            >
              <Sparkles
                className="
                  h-4 w-4
                  text-[#FFD54F]
                "
              />

              Plataforma oficial SIGERM
            </div>

            <div className="mt-12">
              <div
                className="
                  flex h-28 w-28
                  items-center justify-center
                  rounded-full
                  border border-white/15
                  bg-white/10
                  shadow-2xl
                  backdrop-blur-xl
                "
              >
                <Image
                  src="/logo.png"
                  alt="Logotipo de SIGERM"
                  width={100}
                  height={100}
                  priority
                  className="
                    h-auto w-[100px]
                    object-contain
                    drop-shadow-2xl
                  "
                  style={{
                    width: "100px",
                    height: "auto",
                  }}
                />
              </div>

              <h1
                className="
                  mt-8 text-5xl
                  font-black
                  tracking-tight
                  xl:text-6xl
                "
              >
                SIGERM
              </h1>

              <div
                className="
                  mt-4 h-1.5 w-20
                  rounded-full
                  bg-gradient-to-r
                  from-[#FFD54F]
                  to-[#FFC933]
                  shadow-[0_0_20px_rgba(255,213,79,0.5)]
                "
              />

              <p
                className="
                  mt-7 max-w-xl
                  text-xl font-semibold
                  leading-9 text-rose-50
                "
              >
                Sistema Integral de Gestión para
                Encuentros de Renovación
                Matrimonial.
              </p>

              <p
                className="
                  mt-5 max-w-xl
                  text-base leading-8
                  text-rose-100
                "
              >
                Administra inventario, préstamos,
                movimientos, matrimonios y
                actividades desde una plataforma
                moderna, segura y accesible.
              </p>
            </div>
          </div>

          <div
            className="
              relative grid grid-cols-2
              gap-4
            "
          >
            <Beneficio
              icono={
                <ShieldCheck className="h-5 w-5" />
              }
              titulo="Acceso seguro"
              descripcion="Protección mediante Supabase Auth."
            />

            <Beneficio
              icono={
                <HeartHandshake className="h-5 w-5" />
              }
              titulo="Comunidad"
              descripcion="Información organizada para el servicio."
            />
          </div>
        </section>

        {/* Formulario */}
        <section
          className="
            flex min-h-screen
            items-center justify-center
            px-4 py-8
            sm:px-8
            lg:px-12
            xl:px-20
          "
        >
          <div className="w-full max-w-lg">
            {/* Logo en móvil */}
            <div
              className="
                mb-8 flex flex-col
                items-center text-center
                lg:hidden
              "
            >
              <div
                className="
                  flex h-24 w-24
                  items-center justify-center
                  rounded-full
                  bg-gradient-to-br
                  from-[#1E3A5F]
                  to-[#3483FA]
                  shadow-xl
                "
              >
                <Image
                  src="/logo.png"
                  alt="Logotipo de SIGERM"
                  width={82}
                  height={82}
                  priority
                  className="
                    h-auto w-[82px]
                    object-contain
                  "
                  style={{
                    width: "82px",
                    height: "auto",
                  }}
                />
              </div>

              <h1
                className="
                  mt-4 text-3xl
                  font-black
                  text-slate-900
                "
              >
                SIGERM
              </h1>

              <p
                className="
                  mt-2 max-w-sm
                  text-sm leading-6
                  text-slate-500
                "
              >
                Sistema Integral de Gestión para
                Encuentros de Renovación
                Matrimonial.
              </p>
            </div>

            <div
              className="
                overflow-hidden
                rounded-[2rem]
                border border-white/80
                bg-white/85
                shadow-[0_28px_70px_rgba(30,58,95,0.16)]
                backdrop-blur-xl
              "
            >
              <div
                className="
                  border-b
                  border-slate-100
                  bg-gradient-to-r
                  from-white
                  via-blue-50/40
                  to-white
                  px-6 py-7
                  sm:px-8
                "
              >
                <div
                  className="
                    flex h-12 w-12
                    items-center justify-center
                    rounded-2xl
                    bg-blue-50
                    text-[#8B1E2D]
                    shadow-sm
                  "
                >
                  <LogIn
                    className="h-6 w-6"
                    aria-hidden="true"
                  />
                </div>

                <h2
                  className="
                    mt-5 text-3xl
                    font-black
                    tracking-tight
                    text-slate-900
                  "
                >
                  Iniciar sesión
                </h2>

                <p
                  className="
                    mt-2 text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  Ingrese sus credenciales para
                  acceder a los módulos autorizados
                  de SIGERM.
                </p>
              </div>

              <form
                onSubmit={iniciarSesion}
                className="
                  space-y-5
                  px-6 py-7
                  sm:px-8 sm:py-8
                "
              >
                <div>
                  <label
                    htmlFor="email"
                    className="
                      mb-2 block
                      text-sm font-bold
                      text-slate-700
                    "
                  >
                    Correo electrónico
                  </label>

                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        h-5 w-5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      placeholder="nombre@correo.com"
                      required
                      className="
                        min-h-13 w-full
                        rounded-2xl border
                        border-slate-300
                        bg-slate-50
                        py-3.5 pl-12 pr-4
                        text-sm text-slate-900
                        outline-none
                        transition-all
                        placeholder:text-slate-400
                       focus:border-[#8B1E2D]
focus:ring-red-100
                        focus:ring-4
                        focus:ring-blue-100
                        disabled:cursor-not-allowed
                        disabled:opacity-70
                      "
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="
                      mb-2 block
                      text-sm font-bold
                      text-slate-700
                    "
                  >
                    Contraseña
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        h-5 w-5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        mostrarPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      placeholder="Ingrese su contraseña"
                      required
                      className="
                        min-h-13 w-full
                        rounded-2xl border
                        border-slate-300
                        bg-slate-50
                        py-3.5 pl-12 pr-14
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
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setMostrarPassword(
                          (valor) => !valor,
                        )
                      }
                      disabled={loading}
                      aria-label={
                        mostrarPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="
                        absolute right-2
                        top-1/2
                        flex h-10 w-10
                        -translate-y-1/2
                        items-center justify-center
                        rounded-xl
                        text-slate-400
                        transition
                        hover:bg-blue-50
                        hover:text-[#3483FA]
                        focus-visible:outline-none
                        focus-visible:ring-4
                        focus-visible:ring-blue-100
                        disabled:cursor-not-allowed
                      "
                    >
                      {mostrarPassword ? (
                        <EyeOff
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="
                      flex items-start gap-3
                      rounded-2xl
                      border border-red-200
                      bg-red-50 p-4
                      text-sm leading-6
                      text-red-700
                    "
                  >
                    <AlertCircle
                      className="
                        mt-0.5 h-5 w-5
                        shrink-0
                      "
                      aria-hidden="true"
                    />

                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="
group inline-flex
min-h-13
w-full
items-center
justify-center
gap-2
rounded-2xl

bg-gradient-to-r
from-[#A12638]
via-[#8B1E2D]
to-[#6E1420]

px-6
py-3.5

font-black
text-white

shadow-[0_14px_35px_rgba(139,30,45,0.35)]

transition-all
duration-300

hover:-translate-y-1
hover:shadow-[0_18px_45px_rgba(139,30,45,0.45)]
hover:from-[#B72A3F]
hover:via-[#982133]
hover:to-[#741827]

active:scale-[0.98]

focus-visible:outline-none
focus-visible:ring-4
focus-visible:ring-red-200

disabled:opacity-70
disabled:cursor-not-allowed
"
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        className="
                          h-5 w-5
                          animate-spin
                        "
                        aria-hidden="true"
                      />

                      Ingresando...
                    </>
                  ) : (
                    <>
                      Iniciar sesión

                      <ArrowRight
                        className="
                          h-5 w-5
                          transition-transform
                          group-hover:translate-x-1
                        "
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>

                <div
                  className="
                    rounded-2xl
                    border border-slate-200
                    bg-slate-50
                    px-4 py-4
                    text-center
                  "
                >
                  <p
                    className="
                      text-sm text-slate-600
                    "
                  >
                    ¿Todavía no tiene una cuenta?
                  </p>

                  <p
                    className="
                      mt-2
                      text-sm font-bold
                      text-[#8B1E2D]
                    "
                  >
                    Solicítela al Administrador de SIGERM.
                  </p>
                </div>
              </form>
            </div>

            <p
              className="
                mt-6 text-center
                text-xs leading-5
                text-slate-400
              "
            >
              El acceso está limitado a usuarios
              registrados y autorizados por la
              administración de SIGERM.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

type BeneficioProps = {
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
};

function Beneficio({
  icono,
  titulo,
  descripcion,
}: BeneficioProps) {
  return (
    <div
      className="
        rounded-3xl
        border border-white/15
        bg-white/10 p-5
        shadow-lg
        backdrop-blur-md
      "
    >
      <div
        className="
          flex h-10 w-10
          items-center justify-center
          rounded-2xl
          bg-white/10
          text-[#FFD54F]
        "
      >
        {icono}
      </div>

      <p className="mt-4 font-black">
        {titulo}
      </p>

      <p
        className="
          mt-1 text-sm leading-6
          text-rose-100
        "
      >
        {descripcion}
      </p>
    </div>
  );
}