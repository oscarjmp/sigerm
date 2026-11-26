/* eslint-disable @typescript-eslint/no-require-imports -- Local integration regression tests; no SQL or production requests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { crearLoader } = require("./helpers/operacion.cjs");
const rutas = ["/encuentros", "/participantes", "/equipos-servicio", "/configuracion"];
function sidebar(rol, opciones = {}) {
  const { pathname = "/encuentros", cargando = false, autenticado = true, puede = () => true } = opciones;
  const cargar = crearLoader({
    "@/lib/hooks/useAuth": { useAuth: () => ({ rol, cargando, estaAutenticado: autenticado, puede, cerrarSesion: async () => {} }) },
    "next/navigation": { usePathname: () => pathname },
    "next/image": { __esModule: true, default: ({ src, alt, width, height }) => React.createElement("img", { src, alt, width, height }) },
  });
  return renderToStaticMarkup(React.createElement(cargar("components/layout/Sidebar.tsx").default));
}
test("el Sidebar de Administrador incluye las cuatro rutas de operación", () => {
  const html = sidebar("Administrador");
  for (const ruta of rutas) assert.ok(html.includes('href="' + ruta + '"'));
  assert.match(html, /Configuración/); assert.match(html, /Equipos de servicio/);
});
for (const rol of ["Coordinador", "Inventario", "Secretaría", "Tesorería", "Solicitante", "Matrimonio"]) {
  test("el Sidebar excluye los cuatro módulos para " + rol + " aunque tenga permisos amplios", () => {
    const html = sidebar(rol);
    for (const ruta of rutas) assert.ok(!html.includes('href="' + ruta + '"'));
    assert.ok(html.includes('href="/catalogo"'));
  });
}
test("el Sidebar no muestra enlaces privados mientras carga", () => {
  assert.doesNotMatch(sidebar("Administrador", { cargando: true }), /href="\/(encuentros|participantes|equipos-servicio|configuracion)"/);
});
test("el Sidebar no muestra módulos sin autenticación", () => {
  assert.doesNotMatch(sidebar("Administrador", { autenticado: false }), /href="\/(encuentros|participantes|equipos-servicio|configuracion)"/);
});
test("el Sidebar mantiene la comprobación del permiso además del rol", () => {
  const html = sidebar("Administrador", { puede: p => p !== "ver_encuentros" });
  assert.ok(!html.includes('href="/encuentros"')); assert.ok(!html.includes('href="/participantes"'));
  assert.ok(html.includes('href="/equipos-servicio"'));
});
test("una ruta de detalle activa el enlace de su módulo", () => {
  const html = sidebar("Administrador", { pathname: "/encuentros/registro" });
  assert.match(html, /href="\/encuentros"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/encuentros"/);
});
const cargar = crearLoader();
const { tienePermiso } = cargar("lib/permissions/menuPermissions.ts");
const permisos = ["ver_encuentros", "crear_encuentro", "editar_encuentro", "ver_servidores", "crear_servidor", "editar_servidor", "administrar_configuracion"];
test("la matriz de Claude conserva permisos operativos para Administrador", () => {
  assert.ok(permisos.every(p => tienePermiso("Administrador", p)));
});
for (const rol of ["Coordinador", "Inventario", "Secretaría", "Tesorería", "Solicitante", "Matrimonio"]) {
  test("la matriz integrada no concede permisos operativos a " + rol, () => assert.ok(permisos.every(p => !tienePermiso(rol, p))));
}
function middleware(autenticado = false, renovar = false) {
  const pendientes = [], cookiesRequest = [];
  function respuesta(tipo, url) {
    const cookies = [];
    return { tipo, url, cookies: { getAll: () => cookies, set: (...args) => cookies.push(args.length === 1 ? args[0] : { name: args[0], value: args[1] }) } };
  }
  const cargar = crearLoader({
    "@supabase/ssr": { createServerClient: (_url, _key, options) => {
      if (renovar) options.cookies.setAll([{ name: "session-test", value: "not-a-real-session", options: {} }]);
      return { auth: { getClaims: async () => ({ data: autenticado ? { claims: { sub: "test-user" } } : null }) } };
    } },
    "next/server": { NextResponse: { next: () => respuesta("next"), redirect: url => respuesta("redirect", url) } },
  });
  return {
    async solicitar(pathname) {
      const url = new URL("https://sigerm-test.invalid" + pathname);
      url.clone = () => new URL(url);
      const request = { nextUrl: url, cookies: { getAll: () => cookiesRequest, set: (name, value) => pendientes.push({ name, value }) } };
      return cargar("lib/supabase/middleware.ts").updateSession(request);
    },
  };
}
for (const ruta of rutas) {
  for (const sufijo of ["", "/registro"]) test("middleware de Claude protege " + ruta + sufijo + " sin sesión", async () => {
    const r = await middleware().solicitar(ruta + sufijo);
    assert.equal(r.tipo, "redirect"); assert.equal(r.url.pathname, "/login");
    assert.equal(r.url.searchParams.get("redirectTo"), ruta + sufijo);
  });
}
test("middleware permite continuar a páginas autenticadas; el guard de página controla el rol", async () => {
  for (const ruta of rutas) assert.equal((await middleware(true).solicitar(ruta)).tipo, "next");
});
test("la protección usa límites de ruta y no coincide con un prefijo ajeno", async () => {
  assert.equal((await middleware().solicitar("/encuentros-publicos")).tipo, "next");
});
test("la redirección conserva cookies renovadas por el middleware", async () => {
  const r = await middleware(false, true).solicitar("/participantes");
  assert.equal(r.tipo, "redirect"); assert.ok(r.cookies.getAll().some(c => c.name === "session-test"));
});
test("se conservan los SHA256 de los 16 scripts de Claude sin ejecutar SQL", () => {
  const directorio = path.resolve(__dirname, "../supabase/sql");
  const entradas = fs.readFileSync(path.join(directorio, "SHA256SUMS"), "utf8").trim().split(/\r?\n/);
  assert.ok(entradas.length >= 16, "al menos los 16 scripts de Claude");
  for (const linea of entradas) {
    const m = /^([a-f0-9]{64})  ([A-Za-z0-9_]+\.sql)$/.exec(linea);
    assert.ok(m, "Entrada de checksum válida");
    const actual = createHash("sha256").update(fs.readFileSync(path.join(directorio, m[2]))).digest("hex");
    assert.equal(actual, m[1], "Integridad de " + m[2]);
  }
});
