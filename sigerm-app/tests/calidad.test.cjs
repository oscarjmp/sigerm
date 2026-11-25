/* eslint-disable @typescript-eslint/no-require-imports -- Local QA tests with injected persistence and component-event harness. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { montar } = require("./helpers/interaccion.cjs");
const { crearLoader, clienteSimulado, ids, encuentro, participante, servicio, configuracion, catalogos } = require("./helpers/operacion.cjs");
const cargar = crearLoader();
const modelos = cargar("lib/operacion/modelos.ts");
const { crearRepositorio } = cargar("lib/operacion/repositorio.ts");
const datos = {
  encuentros: { estado: "disponible", datos: [encuentro] },
  participantes: { estado: "disponible", datos: [participante] },
  equipos: { estado: "disponible", datos: [servicio] },
  configuraciones: { estado: "disponible", datos: [configuracion] },
};
const entradas = { encuentros: encuentro, participantes: participante, equipos: servicio, configuracion };
const anteriorRAF = global.requestAnimationFrame, anteriorDocument = global.document;
before(() => {
  global.requestAnimationFrame = fn => { fn(); return 0; };
  global.document = { getElementById: () => ({ focus() {} }) };
});
after(() => {
  if (anteriorRAF === undefined) delete global.requestAnimationFrame; else global.requestAnimationFrame = anteriorRAF;
  if (anteriorDocument === undefined) delete global.document; else global.document = anteriorDocument;
});
function formulario(modulo, guardar, extras = {}) {
  const avisos = [], confirmados = [], ocupado = [];
  const props = { modulo, datos, catalogos, onGuardado: r => confirmados.push(r), onOcupado: v => ocupado.push(v), ...extras };
  const escenario = montar("components/operacion/FormularioOperacion.tsx", props, {
    "@/lib/operacion/acciones": { guardarOperacion: guardar },
    sonner: { toast: {
      success: m => avisos.push(["success", m]), error: m => avisos.push(["error", m]), info: m => avisos.push(["info", m]),
    } },
  });
  return { ...escenario, avisos, confirmados, ocupado };
}
for (const modulo of Object.keys(entradas)) {
  test("no anuncia éxito si el servidor rechaza " + modulo, async () => {
    const s = formulario(modulo, async () => ({ ok: false, mensaje: "Acceso denegado por RLS." }));
    s.enviar(entradas[modulo]); await s.terminar();
    assert.equal(s.confirmados.length, 0); assert.equal(s.avisos.filter(a => a[0] === "success").length, 0);
    assert.match(s.avisos[0][1], /Acceso denegado/); assert.deepEqual(s.ocupado, [true, false]);
  });
  test("confirma solo después de respuesta positiva: " + modulo, async () => {
    let resolver;
    const respuesta = new Promise(resolve => { resolver = resolve; });
    const s = formulario(modulo, () => respuesta);
    s.enviar(entradas[modulo]);
    assert.equal(s.confirmados.length, 0); assert.equal(s.avisos.length, 0);
    resolver({ ok: true, valor: entradas[modulo] }); await s.terminar();
    assert.equal(s.confirmados.length, 1); assert.equal(s.avisos.filter(a => a[0] === "success").length, 1);
  });
}
test("dos eventos inmediatos del mismo formulario producen una sola solicitud", async () => {
  let llamadas = 0;
  const s = formulario("encuentros", async () => { llamadas++; return { ok: true, valor: encuentro }; });
  const handler = s.render().props.onSubmit;
  s.enviar(encuentro, handler); s.enviar(encuentro, handler); await s.terminar();
  assert.equal(llamadas, 1);
});
test("un fallo de transporte no presenta éxito ni cierra el formulario", async () => {
  const s = formulario("encuentros", async () => { throw new Error("offline"); });
  s.enviar(encuentro); await s.terminar();
  assert.equal(s.confirmados.length, 0); assert.equal(s.avisos.filter(a => a[0] === "success").length, 0);
  assert.match(s.avisos[0][1], /No se pudo confirmar/);
});
test("fallo al actualizar vista no convierte el guardado confirmado en un error", async () => {
  const s = formulario("encuentros", async () => ({ ok: true, valor: encuentro }), { onGuardado() { throw new Error("router"); } });
  s.enviar(encuentro); await s.terminar();
  assert.equal(s.avisos.filter(a => a[0] === "success").length, 1);
  assert.equal(s.avisos.filter(a => a[0] === "error").length, 0); assert.match(s.avisos.at(-1)[1], /Recarga/);
});
test("errores de campos del servidor aparecen accesibles sin éxito", async () => {
  const s = formulario("encuentros", async () => ({ ok: false, mensaje: "Revisa nombre.", campos: { nombre: "Nombre rechazado." } }));
  s.enviar(encuentro); await s.terminar();
  const entrada = s.nodos().find(n => n.type === "input" && n.props.name === "nombre");
  assert.equal(entrada.props["aria-invalid"], true);
  assert.equal(entrada.props["aria-describedby"], "campo-nombre-error");
  assert.ok(s.nodos().some(n => n.props.role === "alert"));
});
test("validación local impide una fecha imposible antes de llamar al servidor", async () => {
  let llamadas = 0;
  const s = formulario("encuentros", async () => { llamadas++; });
  s.enviar({ ...encuentro, fechaInicio: "2026-02-30" }); await s.terminar();
  assert.equal(llamadas, 0); assert.ok(s.nodos().some(n => n.props.role === "alert"));
});
test("sin catálogos no se ejecuta una inscripción", async () => {
  let llamadas = 0;
  const s = formulario("participantes", async () => { llamadas++; }, { datos: modelos.datosPendientes });
  s.enviar(participante); await s.terminar(); assert.equal(llamadas, 0);
});
test("editar un estado nulo no lo sustituye por Planeación", () => {
  const s = formulario("encuentros", async () => {}, { inicial: { ...encuentro, estado: null } });
  assert.equal(s.nodos().find(n => n.type === "select" && n.props.name === "estado").props.defaultValue, "");
});
test("un encuentro nuevo conserva el estado predeterminado en la interfaz", () => {
  const s = formulario("encuentros", async () => {});
  assert.equal(s.nodos().find(n => n.type === "select" && n.props.name === "estado").props.defaultValue, "Planeación");
});
test("la interfaz bloquea cierre y sustitución del formulario mientras guarda", () => {
  const s = montar("components/operacion/OperacionCliente.tsx", { modulo: "encuentros", datos, catalogos }, {
    "@/lib/operacion/acciones": { guardarOperacion: async () => ({ ok: false, mensaje: "unused" }) },
    sonner: { toast: { success() {}, error() {}, info() {} } },
  });
  s.nodos().find(n => n.props.children === "Nuevo registro").props.onClick();
  const form = s.nodos().find(n => n.type?.name === "FormularioOperacion");
  form.props.onOcupado(true);
  const botones = s.nodos().filter(n => ["Actualizar", "Cerrar", "Cerrar formulario", "Editar"].includes(n.props.children));
  assert.ok(botones.length >= 3); assert.ok(botones.every(n => n.props.disabled === true));
});
test("la tabla busca sin acentos y tolera espacios externos", () => {
  const s = montar("components/ui/DataTable.tsx", { data: [{ id: "a", nombre: "Renovación" }, { id: "b", nombre: "Otro" }], columns: [{ key: "nombre", titulo: "Nombre" }] });
  s.nodos().find(n => n.type?.name === "SearchInput").props.onChange({ target: { value: "  RENOVACION  " } });
  const celdas = s.nodos().filter(n => n.type === "td").map(n => n.props.children);
  assert.deepEqual(celdas, ["Renovación"]);
});
test("agrupación dispone de botón nativo con aria-expanded y oculta sus filas", () => {
  const s = montar("components/ui/DataTable.tsx", { data: [{ id: "a", nombre: "Juan", grupo: "Uno" }], columns: [{ key: "nombre", titulo: "Nombre" }], agruparPor: "grupo" });
  const boton = s.nodos().find(n => n.type === "button");
  assert.equal(boton.props.type, "button"); assert.equal(boton.props["aria-expanded"], true);
  boton.props.onClick();
  assert.equal(s.nodos().find(n => n.type === "button").props["aria-expanded"], false);
  assert.ok(!s.nodos().some(n => n.type === "td" && n.props.children === "Juan"));
});
test("tabla tiene caption, encabezados y región desplazable por teclado", () => {
  const Tabla = cargar("components/ui/DataTable.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Tabla, { data: [], columns: [{ key: "nombre", titulo: "Nombre" }], titulo: "Participantes" }));
  assert.match(html, /<caption/); assert.match(html, /scope="col"/); assert.match(html, /tabindex="0"/);
  assert.match(html, /role="region"/); assert.match(html, /No existen registros/);
});
const rConfig = { id: ids.registro, organizacion: "SIGERM", parroquia: null, ciudad: null, estado: null, pais: null, created_at: null };
test("un cambio de total durante paginación se informa y no entrega métricas parciales", async () => {
  const c = clienteSimulado([{ data: [rConfig], error: null, count: 2 }, { data: [{ ...rConfig, id: ids.otro }], error: null, count: 3 }]);
  const r = await crearRepositorio(c).listarConfiguraciones();
  assert.equal(r.ok, false); assert.match(r.mensaje, /cambiaron/);
});
test("una fila repetida entre páginas no se cuenta dos veces", async () => {
  const c = clienteSimulado([{ data: [rConfig], error: null, count: 2 }, { data: [rConfig], error: null, count: 2 }]);
  assert.equal((await crearRepositorio(c).listarConfiguraciones()).ok, false);
});
function clienteConcurrente(unique) {
  const filas = [];
  return {
    filas,
    from(tabla) {
      let insertado, consultaId;
      const query = {
        select() { return query; }, eq(campo, valor) { if (campo === "id") consultaId = valor; return query; },
        limit() { return query; }, maybeSingle() { return query; },
        insert(payload) { insertado = payload; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (tabla === "encuentros" || tabla === "matrimonios") return { data: { id: consultaId }, error: null };
            if (!insertado) return { data: [], error: null };
            if (unique && filas.some(f => f.encuentro_id === insertado.encuentro_id && f.matrimonio_id === insertado.matrimonio_id)) return { data: null, error: { code: "23505" } };
            const row = { ...insertado, created_at: null };
            filas.push(row); return { data: [row], error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
test("UNIQUE simulado rechaza una de dos inscripciones simultáneas sin falso éxito", async () => {
  const c = clienteConcurrente(true);
  const repo = crearRepositorio(c);
  const resultados = await Promise.all([repo.guardarParticipante(participante), repo.guardarParticipante(participante)]);
  assert.equal(resultados.filter(r => r.ok).length, 1); assert.equal(resultados.filter(r => !r.ok).length, 1); assert.equal(c.filas.length, 1);
});
test("sin UNIQUE la comprobación previa no garantiza concurrencia: riesgo documentado", async () => {
  const c = clienteConcurrente(false);
  const repo = crearRepositorio(c);
  const resultados = await Promise.all([repo.guardarParticipante(participante), repo.guardarParticipante(participante)]);
  assert.equal(resultados.filter(r => r.ok).length, 2); assert.equal(c.filas.length, 2);
});
for (const [modulo, permiso, metodo] of [
  ["encuentros", "crear_encuentro", "guardarEncuentro"],
  ["participantes", "crear_encuentro", "guardarParticipante"],
  ["equipos", "crear_servidor", "guardarServicio"],
  ["configuracion", "administrar_configuracion", "guardarConfiguracion"],
]) test("cada acción verifica permiso en servidor: " + modulo, async () => {
  let clientes = 0;
  const loader = crearLoader({
    "@/lib/auth/requerirPermiso": { requerirPermiso: async p => { assert.equal(p, permiso); throw new Error("denegado"); } },
    "@/lib/supabase/server": { createClient: async () => { clientes++; return {}; } },
    "./repositorio": { crearRepositorio: () => ({ [metodo]: async () => { throw new Error("unexpected write"); } }), mensajeError: () => "error" },
    "next/cache": { revalidatePath() {} },
  });
  await assert.rejects(loader("lib/operacion/acciones.ts").guardarOperacion(modulo, entradas[modulo]), /denegado/);
  assert.equal(clientes, 0);
});
test("capacidad no se inventa ni se envía en el contrato de encuentros", () => {
  const r = modelos.encuentroSchema.parse({ ...encuentro, capacidad: 1 });
  assert.ok(!Object.hasOwn(r, "capacidad"));
});

test("un error de transporte devuelto por la BD solicita revisar el directorio antes de reintentar", async () => {
  const c = clienteSimulado([{ data: null, error: { code: "", message: "fetch failed" } }]);
  const r = await crearRepositorio(c).guardarConfiguracion(configuracion);
  assert.equal(r.ok, false); assert.match(r.mensaje, /Actualiza el directorio/);
});
