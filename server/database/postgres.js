import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf-8");

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
}

loadEnvFile();

const host = process.env.PGHOST || "localhost";
const port = Number(process.env.PGPORT || 5432);
const database = process.env.PGDATABASE || "controlelancha";
const user = process.env.PGUSER || "postgres";
const password = process.env.PGPASSWORD || "";
const isLocalDatabase = host === "localhost" || host === "127.0.0.1";

function resolveSsl() {
  if (process.env.PGSSL === "false") {
    return false;
  }

  if (process.env.PGSSL === "true") {
    return { rejectUnauthorized: false };
  }

  return isLocalDatabase ? false : { rejectUnauthorized: false };
}

export const postgresPool = new Pool({
  host,
  port,
  database,
  user,
  password,
  ssl: resolveSsl(),
});

export async function testPostgresConnection() {
  const client = await postgresPool.connect();

  try {
    await client.query("SELECT 1");
    console.log("Conexao com PostgreSQL estabelecida com sucesso.");
  } finally {
    client.release();
  }
}

export async function closePostgresConnection() {
  await postgresPool.end();
}
