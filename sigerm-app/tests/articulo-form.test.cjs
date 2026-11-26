/* eslint-disable @typescript-eslint/no-require-imports -- ArticuloForm regression tests with in-memory doubles; no network, no SQL, no Storage. */
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { crearLoader } = require("./helpers/operacion.cjs");

const ARTICULO = {
  id: "30000000-0000-4000-8000-000000000001",
  codigo: "MOB-001",
  nombre: "SILLA PLEGABLE",
  categoria: "MOBILIARIO",
  cantidad: 10,
  estado: "Bueno",
  imagen: "https://ejemplo.invalid/articulos/anterior.jpg",
};
const CLAVE = `sigerm:borrador-articulo:${ARTICULO.id}`;
const COLUMNAS_PERMITIDAS = ["cantidad", "categoria", "codigo", "estado", "imagen", "nombre"];

// --- Entorno de navegador mínimo -----------------------------------------
let almacen;
beforeEach(() => {
  almacen = new Map();
  global.window = {
    sessionStorage: {
      getItem: k => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => { almacen.set(k, String(v)); },
      removeItem: k => { almacen.delete(k); },
    },
  };
  global.URL.createObjectURL = () => "blob:vista-previa";
});
afterEach(() => { delete global.window; delete global.URL.createObjectURL; });

// --- Dobles de Supabase -----------------------------------------------------
function supabaseSimulado({ usuario = { id: "auth-admin" }, renovado = null, resultado = { data: [{ id: ARTICULO.id }], error: null }, errorSubida = null, vigente = null, referencias = { data: [], error: null } } = {}) {
  const r = { escrituras: [], lecturas: [], subidas: [], retiradas: [], renovaciones: 0, getUser: 0 };
  const cliente = {
    auth: {
      getUser: async () => { r.getUser++; return { data: { user: usuario }, error: usuario ? null : { message: "JWT expired" } }; },
      refreshSession: async () => { r.renovaciones++; return { data: { user: renovado, session: renovado ? {} : null }, error: renovado ? null : { message: "Invalid Refresh Token" } }; },
    },
    storage: {
      from: bucket => ({
        upload: async (nombre) => { r.subidas.push({ bucket, nombre }); return { error: errorSubida }; },
        getPublicUrl: nombre => ({ data: { publicUrl: `https://ejemplo.invalid/${bucket}/${nombre}` } }),
        remove: async nombres => { r.retiradas.push({ bucket, nombres }); return { error: null }; },
      }),
    },
    from(tabla) {
      const w = { tabla, filtros: [] };
      const q = {
        update: datos => { w.op = "update"; w.datos = datos; return q; },
        insert: datos => { w.op = "insert"; w.datos = datos; return q; },
        eq: (col, val) => { w.filtros.push(["eq", col, val]); return q; },
        is: (col, val) => { w.filtros.push(["is", col, val]); return q; },
        select: columnas => { w.select = columnas; w.op ??= "select"; return q; },
        limit: n => { w.limite = n; return q; },
        maybeSingle: async () => { r.lecturas.push({ ...w, tipo: "vigente" }); return { data: vigente, error: null }; },
        then: (ok, ko) => {
          if (w.op === "select") {
            r.lecturas.push({ ...w, tipo: "referencias" });
            return Promise.resolve(referencias).then(ok, ko);
          }
          r.escrituras.push(w);
          return Promise.resolve().then(() => (typeof resultado === "function" ? resultado(w) : resultado)).then(ok, ko);
        },
      };
      return q;
    },
  };
  return { cliente, r };
}

