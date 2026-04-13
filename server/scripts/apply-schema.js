import fs from "node:fs/promises";
import path from "node:path";
import { postgresPool } from "../database/postgres.js";

const schemaPath = path.join(process.cwd(), "server", "database", "schema.sql");

try {
  const sql = await fs.readFile(schemaPath, "utf-8");
  await postgresPool.query(sql);
  console.log("Schema aplicado com sucesso.");
} finally {
  await postgresPool.end();
}
