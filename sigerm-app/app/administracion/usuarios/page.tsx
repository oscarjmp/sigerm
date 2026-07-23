import MainLayout from "@/components/layout/MainLayout";
import { createClient } from "@/lib/supabase/server";

type Rol = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

type UsuarioConRol = {
  id: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  email: string;
  telefono: string | null;
  activo: boolean | null;
  created_at: string | null;
  roles: Rol | null;
};

type UsuarioConsulta = Omit<UsuarioConRol, "roles"> & {
  roles: Rol[] | Rol | null;
};

function construirNombreCompleto(usuario: UsuarioConRol): string {
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

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select(`
      id,
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      telefono,
      activo,
      created_at,
      roles (
        id,
        nombre,
        descripcion
      )
    `)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al consultar usuarios:", error.message);
  }

  const usuariosConsulta = (data ?? []) as UsuarioConsulta[];

  const usuarios: UsuarioConRol[] = usuariosConsulta.map((usuario) => ({
    ...usuario,
    roles: Array.isArray(usuario.roles)
      ? usuario.roles[0] ?? null
      : usuario.roles,
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Administración de Usuarios
            </h1>

            <p className="mt-1 text-slate-500">
              Gestiona los usuarios, roles y estados de acceso al sistema.
            </p>
          </div>

          <button
            type="button"
            className="
              rounded-xl bg-blue-600 px-5 py-3
              font-semibold text-white
              transition-colors hover:bg-blue-700
            "
          >
            + Nuevo usuario
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            No fue posible consultar los usuarios: {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
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
                {usuarios.length === 0 && !error ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      Aún no hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="transition-colors hover:bg-slate-50"
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
                          {usuario.roles?.nombre ?? "Sin rol"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`
                            rounded-full px-3 py-1 text-sm font-medium
                            ${
                              usuario.activo
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }
                          `}
                        >
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatearFecha(usuario.created_at)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}