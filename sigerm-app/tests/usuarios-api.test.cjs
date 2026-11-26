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
  const admin = {
    supabaseAdmin: {
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
    },
  };
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

test("DELETE responde 404 sin escribir cuando el usuario no existe", async () => {
  const { ruta, escrituras, authEliminados } = escenario({ usuarioObjetivo: null });
  const r = await ruta.DELETE({}, { params: Promise.resolve({ id: OTRO_ADMIN_ID }) });
  assert.equal(r.status, 404);
  assert.deepEqual(escrituras, []);
  assert.deepEqual(authEliminados, []);
});