// --- Arnés del componente ---------------------------------------------------
function montar({ articulo: articuloDado = ARTICULO, nuevo = false, supabase }) {
  const articulo = nuevo ? undefined : articuloDado;
  const valores = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(inicial) {
      const i = cursor++;
      if (!(i in valores)) valores[i] = typeof inicial === "function" ? inicial() : inicial;
      return [valores[i], v => { valores[i] = typeof v === "function" ? v(valores[i]) : v; }];
    },
    useSyncExternalStore: (_suscribir, obtener) => obtener(),
  };
  const avisos = [];
  const navegacion = [];
  const notificar = Object.fromEntries(["exito", "error", "advertencia", "info"].map(t => [t, m => avisos.push([t, m])]));
  const cargar = crearLoader({
    react: hooks,
    "@/lib/supabase/client": { supabase },
    "@/lib/notificaciones": { notificar },
    "next/navigation": { useRouter: () => ({ push: u => navegacion.push(u), refresh: () => navegacion.push("refresh") }) },
    "next/image": { __esModule: true, default: () => null },
  });
  const Formulario = cargar("components/inventario/ArticuloForm.tsx").default;
  const vista = {
    avisos, navegacion,
    arbol() { cursor = 0; return Formulario({ articulo }); },
    elementos() {
      const todos = [];
      const recorrer = n => {
        if (Array.isArray(n)) return n.forEach(recorrer);
        if (!n || typeof n !== "object" || !n.props) return;
        todos.push(n);
        recorrer(n.props.children);
      };
      recorrer(this.arbol());
      return todos;
    },
    texto(n) { const c = n.props.children; return (Array.isArray(c) ? c : [c]).filter(x => typeof x === "string").join(" ").trim(); },
    boton(texto) { return this.elementos().find(e => e.type === "button" && this.texto(e).includes(texto)); },
    campo(valor) { return this.elementos().find(e => e.type === "input" && e.props.value === valor); },
    archivo() { return this.elementos().find(e => e.type === "input" && e.props.type === "file"); },
    escribir(valorActual, nuevo) { this.campo(valorActual).props.onChange({ target: { value: nuevo } }); },
    elegirFoto(nombre = "foto movil.jpg") { this.archivo().props.onChange({ target: { files: [{ name: nombre }] } }); },
    async guardar() { const b = this.elementos().find(e => e.type === "button" && e.props.onClick && e.props.disabled !== undefined); await b.props.onClick(); },
  };
  return vista;
}

// --- Pruebas ----------------------------------------------------------------

test("con sesión válida actualiza solo las 6 columnas permitidas y confirma una fila", async () => {
  const { cliente, r } = supabaseSimulado();
  const v = montar({ supabase: cliente });
  v.escribir(10, "7");
  await v.guardar();
  assert.equal(r.escrituras.length, 1);
  const [w] = r.escrituras;
  assert.equal(w.op, "update");
  assert.deepEqual(Object.keys(w.datos).sort(), COLUMNAS_PERMITIDAS);
  assert.deepEqual(w.filtros, [
    ["eq", "id", ARTICULO.id],
    ["eq", "codigo", ARTICULO.codigo],
    ["eq", "nombre", ARTICULO.nombre],
    ["eq", "categoria", ARTICULO.categoria],
    ["eq", "cantidad", ARTICULO.cantidad],
    ["eq", "estado", ARTICULO.estado],
    ["eq", "imagen", ARTICULO.imagen],
  ], "la actualización se condiciona a los valores originales");
  assert.equal(w.select, "id");
  assert.equal(w.datos.cantidad, 7);
  assert.equal(r.renovaciones, 0);
  assert.deepEqual(v.avisos.at(-1), ["exito", "Artículo actualizado correctamente."]);
  assert.deepEqual(v.navegacion, ["/inventario"]);
});

test("el payload nunca incluye id, disponibles ni created_at", async () => {
  const { cliente, r } = supabaseSimulado();
  await montar({ supabase: cliente }).guardar();
  for (const columna of ["id", "disponibles", "created_at"]) assert.equal(columna in r.escrituras[0].datos, false, columna);
});

test("con la sesión caducada la renueva una vez y guarda", async () => {
  const { cliente, r } = supabaseSimulado({ usuario: null, renovado: { id: "auth-admin" } });
  const v = montar({ supabase: cliente });
  await v.guardar();
  assert.equal(r.getUser, 1);
  assert.equal(r.renovaciones, 1);
  assert.equal(r.escrituras.length, 1);
  assert.equal(v.avisos.at(-1)[0], "exito");
});

test("sin sesión no sube fotos ni escribe, conserva lo capturado y lleva al inicio de sesión", async () => {
  const { cliente, r } = supabaseSimulado({ usuario: null, renovado: null });
  const v = montar({ supabase: cliente });
  v.escribir("SILLA PLEGABLE", "SILLA PLEGABLE NEGRA");
  v.escribir(10, "4");
  v.elegirFoto();
  await v.guardar();
  assert.equal(r.renovaciones, 1);
  assert.deepEqual(r.subidas, []);
  assert.deepEqual(r.escrituras, []);
  assert.deepEqual(JSON.parse(almacen.get(CLAVE)), { codigo: "MOB-001", nombre: "SILLA PLEGABLE NEGRA", categoria: "MOBILIARIO", cantidad: 4, estado: "Bueno" });
  assert.deepEqual(v.navegacion, [`/login?redirectTo=${encodeURIComponent(`/inventario/editar/${ARTICULO.id}`)}`]);
  assert.equal(v.avisos.at(-1)[0], "error");
  assert.match(v.avisos.at(-1)[1], /sesión expiró.*conservaron/);
  assert.equal(v.boton("Guardando"), undefined, "el botón vuelve a estar disponible");
});

