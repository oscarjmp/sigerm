"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  Rol,
  UsuarioConRol,
  UsuarioFormulario,
} from "@/lib/types/usuario";

type ModoFormulario = "crear" | "editar";

type UsuarioFormProps = {
  roles: Rol[];
  modo?: ModoFormulario;
  usuario?: UsuarioConRol | null;
  onCancel: () => void;
  onSuccess: () => void;
};

const formularioVacio: UsuarioFormulario = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  email: "",
  telefono: "",
  password: "",
  rol_id: "",
  activo: true,
};

function construirFormularioInicial(
  modo: ModoFormulario,
  usuario?: UsuarioConRol | null,
): UsuarioFormulario {
  if (modo === "editar" && usuario) {
    return {
      nombre: usuario.nombre ?? "",
      apellido_paterno: usuario.apellido_paterno ?? "",
      apellido_materno: usuario.apellido_materno ?? "",
      email: usuario.email ?? "",
      telefono: usuario.telefono ?? "",
      password: "",
      rol_id: usuario.rol_id ?? "",
      activo: usuario.activo,
    };
  }

  return formularioVacio;
}

export default function UsuarioForm({
  roles,
  modo = "crear",
  usuario = null,
  onCancel,
  onSuccess,
}: UsuarioFormProps) {
  const [formulario, setFormulario] =
    useState<UsuarioFormulario>(() =>
      construirFormularioInicial(modo, usuario),
    );

  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const esEdicion = modo === "editar";

  useEffect(() => {
    setFormulario(
      construirFormularioInicial(modo, usuario),
    );

    setErrores([]);
  }, [modo, usuario]);

  const puedeGuardar = useMemo(() => {
    const datosBasicosValidos =
      formulario.nombre.trim().length > 0 &&
      formulario.email.trim().length > 0 &&
      formulario.rol_id.trim().length > 0;

    if (esEdicion) {
      return datosBasicosValidos;
    }

    return (
      datosBasicosValidos &&
      formulario.password.trim().length >= 8
    );
  }, [esEdicion, formulario]);

  function actualizarCampo<
    K extends keyof UsuarioFormulario,
  >(
    campo: K,
    valor: UsuarioFormulario[K],
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarUsuario(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrores([]);
    setGuardando(true);

    try {
      if (esEdicion && !usuario?.id) {
        setErrores([
          "No se encontró el identificador del usuario.",
        ]);
        return;
      }

      const url = esEdicion
        ? `/api/administracion/usuarios/${usuario?.id}`
        : "/api/administracion/usuarios";

      const response = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formulario.nombre.trim(),
          apellido_paterno:
            formulario.apellido_paterno.trim(),
          apellido_materno:
            formulario.apellido_materno.trim(),
          email: formulario.email.trim().toLowerCase(),
          telefono: formulario.telefono.trim(),
          password: esEdicion
            ? undefined
            : formulario.password,
          rol_id: formulario.rol_id,
          activo: formulario.activo,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        const erroresServidor = Array.isArray(
          resultado.errores,
        )
          ? resultado.errores
          : [
              resultado.error ??
                `No fue posible ${
                  esEdicion ? "actualizar" : "crear"
                } el usuario.`,
            ];

        setErrores(erroresServidor);
        return;
      }

      if (!esEdicion) {
        setFormulario(formularioVacio);
      }

      onSuccess();
    } catch (error) {
      setErrores([
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
      ]);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardarUsuario}
      className="space-y-6"
    >
      {errores.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <ul className="space-y-1 text-sm text-red-700">
            {errores.map((error, index) => (
              <li key={`${error}-${index}`}>
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Nombre(s)
          </label>

          <input
            type="text"
            value={formulario.nombre}
            onChange={(event) =>
              actualizarCampo(
                "nombre",
                event.target.value,
              )
            }
            placeholder="Nombre del usuario"
            autoComplete="given-name"
            required
            disabled={guardando}
            className="
              w-full rounded-xl border border-slate-300
              px-4 py-3 text-slate-900 outline-none
              transition focus:border-blue-500
              focus:ring-4 focus:ring-blue-100
              disabled:bg-slate-100
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Apellido paterno
          </label>

          <input
            type="text"
            value={formulario.apellido_paterno}
            onChange={(event) =>
              actualizarCampo(
                "apellido_paterno",
                event.target.value,
              )
            }
            placeholder="Apellido paterno"
            autoComplete="family-name"
            disabled={guardando}
            className="
              w-full rounded-xl border border-slate-300
              px-4 py-3 text-slate-900 outline-none
              transition focus:border-blue-500
              focus:ring-4 focus:ring-blue-100
              disabled:bg-slate-100
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Apellido materno
          </label>

          <input
            type="text"
            value={formulario.apellido_materno}
            onChange={(event) =>
              actualizarCampo(
                "apellido_materno",
                event.target.value,
              )
            }
            placeholder="Apellido materno"
            disabled={guardando}
            className="
              w-full rounded-xl border border-slate-300
              px-4 py-3 text-slate-900 outline-none
              transition focus:border-blue-500
              focus:ring-4 focus:ring-blue-100
              disabled:bg-slate-100
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Teléfono
          </label>

          <input
            type="tel"
            value={formulario.telefono}
            onChange={(event) =>
              actualizarCampo(
                "telefono",
                event.target.value,
              )
            }
            placeholder="246 000 0000"
            autoComplete="tel"
            disabled={guardando}
            className="
              w-full rounded-xl border border-slate-300
              px-4 py-3 text-slate-900 outline-none
              transition focus:border-blue-500
              focus:ring-4 focus:ring-blue-100
              disabled:bg-slate-100
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Correo electrónico
          </label>

          <input
            type="email"
            value={formulario.email}
            onChange={(event) =>
              actualizarCampo(
                "email",
                event.target.value,
              )
            }
            placeholder="usuario@correo.com"
            autoComplete="email"
            required
            disabled={guardando || esEdicion}
            className="
              w-full rounded-xl border border-slate-300
              px-4 py-3 text-slate-900 outline-none
              transition focus:border-blue-500
              focus:ring-4 focus:ring-blue-100
              disabled:cursor-not-allowed
              disabled:bg-slate-100
              disabled:text-slate-500
            "
          />

          {esEdicion && (
            <p className="mt-2 text-xs text-slate-500">
              El correo no se modifica desde este formulario.
            </p>
          )}
        </div>

        {!esEdicion && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña temporal
            </label>

            <input
              type="password"
              value={formulario.password}
              onChange={(event) =>
                actualizarCampo(
                  "password",
                  event.target.value,
                )
              }
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={guardando}
              className="
                w-full rounded-xl border border-slate-300
                px-4 py-3 text-slate-900 outline-none
                transition focus:border-blue-500
                focus:ring-4 focus:ring-blue-100
                disabled:bg-slate-100
              "
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Rol
          </label>

          <select
            value={formulario.rol_id}
            onChange={(event) =>
              actualizarCampo(
                "rol_id",
                event.target.value,
              )
            }
            required
            disabled={guardando}
            className="
              w-full rounded-xl border border-slate-300
              bg-white px-4 py-3 text-slate-900
              outline-none transition
              focus:border-blue-500 focus:ring-4
              focus:ring-blue-100
              disabled:bg-slate-100
            "
          >
            <option value="">
              Selecciona un rol
            </option>

            {roles.map((rol) => (
              <option
                key={rol.id}
                value={rol.id}
              >
                {rol.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={formulario.activo}
              onChange={(event) =>
                actualizarCampo(
                  "activo",
                  event.target.checked,
                )
              }
              disabled={guardando}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />

            <span className="text-sm font-semibold text-slate-700">
              Usuario activo
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={guardando}
          className="
            rounded-xl border border-slate-300
            px-5 py-3 font-semibold text-slate-700
            transition hover:bg-slate-50
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={!puedeGuardar || guardando}
          className="
            rounded-xl bg-blue-600 px-5 py-3
            font-semibold text-white transition
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:bg-slate-300
          "
        >
          {guardando
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}