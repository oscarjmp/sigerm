"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, HandHelping, Settings, History } from "lucide-react";
import SigermHero from "@/components/ui/SigermHero";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import SearchInput from "@/components/ui/SearchInput";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium";
import DataTable from "@/components/ui/DataTable";
import { ROLES } from "@/lib/constants/roles";
import { useAuth } from "@/lib/hooks/useAuth";
import FormularioOperacion from "./FormularioOperacion";
import { lecturaOperacion, escrituraOperacion, rutasOperacion } from "@/lib/operacion/permisos";
import { ESTADOS_ENCUENTRO, filtrarEncuentros, normalizarBusqueda, nombreMatrimonio, nombreUsuario,
  type Modulo, type OperacionDatos, type Catalogos, type EstadoDatos, type DatosFormulario } from "@/lib/operacion/modelos";
import type { RegistroOperacion } from "@/lib/operacion/contrato";

const titulos = { encuentros: "Encuentros", participantes: "Matrimonios participantes", equipos: "Equipos de servicio", configuracion: "Configuración institucional" };
const descripciones = {
  encuentros: "Organiza fechas y sedes, consulta participantes y asignaciones de servicio.",
  participantes: "Inscribe matrimonios, administra habitaciones y consulta su historial de encuentros.",
  equipos: "Asigna usuarios a un encuentro con su área y cargo de servicio.",
  configuracion: "Administra los registros de organizaciones, parroquias y sus ubicaciones.",
};
function Disponibilidad<T>({ fuente, children }: { fuente: EstadoDatos<T>; children: (datos: T) => React.ReactNode }) {
  if (fuente.estado !== "disponible") return <div role={fuente.estado === "error" ? "alert" : "status"}>
    <EmptyState titulo={fuente.estado === "error" ? "No fue posible consultar la información" : "Información no disponible"} descripcion={fuente.mensaje} />
  </div>;
  return <>{children(fuente.datos)}</>;
}
function fecha(valor: string | null) {
  if (!valor) return "Sin fecha";
  const date = new Date(valor.length === 10 ? valor + "T12:00:00Z" : valor);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
const selectClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
export default function OperacionCliente({ modulo, datos, catalogos }: { modulo: Modulo; datos: OperacionDatos; catalogos: Catalogos }) {
  const { puede, rol, cargando } = useAuth();
  const administrador = rol === ROLES.ADMINISTRADOR;
  const router = useRouter();
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("");
  const [encuentroId, setEncuentroId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [area, setArea] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [detalleId, setDetalleId] = useState("");
  const [formulario, setFormulario] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [inicial, setInicial] = useState<DatosFormulario>({});
  const encuentros = datos.encuentros.estado === "disponible" ? datos.encuentros.datos : [];
  const participantes = datos.participantes.estado === "disponible" ? datos.participantes.datos : [];
  const equipos = datos.equipos.estado === "disponible" ? datos.equipos.datos : [];
  const matrimonios = catalogos.matrimonios.estado === "disponible" ? catalogos.matrimonios.datos : [];
  const usuarios = catalogos.usuarios.estado === "disponible" ? catalogos.usuarios.datos : [];
  const detalle = encuentros.find(e => e.id === detalleId);
  const nombre = (id: string | null) => { const m = matrimonios.find(m => m.id === id); return id === null ? "Sin asignar" : m ? nombreMatrimonio(m) : "Matrimonio no disponible"; };
  const usuario = (id: string | null) => { const u = usuarios.find(u => u.id === id); return id === null ? "Sin asignar" : u ? nombreUsuario(u) : "Usuario no disponible"; };
  const evento = (id: string | null) => id === null ? "Sin asignar" : encuentros.find(e => e.id === id)?.nombre ?? "Encuentro no disponible";
  const permisoCrear = administrador && puede(escrituraOperacion[modulo][0]);
  const permisoEditar = administrador && puede(escrituraOperacion[modulo][1]);
  const actuales = filtrarEncuentros(encuentros, buscar, estado, desde, hasta);
  const estados = [...new Set([...ESTADOS_ENCUENTRO, ...encuentros.flatMap(e => e.estado ? [e.estado] : [])])];
  const q = normalizarBusqueda(buscar);
  function limpiar() { setBuscar(""); setEstado(""); setEncuentroId(""); setPersonaId(""); setArea(""); setDesde(""); setHasta(""); }
  function editar(registro: RegistroOperacion) { if (ocupado) return; setInicial({ ...registro }); setFormulario(true); }
  function guardado() { setFormulario(false); setInicial({}); router.refresh(); }
  const inscripciones = participantes.map(p => ({ ...p, matrimonio: nombre(p.matrimonioId), encuentro: evento(p.encuentroId) }));
  const asignaciones = equipos.map(e => ({ ...e, usuario: usuario(e.usuarioId), encuentro: evento(e.encuentroId) }));
  if (cargando) return <Loader mensaje="Verificando acceso de Administrador..." />;
  if (!administrador) return <EmptyState titulo="Acceso restringido" descripcion="Este modulo esta disponible solo para el Administrador." />;
  return <div className="space-y-6">
    <SigermHero etiqueta="Operación SIGERM" titulo={titulos[modulo]} descripcion={descripciones[modulo]} icono={<CalendarDays size={20} />}
      mensajeInferior="Las consultas y los cambios respetan la sesión y los permisos de la base de datos." />
    <nav aria-label="Módulos de operación" className="flex flex-wrap gap-2">{(Object.keys(rutasOperacion) as Modulo[]).filter(m => administrador && puede(lecturaOperacion[m])).map(m => <Link key={m} href={rutasOperacion[m]} aria-current={modulo === m ? "page" : undefined}
      className={"rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline-2 " + (modulo === m ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-blue-800 hover:bg-blue-50")}>{m === "participantes" ? "Participantes" : titulos[m]}</Link>)}</nav>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard titulo="Encuentros" valor={datos.encuentros.estado === "disponible" ? encuentros.length : "—"} descripcion="Registros accesibles" icono={<CalendarDays />} />
      <StatCard titulo="Inscripciones" valor={datos.participantes.estado === "disponible" ? participantes.length : "—"} descripcion="Un registro por matrimonio y encuentro" icono={<Users />} color="green" />
      <StatCard titulo="Asignaciones" valor={datos.equipos.estado === "disponible" ? equipos.length : "—"} descripcion="Usuarios en servicio" icono={<HandHelping />} color="purple" />
      {modulo === "configuracion" ? <StatCard titulo="Organizaciones" valor={datos.configuraciones.estado === "disponible" ? datos.configuraciones.datos.length : "—"} icono={<Settings />} />
        : <StatCard titulo="En curso" valor={datos.encuentros.estado === "disponible" ? encuentros.filter(e => e.estado === "En curso").length : "—"} descripcion="Encuentros en operación" icono={<CalendarDays />} color="yellow" />}
    </div>
    {modulo === "participantes" && catalogos.matrimonios.estado !== "disponible" && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{catalogos.matrimonios.mensaje}</p>}
    {modulo === "equipos" && catalogos.usuarios.estado !== "disponible" && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{catalogos.usuarios.mensaje}</p>}
    <SectionCard titulo="Directorio" acciones={<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={ocupado} onClick={() => router.refresh()}>Actualizar</Button>{permisoCrear && <Button variant="secondary" disabled={ocupado} onClick={() => { setInicial({}); setFormulario(!formulario); }}>{formulario ? "Cerrar formulario" : "Nuevo registro"}</Button>}</div>}>
      <div className="mb-6 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SearchInput value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar en el directorio…" />
        {modulo === "encuentros" ? <>
          <label className="text-xs font-semibold text-slate-600">Estado<select value={estado} onChange={e => setEstado(e.target.value)} className={selectClass}><option value="">Todos</option>{estados.map(e => <option key={e}>{e}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={selectClass} /></label>
          <label className="text-xs font-semibold text-slate-600">Hasta<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={selectClass} /></label>
        </> : modulo !== "configuracion" ? <>
          <label className="text-xs font-semibold text-slate-600">Encuentro<select value={encuentroId} onChange={e => setEncuentroId(e.target.value)} className={selectClass}><option value="">Todos los encuentros</option>{encuentros.map(e => <option value={e.id} key={e.id}>#{e.numero} · {e.nombre}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">{modulo === "participantes" ? "Matrimonio" : "Usuario"}<select value={personaId} onChange={e => setPersonaId(e.target.value)} className={selectClass}><option value="">Todos</option>
            {modulo === "participantes" ? matrimonios.map(m => <option value={m.id} key={m.id}>{nombreMatrimonio(m)}</option>) : usuarios.map(u => <option value={u.id} key={u.id}>{nombreUsuario(u)}</option>)}</select></label>
          {modulo === "equipos" && <label className="text-xs font-semibold text-slate-600">Área<select value={area} onChange={e => setArea(e.target.value)} className={selectClass}><option value="">Todas las áreas</option>{[...new Set(equipos.map(e => e.area))].filter(Boolean).sort().map(a => <option key={a}>{a}</option>)}</select></label>}
        </> : null}
        <Button variant="outline" onClick={limpiar}>Limpiar filtros</Button>
      </div>
      {desde && hasta && desde > hasta && <p role="alert" className="mb-4 text-sm text-red-700">La fecha desde debe ser anterior o igual a la fecha hasta.</p>}
      {formulario && <div className="mb-6 rounded-2xl border border-blue-100 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{inicial.id ? "Editar registro" : "Nuevo registro"}</h3><Button variant="outline" disabled={ocupado} onClick={() => setFormulario(false)}>Cerrar</Button></div><FormularioOperacion key={modulo + String(inicial.id ?? "nuevo")} modulo={modulo} datos={datos} catalogos={catalogos} inicial={inicial} onGuardado={guardado} onOcupado={setOcupado} /></div>}
      {modulo === "encuentros" && <Disponibilidad fuente={datos.encuentros}>{() => actuales.length ? <div className="grid gap-4 lg:grid-cols-2">{actuales.map(e => <PremiumCard key={e.id} className="p-5">
        <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">#{e.numero} · {e.nombre}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{e.estado || "Sin estado"}</span></div>
        <p className="mt-3 text-sm text-slate-600">{fecha(e.fechaInicio)} — {fecha(e.fechaTermino)}</p><p className="mt-2 text-sm">{e.sede || "Sin sede definida"}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDetalleId(e.id)}>Ver detalle</Button>{permisoEditar && <Button variant="outline" disabled={ocupado} onClick={() => editar(e)}>Editar</Button>}</div>
      </PremiumCard>)}</div> : <EmptyState titulo="Sin encuentros para mostrar" descripcion="Ajusta los filtros o registra un encuentro." />}</Disponibilidad>}
      {modulo === "participantes" && <Disponibilidad fuente={datos.participantes}>{() => <DataTable titulo={titulos[modulo]} mostrarBuscador={false} data={inscripciones.filter(p => (!encuentroId || p.encuentroId === encuentroId) && (!personaId || p.matrimonioId === personaId) && normalizarBusqueda([p.matrimonio, p.encuentro, p.habitacion, p.observaciones].join(" ")).includes(q))}
        buscarEn={["matrimonio", "encuentro", "habitacion", "observaciones"]} columns={[{ key: "matrimonio", titulo: "Matrimonio" }, { key: "encuentro", titulo: "Encuentro" }, { key: "habitacion", titulo: "Habitación" }, { key: "observaciones", titulo: "Observaciones" }, { key: "createdAt", titulo: "Registro", render: p => fecha(p.createdAt) },
        { key: "acciones", titulo: "Acciones", render: p => permisoEditar ? <Button variant="outline" size="sm" disabled={ocupado} onClick={() => editar(p)}>Editar</Button> : "Consulta" }]} mensajeVacio="No hay inscripciones que coincidan con los filtros." />}</Disponibilidad>}
      {modulo === "equipos" && <Disponibilidad fuente={datos.equipos}>{() => <DataTable titulo={titulos[modulo]} mostrarBuscador={false} data={asignaciones.filter(e => (!encuentroId || e.encuentroId === encuentroId) && (!personaId || e.usuarioId === personaId) && (!area || e.area === area) && normalizarBusqueda([e.usuario, e.encuentro, e.area, e.cargo].join(" ")).includes(q))}
        buscarEn={["usuario", "encuentro", "area", "cargo"]} columns={[{ key: "usuario", titulo: "Usuario" }, { key: "encuentro", titulo: "Encuentro" }, { key: "area", titulo: "Área" }, { key: "cargo", titulo: "Cargo" },
        { key: "acciones", titulo: "Acciones", render: e => permisoEditar ? <Button variant="outline" size="sm" disabled={ocupado} onClick={() => editar(e)}>Editar</Button> : "Consulta" }]} mensajeVacio="No hay asignaciones que coincidan con los filtros." />}</Disponibilidad>}
      {modulo === "configuracion" && <Disponibilidad fuente={datos.configuraciones}>{registros => <DataTable titulo={titulos[modulo]} mostrarBuscador={false} data={registros.filter(c => normalizarBusqueda([c.organizacion, c.parroquia, c.ciudad, c.estado, c.pais].join(" ")).includes(q))}
        buscarEn={["organizacion", "parroquia", "ciudad", "estado", "pais"]} columns={[{ key: "organizacion", titulo: "Organización" }, { key: "parroquia", titulo: "Parroquia" }, { key: "ciudad", titulo: "Ciudad" }, { key: "estado", titulo: "Estado" }, { key: "pais", titulo: "País" },
        { key: "acciones", titulo: "Acciones", render: c => permisoEditar ? <Button variant="outline" size="sm" disabled={ocupado} onClick={() => editar(c)}>Editar</Button> : "Consulta" }]} mensajeVacio="No hay registros de configuración para mostrar." />}</Disponibilidad>}
    </SectionCard>
    {modulo === "encuentros" && detalle && <SectionCard titulo={"Detalle · #" + detalle.numero + " · " + detalle.nombre} acciones={<Button variant="outline" onClick={() => setDetalleId("")}>Cerrar detalle</Button>}>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Estado", detalle.estado || "Sin especificar"], ["Sede", detalle.sede || "Sin especificar"], ["Inicio", fecha(detalle.fechaInicio)], ["Término", fecha(detalle.fechaTermino)], ["Registro", fecha(detalle.createdAt)]].map(([k, v]) => <div key={k}><dt className="font-semibold text-slate-500">{k}</dt><dd className="mt-1 text-slate-900">{v}</dd></div>)}</dl>
      <div className="mt-6 space-y-4"><h3 className="font-bold">Matrimonios participantes</h3><Disponibilidad fuente={datos.participantes}>{filas => <ul className="space-y-2">{filas.filter(p => p.encuentroId === detalle.id).map(p => <li key={p.id}>{nombre(p.matrimonioId)} · Habitación: {p.habitacion || "Sin asignar"}</li>)}{!filas.some(p => p.encuentroId === detalle.id) && <li>Sin inscripciones registradas.</li>}</ul>}</Disponibilidad>
      <h3 className="font-bold">Servicio asignado</h3><Disponibilidad fuente={datos.equipos}>{filas => <ul className="space-y-2">{filas.filter(e => e.encuentroId === detalle.id).map(e => <li key={e.id}>{usuario(e.usuarioId)} · {e.area} · {e.cargo}</li>)}{!filas.some(e => e.encuentroId === detalle.id) && <li>Sin asignaciones registradas.</li>}</ul>}</Disponibilidad></div>
    </SectionCard>}
    {modulo === "participantes" && <SectionCard titulo="Historial de participación" icono={<History />} descripcion="Selecciona un matrimonio en el filtro para consultar todas sus inscripciones."><Disponibilidad fuente={datos.participantes}>{() => !personaId ? <p className="text-sm text-slate-500">Selecciona un matrimonio.</p> : <DataTable titulo="Historial de participación" data={inscripciones.filter(p => p.matrimonioId === personaId).sort((a,b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))}
      buscarEn={["encuentro", "habitacion"]} columns={[{ key: "encuentro", titulo: "Encuentro" }, { key: "habitacion", titulo: "Habitación" }, { key: "createdAt", titulo: "Registro", render: p => fecha(p.createdAt) }]} />}</Disponibilidad></SectionCard>}
    {modulo === "configuracion" && <SectionCard titulo="Ministerios" icono={<Settings />} descripcion="Consulta del catálogo institucional existente."><Disponibilidad fuente={catalogos.ministerios}>{registros => registros.length ? <ul className="flex flex-wrap gap-2">{registros.map(m => <li key={m} className="rounded-xl bg-slate-50 p-3 text-sm">{m}</li>)}</ul> : <EmptyState titulo="No hay ministerios registrados" />}</Disponibilidad></SectionCard>}
  </div>;
}
