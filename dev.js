#!/usr/bin/env node
/**
 * Geoportal SIMAC — servidor de desarrollo.
 *
 * Se ejecuta desde la raíz del repositorio y levanta la app de `Frontend/`:
 *
 *   node dev.js                 puerto libre desde 8443 (8443 está ocupado por otro proyecto)
 *   node dev.js --port=9000     puerto preferido
 *   node dev.js --strict-port   no buscar otro puerto si está ocupado
 *   node dev.js --no-install    no instalar dependencias automáticamente
 *   node dev.js --open          abrir el navegador (se pasa a Vite)
 *
 * Cualquier otro argumento se pasa tal cual a Vite:
 *   node dev.js --host --open
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(ROOT, "Frontend");
const BASE_PORT = 8443;
const MAX_TRIES = 20;

const argv = process.argv.slice(2);
const passthrough = [];
let preferred = Number(process.env.PORT) || BASE_PORT;
let strictPort = false;
let autoInstall = true;
let showHelp = false;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--help" || arg === "-h") showHelp = true;
  else if (arg === "--strict-port") strictPort = true;
  else if (arg === "--no-install") autoInstall = false;
  else if (arg === "--port") preferred = Number(argv[++i]);
  else if (arg.startsWith("--port=")) preferred = Number(arg.slice("--port=".length));
  else passthrough.push(arg);
}

if (showHelp) {
  console.log(`
Geoportal SIMAC — servidor de desarrollo

  node dev.js [opciones] [-- argumentos de Vite]

Opciones:
  --port=PUERTO   puerto preferido (por defecto ${BASE_PORT}, o la variable PORT)
  --strict-port   fallar si el puerto está ocupado, en vez de buscar otro libre
  --no-install    no ejecutar la instalación de dependencias si falta node_modules
  --help          muestra esta ayuda

Ejemplos:
  node dev.js
  node dev.js --port=9000
  node dev.js --open
`);
  process.exit(0);
}

if (!Number.isInteger(preferred) || preferred <= 0 || preferred > 65535) {
  console.error(`\n  Puerto inválido: ${preferred}. Usa un número entre 1 y 65535.\n`);
  process.exit(1);
}

const log = (msg) => console.log(msg);
const step = (msg) => console.log(`  ${msg}`);

/* ---------- Gestor de paquetes ---------- */

function commandWorks(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
  return !result.error && result.status === 0;
}

function detectPackageManager() {
  const order = [];
  if (existsSync(path.join(APP_DIR, "pnpm-lock.yaml"))) order.push("pnpm");
  if (existsSync(path.join(APP_DIR, "yarn.lock"))) order.push("yarn");
  if (existsSync(path.join(APP_DIR, "package-lock.json"))) order.push("npm");

  for (const fallback of ["pnpm", "npm", "yarn"]) {
    if (!order.includes(fallback)) order.push(fallback);
  }
  return order.find(commandWorks) ?? null;
}

/* ---------- Puertos ---------- */

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

async function pickPort() {
  if (strictPort) return { port: preferred, moved: false };
  for (let port = preferred; port < preferred + MAX_TRIES && port <= 65535; port++) {
    if (await isPortFree(port)) return { port, moved: port !== preferred };
  }
  return { port: preferred, moved: false, exhausted: true };
}

/* ---------- Arranque ---------- */

const nodeModules = path.join(APP_DIR, "node_modules");
const viteBin = path.join(nodeModules, "vite", "bin", "vite.js");

log("\nGeoportal SIMAC · entorno de desarrollo");

if (!existsSync(path.join(APP_DIR, "package.json"))) {
  console.error(`\n  No se encontró la aplicación en ${APP_DIR}.\n  Este script debe vivir en la raíz del repositorio, junto a Frontend/.\n`);
  process.exit(1);
}
step(`Aplicación: ${APP_DIR}`);

if (!existsSync(viteBin)) {
  if (!autoInstall) {
    console.error("\n  Falta node_modules/vite y se indicó --no-install.\n  Ejecuta: pnpm install\n");
    process.exit(1);
  }
  const pm = detectPackageManager();
  if (!pm) {
    console.error("\n  No se encontró pnpm, yarn ni npm en el PATH.\n");
    process.exit(1);
  }
  step(`Dependencias ausentes · ejecutando \`${pm} install\`…`);
  const install = spawnSync(pm, ["install"], { cwd: APP_DIR, stdio: "inherit", shell: process.platform === "win32" });
  if (install.status !== 0) {
    console.error(`\n  \`${pm} install\` falló con código ${install.status}.\n`);
    process.exit(install.status ?? 1);
  }
}

const { port, moved, exhausted } = await pickPort();

if (exhausted) {
  console.error(
    `\n  No se encontró un puerto libre entre ${preferred} y ${preferred + MAX_TRIES - 1}.\n` +
      `  Libera uno o indica otro con: node dev.js --port=9000\n`,
  );
  process.exit(1);
}
if (moved) {
  const reason = strictPort ? "está en uso" : "estaba ocupado";
  step(`Puerto ${preferred} ${reason} · se usará ${port}`);
}

const url = `http://localhost:${port}/`;
step(`URL: ${url}`);
if (moved) step(`Para usar otro puerto: node dev.js --port=9000`);
log("");

const child = spawn(process.execPath, [viteBin, ...passthrough], {
  cwd: APP_DIR,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

const forward = (signal) => {
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("error", (error) => {
  console.error(`\n  No se pudo iniciar Vite: ${error.message}\n`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    log(`\nServidor detenido (${signal}).\n`);
    process.exit(0);
  }
  process.exit(code ?? 0);
});
