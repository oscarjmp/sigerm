import MainLayout from "@/components/layout/MainLayout";
import OperacionCliente from "@/components/operacion/OperacionCliente";
import { requerirAdministradorOperacion } from "@/lib/operacion/autorizacion";
import { PERMISOS } from "@/lib/permissions/permissions";
import { cargarCatalogos, cargarDatos } from "@/lib/operacion/catalogos";
export default async function Page() {
  const perfil = await requerirAdministradorOperacion(PERMISOS.VER_ENCUENTROS, "/participantes");
  const [datos, catalogos] = await Promise.all([cargarDatos(perfil, "participantes"), cargarCatalogos(perfil, "participantes")]);
  return <MainLayout><OperacionCliente modulo="participantes" datos={datos} catalogos={catalogos} /></MainLayout>;
}
