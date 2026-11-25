import MainLayout from "@/components/layout/MainLayout";
import OperacionCliente from "@/components/operacion/OperacionCliente";
import { requerirAdministradorOperacion } from "@/lib/operacion/autorizacion";
import { PERMISOS } from "@/lib/permissions/permissions";
import { cargarCatalogos, cargarDatos } from "@/lib/operacion/catalogos";
export default async function Page() {
  const perfil = await requerirAdministradorOperacion(PERMISOS.VER_SERVIDORES, "/equipos-servicio");
  const [datos, catalogos] = await Promise.all([cargarDatos(perfil, "equipos"), cargarCatalogos(perfil, "equipos")]);
  return <MainLayout><OperacionCliente modulo="equipos" datos={datos} catalogos={catalogos} /></MainLayout>;
}
