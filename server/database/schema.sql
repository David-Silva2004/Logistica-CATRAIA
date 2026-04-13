-- Tabela de tipos
CREATE TABLE IF NOT EXISTS tipo (
  id_tipo SERIAL PRIMARY KEY,
  tipo_lancha VARCHAR(20) NOT NULL
);

-- Garante que nao exista tipos repetido e permite usar ON CONFLICT sem duplicar os inserts.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_lancha
  ON tipo (tipo_lancha);

-- Tabela de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nome_usuario VARCHAR(50) NOT NULL,
  email_usuario VARCHAR(100) UNIQUE NOT NULL,
  senha_usuario VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de lanchas
CREATE TABLE IF NOT EXISTS lanchas (
  id_lancha SERIAL PRIMARY KEY,
  nome_lancha VARCHAR(50) NOT NULL,
  id_tipo INT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id_tipo) REFERENCES tipo(id_tipo)
);

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

-- Garante que nao exista status repetido e permite usar ON CONFLICT sem duplicar os inserts.
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

-- Inserir
INSERT INTO status (status) VALUES
  ('Barra'),
  ('Viagem'),
  ('Passeio'),
  ('Almoco'),
  ('Abastecendo'),
  ('Livre')
ON CONFLICT (status) DO NOTHING;

-- Inserir 
INSERT INTO tipo (tipo_lancha) VALUES
  ('Madeira'),
  ('Fibra'),
  ('Catamarã')
ON CONFLICT (tipo_lancha) DO NOTHING;