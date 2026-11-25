/* eslint-disable @typescript-eslint/no-require-imports -- Tests use an injected in-memory database double. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { crearLoader, clienteSimulado, ids, encuentro, participante, servicio, configuracion } = require("./helpers/operacion.cjs");
const cargar = crearLoader();
const { crearRepositorio: crearRepo, columnas } = cargar("lib/operacion/repositorio.ts");
const crearRepositorio = cliente => crearRepo(cliente, () => ids.registro);
const rEncuentro = { id: ids.encuentro, numero: 7, nombre: "Renovación", fecha_inicio: "2026-12-01", fecha_fin: "2026-12-03", sede: "México", estado: "Programado", created_at: null };
const rParticipante = { id: ids.registro, encuentro_id: ids.encuentro, matrimonio_id: ids.matrimonio, habitacion: "12", observaciones: null, created_at: null };
const rServicio = { id: ids.registro, encuentro_id: ids.encuentro, usuario_id: ids.usuario, area: "Recepción", cargo: "Responsable", created_at: null };
const rConfig = { id: ids.registro, organizacion: "SIGERM", parroquia: "San José", ciudad: "México", estado: "CDMX", pais: "México", created_at: null };
const ok = data => ({ data, error: null, count: Array.isArray(data) ? data.length : null });
const filaId = id => ok({ id });
const mutaciones = cliente => cliente.llamadas.filter(l => l.pasos.some(p => ["insert", "update"].includes(p[0])));
test("alta de encuentro escribe solamente columnas reales y recibe el número generado", async () => {
  const cliente = clienteSimulado([ok([rEncuentro])]);
  const r = await crearRepositorio(cliente).guardarEncuentro({ ...encuentro, numero: 999, capacidad: 50, observaciones: "no existe", activo: true });
  assert.equal(r.ok, true); assert.equal(r.valor.numero, 7);
  const payload = cliente.llamadas[0].pasos.find(p => p[0] === "insert")[1];
  assert.deepEqual(Object.keys(payload).sort(), ["nombre", "fecha_inicio", "fecha_fin", "sede", "estado"].sort());
});
test("un estado vacío en alta conserva el default de la base", async () => {
  const cliente = clienteSimulado([ok([{ ...rEncuentro, estado: "Planeación" }])]);
  await crearRepositorio(cliente).guardarEncuentro({ ...encuentro, estado: "" });
  assert.ok(!("estado" in cliente.llamadas[0].pasos.find(p => p[0] === "insert")[1]));
});
test("edición acota por UUID y confirma el registro devuelto", async () => {
  const cliente = clienteSimulado([ok([rEncuentro])]);
  const r = await crearRepositorio(cliente).guardarEncuentro(encuentro, ids.encuentro);
  assert.equal(r.ok, true); assert.ok(cliente.llamadas[0].pasos.some(p => p[0] === "eq" && p[1] === "id" && p[2] === ids.encuentro));
});
for (const data of [[], [rEncuentro, rEncuentro], null]) test("no reporta éxito si el servidor no devuelve exactamente una fila: " + JSON.stringify(data?.length), async () => {
  const r = await crearRepositorio(clienteSimulado([{ data, error: null }])).guardarEncuentro(encuentro, ids.encuentro);
  assert.equal(r.ok, false);
});
test("rechaza confirmación de otra fila", async () => {
  const r = await crearRepositorio(clienteSimulado([ok([{ ...rEncuentro, id: ids.otro }])])).guardarEncuentro(encuentro, ids.encuentro);
  assert.equal(r.ok, false); assert.match(r.mensaje, /no corresponde/);
});
test("no escribe si el identificador de edición es inválido", async () => {
  const cliente = clienteSimulado([]);
  const r = await crearRepositorio(cliente).guardarConfiguracion(configuracion, "");
  assert.equal(r.ok, false); assert.equal(cliente.llamadas.length, 0);
});
test("validación del servidor rechaza datos inválidos antes de consultar", async () => {
  const cliente = clienteSimulado([]);
  const r = await crearRepositorio(cliente).guardarEncuentro({ ...encuentro, nombre: "" });
  assert.equal(r.ok, false); assert.ok(r.campos.nombre); assert.equal(cliente.llamadas.length, 0);
});
test("inscribe matrimonio con habitación y observaciones", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), filaId(ids.matrimonio), ok([]), ok([rParticipante])]);
  const r = await crearRepositorio(cliente).guardarParticipante({ ...participante, asistencia: "Presente", estado: "Inscrito" });
  assert.equal(r.ok, true);
  const payload = mutaciones(cliente)[0].pasos.find(p => p[0] === "insert")[1];
  assert.deepEqual(Object.keys(payload).sort(), ["id", "encuentro_id", "matrimonio_id", "habitacion", "observaciones"].sort());
});
test("duplicado detectado impide insertar", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), filaId(ids.matrimonio), ok([{ id: ids.otro }])]);
  const r = await crearRepositorio(cliente).guardarParticipante(participante);
  assert.equal(r.ok, false); assert.match(r.mensaje, /ya está inscrito/); assert.equal(mutaciones(cliente).length, 0);
});
test("edición excluye su propia inscripción al comprobar duplicados", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), filaId(ids.matrimonio), ok([]), ok([rParticipante])]);
  const r = await crearRepositorio(cliente).guardarParticipante(participante, ids.registro);
  assert.equal(r.ok, true); assert.ok(cliente.llamadas[2].pasos.some(p => p[0] === "neq" && p[2] === ids.registro));
});
test("error de lectura de duplicados impide insertar", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), filaId(ids.matrimonio), { data: null, error: { code: "42501" } }]);
  const r = await crearRepositorio(cliente).guardarParticipante(participante);
  assert.equal(r.ok, false); assert.equal(mutaciones(cliente).length, 0);
});
test("referencia inexistente impide inscribir", async () => {
  const cliente = clienteSimulado([ok(null)]);
  const r = await crearRepositorio(cliente).guardarParticipante(participante);
  assert.equal(r.ok, false); assert.equal(mutaciones(cliente).length, 0);
});
test("asigna servicio mediante usuario_id sin relaciones inventadas", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), filaId(ids.usuario), ok([rServicio])]);
  const r = await crearRepositorio(cliente).guardarServicio(servicio);
  assert.equal(r.ok, true);
  const payload = mutaciones(cliente)[0].pasos.find(p => p[0] === "insert")[1];
  assert.deepEqual(Object.keys(payload).sort(), ["id", "encuentro_id", "usuario_id", "area", "cargo"].sort());
});
test("usuario inactivo o no visible impide asignación", async () => {
  const cliente = clienteSimulado([filaId(ids.encuentro), ok(null)]);
  const r = await crearRepositorio(cliente).guardarServicio(servicio);
  assert.equal(r.ok, false); assert.equal(mutaciones(cliente).length, 0);
  assert.ok(cliente.llamadas[1].pasos.some(p => p[0] === "eq" && p[1] === "activo" && p[2] === true));
});
test("alta de configuración no asume singleton y genera UUID en servidor", async () => {
  const cliente = clienteSimulado([ok([rConfig])]);
  const r = await crearRepositorio(cliente).guardarConfiguracion(configuracion);
  assert.equal(r.ok, true);
  const payload = cliente.llamadas[0].pasos.find(p => p[0] === "insert")[1];
  assert.deepEqual(Object.keys(payload).sort(), ["id", "organizacion", "parroquia", "ciudad", "estado", "pais"].sort());
});
test("edita una configuración por su ID sin afectar otras", async () => {
  const cliente = clienteSimulado([ok([rConfig])]);
  const r = await crearRepositorio(cliente).guardarConfiguracion(configuracion, ids.registro);
  assert.equal(r.ok, true); assert.ok(cliente.llamadas[0].pasos.some(p => p[0] === "eq" && p[2] === ids.registro));
});
for (const [codigo, patron] of [["42501", /Acceso denegado/], ["23505", /Ya existe/], ["23503", /referencia/], ["42703", /esquema/]]) test("traduce error de base " + codigo + " sin revelar detalles", async () => {
  const cliente = clienteSimulado([{ data: null, error: { code: codigo, message: "secret-diagnostic" } }]);
  const r = await crearRepositorio(cliente).guardarConfiguracion(configuracion);
  assert.equal(r.ok, false); assert.match(r.mensaje, patron); assert.doesNotMatch(r.mensaje, /secret-diagnostic/);
});
test("maneja fallo de red sin simular guardado", async () => {
  const r = await crearRepositorio(clienteSimulado([new Error("offline")])).guardarConfiguracion(configuracion);
  assert.equal(r.ok, false);
});
test("una respuesta incompatible no se presenta como guardado confirmado", async () => {
  const r = await crearRepositorio(clienteSimulado([ok([{ id: ids.registro }])])).guardarConfiguracion(configuracion);
  assert.equal(r.ok, false); assert.match(r.mensaje, /podría haberse guardado/);
});
for (const [metodo, row, tabla] of [["listarEncuentros", rEncuentro, "encuentros"], ["listarParticipantes", rParticipante, "participantes"], ["listarServicio", rServicio, "equipos_servicio"], ["listarConfiguraciones", rConfig, "configuracion"]]) test("lee y mapea " + tabla, async () => {
  const cliente = clienteSimulado([ok([row])]);
  const r = await crearRepositorio(cliente)[metodo]();
  assert.equal(r.ok, true); assert.equal(r.valor[0].id, row.id);
  assert.equal(cliente.llamadas[0].tabla, tabla);
  assert.equal(cliente.llamadas[0].pasos[0][1], columnas[tabla]);
});
test("continúa paginando aunque el servidor limite la primera respuesta", async () => {
  const cliente = clienteSimulado([{ data: [rConfig], error: null, count: 2 }, { data: [{ ...rConfig, id: ids.otro }], error: null, count: 2 }]);
  const r = await crearRepositorio(cliente).listarConfiguraciones();
  assert.equal(r.ok, true); assert.equal(r.valor.length, 2);
  assert.ok(cliente.llamadas[1].pasos.some(p => p[0] === "range" && p[1] === 1));
});
test("no presenta un listado parcial como completo", async () => {
  const cliente = clienteSimulado([{ data: [rConfig], error: null, count: 2 }, { data: [], error: null, count: 2 }]);
  assert.equal((await crearRepositorio(cliente).listarConfiguraciones()).ok, false);
});
function acciones(guard, repo, invalidate = () => {}) {
  let clientes = 0;
  const actionLoader = crearLoader({
    "@/lib/auth/requerirPermiso": { requerirPermiso: async (...args) => { await guard(...args); return { rol: "Administrador" }; } },
    "@/lib/supabase/server": { createClient: async () => { clientes++; return {}; } },
    "./repositorio": { crearRepositorio: () => repo, mensajeError: () => "Error controlado" },
    "next/cache": { revalidatePath: invalidate },
  });
  return { guardar: actionLoader("lib/operacion/acciones.ts").guardarOperacion, clientes: () => clientes };
}
test("acción exige autorización antes de crear cliente o persistir", async () => {
  const denegado = new Error("redirect-sin-acceso");
  const action = acciones(async () => { throw denegado; }, {});
  await assert.rejects(action.guardar("encuentros", encuentro), e => e === denegado);
  assert.equal(action.clientes(), 0);
});
test("sin sesión no se captura ni se convierte la redirección en éxito", async () => {
  const action = acciones(async () => { throw new Error("redirect-login"); }, {});
  await assert.rejects(action.guardar("configuracion", configuracion), /redirect-login/);
  assert.equal(action.clientes(), 0);
});
test("acción valida módulo de entrada", async () => {
  const action = acciones(async () => { throw new Error("unexpected"); }, {});
  assert.equal((await action.guardar("__proto__", {})).ok, false);
  assert.equal(action.clientes(), 0);
});
test("acción usa permiso de edición y revalida después de confirmación", async () => {
  const eventos = [];
  const action = acciones(async (p, ruta) => eventos.push(["guard", p, ruta]), { guardarEncuentro: async () => { eventos.push(["write"]); return { ok: true, valor: encuentro }; } }, ruta => eventos.push(["refresh", ruta]));
  const r = await action.guardar("encuentros", encuentro, ids.encuentro);
  assert.equal(r.ok, true); assert.deepEqual(eventos[0], ["guard", "editar_encuentro", "/encuentros"]); assert.equal(eventos[1][0], "write"); assert.equal(eventos[2][0], "refresh");
});
test("error del repositorio no dispara revalidación ni éxito", async () => {
  let invalidaciones = 0;
  const action = acciones(async () => {}, { guardarConfiguracion: async () => ({ ok: false, mensaje: "Acceso denegado" }) }, () => invalidaciones++);
  assert.equal((await action.guardar("configuracion", configuracion)).ok, false); assert.equal(invalidaciones, 0);
});
test("fallo al revalidar mantiene la confirmación real e informa recarga", async () => {
  const action = acciones(async () => {}, { guardarConfiguracion: async () => ({ ok: true, valor: configuracion }) }, () => { throw new Error(); });
  const r = await action.guardar("configuracion", configuracion);
  assert.equal(r.ok, true); assert.match(r.aviso, /Recarga/);
});
test("guard de build bloquea red de datos sin ejecutar solicitudes", async () => {
  let red = 0;
  const transporte = { request() { red++; }, get() { red++; } };
  const contexto = { URL, require: () => ({ ...transporte }), fetch: async () => { red++; return "font"; } };
  contexto.globalThis = contexto;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../scripts/build-network-guard.cjs"), "utf8"), contexto);
  await assert.rejects(contexto.fetch("https://sigerm-build.invalid/rest/v1/encuentros"), /BUILD_ONLY_NETWORK_BLOCKED/);
  await assert.rejects(contexto.fetch("https://example.supabase.co/rest/v1/encuentros"), /BUILD_ONLY_NETWORK_BLOCKED/);
  assert.equal(red, 0); assert.equal(await contexto.fetch("https://fonts.googleapis.com/css2"), "font");
});

test("lee inscripciones heredadas con referencias nulas sin inventar vínculos", async () => {
  const r = await crearRepositorio(clienteSimulado([ok([{ ...rParticipante, encuentro_id: null, matrimonio_id: null }])])).listarParticipantes();
  assert.equal(r.ok, true); assert.equal(r.valor[0].encuentroId, null); assert.equal(r.valor[0].matrimonioId, null);
});
test("lee servicio heredado con usuario o encuentro nulos", async () => {
  const r = await crearRepositorio(clienteSimulado([ok([{ ...rServicio, encuentro_id: null, usuario_id: null, area: null, cargo: null }])])).listarServicio();
  assert.equal(r.ok, true); assert.equal(r.valor[0].usuarioId, null); assert.equal(r.valor[0].encuentroId, null);
});
test("lee configuraciones heredadas con campos nulos", async () => {
  const r = await crearRepositorio(clienteSimulado([ok([{ ...rConfig, organizacion: null, ciudad: null }])])).listarConfiguraciones();
  assert.equal(r.ok, true); assert.equal(r.valor[0].ciudad, null);
});
test("la generación UUID predeterminada se ejecuta en servidor y se confirma", async () => {
  let generado;
  const cliente = clienteSimulado([llamada => {
    generado = llamada.pasos.find(p => p[0] === "insert")[1].id;
    return ok([{ ...rConfig, id: generado }]);
  }]);
  const r = await crearRepo(cliente).guardarConfiguracion(configuracion);
  assert.match(generado, /^[0-9a-f-]{36}$/); assert.equal(r.ok, true); assert.equal(r.valor.id, generado);
});
