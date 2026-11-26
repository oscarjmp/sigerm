/* eslint-disable @typescript-eslint/no-require-imports -- Inventory adjustment tests with in-memory doubles; no network, no SQL execution. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { crearLoader } = require("./helpers/operacion.cjs");

const cargar = crearLoader();
const E = cargar("lib/inventario/existencias.ts");
const { ajustarInventario } = cargar("lib/inventario/ajusteExistencias.ts");

// Casos reales de producción (26-nov-2026), sin datos personales.
const DEC0010 = { id: "dec", cantidad: 11, disponibles: 11, activo: false };
const A008 = { id: "a008", cantidad: 36, disponibles: 10, activo: true };
const A009 = { id: "a009", cantidad: 400, disponibles: 1, activo: true };

// --- Reglas de existencias ------------------------------------------------------------

test("DEC-0010: ajuste de 11 a 0 existencias es válido y deja 0 disponibles", () => {
  assert.deepEqual(E.validarAjuste({ actual: DEC0010, prestamosReales: 0, existenciaNueva: 0, motivo: "CONTEO_FISICO", observaciones: "" }), []);
  const r = E.simularAjuste(DEC0010, 0, 0);
  assert.equal(r.disponiblesNuevos, 0);
  assert.equal(r.diferenciaExistencia, -11);
});

test("ajuste de 0 a 11 existencias (nueva entrada de un agotado) deja 11 disponibles", () => {
  const agotado = { cantidad: 0, disponibles: 0, activo: true };
  assert.equal(E.clasificarExistencias(agotado), "agotado");
  assert.deepEqual(E.validarAjuste({ actual: agotado, prestamosReales: 0, existenciaNueva: 11, motivo: "NUEVA_ADQUISICION", observaciones: "" }), []);
  assert.equal(E.simularAjuste(agotado, 0, 11).disponiblesNuevos, 11);
});

test("A008: conciliación sin cambiar la existencia recupera las 26 unidades sin préstamo", () => {
  const n = E.normalizarExistencias(A008, 0);
  assert.equal(n.comprometidas, 26);
  assert.equal(n.prestamosReales, 0);
  assert.equal(n.porConciliar, 26);
  assert.deepEqual(E.validarAjuste({ actual: A008, prestamosReales: 0, existenciaNueva: 36, motivo: "CONTEO_FISICO", observaciones: "" }), [], "no es 'sin cambio': cambia la disponibilidad");
  assert.equal(E.simularAjuste(A008, 0, 36).disponiblesNuevos, 36);
});

test("con préstamos vigentes no se puede bajar la existencia por debajo de lo prestado", () => {
  const conPrestamo = { cantidad: 10, disponibles: 6, activo: true };
  assert.deepEqual(E.validarAjuste({ actual: conPrestamo, prestamosReales: 4, existenciaNueva: 3, motivo: "BAJA_PERDIDA", observaciones: "" }), ["menor_que_prestamos"]);
  assert.deepEqual(E.validarAjuste({ actual: conPrestamo, prestamosReales: 4, existenciaNueva: 4, motivo: "BAJA_PERDIDA", observaciones: "" }), []);
  assert.equal(E.simularAjuste(conPrestamo, 4, 4).disponiblesNuevos, 0, "las 4 prestadas siguen comprometidas");
});

test("cantidades negativas o no enteras se rechazan", () => {
  const base = { actual: A008, prestamosReales: 0, motivo: "CORRECCION_REGISTRO", observaciones: "" };
  assert.deepEqual(E.validarAjuste({ ...base, existenciaNueva: -1 }), ["negativa"]);
  assert.deepEqual(E.validarAjuste({ ...base, existenciaNueva: 2.5 }), ["no_entero"]);
  assert.deepEqual(E.validarAjuste({ ...base, existenciaNueva: Number.NaN }), ["no_entero"]);
});

test("motivo obligatorio de la lista; «Otro» exige justificación; sin cambios se rechaza", () => {
  const base = { actual: { cantidad: 5, disponibles: 5, activo: true }, prestamosReales: 0, existenciaNueva: 4 };
  assert.deepEqual(E.validarAjuste({ ...base, motivo: "", observaciones: "" }), ["sin_motivo"]);
  assert.deepEqual(E.validarAjuste({ ...base, motivo: "OTRO", observaciones: "x" }), ["observaciones_requeridas"]);
  assert.deepEqual(E.validarAjuste({ ...base, motivo: "OTRO", observaciones: "Donación a otra comunidad" }), []);
  assert.deepEqual(E.validarAjuste({ ...base, existenciaNueva: 5, motivo: "CONTEO_FISICO", observaciones: "" }), ["sin_cambio"]);
  assert.equal(E.MOTIVOS_AJUSTE.length, 7);
});

test("se distinguen inactivo, agotado, sin disponibilidad y disponible", () => {
  assert.equal(E.clasificarExistencias(DEC0010), "inactivo", "desactivar no es agotarse");
  assert.equal(E.clasificarExistencias({ cantidad: 0, disponibles: 0, activo: false }), "inactivo");
  assert.equal(E.clasificarExistencias({ cantidad: 0, disponibles: 0, activo: true }), "agotado");
  assert.equal(E.clasificarExistencias({ cantidad: 5, disponibles: 0, activo: true }), "sin_disponibilidad");
  assert.equal(E.clasificarExistencias(A008), "disponible");
});

test("porcentajes con existencia 0 son 0, nunca NaN ni infinito", () => {
  assert.equal(E.porcentajeDisponible({ cantidad: 0, disponibles: 0 }), 0);
  assert.equal(E.porcentajeDisponible({ cantidad: 0, disponibles: 5 }), 0);
  assert.equal(E.porcentaje(5, 0), 0);
  assert.equal(E.porcentajeDisponible({ cantidad: 36, disponibles: 10 }), 28);
});

test("préstamos reales: solo cuentan los PRESTADO", () => {
  const m = E.prestamosRealesPorArticulo([
    { articulo_id: "x", cantidad: 3, prestamos: { estado: "PRESTADO" } },
    { articulo_id: "x", cantidad: 2, prestamos: [{ estado: "PRESTADO" }] },
    { articulo_id: "x", cantidad: 9, prestamos: { estado: "DEVUELTO" } },
    { articulo_id: "y", cantidad: 1, prestamos: { estado: "CANCELADO" } },
  ]);
  assert.equal(m.get("x"), 5);
  assert.equal(m.has("y"), false);
});

test("Dashboard: totales solo de activos, prestados reales y unidades por conciliar (A008 + A009)", () => {
  const otros = { id: "o", cantidad: 10, disponibles: 6, activo: true };
  const r = E.resumirInventario([DEC0010, A008, A009, otros, { id: "z", cantidad: 0, disponibles: 0, activo: true }], new Map([["o", 4]]));
  assert.equal(r.articulosInactivos, 1);
  assert.equal(r.articulosActivos, 4);
  assert.equal(r.existenciaTotal, 446, "DEC-0010 inactivo no suma");
  assert.equal(r.disponibles, 17);
  assert.equal(r.prestadosActualmente, 4, "solo préstamos reales");
  assert.equal(r.unidadesPorConciliar, 425, "26 de A008 + 399 de A009");
  assert.equal(r.articulosPorConciliar, 2);
  assert.equal(r.articulosAgotados, 1);
  assert.equal(r.porcentajeDisponible, 4);
  const sinDatos = E.resumirInventario([A008], null);
  assert.equal(sinDatos.prestadosConfirmados, false);
  assert.equal(sinDatos.prestadosActualmente, 26, "sin consulta de préstamos se usa la resta registrada");
  assert.equal(E.resumirInventario([], new Map()).porcentajeDisponible, 0);
});

// --- Servicio de ajuste (RPC) ---------------------------------------------------------

function rpcSimulada(respuestas) {
  const llamadas = [];
  return {
    llamadas,
    rpc: async (nombre, args) => {
      llamadas.push([nombre, args]);
      const r = respuestas.shift();
      if (r instanceof Error) throw r;
      return r;
    },
  };
}
const ENTRADA = { articuloId: "dec", existenciaEsperada: 11, disponiblesEsperados: 11, existenciaNueva: 0, motivo: "CONTEO_FISICO", observaciones: "  Conteo 26-nov ", claveOperacion: "clave-1" };

test("el servicio llama a ajustar_inventario_articulo con valores esperados y clave de operación", async () => {
  const s = rpcSimulada([{ data: { ya_aplicado: false, articulo: { cantidad: 0, disponibles: 0 }, movimiento: { existencia_anterior: 11 } }, error: null }]);
  const r = await ajustarInventario(s, ENTRADA);
  assert.deepEqual(s.llamadas, [["ajustar_inventario_articulo", {
    p_articulo_id: "dec", p_existencia_esperada: 11, p_disponibles_esperados: 11, p_existencia_nueva: 0,
    p_motivo_tipo: "CONTEO_FISICO", p_observaciones: "Conteo 26-nov", p_clave_operacion: "clave-1",
  }]]);
  assert.deepEqual(r, { estado: "aplicado", yaAplicado: false, existenciaAnterior: 11, existenciaNueva: 0, disponibles: 0 });
});

test("ACTUALIZACIÓN SIMULTÁNEA: un cambio concurrente se informa como conflicto", async () => {
  const s = rpcSimulada([{ data: null, error: { code: "40001", message: "El inventario de este artículo cambió…" } }]);
  assert.equal((await ajustarInventario(s, ENTRADA)).estado, "conflicto");
});

test("FALLO DE CONEXIÓN: el resultado es incierto y el reintento con la misma clave no duplica", async () => {
  const s = rpcSimulada([
    new Error("Failed to fetch"),
    { data: { ya_aplicado: true, articulo: { cantidad: 0, disponibles: 0 }, movimiento: { existencia_anterior: 11 } }, error: null },
  ]);
  assert.equal((await ajustarInventario(s, ENTRADA)).estado, "incierto");
  const reintento = await ajustarInventario(s, ENTRADA);
  assert.equal(reintento.estado, "aplicado");
  assert.equal(reintento.yaAplicado, true);
  assert.equal(s.llamadas[0][1].p_clave_operacion, s.llamadas[1][1].p_clave_operacion);
});

test("permisos, rechazos de negocio y respuestas incompletas se manejan sin éxito falso", async () => {
  assert.equal((await ajustarInventario(rpcSimulada([{ data: null, error: { code: "42501", message: "x" } }]), ENTRADA)).estado, "sin_permiso");
  const rechazo = await ajustarInventario(rpcSimulada([{ data: null, error: { code: "22023", message: "La existencia no puede ser menor que las 4 unidades en préstamos vigentes." } }]), ENTRADA);
  assert.equal(rechazo.estado, "rechazado");
  assert.match(rechazo.mensaje, /préstamos vigentes/);
  assert.equal((await ajustarInventario(rpcSimulada([{ data: {}, error: null }]), ENTRADA)).estado, "incierto");
});

// --- Componente AJUSTAR INVENTARIO ------------------------------------------------------

function montarAjuste({ articulo, prestamosReales, respuestas }) {
  const valores = [];
  let cursor = 0;
  const hooks = { ...React, useState(inicial) {
    const i = cursor++;
    if (!(i in valores)) valores[i] = typeof inicial === "function" ? inicial() : inicial;
    return [valores[i], v => { valores[i] = typeof v === "function" ? v(valores[i]) : v; }];
  } };
  const avisos = [];
  let actualizaciones = 0;
  const s = rpcSimulada(respuestas ?? []);
  const C = crearLoader({
    react: hooks,
    "@/lib/supabase/client": { supabase: s },
    "@/lib/notificaciones": { notificar: Object.fromEntries(["exito", "error", "info", "advertencia"].map(t => [t, m => avisos.push([t, m])])) },
  })("components/inventario/AjusteExistencias.tsx").default;
  const render = () => { cursor = 0; return C({ articulo, prestamosReales, alActualizar: () => actualizaciones++ }); };
  const todos = () => { const out = []; const r = n => { if (Array.isArray(n)) return n.forEach(r); if (!n || typeof n !== "object" || !n.props) return; out.push(n); r(n.props.children); }; r(render()); return out; };
  const texto = n => [].concat(n.props.children).filter(x => typeof x === "string" || typeof x === "number").join("");
  return {
    s, avisos, get actualizaciones() { return actualizaciones; }, todos,
    boton: t => todos().find(e => e.type === "button" && texto(e).includes(t)),
    entrada: () => todos().find(e => e.type === "input" && e.props.type === "number"),
    motivo: () => todos().find(e => e.type === "select"),
    textoCompleto: () => JSON.stringify(render(), (k, v) => (k === "_owner" || k === "_store" ? undefined : v)),
  };
}

test("la ficha muestra AJUSTAR INVENTARIO y diferencia existencia, disponibles, préstamos y por conciliar (A008)", () => {
  const v = montarAjuste({ articulo: A008, prestamosReales: 0 });
  assert.ok(v.boton("AJUSTAR INVENTARIO"));
  const t = v.textoCompleto();
  for (const etiqueta of ["Existencia", "Disponibles", "En préstamos", "Por conciliar"]) assert.ok(t.includes(etiqueta), etiqueta);
  assert.match(t, /sin préstamo que las justifique/);
});

test("A008: conciliar con un toque registra existencia 36 y deja 36 disponibles", async () => {
  const v = montarAjuste({ articulo: A008, prestamosReales: 0, respuestas: [{ data: { ya_aplicado: false, articulo: { cantidad: 36, disponibles: 36 }, movimiento: { existencia_anterior: 36 } }, error: null }] });
  v.boton("AJUSTAR INVENTARIO").props.onClick();
  v.boton("Conciliar con la existencia actual").props.onClick();
  await v.boton("Aplicar ajuste").props.onClick();
  const [, args] = v.s.llamadas[0];
  assert.equal(args.p_existencia_nueva, 36);
  assert.equal(args.p_existencia_esperada, 36);
  assert.equal(args.p_disponibles_esperados, 10);
  assert.equal(args.p_motivo_tipo, "CONTEO_FISICO");
  assert.equal(v.avisos.at(-1)[0], "exito");
  assert.equal(v.actualizaciones, 1);
});

test("DEC-0010: de 11 a 0 desde el celular; un reintento tras fallo usa la misma clave y cambiar datos genera otra", async () => {
  const v = montarAjuste({ articulo: DEC0010, prestamosReales: 0, respuestas: [
    new Error("Failed to fetch"),
    { data: { ya_aplicado: true, articulo: { cantidad: 0, disponibles: 0 }, movimiento: { existencia_anterior: 11 } }, error: null },
  ] });
  v.boton("AJUSTAR INVENTARIO").props.onClick();
  v.entrada().props.onChange({ target: { value: "0" } });
  v.motivo().props.onChange({ target: { value: "CONTEO_FISICO" } });
  assert.equal(v.boton("Aplicar ajuste").props.disabled, false);
  await v.boton("Aplicar ajuste").props.onClick();
  assert.equal(v.avisos.at(-1)[0], "error", "resultado incierto informado");
  await v.boton("Aplicar ajuste").props.onClick();
  assert.equal(v.s.llamadas[0][1].p_clave_operacion, v.s.llamadas[1][1].p_clave_operacion, "mismo intento, misma clave");
  assert.match(v.avisos.at(-1)[1], /no se duplicó/);
});

test("cambiar los datos del ajuste genera una nueva clave de operación", async () => {
  const v = montarAjuste({ articulo: { id: "x", cantidad: 5, disponibles: 5, activo: true }, prestamosReales: 0, respuestas: [new Error("x"), new Error("x")] });
  v.boton("AJUSTAR INVENTARIO").props.onClick();
  v.entrada().props.onChange({ target: { value: "4" } });
  v.motivo().props.onChange({ target: { value: "BAJA_DANO" } });
  await v.boton("Aplicar ajuste").props.onClick();
  v.entrada().props.onChange({ target: { value: "3" } });
  await v.boton("Aplicar ajuste").props.onClick();
  assert.notEqual(v.s.llamadas[0][1].p_clave_operacion, v.s.llamadas[1][1].p_clave_operacion);
});

test("con préstamos vigentes el botón queda bloqueado por debajo de lo prestado y se ofrece ir a Préstamos", () => {
  const v = montarAjuste({ articulo: { id: "p", cantidad: 10, disponibles: 6, activo: true }, prestamosReales: 4 });
  assert.ok(v.todos().some(e => e.props && e.props.href === "/prestamos"), "acceso a la devolución");
  v.boton("AJUSTAR INVENTARIO").props.onClick();
  assert.equal(v.entrada().props.min, 4);
  v.entrada().props.onChange({ target: { value: "2" } });
  v.motivo().props.onChange({ target: { value: "BAJA_PERDIDA" } });
  assert.equal(v.boton("Aplicar ajuste").props.disabled, true);
  v.entrada().props.onChange({ target: { value: "-1" } });
  assert.equal(v.boton("Aplicar ajuste").props.disabled, true, "negativos bloqueados");
});

// --- SQL de producción (análisis estático; no se ejecuta) -------------------------------

const SQL = fs.readFileSync(path.resolve(__dirname, "../supabase/sql/inv_01_ajuste_existencias.sql"), "utf8");
const REV = fs.readFileSync(path.resolve(__dirname, "../supabase/sql/inv_01_ajuste_existencias_reversion.sql"), "utf8");
const cuerpoAjuste = SQL.slice(SQL.indexOf("CREATE FUNCTION public.ajustar_inventario_articulo"), SQL.indexOf("CREATE FUNCTION public.alta_articulo_admin"));

test("SQL ATÓMICO: el ajuste actualiza el artículo e inserta el Kardex en la misma función, tras bloquear la fila", () => {
  const bloqueo = cuerpoAjuste.indexOf("FOR UPDATE");
  const actualiza = cuerpoAjuste.indexOf("UPDATE public.articulos");
  const kardex = cuerpoAjuste.indexOf("INSERT INTO public.movimientos");
  assert.ok(bloqueo > 0 && bloqueo < actualiza && actualiza < kardex);
  assert.doesNotMatch(cuerpoAjuste, /\bCOMMIT\b|\bROLLBACK\b/, "sin control de transacción dentro de la función");
  assert.equal((SQL.match(/^BEGIN;$/gm) || []).length, 1);
  assert.equal((SQL.match(/^COMMIT;$/gm) || []).length, 1);
});

test("SQL: solo Administrador, préstamos reales, concurrencia, idempotencia y sin negativos", () => {
  assert.match(cuerpoAjuste, /rol_actual_en\(ARRAY\['Administrador'\]::text\[\]\)/);
  assert.match(cuerpoAjuste, /p\.estado = 'PRESTADO'/);
  assert.match(cuerpoAjuste, /ERRCODE = '40001'/);
  assert.match(cuerpoAjuste, /metadata ->> 'clave_operacion' = p_clave_operacion::text/);
  assert.match(cuerpoAjuste, /p_existencia_nueva < 0/);
  assert.match(cuerpoAjuste, /p_existencia_nueva < v_reales/);
  for (const k of ["existencia_anterior", "existencia_nueva", "disponibles_anteriores", "disponibles_nuevos", "prestamos_reales_vigentes", "diferencia_conciliada"]) assert.ok(cuerpoAjuste.includes(`'${k}'`), k);
});

test("SQL: no toca registros, RLS ni privilegios de tablas; anon sin EXECUTE; reversión mínima", () => {
  assert.doesNotMatch(SQL, /\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\b|ALTER\s+TABLE|POLICY|ON\s+TABLE/i);
  assert.match(SQL, /REVOKE ALL ON FUNCTION public\.ajustar_inventario_articulo\([^)]*\) FROM PUBLIC, anon;/);
  assert.match(SQL, /GRANT EXECUTE ON FUNCTION public\.ajustar_inventario_articulo\([^)]*\) TO authenticated;/);
  assert.equal((REV.match(/^DROP FUNCTION/gm) || []).length, 2);
  assert.doesNotMatch(REV, /DELETE|UPDATE|TRUNCATE/i);
});
