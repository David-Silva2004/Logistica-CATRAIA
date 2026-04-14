import http from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { URL, pathToFileURL } from "node:url";
import {
  closePostgresConnection,
  postgresPool,
} from "./database/postgres.js";

const PORT = Number(process.env.PORT || 3001);

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

const PASSWORD_HASH_PREFIX = "scrypt";
const USER_ROLE_ADMIN = "admin";
const USER_ROLE_NORMAL = "normal";
const REPORT_PERIOD_DAY = "day";
const REPORT_PERIOD_WEEK = "week";
const REPORT_PERIOD_MONTH = "month";
const OPERATION_STATUS_RULES_BY_TYPE = {
  // Preencha aqui quando definirmos a matriz exata de status por tipo de lancha.
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

function resolveProjectRoot(projectRoot) {
  return projectRoot || process.env.APP_ROOT || process.cwd();
}

async function tryServeStatic(requestUrl, response, distRoot) {
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

async function ensureDatabaseSchema(schemaPath) {
  const sql = await fs.readFile(schemaPath, "utf-8");
  await postgresPool.query(sql);
}

function normalizeLogin(value) {
  return requireText(value, "login")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".");
}

function normalizeOptionalEmail(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizeUserRole(value, fallback = USER_ROLE_NORMAL) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : fallback;

  if (![USER_ROLE_ADMIN, USER_ROLE_NORMAL].includes(normalized)) {
    throw new Error("tipoUsuario invalido.");
  }

  return normalized;
}

function requirePassword(value) {
  const password = typeof value === "string" ? value : "";

  if (!password.trim()) {
    throw new Error("password is required.");
  }

  if (password.length < 6) {
    throw new Error("password must contain at least 6 characters.");
  }

  return password;
}

function createPasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`;
}

function verifyPasswordHash(password, storedPassword) {
  const [, salt, storedHash] = storedPassword.split("$");

  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = scryptSync(password, salt, 64);
  const referenceHash = Buffer.from(storedHash, "hex");

  if (referenceHash.length !== candidateHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, referenceHash);
}

function normalizeBusinessLabel(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeAuthUser(row) {
  return {
    id: row.id_usuario,
    name: row.nome_usuario,
    login: row.login_usuario,
    email: row.email_usuario ?? null,
    role: row.tipo_usuario,
  };
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
    crewMemberName: row.nome_marinheiro || null,
    startedAt: row.inicio_operacao,
    finishedAt: row.fim_operacao,
    notes: row.observacao || "",
  };
}

function parseIsoDateOnly(value, fieldName = "date") {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createHttpError(400, `Informe um ${fieldName} valido no formato YYYY-MM-DD.`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw createHttpError(400, `Informe um ${fieldName} valido no formato YYYY-MM-DD.`);
  }

  return parsedDate;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function getConsolidatedDateRange({ date, period }) {
  const normalizedPeriod = String(period || REPORT_PERIOD_DAY)
    .trim()
    .toLowerCase();

  if (
    ![REPORT_PERIOD_DAY, REPORT_PERIOD_WEEK, REPORT_PERIOD_MONTH].includes(
      normalizedPeriod,
    )
  ) {
    throw createHttpError(400, "Periodo invalido. Use day, week ou month.");
  }

  const referenceDate = parseIsoDateOnly(date, "date");
  let rangeStart = new Date(referenceDate);
  let rangeEnd = new Date(referenceDate);

  if (normalizedPeriod === REPORT_PERIOD_WEEK) {
    const dayOfWeek = referenceDate.getUTCDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    rangeStart.setUTCDate(referenceDate.getUTCDate() - mondayOffset);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeStart.getUTCDate() + 6);
  }

  if (normalizedPeriod === REPORT_PERIOD_MONTH) {
    rangeStart = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
    );
    rangeEnd = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0),
    );
  }

  return {
    period: normalizedPeriod,
    startDate: formatDateOnly(rangeStart),
    endDate: formatDateOnly(rangeEnd),
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
      SELECT
        id_usuario AS id,
        nome_usuario AS label,
        login_usuario AS hint,
        tipo_usuario AS role
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
        o.nome_marinheiro,
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

async function getOperationsByDateRange(startDate, endDate) {
  const result = await postgresPool.query(
    `
      SELECT
        o.id_operacao,
        o.id_lancha,
        o.id_operador,
        o.id_status,
        o.id_usuario,
        o.nome_marinheiro,
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
      WHERE o.inicio_operacao::date BETWEEN $1::date AND $2::date
      ORDER BY o.inicio_operacao DESC, o.id_operacao DESC
    `,
    [startDate, endDate],
  );

  return result.rows.map(normalizeOperation);
}

function normalizeOperationDateRange(payload) {
  const startedAt = requireText(payload.startedAt, "startedAt");
  const finishedAt =
    typeof payload.finishedAt === "string" && payload.finishedAt.trim()
      ? payload.finishedAt.trim()
      : null;
  const startedAtDate = new Date(startedAt);
  const finishedAtDate = finishedAt ? new Date(finishedAt) : null;

  if (Number.isNaN(startedAtDate.getTime())) {
    throw createHttpError(400, "Informe um inicio de operacao valido.");
  }

  if (finishedAt && (!finishedAtDate || Number.isNaN(finishedAtDate.getTime()))) {
    throw createHttpError(400, "Informe um fim de operacao valido.");
  }

  if (finishedAtDate && finishedAtDate.getTime() <= startedAtDate.getTime()) {
    throw createHttpError(400, "O fim da operacao precisa ser maior que o inicio.");
  }

  return {
    startedAt,
    finishedAt,
  };
}

async function ensureLanchaHasNoTimeConflict({
  lanchaId,
  startedAt,
  finishedAt,
  ignoreOperationId = null,
}) {
  const result = await postgresPool.query(
    `
      SELECT
        o.id_operacao,
        l.nome_lancha,
        op.nome_operador
      FROM operacoes o
      INNER JOIN lanchas l ON l.id_lancha = o.id_lancha
      INNER JOIN operadores op ON op.id_operador = o.id_operador
      WHERE o.id_lancha = $1
        AND ($2::int IS NULL OR o.id_operacao <> $2::int)
        AND COALESCE(o.fim_operacao, 'infinity'::timestamp) > $3::timestamp
        AND COALESCE($4::timestamp, 'infinity'::timestamp) > o.inicio_operacao
      LIMIT 1
    `,
    [Number(lanchaId), ignoreOperationId, startedAt, finishedAt],
  );

  if (result.rows[0]) {
    throw createHttpError(
      400,
      `A lancha ${result.rows[0].nome_lancha} ja possui uma operacao no periodo informado.`,
    );
  }
}

async function ensureNoDuplicateOpenLanchaStatus({
  lanchaId,
  statusId,
  finishedAt,
  ignoreOperationId = null,
}) {
  if (finishedAt) {
    return;
  }

  const result = await postgresPool.query(
    `
      SELECT
        o.id_operacao,
        l.nome_lancha,
        s.status
      FROM operacoes o
      INNER JOIN lanchas l ON l.id_lancha = o.id_lancha
      INNER JOIN status s ON s.id_status = o.id_status
      WHERE o.id_lancha = $1
        AND o.id_status = $2
        AND ($3::int IS NULL OR o.id_operacao <> $3::int)
        AND o.fim_operacao IS NULL
      LIMIT 1
    `,
    [Number(lanchaId), Number(statusId), ignoreOperationId],
  );

  if (result.rows[0]) {
    throw createHttpError(
      400,
      `A lancha ${result.rows[0].nome_lancha} ja possui uma operacao aberta com status ${result.rows[0].status}.`,
    );
  }
}

async function ensureOperatorHasNoOpenConflict({
  operatorId,
  finishedAt,
  ignoreOperationId = null,
}) {
  if (finishedAt) {
    return;
  }

  const result = await postgresPool.query(
    `
      SELECT
        o.id_operacao,
        op.nome_operador,
        l.nome_lancha
      FROM operacoes o
      INNER JOIN operadores op ON op.id_operador = o.id_operador
      INNER JOIN lanchas l ON l.id_lancha = o.id_lancha
      WHERE o.id_operador = $1
        AND ($2::int IS NULL OR o.id_operacao <> $2::int)
        AND o.fim_operacao IS NULL
      LIMIT 1
    `,
    [Number(operatorId), ignoreOperationId],
  );

  if (result.rows[0]) {
    throw createHttpError(
      400,
      `O operador ${result.rows[0].nome_operador} ja possui uma operacao aberta na lancha ${result.rows[0].nome_lancha}.`,
    );
  }
}

async function ensureValidStatusTypeCombination({ lanchaId, statusId }) {
  const result = await postgresPool.query(
    `
      SELECT
        t.tipo_lancha,
        s.status
      FROM lanchas l
      INNER JOIN tipo t ON t.id_tipo = l.id_tipo
      INNER JOIN status s ON s.id_status = $2
      WHERE l.id_lancha = $1
      LIMIT 1
    `,
    [Number(lanchaId), Number(statusId)],
  );

  const row = result.rows[0];

  if (!row) {
    throw createHttpError(
      400,
      "Nao foi possivel validar a lancha e o status informados.",
    );
  }

  const normalizedType = normalizeBusinessLabel(row.tipo_lancha);
  const normalizedStatus = normalizeBusinessLabel(row.status);
  const allowedStatuses = OPERATION_STATUS_RULES_BY_TYPE[normalizedType];

  if (!allowedStatuses || allowedStatuses.length === 0) {
    return;
  }

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw createHttpError(
      400,
      `O status ${row.status} nao pode ser usado com lanchas do tipo ${row.tipo_lancha}.`,
    );
  }
}

function shouldRequireCrewMember({ typeName, statusName }) {
  const normalizedType = normalizeBusinessLabel(typeName);
  const normalizedStatus = normalizeBusinessLabel(statusName);
  const isLargeLancha = normalizedType.includes("catamara");
  const isBarra = normalizedStatus.includes("barra");
  const isPasseio = normalizedStatus.includes("passeio");

  return isBarra || (isPasseio && isLargeLancha);
}

async function ensureCrewMemberRequirement({ lanchaId, statusId, crewMemberName }) {
  const result = await postgresPool.query(
    `
      SELECT
        t.tipo_lancha,
        s.status
      FROM lanchas l
      INNER JOIN tipo t ON t.id_tipo = l.id_tipo
      INNER JOIN status s ON s.id_status = $2
      WHERE l.id_lancha = $1
      LIMIT 1
    `,
    [Number(lanchaId), Number(statusId)],
  );

  const row = result.rows[0];

  if (!row) {
    throw createHttpError(
      400,
      "Nao foi possivel validar a lancha e o status informados.",
    );
  }

  if (
    shouldRequireCrewMember({
      typeName: row.tipo_lancha,
      statusName: row.status,
    }) &&
    !String(crewMemberName || "").trim()
  ) {
    throw createHttpError(
      400,
      "Informe o marinheiro acompanhante para operacoes de Barra e Passeio com lancha grande.",
    );
  }
}

async function validateOperationBusinessRules(payload, { operationId = null } = {}) {
  const { startedAt, finishedAt } = normalizeOperationDateRange(payload);

  await ensureLanchaHasNoTimeConflict({
    lanchaId: payload.lanchaId,
    startedAt,
    finishedAt,
    ignoreOperationId: operationId,
  });

  await ensureOperatorHasNoOpenConflict({
    operatorId: payload.operatorId,
    finishedAt,
    ignoreOperationId: operationId,
  });

  await ensureNoDuplicateOpenLanchaStatus({
    lanchaId: payload.lanchaId,
    statusId: payload.statusId,
    finishedAt,
    ignoreOperationId: operationId,
  });

  await ensureValidStatusTypeCombination({
    lanchaId: payload.lanchaId,
    statusId: payload.statusId,
  });

  await ensureCrewMemberRequirement({
    lanchaId: payload.lanchaId,
    statusId: payload.statusId,
    crewMemberName: payload.crewMemberName,
  });

  return {
    startedAt,
    finishedAt,
  };
}

async function createOperation(payload) {
  const { operatorId, lanchaId, statusId, userId, notes, crewMemberName } = payload;
  const { startedAt, finishedAt } = await validateOperationBusinessRules(payload);

  const result = await postgresPool.query(
    `
      INSERT INTO operacoes (
        id_lancha,
        id_operador,
        id_status,
        id_usuario,
        nome_marinheiro,
        inicio_operacao,
        fim_operacao,
        observacao
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_operacao
    `,
    [
      Number(lanchaId),
      Number(operatorId),
      Number(statusId),
      userId ? Number(userId) : null,
      crewMemberName?.trim() || null,
      startedAt,
      finishedAt || null,
      notes?.trim() || null,
    ],
  );

  return result.rows[0].id_operacao;
}

async function updateOperation(operationId, payload) {
  const { operatorId, lanchaId, statusId, userId, notes, crewMemberName } = payload;
  const { startedAt, finishedAt } = await validateOperationBusinessRules(
    payload,
    { operationId: Number(operationId) },
  );

  const result = await postgresPool.query(
    `
      UPDATE operacoes
      SET
        id_lancha = $1,
        id_operador = $2,
        id_status = $3,
        id_usuario = $4,
        nome_marinheiro = $5,
        inicio_operacao = $6,
        fim_operacao = $7,
        observacao = $8
      WHERE id_operacao = $9
      RETURNING id_operacao
    `,
    [
      Number(lanchaId),
      Number(operatorId),
      Number(statusId),
      userId ? Number(userId) : null,
      crewMemberName?.trim() || null,
      startedAt,
      finishedAt || null,
      notes?.trim() || null,
      Number(operationId),
    ],
  );

  return result.rows[0]?.id_operacao || null;
}

async function deleteOperation(operationId) {
  const result = await postgresPool.query(
    `
      DELETE FROM operacoes
      WHERE id_operacao = $1
      RETURNING id_operacao
    `,
    [Number(operationId)],
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

async function countUsers() {
  const result = await postgresPool.query(
    "SELECT COUNT(*)::int AS total FROM usuarios",
  );

  return result.rows[0]?.total ?? 0;
}

async function countAdminUsers() {
  const result = await postgresPool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM usuarios
      WHERE tipo_usuario = $1
    `,
    [USER_ROLE_ADMIN],
  );

  return result.rows[0]?.total ?? 0;
}

