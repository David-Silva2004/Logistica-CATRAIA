-- Tabela de tipos
CREATE TABLE IF NOT EXISTS tipo (
  id_tipo SERIAL PRIMARY KEY,
  tipo_lancha VARCHAR(20) NOT NULL
);

-- Garante que nao exista tipos repetidos e permite usar ON CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_lancha
  ON tipo (tipo_lancha);

-- Tabela de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nome_usuario VARCHAR(50) NOT NULL,
  login_usuario VARCHAR(50),
  email_usuario VARCHAR(100),
  tipo_usuario VARCHAR(20),
  senha_usuario VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Garante compatibilidade com bancos antigos.
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS login_usuario VARCHAR(50);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS email_usuario VARCHAR(100);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20);

-- O email fica opcional para compatibilidade com a base antiga.
ALTER TABLE usuarios
ALTER COLUMN email_usuario DROP NOT NULL;

-- Usuarios antigos passam a ser administradores para preservar acesso.
UPDATE usuarios
SET tipo_usuario = 'admin'
WHERE tipo_usuario IS NULL OR BTRIM(tipo_usuario) = '';

ALTER TABLE usuarios
ALTER COLUMN tipo_usuario SET DEFAULT 'normal';

ALTER TABLE usuarios
ALTER COLUMN tipo_usuario SET NOT NULL;

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_tipo_usuario_check
CHECK (tipo_usuario IN ('admin', 'normal'));

-- Gera login a partir do nome para registros antigos sem depender de email.
UPDATE usuarios
SET login_usuario = LOWER(
  REGEXP_REPLACE(
    COALESCE(NULLIF(nome_usuario, ''), 'usuario'),
    '[^a-zA-Z0-9]+',
    '.',
    'g'
  )
)
WHERE login_usuario IS NULL OR BTRIM(login_usuario) = '';

-- Resolve logins duplicados antes de criar o indice unico.
UPDATE usuarios u
SET login_usuario = CONCAT(
  LEFT(COALESCE(NULLIF(u.login_usuario, ''), 'usuario'), 42),
  '.',
  u.id_usuario
)
WHERE EXISTS (
  SELECT 1
  FROM usuarios duplicated
  WHERE duplicated.id_usuario <> u.id_usuario
    AND LOWER(duplicated.login_usuario) = LOWER(u.login_usuario)
);

ALTER TABLE usuarios
ALTER COLUMN login_usuario SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_login
  ON usuarios (LOWER(login_usuario));

-- Tabela de lanchas
CREATE TABLE IF NOT EXISTS lanchas (
  id_lancha SERIAL PRIMARY KEY,
  nome_lancha VARCHAR(50) NOT NULL,
  id_tipo INT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id_tipo) REFERENCES tipo(id_tipo)
);

-- Evita repetir lanchas a cada inicializacao do sistema.
CREATE UNIQUE INDEX IF NOT EXISTS ux_lanchas_nome
  ON lanchas (nome_lancha);

-- Tabela de operadores
CREATE TABLE IF NOT EXISTS operadores (
  id_operador SERIAL PRIMARY KEY,
  nome_operador VARCHAR(50) NOT NULL
);

-- Tabela de status
CREATE TABLE IF NOT EXISTS status (
  id_status SERIAL PRIMARY KEY,
  status VARCHAR(15) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_status_nome
  ON status (status);

-- Tabela de operacoes
CREATE TABLE IF NOT EXISTS operacoes (
  id_operacao SERIAL PRIMARY KEY,
  id_lancha INT NOT NULL,
  id_operador INT NOT NULL,
  id_status INT NOT NULL,
  id_usuario INT,
  inicio_operacao TIMESTAMP NOT NULL DEFAULT NOW(),
  fim_operacao TIMESTAMP,
  observacao VARCHAR(255),
  criado_em TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id_lancha) REFERENCES lanchas(id_lancha),
  FOREIGN KEY (id_operador) REFERENCES operadores(id_operador),
  FOREIGN KEY (id_status) REFERENCES status(id_status),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CHECK (fim_operacao IS NULL OR fim_operacao >= inicio_operacao)
);

INSERT INTO status (status) VALUES
  ('Barra'),
  ('Viagem'),
  ('Passeio'),
  ('Almoco'),
  ('Abastecendo'),
  ('Livre')
ON CONFLICT (status) DO NOTHING;

INSERT INTO tipo (tipo_lancha) VALUES
  ('Madeira'),
  ('Fibra'),
  ('Catamara')
ON CONFLICT (tipo_lancha) DO NOTHING;

INSERT INTO lanchas (nome_lancha, id_tipo) VALUES
  ('FAB I', 1),
  ('FAB III', 1),
  ('FAB IV', 1),
  ('FAB XV', 1),
  ('FAB XVIII', 1),
  ('FAB XXI', 1),
  ('FAB XXII', 1),
  ('FAB XXIV', 1),
  ('FAB XXVII', 1),
  ('FAB XXVIII', 1),
  ('FAB XXX', 1),
  ('FAB XXXII', 1),
  ('FAB XXXV', 1),
  ('FAB XLI', 1),
  ('FAB XLIII', 1),
  ('FAB XLV', 1),
  ('FAB XLVI', 1),
  ('FAB XLVII', 1),
  ('FAB II', 2),
  ('FAB V', 2),
  ('FAB IX', 2),
  ('FAB XI', 2),
  ('FAB XII', 2),
  ('FAB XIV', 2),
  ('FAB XVI', 2),
  ('FAB XIX', 2),
  ('FAB XX', 2),
  ('FAB XXV', 2),
  ('FAB XXVI', 2),
  ('FAB XXXIV', 2),
  ('CAT I', 3),
  ('CAT II', 3),
  ('CAT III', 3)
ON CONFLICT (nome_lancha) DO NOTHING;