test("al volver, el borrador se ofrece y se recupera solo con la acción de la usuaria", async () => {
  almacen.set(CLAVE, JSON.stringify({ codigo: "MOB-001", nombre: "SILLA PLEGABLE NEGRA", categoria: "MOBILIARIO", cantidad: 4, estado: "Regular" }));
  const { cliente } = supabaseSimulado();
  const v = montar({ supabase: cliente });
  assert.ok(v.campo("SILLA PLEGABLE"), "sin acción no se sobrescriben los datos");
  v.boton("Recuperar datos").props.onClick();
  assert.ok(v.campo("SILLA PLEGABLE NEGRA"));
  assert.ok(v.campo(4));
  assert.equal(almacen.has(CLAVE), false);
  assert.equal(v.boton("Recuperar datos"), undefined);
  assert.equal(v.avisos.at(-1)[0], "info");
});

test("el borrador se puede descartar y uno corrupto se ignora", () => {
  almacen.set(CLAVE, JSON.stringify({ codigo: "X", nombre: "Y", categoria: "Z", cantidad: 1, estado: "Bueno" }));
  const { cliente } = supabaseSimulado();
  const v = montar({ supabase: cliente });
  v.boton("Descartar").props.onClick();
  assert.equal(almacen.has(CLAVE), false);
  assert.equal(v.boton("Recuperar datos"), undefined);
  assert.ok(v.campo("SILLA PLEGABLE"));

  almacen.set(CLAVE, "{no es json");
  assert.equal(montar({ supabase: cliente }).boton("Recuperar datos"), undefined);
  almacen.set(CLAVE, JSON.stringify({ codigo: "X", nombre: "Y", categoria: "Z", cantidad: "mucho", estado: "Bueno" }));
  assert.equal(montar({ supabase: cliente }).boton("Recuperar datos"), undefined);
});

test("el error 42501 muestra un mensaje comprensible y conserva lo capturado en pantalla", async () => {
  const { cliente } = supabaseSimulado({ resultado: { data: null, error: { code: "42501", message: "permission denied for table articulos" } } });
  const v = montar({ supabase: cliente });
  v.escribir("SILLA PLEGABLE", "SILLA PLEGABLE NEGRA");
  await v.guardar();
  const [tipo, mensaje] = v.avisos.at(-1);
  assert.equal(tipo, "error");
  assert.doesNotMatch(mensaje, /permission denied/);
  assert.match(mensaje, /permisos.*datos siguen en pantalla/);
  assert.ok(v.campo("SILLA PLEGABLE NEGRA"), "los datos no se pierden");
  assert.deepEqual(v.navegacion, []);
  assert.equal(v.boton("Guardando"), undefined);
});

test("si falla la actualización se retira la fotografía recién subida", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: { data: null, error: { code: "42501", message: "permission denied for table articulos" } } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.equal(r.subidas.length, 1);
  assert.match(r.subidas[0].nombre, /^\d+-nueva\.jpg$/);
  assert.deepEqual(r.retiradas, [{ bucket: "articulos", nombres: [r.subidas[0].nombre] }]);
});

test("si la actualización afecta 0 filas (RLS) no informa éxito y retira la fotografía", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: { data: [], error: null } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.equal(v.avisos.at(-1)[0], "error");
  assert.equal(r.retiradas.length, 1);
  assert.deepEqual(v.navegacion, []);
});

test("CONCURRENCIA: si otra persona modificó el artículo no se sobrescribe y se conserva lo capturado", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: { data: [], error: null }, vigente: { id: ARTICULO.id } });
  const v = montar({ supabase: cliente });
  v.escribir(10, "3");
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.equal(r.escrituras.filter(w => w.op === "update").length, 1);
  assert.equal(r.lecturas.filter(l => l.tipo === "vigente").length, 1, "se comprueba si el artículo sigue existiendo");
  const [tipo, mensaje] = v.avisos.at(-1);
  assert.equal(tipo, "error");
  assert.match(mensaje, /Otra persona modificó este artículo/);
  assert.equal(JSON.parse(almacen.get(CLAVE)).cantidad, 3, "borrador conservado para recuperarlo tras recargar");
  assert.ok(v.campo(3), "los datos siguen en pantalla");
  assert.equal(r.retiradas.length, 1, "la fotografía subida se retira");
  assert.deepEqual(v.navegacion, []);
});

test("CONCURRENCIA: un artículo con imagen nula se condiciona con IS NULL", async () => {
  const { cliente, r } = supabaseSimulado();
  await montar({ articulo: { ...ARTICULO, imagen: null }, supabase: cliente }).guardar();
  assert.deepEqual(r.escrituras[0].filtros.at(-1), ["is", "imagen", null]);
});

