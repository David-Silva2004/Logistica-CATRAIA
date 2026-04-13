import pg from "pg";

const { Pool } = pg;

// Preencha os dados abaixo com as credenciais do seu ambiente.
// Este arquivo deve ser usado apenas no backend.
export const postgresPool = new Pool({
  host: "localhost",
  port: 5432,
  database: "controlelancha",
  user: "postgres",
  password: "KOLP4jar@jCe",
  ssl: false,
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
