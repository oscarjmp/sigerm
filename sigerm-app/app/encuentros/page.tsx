import MainLayout from "@/components/layout/MainLayout";
import OperacionCliente from "@/components/operacion/OperacionCliente";
import { requerirAdministradorOperacion } from "@/lib/operacion/autorizacion";
import { PERMISOS } from "@/lib/permissions/permissions";
import { cargarCatalogos, cargarDatos } from "@/lib/operacion/catalogos";
export default async function Page() {
  const perfil = await requerirAdministradorOperacion(PERMISOS.VER_ENCUENTROS, "/encuentros");
  const [datos, catalogos] = await Promise.all([cargarDatos(perfil, "encuentros"), cargarCatalogos(perfil, "encuentros")]);
  return <MainLayout><OperacionCliente modulo="encuentros" datos={datos} catalogos={catalogos} /></MainLayout>;
}