test("dos administradores editando artículos distintos guardan ambos sin conflicto", async () => {
  const otro = { ...ARTICULO, id: "30000000-0000-4000-8000-000000000002", codigo: "MOB-002", nombre: "MESA" };
  const a = supabaseSimulado(); const b = supabaseSimulado({ resultado: { data: [{ id: otro.id }], error: null } });
  const va = montar({ supabase: a.cliente }); const vb = montar({ articulo: otro, supabase: b.cliente });
  await Promise.all([va.guardar(), vb.guardar()]);
  assert.equal(va.avisos.at(-1)[0], "exito");
  assert.equal(vb.avisos.at(-1)[0], "exito");
});

test("si la red falla tras subir la foto, se retira y se informa sin bloquear el botón", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: () => { throw new Error("Failed to fetch"); } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.equal(r.retiradas.length, 1);
  assert.match(v.avisos.at(-1)[1], /Failed to fetch/);
  assert.equal(v.boton("Guardando"), undefined);
});

test("FOTOS: antes de retirar una foto se comprueba que ningún artículo la referencia", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: { data: null, error: { code: "42501", message: "x" } } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  const [ref] = r.lecturas.filter(l => l.tipo === "referencias");
  assert.ok(ref, "consulta de referencias realizada");
  assert.deepEqual(ref.filtros, [["eq", "imagen", `https://ejemplo.invalid/articulos/${r.subidas[0].nombre}`]]);
  assert.equal(r.retiradas.length, 1);
});

test("FOTOS: si la red falla DESPUÉS de que la base aplicó el cambio, la foto en uso NO se retira", async () => {
  const { cliente, r } = supabaseSimulado({
    resultado: () => { throw new Error("Failed to fetch"); },
    referencias: { data: [{ id: ARTICULO.id }], error: null },
  });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.deepEqual(r.retiradas, [], "la fotografía referenciada se conserva");
  assert.equal(v.avisos.at(-1)[0], "error");
});

test("FOTOS: si no se puede comprobar si la foto está en uso, se conserva", async () => {
  const { cliente, r } = supabaseSimulado({
    resultado: { data: null, error: { code: "42501", message: "x" } },
    referencias: { data: null, error: { message: "network" } },
  });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.deepEqual(r.retiradas, []);
});

test("FOTOS: la imagen anterior del artículo nunca se retira", async () => {
  const { cliente, r } = supabaseSimulado({ resultado: { data: null, error: { code: "42501", message: "x" } } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  for (const { nombres } of r.retiradas) assert.ok(!nombres.some(n => ARTICULO.imagen.endsWith(n)), "no se toca la imagen anterior");
  const sinFoto = supabaseSimulado({ resultado: { data: null, error: { code: "42501", message: "x" } } });
  await montar({ supabase: sinFoto.cliente }).guardar();
  assert.deepEqual(sinFoto.r.retiradas, [], "sin foto nueva no se retira nada");
});

test("con éxito la fotografía nueva se conserva y se guarda su URL", async () => {
  const { cliente, r } = supabaseSimulado();
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.deepEqual(r.retiradas, []);
  assert.equal(r.escrituras[0].datos.imagen, `https://ejemplo.invalid/articulos/${r.subidas[0].nombre}`);
});

test("si falla la subida de la foto no se escribe el artículo", async () => {
  const { cliente, r } = supabaseSimulado({ errorSubida: { message: "new row violates row-level security policy" } });
  const v = montar({ supabase: cliente });
  v.elegirFoto("nueva.jpg");
  await v.guardar();
  assert.deepEqual(r.escrituras, []);
  assert.deepEqual(r.retiradas, []);
  assert.equal(v.avisos.at(-1)[0], "error");
});

test("un artículo nuevo se inserta con las mismas columnas y confirma una fila", async () => {
  const { cliente, r } = supabaseSimulado();
  cliente.rpc = async (nombre, args) => { r.rpc = [nombre, args]; return { data: "MES-001", error: null }; };
  const v = montar({ nuevo: true, supabase: cliente });
  const categoria = v.elementos().find(e => e.type === "select" && e.props.value === "");
  await categoria.props.onChange({ target: { value: "MESAS" } });
  assert.deepEqual(r.rpc, ["generar_codigo_articulo", { categoria: "MESAS" }]);
  const nombre = v.elementos().find(e => e.type === "input" && e.props.value === "" && e.props.onChange);
  nombre.props.onChange({ target: { value: "Mesa plegable" } });
  await v.guardar();
  assert.equal(r.escrituras.length, 1);
  assert.equal(r.escrituras[0].op, "insert");
  assert.equal(r.escrituras[0].datos.codigo, "MES-001");
  assert.deepEqual(Object.keys(r.escrituras[0].datos).sort(), COLUMNAS_PERMITIDAS);
  assert.equal(r.escrituras[0].select, "id");
});
