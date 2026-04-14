const { spawn } = require("node:child_process");
const electronBinary = require("electron");

const args = process.argv.slice(2);
const childEnv = { ...process.env };

delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, args, {
  stdio: "inherit",
  windowsHide: false,
  env: childEnv,
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
