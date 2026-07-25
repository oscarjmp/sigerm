import { redirect } from "next/navigation";

import MainLayout from "@/components/layout/MainLayout";
import PrestamoForm from "@/components/prestamos/PrestamoForm";
import TablaPrestamos from "@/components/prestamos/TablaPrestamos";

import { createClient } from "@/lib/supabase/server";

type ArticuloPrestamoDisponible = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  cantidad: number;
  disponibles: number;
  activo: boolean;
};

type ArticuloDetallePrestamo = {
  id: string;
  codigo: string;
  nombre: string;
};

type DetallePrestamo = {
  id: string;
  cantidad: number;
  articulos: ArticuloDetallePrestamo | null;
};

type PrestamoListado = {
  id: string;
  folio: string;
  responsable: string;
  solicitante: string;
  fecha_prestamo: string;
  fecha_devolucion: string;
  estado: string;
  observaciones: string;
  usuario_id: string | null;
  detalle_prestamo: DetallePrestamo[];
};

type ArticuloRelacionadoSupabase = {
  id?: string | null;
  codigo?: string | null;
  nombre?: string | null;
};

type RolRelacionadoSupabase =
  | {
      nombre?: string | null;
    }
  | {
      nombre?: string | null;
    }[]
  | null;

function normalizarArticuloRelacionado(
  relacion:
    | ArticuloRelacionadoSupabase
    | ArticuloRelacionadoSupabase[]
    | null
    | undefined,
): ArticuloDetallePrestamo | null {
  const articulo = Array.isArray(relacion)
    ? relacion[0]
    : relacion;

  if (!articulo?.id) {
    return null;
  }

  return {
    id: articulo.id,
    codigo: articulo.codigo ?? "",
    nombre: articulo.nombre ?? "",
  };
}

function obtenerNombreRol(
  relacion: RolRelacionadoSupabase,
): string | null {
  if (Array.isArray(relacion)) {
    return relacion[0]?.nombre ?? null;
  }

  return relacion?.nombre ?? null;
}

export default async function PrestamosPage() {
  const supabase = await createClient();

  // ==========================================================
  // USUARIO AUTENTICADO
  // ==========================================================

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/login");
  }

  // ==========================================================
  // PERFIL INTERNO Y ROL
  // ==========================================================

  const {
    data: perfil,
    error: errorPerfil,
  } = await supabase
    .from("usuarios")
    .select(`
      id,
      activo,
      roles (
        nombre
      )
    `)
    .eq("auth_id", user.id)
    .maybeSingle();

  if (errorPerfil) {
    throw new Error(
      `No fue posible consultar el perfil del usuario: ${errorPerfil.message}`,
    );
  }

  if (!perfil || !perfil.activo) {
    redirect("/login");
  }

  const nombreRol = obtenerNombreRol(
    perfil.roles as RolRelacionadoSupabase,
  );

  const esAdministrador =
    nombreRol === "Administrador";

  // ==========================================================
  // ARTÍCULOS ACTIVOS CON UNIDADES DISPONIBLES
  // ==========================================================

  const {
    data: articulosData,
    error: errorArticulos,
  } = await supabase
    .from("articulos")
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      cantidad,
      disponibles,
      activo
    `)
    .eq("activo", true)
    .gt("disponibles", 0)
    .order("nombre", {
      ascending: true,
    });

  if (errorArticulos) {
    throw new Error(
      `No fue posible consultar los artículos disponibles: ${errorArticulos.message}`,
    );
  }

  const articulos: ArticuloPrestamoDisponible[] = (
    articulosData ?? []
  ).map((articulo) => ({
    id: articulo.id,
    codigo: articulo.codigo ?? "",
    nombre: articulo.nombre ?? "",
    categoria: articulo.categoria ?? null,
    cantidad: articulo.cantidad ?? 0,
    disponibles: articulo.disponibles ?? 0,
    activo: articulo.activo ?? false,
  }));

  // ==========================================================
  // PRÉSTAMOS REGISTRADOS
  // ==========================================================

  let consultaPrestamos = supabase
    .from("prestamos")
    .select(`
      id,
      folio,
      responsable,
      solicitante,
      fecha_prestamo,
      fecha_devolucion,
      estado,
      observaciones,
      usuario_id,
      detalle_prestamo (
        id,
        cantidad,
        articulos (
          id,
          codigo,
          nombre
        )
      )
    `);

  /*
   * El Administrador consulta todos los préstamos.
   * Los demás usuarios únicamente consultan los registros
   * cuyo usuario_id coincide con su perfil interno.
   */
  if (!esAdministrador) {
    consultaPrestamos = consultaPrestamos.eq(
      "usuario_id",
      perfil.id,
    );
  }

  const {
    data: prestamosData,
    error: errorPrestamos,
  } = await consultaPrestamos.order(
    "created_at",
    {
      ascending: false,
    },
  );

  if (errorPrestamos) {
    throw new Error(
      `No fue posible consultar los préstamos: ${errorPrestamos.message}`,
    );
  }

  const prestamos: PrestamoListado[] = (
    prestamosData ?? []
  ).map((prestamo) => ({
    id: prestamo.id,
    folio: prestamo.folio ?? "",
    responsable: prestamo.responsable ?? "",
    solicitante: prestamo.solicitante ?? "",
    fecha_prestamo:
      prestamo.fecha_prestamo ?? "",
    fecha_devolucion:
      prestamo.fecha_devolucion ?? "",
    estado:
      prestamo.estado ?? "PRESTADO",
    observaciones:
      prestamo.observaciones ?? "",
    usuario_id:
      prestamo.usuario_id ?? null,

    detalle_prestamo: (
      prestamo.detalle_prestamo ?? []
    ).map((detalle) => ({
      id: detalle.id,
      cantidad: detalle.cantidad ?? 0,
      articulos:
        normalizarArticuloRelacionado(
          detalle.articulos,
        ),
    })),
  }));

  // ==========================================================
  // INDICADORES
  // ==========================================================

  const totalArticulosDisponibles =
    articulos.length;

  const totalPrestamos =
    prestamos.length;

  const totalPrestamosActivos =
    prestamos.filter(
      (prestamo) =>
        prestamo.estado
          .trim()
          .toUpperCase() === "PRESTADO",
    ).length;

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">
            Movimientos de Inventario
          </h1>

          <p className="mt-2 text-gray-500">
            {esAdministrador
              ? "Consulta y administra todos los préstamos registrados en SIGERM."
              : "Consulta y administra únicamente los préstamos registrados por tu cuenta."}
          </p>
        </div>

        <span
          className={`
            inline-flex w-fit
            rounded-full px-4 py-2
            text-sm font-semibold
            ${
              esAdministrador
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }
          `}
        >
          {esAdministrador
            ? "Vista general"
            : "Mis préstamos"}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">
            Artículos disponibles
          </p>

          <p className="mt-2 text-3xl font-bold text-[#3483FA]">
            {totalArticulosDisponibles}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">
            {esAdministrador
              ? "Préstamos registrados"
              : "Mis préstamos registrados"}
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {totalPrestamos}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">
            {esAdministrador
              ? "Préstamos pendientes"
              : "Mis préstamos pendientes"}
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {totalPrestamosActivos}
          </p>
        </div>
      </div>

      <PrestamoForm articulos={articulos} />

      <div className="mt-10">
        <TablaPrestamos
          prestamos={prestamos}
        />
      </div>
    </MainLayout>
  );
}