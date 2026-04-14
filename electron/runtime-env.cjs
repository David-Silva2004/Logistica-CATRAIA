const fs = require("node:fs/promises");

const loadedPaths = new Set();

async function loadEnvFileIntoProcess(envPath) {
  if (!envPath || loadedPaths.has(envPath)) {
    return;
  }

  let contents = "";

  try {
    contents = await fs.readFile(envPath, "utf-8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }

  loadedPaths.add(envPath);
}

module.exports = {
  loadEnvFileIntoProcess,
};
