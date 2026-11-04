import { redirect } from "next/navigation";

import Can from "@/components/auth/Can";
import MainLayout from "@/components/layout/MainLayout";
import MatrimonioModal from "@/components/matrimonios/MatrimonioModal";
import TablaMatrimonios from "@/components/matrimonios/TablaMatrimonios";
import {
  TODOS_LOS_ROLES,
  type NombreRol,
} from "@/lib/constants/roles";
import { tienePermiso } from "@/lib/permissions/menuPermissions";
import { PERMISOS } from "@/lib/permissions/permissions";
import { crearUsuarioRepository } from "@/lib/repositories/usuario.repository";
import { createClient } from "@/lib/supabase/server";
import type { UsuarioConRol } from "@/lib/types/usuario";
import type { MatrimonioVista } from "@/types/matrimonio";

/**
 * Columnas estrictamente necesarias para la tabla, el modal y el formulario
 * de edición. "direccion" es imprescindible: el formulario la reenvía al
 * editar y, si no se cargara, se sobrescribiría con un valor vacío.
 * No se consultan created_at, usuario_id ni comision_id.
 */
const COLUMNAS_GESTION =
  "id, esposo, esposa, telefono, email, direccion, ministerio, foto, activo";

function obtenerRolValido(
  perfil: UsuarioConRol | null,
): NombreRol | null {
  const nombre = perfil?.roles?.nombre;

  if (
    nombre &&
    (TODOS_LOS_ROLES as string[]).includes(nombre)
  ) {
    return nombre as NombreRol;
  }

  return null;
}

function AvisoError({
  mensaje,
}: {
  mensaje: string;
}) {

  return (

    <MainLayout>

      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        Matrimonios
      </h1>

      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
      >
        {mensaje}
      </div>

    </MainLayout>

  );

}

export default async function MatrimoniosPage() {

  const supabase = await createClient();

  // 1. Sesión validada contra Supabase Auth (no solo la cookie local).
  const {
    data: { user },
    error: errorSesion,
  } = await supabase.auth.getUser();

  if (errorSesion || !user) {
    redirect("/login?redirectTo=/matrimonios");
  }

  // 2. Perfil institucional, con la sesión del usuario (sin service_role).
  let perfil: UsuarioConRol | null = null;
  let errorPerfil = false;

  try {

    perfil = await crearUsuarioRepository(
      supabase
    ).obtenerPorAuthId(user.id);

  } catch (causa) {

    errorPerfil = true;

    console.error(
      "[matrimonios] No fue posible verificar el perfil del usuario:",
      causa instanceof Error ? causa.message : "error desconocido"
    );

  }

  // Si no se puede verificar el perfil, se deniega sin mostrar datos.
  if (errorPerfil) {
    return (
      <AvisoError mensaje="No fue posible verificar sus permisos. Intente nuevamente en unos minutos." />
    );
  }

  // 3. Autorización: perfil existente, activo, con rol reconocido y con
  //    VER_MATRIMONIOS (Administrador, Coordinador y Secretaría).
  //    Inventario, Tesorería, roles no reconocidos (p. ej. Solicitante),
  //    usuarios sin perfil o inactivos quedan fuera.
  //    redirect() se invoca fuera de try/catch a propósito.
  const rol = obtenerRolValido(perfil);

  if (
    !perfil ||
    !perfil.activo ||
    !tienePermiso(rol, PERMISOS.VER_MATRIMONIOS)
  ) {
    redirect("/dashboard");
  }

  // 4. Consulta, solo después de autorizar.
  const { data, error } = await supabase
    .from("matrimonios")
    .select(COLUMNAS_GESTION)
    .order("esposo");

  if (error) {

    // Solo información técnica, sin datos personales ni identificadores.
    console.error(
      "[matrimonios] Error al consultar matrimonios:",
      { code: error.code, message: error.message }
    );

    return (
      <AvisoError mensaje="No fue posible cargar los matrimonios. Intente nuevamente o contacte al administrador del sistema." />
    );

  }

  const matrimonios: MatrimonioVista[] = data ?? [];

  const totalMatrimonios = matrimonios.length;

  const matrimoniosActivos =
    matrimonios.filter((m) => m.activo).length;

  const totalMinisterios = new Set(
    matrimonios.map((m) => m.ministerio)
  ).size;

  return (

    <MainLayout>

      {/* Encabezado */}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 mb-8">

        <h1 className="text-3xl md:text-4xl font-bold">
          Matrimonios
        </h1>

       <Can
         permiso={PERMISOS.CREAR_MATRIMONIO}
         conservarDuranteRevalidacion
       >

         <MatrimonioModal />

       </Can>

      </div>

      {/* Tarjetas */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            👫 Matrimonios
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMatrimonios}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            ✅ Activos
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {matrimoniosActivos}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            ❤️ Ministerios
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMinisterios}

          </h2>

        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">

          <p className="text-gray-500">
            📱 Contactos
          </p>

          <h2 className="text-4xl font-bold mt-3">

            {totalMatrimonios}

          </h2>

        </div>

      </div>

      {/* Tabla */}

      <div className="overflow-x-auto">

        <TablaMatrimonios

          matrimonios={matrimonios}

        />

      </div>

    </MainLayout>

  );

}
