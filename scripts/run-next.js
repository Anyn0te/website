#!/usr/bin/env node

/**
 * Helper wrapper around the Next.js CLI that ensures `.env.local`
 * (and the rest of the Next-supported env files) are loaded before
 * we decide which port to bind to.
 */

const { spawn } = require("node:child_process");
const path = require("node:path");

const { loadEnvConfig } = require("@next/env");

const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

const mode = process.argv[2] ?? "dev";
const extraArgs = process.argv.slice(3);

const nextCli = require.resolve("next/dist/bin/next");

const portFlagProvided = extraArgs.some((arg, index, arr) => {
  if (arg === "-p" || arg === "--port") {
    // Covers `-p 4000` or `--port 4000`
    return true;
  }

  if (arg.startsWith("-p=") || arg.startsWith("--port=")) {
    // Covers `-p=4000` or `--port=4000`
    return true;
  }

  // If the previous token is -p/--port we already returned true.
  return false;
});

const finalArgs = [mode, ...extraArgs];

if (!portFlagProvided) {
  const port = process.env.PORT || "3000";
  finalArgs.push("-p", port);
}

const child = spawn(process.execPath, [nextCli, ...finalArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
  },
  cwd: projectRoot,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
