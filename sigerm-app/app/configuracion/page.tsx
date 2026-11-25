import MainLayout from "@/components/layout/MainLayout";
import OperacionCliente from "@/components/operacion/OperacionCliente";
import { requerirAdministradorOperacion } from "@/lib/operacion/autorizacion";
import { PERMISOS } from "@/lib/permissions/permissions";
import { cargarCatalogos, cargarDatos } from "@/lib/operacion/catalogos";
export default async function Page() {
  const perfil = await requerirAdministradorOperacion(PERMISOS.ADMINISTRAR_CONFIGURACION, "/configuracion");
  const [datos, catalogos] = await Promise.all([cargarDatos(perfil, "configuracion"), cargarCatalogos(perfil, "configuracion")]);
  return <MainLayout><OperacionCliente modulo="configuracion" datos={datos} catalogos={catalogos} /></MainLayout>;
}
