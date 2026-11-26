/* eslint-disable @typescript-eslint/no-require-imports -- Auth/navigation regression tests with in-memory doubles; no network. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { crearLoader } = require("./helpers/operacion.cjs");

const ORIGEN = "https://sigerm-test.invalid";

/*
 * Estados de sesión de un navegador:
 *  - "valida":   JWT vigente y sesión viva en Auth.
 *  - "revocada": JWT aún vigente (verificación local de getClaims) pero la
 *                sesión fue cerrada en Auth, p. ej. por un cierre de sesión
 *                global desde otro dispositivo. Reproduce el incidente.
 *  - "ninguna":  sin cookies de sesión.
 */
function navegador(estadoInicial) {
  const estado = { sesion: estadoInicial, cierres: [], llamadasGetUser: 0 };
  const auth = () => ({
    getClaims: async () => ({ data: estado.sesion === "ninguna" ? null : { claims: { sub: "auth-admin" } } }),
    getUser: async () => {
      estado.llamadasGetUser++;
      return estado.sesion === "valida"
        ? { data: { user: { id: "auth-admin" } }, error: null }
        : { data: { user: null }, error: { message: "Session from session_id claim in JWT does not exist" } };
    },
  });

  function respuesta(tipo, url) {
    const cookies = [];
    return { tipo, url, cookies: { getAll: () => cookies, set: (...a) => cookies.push(a.length === 1 ? a[0] : { name: a[0], value: a[1], ...(a[2] ?? {}) }) } };
  }

  const cargarMiddleware = crearLoader({
    "@supabase/ssr": {
      createServerClient: (_u, _k, opciones) => ({
        auth: {
          ...auth(),
          signOut: async ({ scope } = {}) => {
            estado.cierres.push(scope ?? "global");
            opciones.cookies.setAll([{ name: "sb-test-auth-token", value: "", options: { maxAge: 0, path: "/" } }]);
            if (scope === "local") estado.sesion = "ninguna";
            return { error: null };
          },
        },
      }),
    },
    "next/server": { NextResponse: { next: () => respuesta("next"), redirect: url => respuesta("redirect", url) } },
  });

  const cargarGuard = crearLoader({
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: auth(),
        from: () => {
          const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { id: "u1", activo: true, roles: { nombre: "Administrador" } }, error: null }) };
          return q;
        },
      }),
    },
    "next/navigation": { redirect: destino => { throw { redireccion: destino }; } },
  });

  return {
    estado,
    async middleware(ruta) {
      const url = new URL(ORIGEN + ruta);
      url.clone = () => new URL(url);
      const request = { nextUrl: url, cookies: { getAll: () => [], set: () => {} } };
      return cargarMiddleware("lib/supabase/middleware.ts").updateSession(request);
    },
    async pagina(ruta) {
      const { requerirPermiso } = cargarGuard("lib/auth/requerirPermiso.ts");
      const { PERMISOS } = cargarGuard("lib/permissions/permissions.ts");
      try { await requerirPermiso(PERMISOS.VER_DASHBOARD, ruta); return { tipo: "pagina" }; }
      catch (e) { if (e && e.redireccion) return { tipo: "redirect", url: new URL(e.redireccion, ORIGEN) }; throw e; }
    },
    /* Sigue redirecciones como un navegador, con un límite como Chrome. */
    async visitar(ruta, limite = 20) {
      const recorrido = [];
      let actual = ruta;
      for (let i = 0; i < limite; i++) {
        recorrido.push(actual);
        const m = await this.middleware(actual);
        if (m.tipo === "redirect") { actual = m.url.pathname + m.url.search; continue; }
        const p = actual.startsWith("/login") ? { tipo: "pagina" } : await this.pagina(new URL(actual, ORIGEN).pathname);
        if (p.tipo === "redirect") { actual = p.url.pathname + p.url.search; continue; }
        return { final: actual, recorrido, cookies: m.cookies.getAll() };
      }
      return { final: null, recorrido, error: "ERR_TOO_MANY_REDIRECTS" };
    },
  };
}

test("REPRODUCE el incidente: sesión revocada en otro dispositivo ya no produce ERR_TOO_MANY_REDIRECTS", async () => {
  const b = navegador("revocada");
  const r = await b.visitar("/dashboard");
  assert.equal(r.error, undefined, `ciclo detectado: ${r.recorrido.join(" -> ")}`);
  assert.match(r.final, /^\/login/);
  assert.ok(r.recorrido.length <= 3, r.recorrido.join(" -> "));
});

