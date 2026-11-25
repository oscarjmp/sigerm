/* eslint-disable @typescript-eslint/no-require-imports -- Node preload for isolated build checks. */
const http = require("node:http");
const https = require("node:https");
function permitir(input) {
  const raw = typeof input === "string" || input instanceof URL ? input : input?.url;
  const host = raw ? new URL(raw).hostname : String(input?.hostname ?? input?.host ?? "").split(":")[0];
  if (!["fonts.googleapis.com", "fonts.gstatic.com"].includes(host)) {
    throw new Error("BUILD_ONLY_NETWORK_BLOCKED: external data connections are disabled");
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => { permitir(input); return originalFetch(input, init); };
for (const transporte of [http, https]) {
  for (const method of ["request", "get"]) {
    const original = transporte[method];
    transporte[method] = function(input, ...args) { permitir(input); return original.call(this, input, ...args); };
  }
}
