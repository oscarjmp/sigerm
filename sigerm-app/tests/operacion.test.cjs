/* eslint-disable @typescript-eslint/no-require-imports -- Node tests compile TS in memory. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { crearLoader, ids, encuentro, participante, servicio, configuracion, matrimonio, catalogos } = require("./helpers/operacion.cjs");
const cargar = crearLoader({ "@/lib/operacion/acciones": { guardarOperacion: async () => ({ ok: false, mensaje: "not invoked during rendering" }) } });
const modelos = cargar("lib/operacion/modelos.ts");
const { encuentroSchema, participanteSchema, equipoSchema, configuracionSchema, filtrarEncuentros, validarInscripcion } = modelos;
test("normaliza texto sin persistir campos propuestos", () => {
  const r = encuentroSchema.parse({ ...encuentro, nombre: "  Renovación  ", capacidad: 50, observaciones: "propuesta" });
  assert.equal(r.nombre, "Renovación"); assert.ok(!("capacidad" in r)); assert.ok(!("observaciones" in r));
});
for (const nombre of ["", " ", "x".repeat(151), {}, null, undefined]) test("rechaza nombre inválido " + JSON.stringify(nombre), () => assert.equal(encuentroSchema.safeParse({ ...encuentro, nombre }).success, false));
test("rechaza término anterior al inicio", () => assert.equal(encuentroSchema.safeParse({ ...encuentro, fechaTermino: "2026-11-30" }).success, false));
test("rechaza fecha inexistente", () => assert.equal(encuentroSchema.safeParse({ ...encuentro, fechaInicio: "2026-02-30" }).success, false));
test("acepta fechas nulas del contrato", () => { const d = encuentroSchema.parse({ ...encuentro, fechaInicio: "", fechaTermino: "" }); assert.equal(d.fechaInicio, null); assert.equal(d.fechaTermino, null); });
test("acepta una fecha opcional aislada", () => assert.equal(encuentroSchema.safeParse({ ...encuentro, fechaInicio: null }).success, true));
test("busca sin acentos y por consecutivo", () => { assert.equal(filtrarEncuentros([encuentro], "renovacion", "").length, 1); assert.equal(filtrarEncuentros([encuentro], "7", "").length, 1); });
test("filtra estado y solapamiento de fechas", () => { assert.equal(filtrarEncuentros([encuentro], "", "Cancelado").length, 0); assert.equal(filtrarEncuentros([encuentro], "", "", "2026-12-02", "2026-12-02").length, 1); });
test("un rango invertido no devuelve resultados", () => assert.equal(filtrarEncuentros([encuentro], "", "", "2026-12-04", "2026-12-01").length, 0));
test("admite inscripción válida por matrimonio", () => assert.equal(validarInscripcion(participante, [encuentro], [matrimonio], []), null));
test("detecta matrimonio duplicado en encuentro", () => assert.match(validarInscripcion(participante, [encuentro], [matrimonio], [participante]), /ya está inscrito/));
test("permite editar la misma inscripción", () => assert.equal(validarInscripcion(participante, [encuentro], [matrimonio], [participante], participante.id), null));
test("no confunde inscripciones en encuentros distintos", () => assert.equal(validarInscripcion(participante, [encuentro], [matrimonio], [{ ...participante, encuentroId: ids.otro }]), null));
test("rechaza matrimonio inactivo", () => assert.match(validarInscripcion(participante, [encuentro], [{ ...matrimonio, activo: false }], []), /activo/));
test("rechaza habitación con más de 20 caracteres", () => assert.equal(participanteSchema.safeParse({ ...participante, habitacion: "1".repeat(21) }).success, false));
test("habitación vacía y observaciones vacías se convierten a null", () => { const d = participanteSchema.parse({ ...participante, habitacion: "", observaciones: "" }); assert.equal(d.habitacion, null); assert.equal(d.observaciones, null); });
test("exige UUID de encuentro en la inscripción", () => assert.equal(participanteSchema.safeParse({ ...participante, encuentroId: "e1" }).success, false));
test("exige UUID de matrimonio en la inscripción", () => assert.equal(participanteSchema.safeParse({ ...participante, matrimonioId: "" }).success, false));
test("servicio se asigna a usuario sin inventar matrimonio o ministerio", () => { const d = equipoSchema.parse({ ...servicio, matrimonioId: ids.matrimonio, ministerioId: ids.otro }); assert.equal(d.usuarioId, ids.usuario); assert.ok(!("matrimonioId" in d)); assert.ok(!("ministerioId" in d)); });
test("valida límites reales de área y cargo", () => { assert.equal(equipoSchema.safeParse({ ...servicio, area: "a".repeat(101) }).success, false); assert.equal(equipoSchema.safeParse({ ...servicio, cargo: "" }).success, false); });
test("configuración valida organización y admite ubicación opcional", () => { assert.equal(configuracionSchema.safeParse({ ...configuracion, organizacion: "" }).success, false); assert.equal(configuracionSchema.safeParse({ ...configuracion, ciudad: null }).success, true); });
test("configuración no incluye parámetros inexistentes", () => { const d = configuracionSchema.parse({ ...configuracion, capacidadPredeterminada: 50 }); assert.ok(!("capacidadPredeterminada" in d)); });
for (const modulo of ["encuentros", "participantes", "equipos", "configuracion"]) test("renderiza estado pendiente sin simular registros: " + modulo, () => {
  const Cliente = cargar("components/operacion/OperacionCliente.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo, datos: modelos.datosPendientes, catalogos }));
  assert.match(html, /Información no disponible/); assert.match(html, /—/); assert.doesNotMatch(html, /Registro guardado/);
});
test("el directorio renderiza datos recibidos y acceso a detalle", () => {
  const Cliente = cargar("components/operacion/OperacionCliente.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo: "encuentros", datos: { ...modelos.datosPendientes, encuentros: { estado: "disponible", datos: [encuentro] } }, catalogos }));
  assert.match(html, /Renovación/); assert.match(html, /Ver detalle/); assert.doesNotMatch(html, /capacidad/i);
});
test("no confunde un error de directorio con datos vacíos", () => {
  const Cliente = cargar("components/operacion/OperacionCliente.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo: "encuentros", datos: { ...modelos.datosPendientes, encuentros: { estado: "error", mensaje: "Acceso denegado" } }, catalogos }));
  assert.match(html, /role="alert"/); assert.match(html, /Acceso denegado/);
});
test("renderiza varios registros institucionales sin singleton", () => {
  const Cliente = cargar("components/operacion/OperacionCliente.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Cliente, { modulo: "configuracion", datos: { ...modelos.datosPendientes, configuraciones: { estado: "disponible", datos: [configuracion, { ...configuracion, id: ids.otro, organizacion: "Otra organización" }] } }, catalogos }));
  assert.match(html, /Otra organización/); assert.match(html, /SIGERM/);
});
test("formularios usan campos del contrato y guardado real", () => {
  const Formulario = cargar("components/operacion/FormularioOperacion.tsx").default;
  const datos = { ...modelos.datosPendientes, encuentros: { estado: "disponible", datos: [encuentro] } };
  const html = renderToStaticMarkup(React.createElement(Formulario, { modulo: "participantes", datos, catalogos, onGuardado() {} }));
  assert.match(html, /name="habitacion"/); assert.match(html, /name="observaciones"/); assert.match(html, /Guardar registro/);
  assert.doesNotMatch(html, /name="asistencia"|name="estado"/);
});
test("guardar se bloquea si faltan las referencias necesarias", () => {
  const Formulario = cargar("components/operacion/FormularioOperacion.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Formulario, { modulo: "equipos", datos: modelos.datosPendientes, catalogos, onGuardado() {} }));
  assert.match(html, /disabled/); assert.match(html, /No se puede guardar/);
});
test("una fila guardada puede tener un estado existente no catalogado", () => {
  assert.equal(encuentroSchema.safeParse({ ...encuentro, estado: "Estado legado" }).success, true);
});