async function findUserById(userId) {
  const result = await postgresPool.query(
    `
      SELECT
        id_usuario,
        nome_usuario,
        login_usuario,
        email_usuario,
        tipo_usuario,
        senha_usuario
      FROM usuarios
      WHERE id_usuario = $1
      LIMIT 1
    `,
    [Number(userId)],
  );

  return result.rows[0] || null;
}

async function findUserByEmail(email) {
  const result = await postgresPool.query(
    `
      SELECT
        id_usuario,
        nome_usuario,
        login_usuario,
        email_usuario,
        tipo_usuario,
        senha_usuario
      FROM usuarios
      WHERE LOWER(email_usuario) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] || null;
}

async function findUserByLogin(login) {
  const result = await postgresPool.query(
    `
      SELECT
        id_usuario,
        nome_usuario,
        login_usuario,
        email_usuario,
        tipo_usuario,
        senha_usuario
      FROM usuarios
      WHERE LOWER(login_usuario) = LOWER($1)
      LIMIT 1
    `,
    [login],
  );

  return result.rows[0] || null;
}

async function findUserByLoginOrEmail(identifier) {
  const result = await postgresPool.query(
    `
      SELECT
        id_usuario,
        nome_usuario,
        login_usuario,
        email_usuario,
        tipo_usuario,
        senha_usuario
      FROM usuarios
      WHERE LOWER(login_usuario) = LOWER($1)
         OR LOWER(email_usuario) = LOWER($1)
      LIMIT 1
    `,
    [identifier],
  );

  return result.rows[0] || null;
}

async function getAuthenticatedUserFromRequest(request) {
  const rawHeader = request.headers["x-user-id"];
  const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!userId) {
    throw createHttpError(401, "Sessao invalida. Entre novamente no sistema.");
  }

  const user = await findUserById(userId);

  if (!user) {
    throw createHttpError(401, "Sessao invalida. Entre novamente no sistema.");
  }

  return normalizeAuthUser(user);
}

function ensureAdminUser(user, message = "Somente administradores podem executar essa acao.") {
  if (user.role !== USER_ROLE_ADMIN) {
    throw createHttpError(403, message);
  }
}

async function createUser(payload, { firstUserOnly = false } = {}) {
  const name = requireText(payload.name, "name");
  const login = normalizeLogin(payload.login);
  const email = normalizeOptionalEmail(payload.email);
  const role = firstUserOnly
    ? USER_ROLE_ADMIN
    : normalizeUserRole(payload.role, USER_ROLE_NORMAL);
  const password = requirePassword(payload.password);

  if (firstUserOnly) {
    const totalUsers = await countUsers();

    if (totalUsers > 0) {
      throw new Error("Ja existe um usuario cadastrado no sistema.");
    }
  }

  if (email) {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new Error("Ja existe um usuario com esse e-mail.");
    }
  }

  const existingLogin = await findUserByLogin(login);

  if (existingLogin?.login_usuario?.toLowerCase() === login) {
    throw new Error("Ja existe um usuario com esse nome de acesso.");
  }

  const result = await postgresPool.query(
    `
      INSERT INTO usuarios (
        nome_usuario,
        login_usuario,
        email_usuario,
        tipo_usuario,
        senha_usuario
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_usuario, nome_usuario, login_usuario, email_usuario, tipo_usuario
    `,
    [name, login, email, role, createPasswordHash(password)],
  );

  return normalizeAuthUser(result.rows[0]);
}

async function updateUser(userId, payload, currentUser) {
  const id = Number(userId);
  const name = requireText(payload.name, "name");
  const login = normalizeLogin(payload.login);
  const role = normalizeUserRole(payload.role, USER_ROLE_NORMAL);
  const nextPassword =
    typeof payload.password === "string" ? payload.password.trim() : "";
  const targetUser = await findUserById(id);

  if (!targetUser) {
    return null;
  }

  const existingLogin = await findUserByLogin(login);

  if (existingLogin && existingLogin.id_usuario !== id) {
    throw new Error("Ja existe um usuario com esse nome de acesso.");
  }

  if (
    targetUser.tipo_usuario === USER_ROLE_ADMIN &&
    role !== USER_ROLE_ADMIN
  ) {
    const totalAdmins = await countAdminUsers();

    if (totalAdmins <= 1) {
      throw new Error("Nao e possivel remover o ultimo administrador do sistema.");
    }
  }

  if (currentUser.id === id && currentUser.role === USER_ROLE_ADMIN && role !== USER_ROLE_ADMIN) {
    throw new Error("Nao e possivel remover seu proprio acesso de administrador.");
  }

  let result;

  if (nextPassword) {
    if (nextPassword.length < 6) {
      throw new Error("password must contain at least 6 characters.");
    }

    result = await postgresPool.query(
      `
        UPDATE usuarios
        SET
          nome_usuario = $1,
          login_usuario = $2,
          tipo_usuario = $3,
          senha_usuario = $4
        WHERE id_usuario = $5
        RETURNING id_usuario, nome_usuario, login_usuario, email_usuario, tipo_usuario
      `,
      [name, login, role, createPasswordHash(nextPassword), id],
    );
  } else {
    result = await postgresPool.query(
      `
        UPDATE usuarios
        SET
          nome_usuario = $1,
          login_usuario = $2,
          tipo_usuario = $3
        WHERE id_usuario = $4
        RETURNING id_usuario, nome_usuario, login_usuario, email_usuario, tipo_usuario
      `,
      [name, login, role, id],
    );
  }

  return result.rows[0] ? normalizeAuthUser(result.rows[0]) : null;
}

async function deleteUser(userId, currentUser) {
  const id = Number(userId);
  const targetUser = await findUserById(id);

  if (!targetUser) {
    return null;
  }

  if (currentUser.id === id) {
    throw new Error("Nao e possivel excluir o usuario que esta logado no momento.");
  }

  if (targetUser.tipo_usuario === USER_ROLE_ADMIN) {
    const totalAdmins = await countAdminUsers();

    if (totalAdmins <= 1) {
      throw new Error("Nao e possivel excluir o ultimo administrador do sistema.");
    }
  }

  const linkedOperations = await postgresPool.query(
    `
      SELECT 1
      FROM operacoes
      WHERE id_usuario = $1
      LIMIT 1
    `,
    [id],
  );

  if (linkedOperations.rowCount) {
    throw new Error(
      "Nao e possivel excluir este usuario porque ele ja esta vinculado a operacoes.",
    );
  }

  const result = await postgresPool.query(
    `
      DELETE FROM usuarios
      WHERE id_usuario = $1
      RETURNING id_usuario, nome_usuario, login_usuario, email_usuario, tipo_usuario
    `,
    [id],
  );

  return result.rows[0] ? normalizeAuthUser(result.rows[0]) : null;
}

async function authenticateUser(payload) {
  const identifier = requireText(
    payload.login || payload.identifier || payload.email,
    "login",
  ).toLowerCase();
  const password = requirePassword(payload.password);

  const user = await findUserByLoginOrEmail(identifier);

  if (!user) {
    throw new Error("Usuario ou senha invalidos.");
  }

  let passwordMatches = false;
  let shouldUpgradePassword = false;

  if (user.senha_usuario.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    passwordMatches = verifyPasswordHash(password, user.senha_usuario);
  } else {
    passwordMatches = user.senha_usuario === password;
    shouldUpgradePassword = passwordMatches;
  }

  if (!passwordMatches) {
    throw new Error("Usuario ou senha invalidos.");
  }

  if (shouldUpgradePassword) {
    await postgresPool.query(
      `
        UPDATE usuarios
        SET senha_usuario = $1
        WHERE id_usuario = $2
      `,
      [createPasswordHash(password), user.id_usuario],
    );
  }

  return normalizeAuthUser(user);
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

async function updateOperator(operatorId, payload) {
  const name = requireText(payload.name, "name");
  const result = await postgresPool.query(
    `
      UPDATE operadores
      SET nome_operador = $1
      WHERE id_operador = $2
      RETURNING id_operador AS id, nome_operador AS label
    `,
    [name, Number(operatorId)],
  );

  return result.rows[0] || null;
}

async function deleteOperator(operatorId) {
  const result = await postgresPool.query(
    `
      DELETE FROM operadores
      WHERE id_operador = $1
      RETURNING id_operador AS id
    `,
    [Number(operatorId)],
  );

  return result.rows[0] || null;
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

function createHttpServer({ projectRoot }) {
  const distRoot = path.join(projectRoot, "dist");
  const schemaPath = path.join(projectRoot, "server", "database", "schema.sql");

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(
      request.url || "/",
      `http://${request.headers.host || "127.0.0.1"}`,
    );

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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

      if (request.method === "GET" && requestUrl.pathname === "/api/auth/status") {
        const totalUsers = await countUsers();
        sendJson(response, 200, { hasUsers: totalUsers > 0 });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/auth/login") {
        const payload = await readJsonBody(request);
        const session = await authenticateUser(payload);
        sendJson(response, 200, { session });
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/auth/bootstrap-admin"
      ) {
        const payload = await readJsonBody(request);
        const session = await createUser(payload, { firstUserOnly: true });
        sendJson(response, 201, { session });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/api/bootstrap") {
        await getAuthenticatedUserFromRequest(request);
        const selectedDate = requestUrl.searchParams.get("date");
        const [options, operations] = await Promise.all([
          getOptions(),
          getOperations(selectedDate),
        ]);

        sendJson(response, 200, { options, operations });
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/reports/consolidated"
      ) {
        await getAuthenticatedUserFromRequest(request);

        const selectedDate = requestUrl.searchParams.get("date");
        const period = requestUrl.searchParams.get("period") || REPORT_PERIOD_DAY;

        if (!selectedDate) {
          throw createHttpError(400, "Informe a data de referencia para o relatorio.");
        }

        const range = getConsolidatedDateRange({
          date: selectedDate,
          period,
        });
        const operations = await getOperationsByDateRange(
          range.startDate,
          range.endDate,
        );

        sendJson(response, 200, {
          period: range.period,
          startDate: range.startDate,
          endDate: range.endDate,
          operations,
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/operations") {
        await getAuthenticatedUserFromRequest(request);
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
        await getAuthenticatedUserFromRequest(request);
        const payload = await readJsonBody(request);
        const operator = await createOperator(payload);
        sendJson(response, 201, operator);
        return;
      }

      if (
        request.method === "PUT" &&
        requestUrl.pathname.startsWith("/api/operators/")
      ) {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem editar operadores.",
        );
        const operatorId = requestUrl.pathname.split("/").pop();
        const payload = await readJsonBody(request);
        const operator = await updateOperator(operatorId, payload);

        if (!operator) {
          sendJson(response, 404, { error: "Operator not found." });
          return;
        }

        sendJson(response, 200, operator);
        return;
      }

      if (
        request.method === "DELETE" &&
        requestUrl.pathname.startsWith("/api/operators/")
      ) {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem excluir operadores.",
        );
        const operatorId = requestUrl.pathname.split("/").pop();
        const deletedOperator = await deleteOperator(operatorId);

        if (!deletedOperator) {
          sendJson(response, 404, { error: "Operator not found." });
          return;
        }

        sendJson(response, 200, deletedOperator);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/types") {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(requestUser);
        const payload = await readJsonBody(request);
        const type = await createType(payload);
        sendJson(response, 201, type);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/lanchas") {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(requestUser);
        const payload = await readJsonBody(request);
        const lancha = await createLancha(payload);
        sendJson(response, 201, lancha);
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/api/users") {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem cadastrar usuarios.",
        );
        const payload = await readJsonBody(request);
        const user = await createUser(payload);
        sendJson(response, 201, {
          id: user.id,
          label: user.name,
          login: user.login,
          role: user.role,
        });
        return;
      }

      if (
        request.method === "PUT" &&
        requestUrl.pathname.startsWith("/api/users/")
      ) {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem editar usuarios.",
        );
        const userId = requestUrl.pathname.split("/").pop();
        const payload = await readJsonBody(request);
        const user = await updateUser(userId, payload, requestUser);

        if (!user) {
          sendJson(response, 404, { error: "User not found." });
          return;
        }

        sendJson(response, 200, {
          id: user.id,
          label: user.name,
          login: user.login,
          role: user.role,
        });
        return;
      }

      if (
        request.method === "DELETE" &&
        requestUrl.pathname.startsWith("/api/users/")
      ) {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem excluir usuarios.",
        );
        const userId = requestUrl.pathname.split("/").pop();
        const deletedUser = await deleteUser(userId, requestUser);

        if (!deletedUser) {
          sendJson(response, 404, { error: "User not found." });
          return;
        }

        sendJson(response, 200, {
          id: deletedUser.id,
          label: deletedUser.name,
          login: deletedUser.login,
          role: deletedUser.role,
        });
        return;
      }

      if (
        request.method === "PUT" &&
        requestUrl.pathname.startsWith("/api/operations/")
      ) {
        await getAuthenticatedUserFromRequest(request);
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

      if (
        request.method === "DELETE" &&
        requestUrl.pathname.startsWith("/api/operations/")
      ) {
        const requestUser = await getAuthenticatedUserFromRequest(request);
        ensureAdminUser(
          requestUser,
          "Somente administradores podem excluir operacoes.",
        );
        const operationId = requestUrl.pathname.split("/").pop();
        const deletedId = await deleteOperation(operationId);

        if (!deletedId) {
          sendJson(response, 404, { error: "Operation not found." });
          return;
        }

        sendJson(response, 200, { id: deletedId });
        return;
      }

      const handledStatic = await tryServeStatic(requestUrl, response, distRoot);

      if (handledStatic) {
        return;
      }

      sendJson(response, 404, { error: "Route not found." });
    } catch (error) {
      const message =
        error.code === "23503"
          ? "Nao e possivel excluir este operador porque ele ja esta vinculado a operacoes."
          : error.message || "Unexpected server error.";
      const statusCode = error.statusCode
        ? error.statusCode
        : error.code === "23505" ||
            error.code === "23503" ||
            error.code === "23514" ||
            error.message?.includes("required") ||
            error.message?.includes("at least 6 characters") ||
            error.message?.includes("Ja existe") ||
            error.message?.includes("violates foreign key constraint") ||
            error.message?.includes("invalidos")
          ? 400
          : 500;

      sendJson(response, statusCode, {
        error: message,
      });
    }
  });

  return {
    schemaPath,
    server,
  };
}

export async function startServer({
  port = PORT,
  host = "0.0.0.0",
  projectRoot,
} = {}) {
  const resolvedProjectRoot = resolveProjectRoot(projectRoot);
  const { schemaPath, server } = createHttpServer({
    projectRoot: resolvedProjectRoot,
  });

  await ensureDatabaseSchema(schemaPath);

  await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });

  const address = server.address();
  const actualPort =
    typeof address === "object" && address ? address.port : Number(port);
  const listenHost = host === "0.0.0.0" ? "127.0.0.1" : host;

  return {
    host: listenHost,
    port: actualPort,
    server,
    url: `http://${listenHost}:${actualPort}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await closePostgresConnection();
    },
  };
}

async function startStandaloneServer() {
  try {
    const serverHandle = await startServer();
    console.log("Schema do banco garantido com sucesso.");
    console.log(`API online em ${serverHandle.url}`);

    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.on(signal, async () => {
        await serverHandle.close();
        process.exit(0);
      });
    }
  } catch (error) {
    console.error("Falha ao inicializar banco de dados:", error.message);
    process.exit(1);
  }
}

const entryFile = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryFile === import.meta.url) {
  await startStandaloneServer();
}
