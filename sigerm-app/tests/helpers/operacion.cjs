/* eslint-disable @typescript-eslint/no-require-imports -- In-memory TypeScript loader for Node tests. */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const root = path.resolve(__dirname, "../..");
function crearLoader(overrides = {}) {
  const cache = new Map();
  function cargar(nombre) {
    const archivo = path.resolve(root, nombre);
    if (cache.has(archivo)) return cache.get(archivo).exports;
    const m = new Module(archivo, module);
    m.filename = archivo; m.paths = Module._nodeModulePaths(path.dirname(archivo));
    cache.set(archivo, m);
    const original = m.require.bind(m);
    m.require = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
      if (id === "next/navigation") return { useRouter: () => ({ refresh() {} }) };
      if (id === "@/lib/hooks/useAuth") return { useAuth: () => ({ puede: () => true, rol: "Administrador" }) };
      if (id.startsWith("@/") || id.startsWith(".")) {
        const base = id.startsWith("@/") ? path.join(root, id.slice(2)) : path.resolve(path.dirname(archivo), id);
        const file = ["", ".ts", ".tsx", "/index.tsx"].map(ext => base + ext).find(f => /\.tsx?$/.test(f) && fs.existsSync(f));
        if (file) return cargar(path.relative(root, file));
      }
      return original(id);
    };
    m._compile(ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, archivo);
    return m.exports;
  }
  return cargar;
}
const ids = {
  encuentro: "10000000-0000-4000-8000-000000000001",
  matrimonio: "10000000-0000-4000-8000-000000000002",
  usuario: "10000000-0000-4000-8000-000000000003",
  registro: "10000000-0000-4000-8000-000000000004",
  otro: "10000000-0000-4000-8000-000000000005",
};
const encuentro = { id: ids.encuentro, numero: 7, nombre: "Renovación", fechaInicio: "2026-12-01", fechaTermino: "2026-12-03", sede: "México", estado: "Programado", createdAt: "2026-11-24T12:00:00Z" };
const participante = { id: ids.registro, encuentroId: ids.encuentro, matrimonioId: ids.matrimonio, habitacion: "12", observaciones: "", createdAt: null };
const servicio = { id: ids.registro, encuentroId: ids.encuentro, usuarioId: ids.usuario, area: "Recepción", cargo: "Responsable", createdAt: null };
const configuracion = { id: ids.registro, organizacion: "SIGERM", parroquia: "San José", ciudad: "México", estado: "CDMX", pais: "México", createdAt: null };
const matrimonio = { id: ids.matrimonio, esposo: "Juan", esposa: "Ana", activo: true };
const usuario = { id: ids.usuario, nombre: "Luis", apellido_paterno: "Pérez", apellido_materno: null, activo: true };
const catalogos = {
  matrimonios: { estado: "disponible", datos: [matrimonio] },
  usuarios: { estado: "disponible", datos: [usuario] },
  ministerios: { estado: "disponible", datos: ["Acogida"] },
};
function clienteSimulado(respuestas) {
  const llamadas = [];
  const pendientes = [...respuestas];
  return {
    llamadas, pendientes,
    from(tabla) {
      const llamada = { tabla, pasos: [] };
      const builder = {};
      for (const metodo of ["select", "insert", "update", "eq", "neq", "range", "order", "limit", "maybeSingle"]) {
        builder[metodo] = (...args) => { llamada.pasos.push([metodo, ...args]); return builder; };
      }
      builder.then = (resolve, reject) => {
        llamadas.push(llamada);
        const next = pendientes.shift();
        if (next === undefined) return Promise.reject(new Error("Unexpected simulated query")).then(resolve, reject);
        if (next instanceof Error) return Promise.reject(next).then(resolve, reject);
        return Promise.resolve(typeof next === "function" ? next(llamada) : next).then(resolve, reject);
      };
      return builder;
    },
  };
}
module.exports = { crearLoader, ids, encuentro, participante, servicio, configuracion, matrimonio, usuario, catalogos, clienteSimulado };
