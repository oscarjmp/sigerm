/* eslint-disable @typescript-eslint/no-require-imports -- K-2 and administrator-only integration tests use simulated data. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { crearLoader, clienteSimulado, ids, encuentro, participante, servicio, configuracion, catalogos } = require("./helpers/operacion.cjs");
const { montar } = require("./helpers/interaccion.cjs");
const loader = crearLoader();
const { crearRepositorio, mensajeError } = loader("lib/operacion/repositorio.ts");
const modelos = loader("lib/operacion/modelos.ts");
const rPart = { id: ids.registro, encuentro_id: null, matrimonio_id: null, habitacion: "12", observaciones: null, created_at: null };
const rServ = { id: ids.registro, encuentro_id: null, usuario_id: null, area: null, cargo: "Apoyo", created_at: null };
const ok = data => ({ data, error: null });
const payload = c => c.llamadas.find(q => q.pasos.some(p => p[0] === "update")).pasos.find(p => p[0] === "update")[1];
const previo = { raf: global.requestAnimationFrame, doc: global.document };
before(() => { global.requestAnimationFrame = fn => { fn(); return 0; }; global.document = { getElementById: () => ({ focus() {} }) }; });
after(() => {
  if (previo.raf === undefined) delete global.requestAnimationFrame; else global.requestAnimationFrame = previo.raf;
  if (previo.doc === undefined) delete global.document; else global.document = previo.doc;
});
test("K-2 edita habitación sin consultar ni completar las dos FK nulas", async () => {
  const c = clienteSimulado([ok([rPart])]);
  const r = await crearRepositorio(c).guardarParticipante({ habitacion: "12" }, ids.registro);
  assert.equal(r.ok, true); assert.equal(c.llamadas.length, 1);
  assert.deepEqual(payload(c), { habitacion: "12" }); assert.equal(r.valor.encuentroId, null); assert.equal(r.valor.matrimonioId, null);
});
test("K-2 edita observaciones sin revalidar una referencia histórica inactiva", async () => {
  const c = clienteSimulado([ok([{ ...rPart, matrimonio_id: ids.matrimonio, observaciones: "Nota" }])]);
  assert.equal((await crearRepositorio(c).guardarParticipante({ observaciones: "Nota" }, ids.registro)).ok, true);
  assert.deepEqual(payload(c), { observaciones: "Nota" }); assert.equal(c.llamadas.length, 1);
});
test("K-2 edita cargo preservando área y referencias nulas de servicio", async () => {
  const c = clienteSimulado([ok([rServ])]);
  const r = await crearRepositorio(c).guardarServicio({ cargo: "Apoyo" }, ids.registro);
  assert.equal(r.ok, true); assert.equal(r.valor.usuarioId, null); assert.equal(r.valor.encuentroId, null);
  assert.deepEqual(payload(c), { cargo: "Apoyo" }); assert.equal(c.llamadas.length, 1);
});
test("al asignar solo encuentro conserva el matrimonio nulo", async () => {
  const c = clienteSimulado([ok({ id: ids.encuentro }), ok({ id: ids.registro, encuentro_id: null, matrimonio_id: null }), ok([{ ...rPart, encuentro_id: ids.encuentro }])]);
  const r = await crearRepositorio(c).guardarParticipante({ encuentroId: ids.encuentro }, ids.registro);
  assert.equal(r.ok, true); assert.equal(r.valor.matrimonioId, null);
  assert.deepEqual(payload(c), { encuentro_id: ids.encuentro });
});
test("al cambiar una FK se comprueban duplicados usando la otra FK del servidor", async () => {
  const c = clienteSimulado([
    ok({ id: ids.matrimonio }),
    ok({ id: ids.registro, encuentro_id: ids.encuentro, matrimonio_id: null }),
    ok([{ id: ids.otro }]),
  ]);
  const r = await crearRepositorio(c).guardarParticipante({ matrimonioId: ids.matrimonio }, ids.registro);
  assert.equal(r.ok, false); assert.match(r.mensaje, /ya está inscrito/);
  assert.equal(c.llamadas.some(q => q.pasos.some(p => p[0] === "update")), false);
});
test("no usa una referencia histórica de una fila no accesible", async () => {
  const c = clienteSimulado([ok({ id: ids.encuentro }), ok(null)]);
  const r = await crearRepositorio(c).guardarParticipante({ encuentroId: ids.encuentro }, ids.registro);
  assert.equal(r.ok, false); assert.equal(c.llamadas.length, 2);
});
for (const [metodo, datos] of [
  ["guardarParticipante", { habitacion: "1" }],
  ["guardarServicio", { cargo: "Apoyo", area: "Recepción" }],
]) test("alta mantiene FK obligatorias: " + metodo, async () => {
  const c = clienteSimulado([]);
  assert.equal((await crearRepositorio(c)[metodo](datos)).ok, false); assert.equal(c.llamadas.length, 0);
});
for (const [metodo, datos] of [
  ["guardarParticipante", { encuentroId: null }],
  ["guardarParticipante", { matrimonioId: "" }],
  ["guardarServicio", { usuarioId: null }],
  ["guardarServicio", { encuentroId: "" }],
]) test("una edición no puede borrar una FK asignada: " + metodo + JSON.stringify(datos), async () => {
  const c = clienteSimulado([]);
  assert.equal((await crearRepositorio(c)[metodo](datos, ids.registro)).ok, false); assert.equal(c.llamadas.length, 0);
});
test("una edición vacía no envía UPDATE", async () => {
  const c = clienteSimulado([]);
  assert.equal((await crearRepositorio(c).guardarServicio({}, ids.registro)).ok, false); assert.equal(c.llamadas.length, 0);
});
test("23505 identifica duplicidad y 23503 identifica integridad sin exponer diagnósticos", () => {
  assert.match(mensajeError({ code: "23505", message: "sensitive" }), /existe/);
  assert.match(mensajeError({ code: "23503", message: "sensitive" }), /integridad/);
  assert.doesNotMatch(mensajeError({ code: "23503", message: "sensitive" }), /sensitive/);
});
for (const modulo of ["participantes", "equipos"]) test("el formulario histórico guarda solo lo modificado sin catálogos: " + modulo, async () => {
  const inicial = modulo === "participantes" ? { ...participante, encuentroId: null, matrimonioId: null } : { ...servicio, encuentroId: null, usuarioId: null, area: "", cargo: "" };
  const enviados = [], avisos = [];
  const campos = modulo === "participantes"
    ? { encuentroId: "", matrimonioId: "", habitacion: "Nueva", observaciones: "" }
    : { encuentroId: "", usuarioId: "", area: "", cargo: "Apoyo" };
  const s = montar("components/operacion/FormularioOperacion.tsx", {
    modulo, inicial, datos: modelos.datosPendientes,
    catalogos: { matrimonios: { estado: "error", mensaje: "No disponible" }, usuarios: { estado: "error", mensaje: "No disponible" }, ministerios: { estado: "pendiente", mensaje: "" } },
    onGuardado() {},
  }, {
    "@/lib/operacion/acciones": { guardarOperacion: async (...args) => { enviados.push(args); return { ok: true, valor: inicial }; } },
    sonner: { toast: { success: m => avisos.push(m), error() {}, info() {} } },
  });
  const selects = s.nodos().filter(n => n.type === "select");
  assert.ok(selects.every(n => n.props.required === false));
  assert.ok(s.nodos().some(n => n.type === "option" && n.props.children === "Sin asignar"));
  s.enviar(campos); await s.terminar();
  assert.equal(enviados.length, 1); assert.equal(avisos.length, 1);
  assert.deepEqual(enviados[0][1], modulo === "participantes" ? { habitacion: "Nueva" } : { cargo: "Apoyo" });
});
for (const modulo of ["participantes", "equipos"]) test("directorio muestra Sin asignar para FK nulas: " + modulo, () => {
  const Cliente = crearLoader({ "@/lib/operacion/acciones": { guardarOperacion: async () => {} }, sonner: { toast: { success() {}, error() {}, info() {} } } })("components/operacion/OperacionCliente.tsx").default;
  const datos = {
    ...modelos.datosPendientes,
    [modulo === "participantes" ? "participantes" : "equipos"]: { estado: "disponible", datos: [
      modulo === "participantes" ? { ...participante, encuentroId: null, matrimonioId: null } : { ...servicio, encuentroId: null, usuarioId: null },
    ] },
  };
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo, datos, catalogos }));
  assert.ok((html.match(/Sin asignar/g) ?? []).length >= 2);
});
for (const [modulo, metodo, datos] of [
  ["encuentros", "guardarEncuentro", encuentro], ["participantes", "guardarParticipante", participante],
  ["equipos", "guardarServicio", servicio], ["configuracion", "guardarConfiguracion", configuracion],
]) {
  for (const rol of ["Administrador", "Coordinador", "Matrimonio"]) test("acción exclusiva de Administrador: " + modulo + " / " + rol, async () => {
    let clientes = 0;
    const action = crearLoader({
      "@/lib/auth/requerirPermiso": { requerirPermiso: async () => ({ rol, usuarioId: ids.usuario }) },
      "@/lib/supabase/server": { createClient: async () => { clientes++; return {}; } },
      "./repositorio": { crearRepositorio: () => ({ [metodo]: async () => ({ ok: true, valor: datos }) }), mensajeError: () => "error" },
      "next/navigation": { redirect: () => { throw new Error("ADMIN_ONLY"); } },
      "next/cache": { revalidatePath() {} },
    })("lib/operacion/acciones.ts").guardarOperacion;
    if (rol === "Administrador") { assert.equal((await action(modulo, datos)).ok, true); assert.equal(clientes, 1); }
    else { await assert.rejects(action(modulo, datos), /ADMIN_ONLY/); assert.equal(clientes, 0); }
  });
}
for (const ruta of ["encuentros", "participantes", "equipos-servicio", "configuracion"]) test("la página deniega otro rol antes de cargar datos: " + ruta, async () => {
  let consultas = 0;
  const Page = crearLoader({
    "@/lib/auth/requerirPermiso": { requerirPermiso: async () => ({ rol: "Coordinador" }) },
    "next/navigation": { redirect: () => { throw new Error("ADMIN_ONLY"); } },
    "@/components/layout/MainLayout": { __esModule: true, default: () => null },
    "@/components/operacion/OperacionCliente": { __esModule: true, default: () => null },
    "@/lib/operacion/catalogos": { cargarDatos: async () => { consultas++; }, cargarCatalogos: async () => { consultas++; } },
  })("app/" + ruta + "/page.tsx").default;
  await assert.rejects(Page(), /ADMIN_ONLY/); assert.equal(consultas, 0);
});
test("la interfaz no muestra módulos aunque un rol no administrador tenga permisos amplios", () => {
  const Cliente = crearLoader({
    "@/lib/hooks/useAuth": { useAuth: () => ({ rol: "Matrimonio", puede: () => true }) },
    sonner: { toast: { success() {}, error() {}, info() {} } },
    "@/lib/operacion/acciones": { guardarOperacion: async () => {} },
  })("components/operacion/OperacionCliente.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo: "encuentros", datos: modelos.datosPendientes, catalogos }));
  assert.match(html, /Acceso restringido/); assert.doesNotMatch(html, /Nuevo registro|Módulos de operación/);
});
test("las cuatro entradas preparadas del Sidebar son exclusivas de Administrador", () => {
  const { navegacionOperacion } = loader("lib/operacion/permisos.ts");
  assert.equal(navegacionOperacion.length, 4); assert.ok(navegacionOperacion.every(n => n.soloAdministrador));
});
