/* eslint-disable @typescript-eslint/no-require-imports -- Deterministic component-event tests without a browser or database. */
const React = require("react");
const { crearLoader } = require("./operacion.cjs");
function nodos(arbol) {
  if (Array.isArray(arbol)) return arbol.flatMap(nodos);
  if (!arbol || typeof arbol !== "object" || !arbol.props) return [];
  return [arbol, ...nodos(arbol.props.children), ...nodos(arbol.props.acciones)];
}
function montar(nombre, props, overrides = {}) {
  const valores = [], tareas = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(inicial) {
      const i = cursor++;
      if (!(i in valores)) valores[i] = typeof inicial === "function" ? inicial() : inicial;
      return [valores[i], valor => { valores[i] = typeof valor === "function" ? valor(valores[i]) : valor; }];
    },
    useRef(inicial) {
      const i = cursor++;
      if (!(i in valores)) valores[i] = { current: inicial };
      return valores[i];
    },
    useMemo: fn => fn(),
    useTransition() {
      const i = cursor++;
      valores[i] ??= false;
      return [valores[i], fn => {
        valores[i] = true;
        const tarea = Promise.resolve().then(fn).finally(() => { valores[i] = false; });
        tareas.push(tarea);
      }];
    },
  };
  const cargar = crearLoader({ ...overrides, react: hooks });
  const Componente = cargar(nombre).default;
  return {
    render() { cursor = 0; return Componente(props); },
    nodos() { return nodos(this.render()); },
    async terminar() { await Promise.all(tareas.splice(0)); },
    enviar(campos, handler) {
      const Original = global.FormData;
      global.FormData = class { constructor(form) { return form.campos[Symbol.iterator](); } };
      try { (handler ?? this.render().props.onSubmit)({ preventDefault() {}, currentTarget: { campos: Object.entries(campos) } }); }
      finally { global.FormData = Original; }
    },
  };
}
module.exports = { montar, nodos };
