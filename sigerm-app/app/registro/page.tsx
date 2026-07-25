"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  UserPlus,
} from "lucide-react";

type RegistroRespuesta = {
  mensaje?: string;
  error?: string;
  errores?: string[];
};

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [
    apellidoPaterno,
    setApellidoPaterno,
  ] = useState("");
  const [
    apellidoMaterno,
    setApellidoMaterno,
  ] = useState("");
  const [telefono, setTelefono] =
    useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmarPassword,
    setConfirmarPassword,
  ] = useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  function limpiarFormulario() {
    setNombre("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setTelefono("");
    setEmail("");
    setPassword("");
    setConfirmarPassword("");
  }

  async function registrar(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (guardando) {
      return;
    }

    setError("");
    setExito("");

    if (!nombre.trim()) {
      setError(
        "Capture su nombre.",
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Capture su correo electrónico.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe contener al menos 8 caracteres.",
      );
      return;
    }

    if (password !== confirmarPassword) {
      setError(
        "Las contraseñas no coinciden.",
      );
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(
        "/api/registro",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            apellido_paterno:
              apellidoPaterno.trim(),
            apellido_materno:
              apellidoMaterno.trim(),
            telefono: telefono.trim(),
            email: email
              .trim()
              .toLowerCase(),
            password,
            confirmar_password:
              confirmarPassword,
          }),
        },
      );

      const datos =
        (await respuesta.json()) as RegistroRespuesta;

      if (!respuesta.ok) {
        const mensajeErrores =
          datos.errores?.length
            ? datos.errores.join(" ")
            : "";

        throw new Error(
          mensajeErrores ||
            datos.error ||
            "No fue posible registrar la cuenta.",
        );
      }

      setExito(
        datos.mensaje ??
          "Su cuenta fue registrada correctamente y está pendiente de aprobación.",
      );

      limpiarFormulario();
    } catch (registroError) {
      setError(
        registroError instanceof Error
          ? registroError.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main
      className="
        flex min-h-screen items-center
        justify-center
        bg-gradient-to-br
        from-blue-50 via-slate-100
        to-white p-4 sm:p-6
      "
    >
      <div
        className="
          w-full max-w-2xl
          overflow-hidden rounded-3xl
          border border-slate-200
          bg-white shadow-2xl
        "
      >
        {/* Encabezado */}
        <div className="bg-[#1E3A5F] p-7 text-center text-white sm:p-8">
          <Image
            src="/logo.png"
            alt="Logotipo de SIGERM"
            width={90}
            height={90}
            priority
            className="mx-auto h-auto w-[90px]"
          />

          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
            Crear cuenta
          </h1>

          <p className="mt-3 leading-7 text-blue-100">
            Sistema Integral de Gestión para
            <br />
            Encuentros de Renovación Matrimonial
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={registrar}
          className="space-y-6 p-6 sm:p-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <CampoTexto
              id="nombre"
              etiqueta="Nombre(s)"
              value={nombre}
              onChange={setNombre}
              autoComplete="given-name"
              requerido
            />

            <CampoTexto
              id="telefono"
              etiqueta="Teléfono"
              value={telefono}
              onChange={setTelefono}
              type="tel"
              autoComplete="tel"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <CampoTexto
              id="apellidoPaterno"
              etiqueta="Apellido paterno"
              value={apellidoPaterno}
              onChange={setApellidoPaterno}
              autoComplete="family-name"
            />

            <CampoTexto
              id="apellidoMaterno"
              etiqueta="Apellido materno"
              value={apellidoMaterno}
              onChange={setApellidoMaterno}
            />
          </div>

          <CampoTexto
            id="email"
            etiqueta="Correo electrónico"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            requerido
          />

          <div className="grid gap-5 md:grid-cols-2">
            <CampoTexto
              id="password"
              etiqueta="Contraseña"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
              requerido
              ayuda="Mínimo 8 caracteres."
            />

            <CampoTexto
              id="confirmarPassword"
              etiqueta="Confirmar contraseña"
              value={confirmarPassword}
              onChange={setConfirmarPassword}
              type="password"
              autoComplete="new-password"
              requerido
            />
          </div>

          {error && (
            <div
              role="alert"
              className="
                rounded-2xl border
                border-red-200 bg-red-50
                px-4 py-3 text-sm
                font-medium text-red-700
              "
            >
              {error}
            </div>
          )}

          {exito && (
            <div
              role="status"
              className="
                flex items-start gap-3
                rounded-2xl border
                border-emerald-200
                bg-emerald-50 px-4 py-4
                text-sm font-medium
                text-emerald-700
              "
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p>{exito}</p>

                <p className="mt-2 font-normal">
                  Un administrador deberá activar su cuenta y asignarle los permisos correspondientes.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="
              inline-flex min-h-13
              w-full items-center
              justify-center gap-3
              rounded-2xl
              bg-[#3483FA] p-4
              font-semibold text-white
              shadow-sm transition-all
              hover:-translate-y-0.5
              hover:bg-[#2968C8]
              hover:shadow-xl
              disabled:cursor-not-allowed
              disabled:bg-slate-400
              disabled:shadow-none
            "
          >
            <UserPlus size={22} />

            {guardando
              ? "Registrando..."
              : "Crear cuenta"}
          </button>

          <div className="pt-2 text-center">
            <span className="text-slate-500">
              ¿Ya tienes una cuenta?
            </span>

            <Link
              href="/login"
              className="
                ml-2 font-semibold
                text-blue-600
                hover:underline
              "
            >
              Iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

type CampoTextoProps = {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  requerido?: boolean;
  ayuda?: string;
};

function CampoTexto({
  id,
  etiqueta,
  value,
  onChange,
  type = "text",
  autoComplete,
  requerido = false,
  ayuda,
}: CampoTextoProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="
          mb-2 block
          text-sm font-semibold
          text-slate-700
        "
      >
        {etiqueta}

        {requerido && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        required={requerido}
        autoComplete={autoComplete}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          min-h-12 w-full
          rounded-2xl border
          border-slate-300
          bg-white px-4 py-3
          text-slate-900
          outline-none transition
          placeholder:text-slate-400
          focus:border-blue-500
          focus:ring-4
          focus:ring-blue-100
        "
      />

      {ayuda && (
        <p className="mt-1.5 text-xs text-slate-500">
          {ayuda}
        </p>
      )}
    </div>
  );
}