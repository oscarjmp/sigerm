/* eslint-disable @typescript-eslint/no-require-imports -- Local build launcher; no persistent environment files. */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const guard = path.join(__dirname, "build-network-guard.cjs").split(path.sep).join("/");
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "https://sigerm-build.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sigerm-build-only-public-placeholder",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_OPTIONS: ((process.env.NODE_OPTIONS ?? "") + ' --require "' + guard + '"').trim(),
};
// Sin clave administrativa, igual que Vercel Preview: el build no debe
// depender de SUPABASE_SERVICE_ROLE_KEY (el cliente se crea en tiempo de
// ejecución). Se elimina también si existe en el entorno del proceso.
delete env.SUPABASE_SERVICE_ROLE_KEY;
console.log("Isolated build: fictitious environment; data network access blocked.");
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  cwd: path.resolve(__dirname, ".."), env, stdio: "inherit",
});
if (result.error) { console.error(result.error.message); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