test("con sesión revocada, /login borra solo las cookies locales y muestra el formulario", async () => {
  const b = navegador("revocada");
  const m = await b.middleware("/login");
  assert.equal(m.tipo, "next");
  assert.deepEqual(b.estado.cierres, ["local"], "nunca se revoca globalmente desde el middleware");
  assert.ok(m.cookies.getAll().some(c => c.name === "sb-test-auth-token" && c.value === "" && c.maxAge === 0));
});

test("tras limpiar la sesión revocada, la siguiente visita a /login no vuelve a consultar Auth", async () => {
  const b = navegador("revocada");
  await b.middleware("/login");
  const llamadas = b.estado.llamadasGetUser;
  const m = await b.middleware("/login");
  assert.equal(m.tipo, "next");
  assert.equal(b.estado.llamadasGetUser, llamadas);
});

test("con sesión válida, /login lleva al dashboard sin ciclo", async () => {
  const b = navegador("valida");
  const r = await b.visitar("/login");
  assert.equal(r.final, "/dashboard");
  assert.deepEqual(b.estado.cierres, []);
});

test("con sesión válida se respeta un redirectTo interno (volver al artículo)", async () => {
  const b = navegador("valida");
  const m = await b.middleware("/login?redirectTo=" + encodeURIComponent("/inventario/editar/abc"));
  assert.equal(m.tipo, "redirect");
  assert.equal(m.url.origin, ORIGEN);
  assert.equal(m.url.pathname, "/inventario/editar/abc");
});

for (const malicioso of ["//evil.example", "/\\evil.example", "https://evil.example/x", "/login", "/login?redirectTo=/login", "javascript:alert(1)", "dashboard"]) {
  test(`redirectTo inseguro o circular se ignora: ${malicioso}`, async () => {
    const b = navegador("valida");
    const m = await b.middleware("/login?redirectTo=" + encodeURIComponent(malicioso));
    assert.equal(m.tipo, "redirect");
    assert.equal(m.url.origin, ORIGEN);
    assert.equal(m.url.pathname, "/dashboard");
  });
}

test("sin sesión, las rutas protegidas llevan a /login con redirectTo y sin ciclo", async () => {
  const b = navegador("ninguna");
  const r = await b.visitar("/inventario/editar/abc");
  assert.equal(r.final, "/login?redirectTo=" + encodeURIComponent("/inventario/editar/abc"));
  assert.equal(b.estado.llamadasGetUser, 0);
});

test("dos dispositivos independientes: revocar uno no afecta al otro", async () => {
  const oficina = navegador("valida");
  const celular = navegador("revocada");
  assert.equal((await oficina.visitar("/dashboard")).final, "/dashboard");
  assert.match((await celular.visitar("/dashboard")).final, /^\/login/);
  assert.equal((await oficina.visitar("/inventario")).final, "/inventario");
});

test("«Cerrar sesión» es local: no revoca las sesiones de otros dispositivos", () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, "../lib/contexts/AuthContext.tsx"), "utf8");
  const cerrar = fuente.slice(fuente.indexOf("const cerrarSesion"), fuente.indexOf("const value = useMemo"));
  assert.match(cerrar, /signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  // Las cuentas inactivas o sin perfil se siguen revocando globalmente (control de seguridad conservado).
  const bloqueos = fuente.slice(0, fuente.indexOf("const cerrarSesion")).match(/signOut\(\)/g) ?? [];
  assert.equal(bloqueos.length, 2);
});

test("rutaInternaSegura solo admite rutas internas distintas de /login", () => {
  const { rutaInternaSegura } = crearLoader()("lib/auth/redireccion.ts");
  assert.equal(rutaInternaSegura("/inventario"), "/inventario");
  assert.equal(rutaInternaSegura("/inventario/editar/1?x=1"), "/inventario/editar/1?x=1");
  for (const v of [null, undefined, "", "inventario", "//a.b", "/\\a.b", "http://a.b", "/x://y", "/login", "/login/", "/login?a=1", "/a\u0000b", "/" + "a".repeat(600)]) {
    assert.equal(rutaInternaSegura(v), null, String(v));
  }
});
