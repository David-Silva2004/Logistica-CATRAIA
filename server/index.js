import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { postgresPool } from "./database/postgres.js";

const PORT = Number(process.env.PORT || 3001);
const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const schemaPath = path.join(projectRoot, "server", "database", "schema.sql");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";
  const fileContents = await fs.readFile(filePath);

  response.writeHead(200, {
    "Content-Type": contentType,
  });
  response.end(fileContents);
}

async function tryServeStatic(requestUrl, response) {
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const normalizedPath = path.normalize(path.join(distRoot, pathname));

  if (!normalizedPath.startsWith(distRoot)) {
    sendJson(response, 403, { error: "Forbidden." });
    return true;
  }

  try {
    const fileStat = await fs.stat(normalizedPath);

    if (fileStat.isFile()) {
      await sendFile(response, normalizedPath);
      return true;
    }
  } catch {
    if (!requestUrl.pathname.startsWith("/api")) {
      await sendFile(response, path.join(distRoot, "index.html"));
      return true;
    }
  }

  return false;
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

async function ensureDatabaseSchema() {
  const sql = await fs.readFile(schemaPath, "utf-8");
  await postgresPool.query(sql);
}

function normalizeOperation(row) {
  return {
    id: row.id_operacao,
    operatorId: row.id_operador,
    operatorName: row.nome_operador,
    lanchaId: row.id_lancha,
    lanchaName: row.nome_lancha,
    typeName: row.tipo_lancha,
    statusId: row.id_status,
    statusName: row.status_nome,
    userId: row.id_usuario,
    userName: row.nome_usuario,
    startedAt: row.inicio_operacao,
    finishedAt: row.fim_operacao,
    notes: row.observacao || "",
  };
}

async function getOptions() {
  const [operators, lanchas, statuses, users, types] = await Promise.all([
    postgresPool.query(`
      SELECT id_operador AS id, nome_operador AS label
      FROM operadores
      ORDER BY nome_operador ASC
    `),
    postgresPool.query(`
      SELECT
        l.id_lancha AS id,
        l.nome_lancha AS label,
        t.tipo_lancha AS hint
      FROM lanchas l
      INNER JOIN tipo t ON t.id_tipo = l.id_tipo
      ORDER BY l.nome_lancha ASC
    `),
    postgresPool.query(`
      SELECT id_status AS id, status AS label
      FROM status
      ORDER BY status ASC
    `),
    postgresPool.query(`
      SELECT id_usuario AS id, nome_usuario AS label
      FROM usuarios
      ORDER BY nome_usuario ASC
    `),
    postgresPool.query(`
      SELECT id_tipo AS id, tipo_lancha AS label
      FROM tipo
      ORDER BY tipo_lancha ASC
    `),
  ]);

  return {
    operators: operators.rows,
    lanchas: lanchas.rows,
    statuses: statuses.rows,
    users: users.rows,
    types: types.rows,
  };
}

async function getOperations(selectedDate) {
  const params = [];
  let whereClause = "";

  if (selectedDate) {
    params.push(selectedDate);
    whereClause = "WHERE o.inicio_operacao::date = $1::date";
  }

  const result = await postgresPool.query(
    `
      SELECT
        o.id_operacao,
        o.id_lancha,
        o.id_operador,
        o.id_status,
        o.id_usuario,
        o.inicio_operacao,
        o.fim_operacao,
        o.observacao,
        op.nome_operador,
        l.nome_lancha,
        t.tipo_lancha,
        s.status AS status_nome,
        u.nome_usuario
      FROM operacoes o
      INNER JOIN operadores op ON op.id_operador = o.id_operador
      INNER JOIN lanchas l ON l.id_lancha = o.id_lancha
      INNER JOIN tipo t ON t.id_tipo = l.id_tipo
      INNER JOIN status s ON s.id_status = o.id_status
      LEFT JOIN usuarios u ON u.id_usuario = o.id_usuario
      ${whereClause}
      ORDER BY o.inicio_operacao DESC, o.id_operacao DESC
    `,
    params,
  );

  return result.rows.map(normalizeOperation);
}

async function createOperation(payload) {
  const {
    operatorId,
    lanchaId,
    statusId,
    userId,
    startedAt,
    finishedAt,
    notes,
  } = payload;

  const result = await postgresPool.query(
    `
      INSERT INTO operacoes (
        id_lancha,
        id_operador,
        id_status,
        id_usuario,
        inicio_operacao,
        fim_operacao,
        observacao
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_operacao
    `,
    [
      Number(lanchaId),
      Number(operatorId),
      Number(statusId),
      userId ? Number(userId) : null,
      startedAt,
      finishedAt || null,
      notes?.trim() || null,
    ],
  );

  return result.rows[0].id_operacao;
}

async function updateOperation(operationId, payload) {
  const {
    operatorId,
    lanchaId,
    statusId,
    userId,
    startedAt,
    finishedAt,
    notes,
  } = payload;

  const result = await postgresPool.query(
    `
      UPDATE operacoes
      SET
        id_lancha = $1,
        id_operador = $2,
        id_status = $3,
        id_usuario = $4,
        inicio_operacao = $5,
        fim_operacao = $6,
        observacao = $7
      WHERE id_operacao = $8
      RETURNING id_operacao
    `,
    [
      Number(lanchaId),
      Number(operatorId),
      Number(statusId),
      userId ? Number(userId) : null,
      startedAt,
      finishedAt || null,
      notes?.trim() || null,
      Number(operationId),
    ],
  );

  return result.rows[0]?.id_operacao || null;
}

function validateOperationPayload(payload) {
  if (!payload.operatorId || !payload.lanchaId || !payload.statusId || !payload.startedAt) {
    return "operatorId, lanchaId, statusId and startedAt are required.";
  }

  return null;
}

function requireText(value, fieldName) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

async function createOperator(payload) {
  const name = requireText(payload.name, "name");
  const result = await postgresPool.query(
    `
      INSERT INTO operadores (nome_operador)
      VALUES ($1)
      RETURNING id_operador AS id, nome_operador AS label
    `,
    [name],
  );

  return result.rows[0];
}

async function createType(payload) {
  const name = requireText(payload.name, "name");
  const result = await postgresPool.query(
    `
      INSERT INTO tipo (tipo_lancha)
      VALUES ($1)
      RETURNING id_tipo AS id, tipo_lancha AS label
    `,
    [name],
  );

  return result.rows[0];
}

async function createLancha(payload) {
  const name = requireText(payload.name, "name");

  if (!payload.typeId) {
    throw new Error("typeId is required.");
  }

  const result = await postgresPool.query(
    `
      INSERT INTO lanchas (nome_lancha, id_tipo)
      VALUES ($1, $2)
      RETURNING id_lancha
    `,
    [name, Number(payload.typeId)],
  );

  return result.rows[0];
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
      await postgresPool.query("SELECT 1");
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/bootstrap") {
      const selectedDate = requestUrl.searchParams.get("date");
      const [options, operations] = await Promise.all([
        getOptions(),
        getOperations(selectedDate),
      ]);

      sendJson(response, 200, { options, operations });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/operations") {
      const payload = await readJsonBody(request);
      const validationError = validateOperationPayload(payload);

      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const createdId = await createOperation(payload);
      sendJson(response, 201, { id: createdId });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/operators") {
      const payload = await readJsonBody(request);
      const operator = await createOperator(payload);
      sendJson(response, 201, operator);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/types") {
      const payload = await readJsonBody(request);
      const type = await createType(payload);
      sendJson(response, 201, type);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/lanchas") {
      const payload = await readJsonBody(request);
      const lancha = await createLancha(payload);
      sendJson(response, 201, lancha);
      return;
    }

    if (request.method === "PUT" && requestUrl.pathname.startsWith("/api/operations/")) {
      const operationId = requestUrl.pathname.split("/").pop();
      const payload = await readJsonBody(request);
      const validationError = validateOperationPayload(payload);

      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const updatedId = await updateOperation(operationId, payload);

      if (!updatedId) {
        sendJson(response, 404, { error: "Operation not found." });
        return;
      }

      sendJson(response, 200, { id: updatedId });
      return;
    }

    const handledStatic = await tryServeStatic(requestUrl, response);

    if (handledStatic) {
      return;
    }

    sendJson(response, 404, { error: "Route not found." });
  } catch (error) {
    const statusCode =
      error.code === "23503" ||
      error.code === "23514" ||
      error.message?.includes("required")
        ? 400
        : 500;

    sendJson(response, statusCode, {
      error: error.message || "Unexpected server error.",
    });
  }
});

try {
  await ensureDatabaseSchema();
  console.log("Schema do banco garantido com sucesso.");

  server.listen(PORT, () => {
    console.log(`API online em http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Falha ao inicializar banco de dados:", error.message);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await postgresPool.end();
    server.close(() => process.exit(0));
  });
}
