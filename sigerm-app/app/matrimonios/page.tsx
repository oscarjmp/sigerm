import type { ReactNode } from "react";
import {
  HeartHandshake,
  Phone,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import RequirePermission from "@/components/auth/RequirePermission";
import MainLayout from "@/components/layout/MainLayout";
import MatrimonioModal from "@/components/matrimonios/MatrimonioModal";
import TablaMatrimonios from "@/components/matrimonios/TablaMatrimonios";
import SectionCard from "@/components/ui/SectionCard";
import SigermHero from "@/components/ui/SigermHero";
import StatCard from "@/components/ui/StatCard";

import { PERMISOS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

import type { Matrimonio } from "@/types/matrimonio";

type RolRelacionado = {
  nombre: string | null;
};

type UsuarioActual = {
  id: string;
  roles:
    | RolRelacionado
    | RolRelacionado[]
    | null;
};

function obtenerTextoSeguro(
  valor: string | null | undefined,
): string {
  return valor?.trim() || "";
}

function tieneContacto(
  matrimonio: Matrimonio,
): boolean {
  return Boolean(
    obtenerTextoSeguro(matrimonio.telefono) ||
      obtenerTextoSeguro(matrimonio.email),
  );
}

function obtenerNombreRol(
  roles: UsuarioActual["roles"],
): string {
  if (!roles) {
    return "";
  }

  if (Array.isArray(roles)) {
    return roles[0]?.nombre?.trim() || "";
  }

  return roles.nombre?.trim() || "";
}

export default async function MatrimoniosPage() {
  const supabase = await createClient();

  /*
   * Usuario autenticado
   */
  const {
    data: { user },
    error: errorAutenticacion,
  } = await supabase.auth.getUser();

  if (errorAutenticacion) {
    console.error(
      "Error al consultar la sesión:",
      errorAutenticacion.message,
    );
  }

  /*
   * Usuario de la tabla pública y rol
   */
  let usuarioActualId: string | null = null;
  let esAdministrador = false;

  if (user) {
    const {
      data: usuarioConsultado,
      error: errorUsuario,
    } = await supabase
      .from("usuarios")
      .select(`
        id,
        roles (
          nombre
        )
      `)
      .eq("auth_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorUsuario) {
      console.error(
        "Error al consultar el usuario actual:",
        errorUsuario.message,
      );
    }

    const usuarioActual =
      usuarioConsultado as UsuarioActual | null;

    if (usuarioActual) {
      usuarioActualId = usuarioActual.id;

      const nombreRol = obtenerNombreRol(
        usuarioActual.roles,
      );

      esAdministrador =
        nombreRol.toUpperCase() ===
        "ADMINISTRADOR";
    }
  }

  /*
   * Directorio de matrimonios
   */
  const {
    data,
    error: errorMatrimonios,
  } = await supabase
    .from("matrimonios")
    .select(`
      id,
      esposo,
      esposa,
      telefono,
      email,
      direccion,
      ministerio,
      foto,
      activo,
      usuario_id,
      created_at
    `)
    .order("esposo", {
      ascending: true,
    });

  if (errorMatrimonios) {
    console.error(
      "Error al consultar matrimonios:",
      errorMatrimonios.message,
    );
  }

  const matrimonios =
    (data ?? []) as Matrimonio[];

  /*
   * Indicadores
   */
  const totalMatrimonios =
    matrimonios.length;

  const matrimoniosActivos =
    matrimonios.filter(
      (matrimonio) =>
        matrimonio.activo === true,
    ).length;

  const ministeriosValidos =
    matrimonios
      .map((matrimonio) =>
        obtenerTextoSeguro(
          matrimonio.ministerio,
        ),
      )
      .filter(Boolean);

  const totalMinisterios =
    new Set(ministeriosValidos).size;

  const totalContactos =
    matrimonios.filter(tieneContacto).length;

  return (
    <MainLayout>
      <RequirePermission
        permiso={PERMISOS.VER_MATRIMONIOS}
      >
        <div className="space-y-8">
          <SigermHero
            etiqueta="Comunidad SIGERM"
            titulo="Directorio de matrimonios"
            descripcion="Consulta la información de los matrimonios que participan en los encuentros, ministerios y actividades de Renovación Matrimonial."
            icono={
              <HeartHandshake
                aria-hidden="true"
                className="h-4 w-4"
              />
            }
            mensajeInferior="Cada usuario únicamente puede modificar el matrimonio vinculado con su cuenta."
            acciones={<MatrimonioModal />}
            indicadores={
              <div
                className="
                  grid grid-cols-2
                  gap-3 rounded-2xl
                  bg-white/10 p-4
                  backdrop-blur-sm
                "
              >
                <IndicadorHero
                  etiqueta="Matrimonios"
                  valor={totalMatrimonios}
                  icono={
                    <Users
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  }
                />

                <IndicadorHero
                  etiqueta="Activos"
                  valor={matrimoniosActivos}
                  icono={
                    <UserCheck
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  }
                />

                <IndicadorHero
                  etiqueta="Ministerios"
                  valor={totalMinisterios}
                  icono={
                    <HeartHandshake
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  }
                />

                <IndicadorHero
                  etiqueta="Contactos"
                  valor={totalContactos}
                  icono={
                    <Phone
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  }
                />
              </div>
            }
          />

          {errorMatrimonios && (
            <section
              role="alert"
              className="
                rounded-3xl border
                border-red-200
                bg-red-50 p-5
                text-red-700
                shadow-sm
              "
            >
              <h2 className="font-black">
                No fue posible consultar el directorio
              </h2>

              <p className="mt-1 text-sm leading-6">
                {errorMatrimonios.message}
              </p>
            </section>
          )}

          <section
            aria-label="Resumen de matrimonios"
            className="
              grid grid-cols-1
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
              xl:gap-6
            "
          >
            <StatCard
              titulo="Matrimonios"
              valor={totalMatrimonios.toLocaleString(
                "es-MX",
              )}
              descripcion="Registros en el directorio"
              color="blue"
              icono={
                <Users
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              }
            />

            <StatCard
              titulo="Activos"
              valor={matrimoniosActivos.toLocaleString(
                "es-MX",
              )}
              descripcion="Matrimonios activos"
              color="green"
              icono={
                <UserCheck
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              }
            />

            <StatCard
              titulo="Ministerios"
              valor={totalMinisterios.toLocaleString(
                "es-MX",
              )}
              descripcion="Ministerios representados"
              color="purple"
              icono={
                <HeartHandshake
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              }
            />

            <StatCard
              titulo="Con contacto"
              valor={totalContactos.toLocaleString(
                "es-MX",
              )}
              descripcion="Con teléfono o correo"
              color="yellow"
              icono={
                <Phone
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              }
            />
          </section>

          <SectionCard
            titulo="Matrimonios registrados"
            descripcion="Consulta el directorio general. Las acciones de edición y eliminación solo se muestran en los registros autorizados."
            icono={
              <Users
                aria-hidden="true"
                className="h-5 w-5"
              />
            }
            acciones={
              <div
                className="
                  inline-flex items-center
                  gap-2 rounded-full
                  bg-blue-50
                  px-4 py-2
                  text-sm font-bold
                  text-[#3483FA]
                "
              >
                <Sparkles
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                {totalMatrimonios.toLocaleString(
                  "es-MX",
                )}{" "}
                registros
              </div>
            }
            contenidoClassName="p-0 sm:p-0"
          >
            {matrimonios.length === 0 &&
            !errorMatrimonios ? (
              <div
                className="
                  flex min-h-80
                  flex-col items-center
                  justify-center
                  px-6 py-12
                  text-center
                "
              >
                <div
                  className="
                    flex h-16 w-16
                    items-center justify-center
                    rounded-3xl
                    bg-blue-50
                    text-[#3483FA]
                  "
                >
                  <HeartHandshake
                    aria-hidden="true"
                    className="h-8 w-8"
                  />
                </div>

                <h2
                  className="
                    mt-5 text-xl
                    font-black
                    text-slate-800
                  "
                >
                  No hay matrimonios registrados
                </h2>

                <p
                  className="
                    mt-2 max-w-md
                    text-sm leading-6
                    text-slate-500
                  "
                >
                  Los nuevos registros aparecerán
                  automáticamente en esta sección.
                </p>
              </div>
            ) : (
              <TablaMatrimonios
                matrimonios={matrimonios}
                usuarioActualId={usuarioActualId}
                esAdministrador={esAdministrador}
              />
            )}
          </SectionCard>
        </div>
      </RequirePermission>
    </MainLayout>
  );
}

type IndicadorHeroProps = {
  etiqueta: string;
  valor: number;
  icono: ReactNode;
};

function IndicadorHero({
  etiqueta,
  valor,
  icono,
}: IndicadorHeroProps) {
  return (
    <div
      className="
        rounded-2xl
        bg-white/10 p-3
        text-center
        backdrop-blur-sm
      "
    >
      <div
        className="
          mx-auto flex h-8 w-8
          items-center justify-center
          rounded-xl
          bg-white/10
          text-[#FFD54F]
        "
      >
        {icono}
      </div>

      <p
        className="
          mt-2 text-xl
          font-black text-white
        "
      >
        {valor.toLocaleString("es-MX")}
      </p>

      <p
        className="
          mt-1 text-[11px]
          text-blue-100
        "
      >
        {etiqueta}
      </p>
    </div>
  );
}