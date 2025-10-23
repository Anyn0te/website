const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const appRoot = __dirname;
loadEnvConfig(appRoot);

const runtimeEnv = {
  ...process.env,
  NODE_ENV: "production",
};

if (!runtimeEnv.PORT) {
  runtimeEnv.PORT = "3000";
}

const appName = "anyn0te-web";

module.exports = {
  apps: [
    {
      name: appName,
      cwd: appRoot,
      interpreter: process.execPath,
      script: path.join("scripts", "run-next.js"),
      args: ["start"],
      env: runtimeEnv,
      watch: false,
      autorestart: true,
      max_restarts: 5,
    },
  ],
};
