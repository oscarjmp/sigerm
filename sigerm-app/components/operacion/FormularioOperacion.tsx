"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import { guardarOperacion } from "@/lib/operacion/acciones";
import { ESTADOS_ENCUENTRO, encuentroSchema, participanteSchema, equipoSchema, participanteEdicionSchema, equipoEdicionSchema, configuracionSchema, nombreMatrimonio,
  nombreUsuario, type Modulo, type OperacionDatos, type Catalogos, type DatosFormulario } from "@/lib/operacion/modelos";
import type { RegistroOperacion } from "@/lib/operacion/contrato";
type Campo = { nombre: string; titulo: string; tipo?: string; opciones?: { valor: string; texto: string }[]; max?: number; opcional?: boolean };
export default function FormularioOperacion({ modulo, datos, catalogos, inicial = {}, onGuardado, onOcupado }: {
  modulo: Modulo; datos: OperacionDatos; catalogos: Catalogos; inicial?: DatosFormulario; onGuardado: (registro: RegistroOperacion) => void; onOcupado?: (valor: boolean) => void;
}) {
  const edicionParcial = Boolean(inicial.id) && (modulo === "participantes" || modulo === "equipos");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, startTransition] = useTransition();
  const envioEnCurso = useRef(false);
  const encuentros = datos.encuentros.estado === "disponible" ? datos.encuentros.datos : [];
  const matrimonios = catalogos.matrimonios.estado === "disponible" ? catalogos.matrimonios.datos : [];
  const usuarios = catalogos.usuarios.estado === "disponible" ? catalogos.usuarios.datos : [];
  const estados = [...new Set([...ESTADOS_ENCUENTRO, ...(typeof inicial.estado === "string" ? [inicial.estado] : [])])];
  const encuentro: Campo = { nombre: "encuentroId", titulo: "Encuentro", opciones: encuentros.map(e => ({ valor: e.id, texto: "#" + e.numero + " · " + e.nombre })) };
  const campos: Record<Modulo, Campo[]> = {
    encuentros: [
      { nombre: "nombre", titulo: "Nombre", max: 150 },
      { nombre: "fechaInicio", titulo: "Fecha de inicio", tipo: "date", opcional: true },
      { nombre: "fechaTermino", titulo: "Fecha de término", tipo: "date", opcional: true },
      { nombre: "sede", titulo: "Sede", max: 200, opcional: true },
      { nombre: "estado", titulo: "Estado", opciones: estados.map(e => ({ valor: e, texto: e })), opcional: true },
    ],
    participantes: [encuentro,
      { nombre: "matrimonioId", titulo: "Matrimonio activo", opciones: matrimonios.filter(m => m.activo || m.id === inicial.matrimonioId).map(m => ({ valor: m.id, texto: nombreMatrimonio(m) })) },
      { nombre: "habitacion", titulo: "Habitación", max: 20, opcional: true },
      { nombre: "observaciones", titulo: "Observaciones", tipo: "textarea", max: 4000, opcional: true }],
    equipos: [encuentro,
      { nombre: "usuarioId", titulo: "Usuario activo", opciones: usuarios.filter(u => u.activo || u.id === inicial.usuarioId).map(u => ({ valor: u.id, texto: nombreUsuario(u) })) },
      { nombre: "area", titulo: "Área de servicio", max: 100 },
      { nombre: "cargo", titulo: "Cargo", max: 100 }],
    configuracion: [
      { nombre: "organizacion", titulo: "Organización", max: 200 },
      { nombre: "parroquia", titulo: "Parroquia", max: 200, opcional: true },
      { nombre: "ciudad", titulo: "Ciudad", max: 100, opcional: true },
      { nombre: "estado", titulo: "Estado o entidad", max: 100, opcional: true },
      { nombre: "pais", titulo: "País", max: 100, opcional: true }],
  };
  const faltanReferencias = !inicial.id && ((modulo === "participantes" && (datos.encuentros.estado !== "disponible" || catalogos.matrimonios.estado !== "disponible"))
    || (modulo === "equipos" && (datos.encuentros.estado !== "disponible" || catalogos.usuarios.estado !== "disponible")));
  function mostrarErrores(nuevos: Record<string, string>, texto: string) {
    setErrores(nuevos); setMensaje(texto); toast.error(texto);
    requestAnimationFrame(() => document.getElementById("errores-operacion")?.focus());
  }
  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (envioEnCurso.current || guardando || faltanReferencias) return;
    const entradas = Object.fromEntries(new FormData(event.currentTarget));
    const parcial = edicionParcial;
    const valores = parcial ? Object.fromEntries(Object.entries(entradas).filter(([clave, valor]) => String(valor) !== String(inicial[clave] ?? ""))) : entradas;
    if (parcial && !Object.keys(valores).length) { mostrarErrores({}, "No hay cambios para guardar."); return; }
    const schemas = { encuentros: encuentroSchema, participantes: inicial.id ? participanteEdicionSchema : participanteSchema, equipos: inicial.id ? equipoEdicionSchema : equipoSchema, configuracion: configuracionSchema };
    const resultado = schemas[modulo].safeParse(valores);
    if (!resultado.success) {
      const nuevos: Record<string, string> = {};
      resultado.error.issues.forEach(i => { nuevos[String(i.path[0] ?? "_")] ??= i.message; });
      mostrarErrores(nuevos, "Revisa los campos indicados."); return;
    }
    setErrores({}); setMensaje("");
    envioEnCurso.current = true;
    onOcupado?.(true);
    startTransition(async () => {
      try {
        const respuesta = await guardarOperacion(modulo, valores, typeof inicial.id === "string" ? inicial.id : undefined);
        if (!respuesta.ok) { mostrarErrores(respuesta.campos ?? {}, respuesta.mensaje); return; }
        toast.success(inicial.id ? "Cambios guardados y confirmados." : "Registro guardado y confirmado.");
        if (respuesta.aviso) toast.info(respuesta.aviso);
        try { onGuardado(respuesta.valor); }
        catch { toast.info("Guardado confirmado. Recarga para actualizar la vista."); }
      } catch {
        mostrarErrores({}, "No se pudo confirmar la respuesta. Recarga antes de reintentar para evitar duplicados.");
      } finally {
        envioEnCurso.current = false;
        onOcupado?.(false);
      }
    });
  }
  return <form onSubmit={enviar} noValidate aria-busy={guardando} className="space-y-5">
    <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">Los cambios se guardan mediante el servidor y respetan los permisos de la base de datos.
      {modulo === "encuentros" && " El número consecutivo es generado automáticamente."}
    </p>
    {inicial.id && (modulo === "participantes" || modulo === "equipos") && <p className="text-sm text-slate-600">Puedes conservar referencias hist\u00f3ricas sin asignar. Solo se env\u00edan los campos modificados.</p>}
    {faltanReferencias && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No se puede guardar mientras los catálogos necesarios no estén disponibles. Recarga o solicita la revisión de permisos.</p>}
    {(mensaje || Object.keys(errores).length > 0) && <div id="errores-operacion" tabIndex={-1} role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p className="font-bold">{mensaje}</p><ul className="mt-2 list-disc pl-5">{Object.entries(errores).map(([campo, texto]) => <li key={campo}>
        {campo === "_" ? texto : <a href={"#campo-" + campo}>{campos[modulo].find(c => c.nombre === campo)?.titulo}: {texto}</a>}
      </li>)}</ul>
    </div>}
    <fieldset disabled={guardando} className="grid gap-4 sm:grid-cols-2">{campos[modulo].map(c => {
      const id = "campo-" + c.nombre;
      const opciones = c.opciones ? [...c.opciones] : undefined;
      const actual = inicial[c.nombre];
      if (opciones && typeof actual === "string" && actual && !opciones.some(o => o.valor === actual)) opciones.unshift({ valor: actual, texto: "Asignaci\u00f3n actual (no disponible)" });
      const props = { id, name: c.nombre, defaultValue: inicial[c.nombre] ?? (!inicial.id && c.nombre === "estado" && modulo === "encuentros" ? "Planeación" : ""),
        "aria-invalid": Boolean(errores[c.nombre]), "aria-describedby": errores[c.nombre] ? id + "-error" : undefined,
        required: !c.opcional && !edicionParcial, className: "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" };
      return <div key={c.nombre} className={c.tipo === "textarea" ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">{c.titulo}{c.opcional ? " (opcional)" : edicionParcial ? "" : " *"}</label>
        {opciones ? <select {...props}><option value="">{inicial.id && (c.nombre === "encuentroId" || c.nombre === "matrimonioId" || c.nombre === "usuarioId") ? "Sin asignar" : c.opcional ? "Sin especificar" : "Selecciona una opción"}</option>{opciones.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>
          : c.tipo === "textarea" ? <textarea {...props} rows={3} maxLength={c.max} />
          : <input {...props} type={c.tipo ?? "text"} maxLength={c.max} />}
        {errores[c.nombre] && <p id={id + "-error"} className="mt-1 text-sm text-red-700">{errores[c.nombre]}</p>}
      </div>;
    })}</fieldset>
    <Button type="submit" variant="secondary" loading={guardando} disabled={faltanReferencias}>{inicial.id ? "Guardar cambios" : "Guardar registro"}</Button>
  </form>;
}
