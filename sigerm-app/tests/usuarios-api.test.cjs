/* eslint-disable @typescript-eslint/no-require-imports -- Route regression tests with in-memory Supabase doubles; no network, no SQL. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearLoader } = require("./helpers/operacion.cjs");

const ADMIN_ID = "20000000-0000-4000-8000-0000000000aa";
const OTRO_ADMIN_ID = "20000000-0000-4000-8000-0000000000bb";

function consulta(resultado, registro) {
  const q = {
    select: () => q,
    eq: (columna, valor) => { registro.push(["eq", columna, valor]); return q; },
    update: valores => { registro.push(["update", valores]); return q; },
    delete: () => { registro.push(["delete"]); return q; },
    maybeSingle: async () => resultado(registro),
    then: (ok, ko) => Promise.resolve(resultado(registro)).then(ok, ko),
  };
  return q;
}

function escenario({ usuarioObjetivo, administradoresActivos = 2 }) {
  const escrituras = [];
  const authEliminados = [];
  const perfilSesion = { id: ADMIN_ID, auth_id: "auth-admin", activo: true, roles: { id: "rol-admin", nombre: "Administrador" } };
  const servidor = {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: "auth-admin" } }, error: null }) },
      from: () => consulta(() => ({ data: perfilSesion, error: null }), []),
    }),
  };
  const clienteAdmin = {
      from(tabla) {
        const registro = [];
        return consulta(r => {
          if (r.some(([op]) => op === "update" || op === "delete")) {
            escrituras.push({ tabla, registro: r });
            return { error: null };
          }
          if (tabla === "roles") return { data: { id: "rol-admin" }, error: null };
          if (r.some(([op, col]) => op === "eq" && col === "activo")) return { count: administradoresActivos, error: null };
          return { data: usuarioObjetivo, error: null };
        }, registro);
      },
      auth: { admin: { deleteUser: async authId => { authEliminados.push(authId); return { error: null }; } } },
  };
  const admin = { AdministracionNoDisponibleError: class extends Error {}, obtenerSupabaseAdmin: () => clienteAdmin };
  const nextServer = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
  const cargar = crearLoader({ "next/server": nextServer, "@/lib/supabase/server": servidor, "@/lib/supabase/admin": admin });
  const ruta = cargar("app/api/administracion/usuarios/[id]/route.ts");
  return { ruta, escrituras, authEliminados };
}

test("DELETE rechaza la propia cuenta aunque el UUID llegue en mayúsculas", async () => {
  const { ruta, escrituras, authEliminados } = escenario({
    usuarioObjetivo: { id: ADMIN_ID, auth_id: "auth-admin", activo: true, rol_id: "rol-admin", roles: { id: "rol-admin", nombre: "Administrador" } },
  });
  const r = await ruta.DELETE({}, { params: Promise.resolve({ id: ADMIN_ID.toUpperCase() }) });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "No puede eliminar su propia cuenta.");
  assert.deepEqual(escrituras, []);
  assert.deepEqual(authEliminados, []);
});

test("DELETE rechaza la propia cuenta con el UUID exacto antes de consultar", async () => {
  const { ruta, escrituras, authEliminados } = escenario({ usuarioObjetivo: null });
  const r = await ruta.DELETE({}, { params: Promise.resolve({ id: ADMIN_ID }) });
  assert.equal(r.status, 400);
  assert.deepEqual(escrituras, []);
  assert.deepEqual(authEliminados, []);
});

test("DELETE conserva al último administrador activo", async () => {
  const { ruta, escrituras, authEliminados } = escenario({
    administradoresActivos: 1,
    usuarioObjetivo: { id: OTRO_ADMIN_ID, auth_id: "auth-otro", activo: true, rol_id: "rol-admin", roles: { id: "rol-admin", nombre: "Administrador" } },
  });
  const r = await ruta.DELETE({}, { params: Promise.resolve({ id: OTRO_ADMIN_ID }) });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /último administrador/);
  assert.deepEqual(escrituras, []);
  assert.deepEqual(authEliminados, []);
});

// --- Entorno sin SUPABASE_SERVICE_ROLE_KEY (Vercel Preview) -------------
// Se usa el módulo real lib/supabase/admin.ts; solo se simulan la sesión
// y next/server. Ninguna prueba crea clientes con red.

const VARIABLES = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
function conEntorno(valores, fn) {
  const previo = Object.fromEntries(VARIABLES.map(v => [v, process.env[v]]));
  for (const v of VARIABLES) { if (valores[v] === undefined) delete process.env[v]; else process.env[v] = valores[v]; }
  const restaurar = () => { for (const v of VARIABLES) { if (previo[v] === undefined) delete process.env[v]; else process.env[v] = previo[v]; } };
  return Promise.resolve().then(fn).finally(restaurar);
}

function sinClave({ sesion = true, rol = "Administrador" } = {}) {
  const perfil = { id: ADMIN_ID, auth_id: "auth-admin", activo: true, roles: { id: "rol", nombre: rol } };
  const servidor = {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: sesion ? { id: "auth-admin" } : null }, error: sesion ? null : { message: "sin sesión" } }) },
      from: () => consulta(() => ({ data: perfil, error: null }), []),
    }),
  };
  const nextServer = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
  const cargar = crearLoader({ "next/server": nextServer, "@/lib/supabase/server": servidor });
  return {
    individual: cargar("app/api/administracion/usuarios/[id]/route.ts"),
    coleccion: cargar("app/api/administracion/usuarios/route.ts"),
    admin: cargar("lib/supabase/admin.ts"),
  };
}
const contexto = { params: Promise.resolve({ id: OTRO_ADMIN_ID }) };
const peticion = cuerpo => ({ json: async () => cuerpo });

test("importar las rutas y el cliente administrativo no exige la clave (build de Preview)", () =>
  conEntorno({ NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.invalid" }, () => {
    const { individual, coleccion, admin } = sinClave();
    assert.equal(typeof individual.DELETE, "function");
    assert.equal(typeof individual.PUT, "function");
    assert.equal(typeof coleccion.POST, "function");
    assert.throws(() => admin.obtenerSupabaseAdmin(), admin.AdministracionNoDisponibleError);
  }));

test("sin la clave, un Administrador autorizado recibe 503 en POST, PUT y DELETE", () =>
  conEntorno({ NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.invalid" }, async () => {
    const { individual, coleccion } = sinClave();
    const respuestas = [
      await individual.DELETE({}, contexto),
      await individual.PUT(peticion({ nombre: "Ana", rol_id: "rol" }), contexto),
      await coleccion.POST(peticion({ nombre: "Ana", email: "ana@ejemplo.invalid", password: "x", rol_id: "rol" })),
    ];
    for (const r of respuestas) {
      assert.equal(r.status, 503);
      assert.equal(r.body.error, "La administración de usuarios no está disponible en este entorno.");
      assert.doesNotMatch(JSON.stringify(r.body), /SERVICE_ROLE|\.env/);
    }
  }));

test("sin la clave se conserva la autorización: sin sesión 401 y sin rol Administrador 403", () =>
  conEntorno({ NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.invalid" }, async () => {
    const anonimo = sinClave({ sesion: false });
    assert.equal((await anonimo.individual.DELETE({}, contexto)).status, 401);
    assert.equal((await anonimo.individual.PUT(peticion({}), contexto)).status, 401);
    assert.equal((await anonimo.coleccion.POST(peticion({}))).status, 401);
    const coordinador = sinClave({ rol: "Coordinador" });
    assert.equal((await coordinador.individual.DELETE({}, contexto)).status, 403);
    assert.equal((await coordinador.individual.PUT(peticion({}), contexto)).status, 403);
    assert.equal((await coordinador.coleccion.POST(peticion({}))).status, 403);
  }));

test("sin URL de Supabase tampoco se crea el cliente administrativo", () =>
  conEntorno({ SUPABASE_SERVICE_ROLE_KEY: "clave-ficticia" }, () => {
    const { admin } = sinClave();
    assert.throws(() => admin.obtenerSupabaseAdmin(), admin.AdministracionNoDisponibleError);
  }));

test("con URL y clave el cliente se crea una sola vez y se reutiliza", () =>
  conEntorno({ NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.invalid", SUPABASE_SERVICE_ROLE_KEY: "clave-ficticia" }, () => {
    const { admin } = sinClave();
    const a = admin.obtenerSupabaseAdmin();
    assert.equal(typeof a.from, "function");
    assert.equal(admin.obtenerSupabaseAdmin(), a);
  }));

test("el cliente administrativo se niega a crearse en un navegador", () =>
  conEntorno({ NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.invalid", SUPABASE_SERVICE_ROLE_KEY: "clave-ficticia" }, () => {
    const { admin } = sinClave();
    global.window = {};
    try { assert.throws(() => admin.obtenerSupabaseAdmin(), /solo puede usarse en el servidor/); }
    finally { delete global.window; }
  }));

test("DELETE responde 404 sin escribir cuando el usuario no existe", async () => {
  const { ruta, escrituras, authEliminados } = escenario({ usuarioObjetivo: null });
  const r = await ruta.DELETE({}, { params: Promise.resolve({ id: OTRO_ADMIN_ID }) });
  assert.equal(r.status, 404);
  assert.deepEqual(escrituras, []);
  assert.deepEqual(authEliminados, []);
});
