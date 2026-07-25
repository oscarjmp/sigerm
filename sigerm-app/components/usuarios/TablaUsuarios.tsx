"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import EditarUsuarioModal from "@/components/usuarios/EditarUsuarioModal";
import EliminarUsuarioModal from "@/components/usuarios/EliminarUsuarioModal";
import NuevoUsuarioModal from "@/components/usuarios/NuevoUsuarioModal";

import type {
  Rol,
  UsuarioConRol,
} from "@/lib/types/usuario";

type TablaUsuariosProps = {
  usuarios: UsuarioConRol[];
  roles: Rol[];
  error: string | null;
};

function construirNombreCompleto(
  usuario: UsuarioConRol,
): string {
  return [
    usuario.nombre,
    usuario.apellido_paterno,
    usuario.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) {
    return "Sin información";
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Sin información";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fechaConvertida);
}

export default function TablaUsuarios({
  usuarios,
  roles,
  error,
}: TablaUsuariosProps) {
  const router = useRouter();

  const [modalNuevoAbierto, setModalNuevoAbierto] =
    useState(false);

  const [modalEditarAbierto, setModalEditarAbierto] =
    useState(false);

  const [modalEliminarAbierto, setModalEliminarAbierto] =
    useState(false);

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioConRol | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [eliminando, setEliminando] =
    useState(false);

  const [errorEliminacion, setErrorEliminacion] =
    useState<string | null>(null);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const nombreCompleto =
        construirNombreCompleto(usuario).toLowerCase();

      const email = usuario.email.toLowerCase();

      const rol =
        usuario.roles?.nombre.toLowerCase() ?? "";

      const estado = usuario.activo
        ? "activo"
        : "inactivo";

      return (
        nombreCompleto.includes(termino) ||
        email.includes(termino) ||
        rol.includes(termino) ||
        estado.includes(termino)
      );
    });
  }, [busqueda, usuarios]);

  function abrirModalNuevo() {
    setModalNuevoAbierto(true);
  }

  function cerrarModalNuevo() {
    setModalNuevoAbierto(false);
  }

  function abrirModalEditar(
    usuario: UsuarioConRol,
  ) {
    setUsuarioSeleccionado(usuario);
    setModalEditarAbierto(true);
  }

  function cerrarModalEditar() {
    setModalEditarAbierto(false);
    setUsuarioSeleccionado(null);
  }

  function abrirModalEliminar(
    usuario: UsuarioConRol,
  ) {
    setUsuarioSeleccionado(usuario);
    setErrorEliminacion(null);
    setModalEliminarAbierto(true);
  }

  function cerrarModalEliminar() {
    if (eliminando) {
      return;
    }

    setModalEliminarAbierto(false);
    setUsuarioSeleccionado(null);
    setErrorEliminacion(null);
  }

  function usuarioCreado() {
    setModalNuevoAbierto(false);

    toast.success(
      "Usuario creado correctamente.",
    );

    router.refresh();
  }

  function usuarioActualizado() {
    setModalEditarAbierto(false);
    setUsuarioSeleccionado(null);

    toast.success(
      "Usuario actualizado correctamente.",
    );

    router.refresh();
  }

  async function eliminarUsuario() {
    if (!usuarioSeleccionado) {
      return;
    }

    setEliminando(true);
    setErrorEliminacion(null);

    try {
      const response = await fetch(
        `/api/administracion/usuarios/${usuarioSeleccionado.id}`,
        {
          method: "DELETE",
        },
      );

      const resultado = await response.json();

      if (!response.ok) {
        setErrorEliminacion(
          resultado.error ??
            "No fue posible eliminar el usuario.",
        );

        return;
      }

      setModalEliminarAbierto(false);
      setUsuarioSeleccionado(null);

      toast.success(
        resultado.mensaje ??
          "Usuario eliminado correctamente.",
      );

      router.refresh();
    } catch (error) {
      setErrorEliminacion(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Administración de Usuarios
            </h1>

            <p className="mt-1 text-slate-500">
              Gestiona los usuarios, roles y
              estados de acceso al sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="
              inline-flex items-center
              justify-center gap-2
              rounded-xl bg-blue-600
              px-5 py-3 font-semibold
              text-white shadow-sm
              transition hover:bg-blue-700
              focus:outline-none focus:ring-4
              focus:ring-blue-100
            "
          >
            <Plus size={20} />
            Nuevo usuario
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            No fue posible consultar la información:
            {" "}
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total de usuarios
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {usuarios.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Usuarios activos
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {
                usuarios.filter(
                  (usuario) => usuario.activo,
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Usuarios inactivos
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {
                usuarios.filter(
                  (usuario) => !usuario.activo,
                ).length
              }
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={22} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Usuarios registrados
                </h2>

                <p className="text-sm text-slate-500">
                  {usuariosFiltrados.length}
                  {" "}
                  resultado(s)
                </p>
              </div>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search
                size={19}
                className="
                  pointer-events-none
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="search"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar por nombre, correo, rol o estado"
                className="
                  w-full rounded-xl
                  border border-slate-300
                  py-3 pl-11 pr-4
                  text-slate-900 outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Nombre
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Correo
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Rol
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Estado
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Fecha de alta
                  </th>

                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="
                        transition-colors
                        hover:bg-slate-50
                      "
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {construirNombreCompleto(usuario)}
                        </div>

                        {usuario.telefono && (
                          <div className="mt-1 text-sm text-slate-500">
                            {usuario.telefono}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {usuario.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                          {usuario.roles?.nombre ??
                            "Sin rol"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`
                            rounded-full px-3 py-1
                            text-sm font-medium
                            ${
                              usuario.activo
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }
                          `}
                        >
                          {usuario.activo
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatearFecha(
                          usuario.created_at,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirModalEditar(usuario)
                            }
                            className="
                              inline-flex items-center
                              gap-2 rounded-lg
                              px-3 py-2
                              font-semibold
                              text-blue-600
                              transition
                              hover:bg-blue-50
                              hover:text-blue-800
                            "
                          >
                            <Pencil size={17} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              abrirModalEliminar(
                                usuario,
                              )
                            }
                            className="
                              inline-flex items-center
                              gap-2 rounded-lg
                              px-3 py-2
                              font-semibold text-red-600
                              transition
                              hover:bg-red-50
                              hover:text-red-800
                            "
                          >
                            <Trash2 size={17} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NuevoUsuarioModal
        abierto={modalNuevoAbierto}
        roles={roles}
        onClose={cerrarModalNuevo}
        onSuccess={usuarioCreado}
      />

      <EditarUsuarioModal
        abierto={modalEditarAbierto}
        usuario={usuarioSeleccionado}
        roles={roles}
        onClose={cerrarModalEditar}
        onSuccess={usuarioActualizado}
      />

      <EliminarUsuarioModal
        abierto={modalEliminarAbierto}
        usuario={usuarioSeleccionado}
        eliminando={eliminando}
        error={errorEliminacion}
        onClose={cerrarModalEliminar}
        onConfirm={eliminarUsuario}
      />
    </>
  );
}