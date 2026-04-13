## Logistica CATRAIA

Painel web para controle de operacoes, com frontend em `Vite + React`, backend em `Node.js` e persistencia em `PostgreSQL`.

## Tecnologias

- Vite
- React
- TypeScript/TSX
- Tailwind CSS
- Node.js
- PostgreSQL

## Rodando localmente

### Requisitos

- Node.js LTS
- PostgreSQL

### Instalar dependencias

```bash
npm install
```

### Configurar ambiente

Use o arquivo [.env.example](.env.example) como base:

```bash
PGHOST=localhost
PGPORT=5432
PGDATABASE=example_catraia
PGUSER=example_catraia_user
PGPASSWORD=sua_senha
PGSSL=false
```

### Aplicar o schema

Depois de configurar as variaveis do banco:

```bash
npm run db:apply-schema
```

### Rodar frontend

```bash
npm run dev:client
```

### Rodar backend

```bash
npm run dev:server
```

Frontend local: `http://localhost:5173`

API local: `http://localhost:3001/api/health`

## Build de producao

```bash
npm run build
```

## Deploy no Render

O projeto ja esta preparado para subir como **um unico Web Service**:

- build: `npm install && npm run build`
- start: `npm start`

O backend serve a API e tambem os arquivos do `dist`, entao nao precisa criar um Static Site separado.

### Variaveis de ambiente no Render

Configure estas variaveis no servico:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSL=true`

Se quiser usar configuracao por arquivo, o projeto tambem inclui [render.yaml](render.yaml).

Observacao:

- Se o hostname do banco terminar com algo como `-a`, ele costuma ser o hostname interno da Render e funciona para o app publicado dentro da propria Render.
- Esse tipo de hostname normalmente nao resolve no seu computador local.

## Estrutura principal

```text
src/
  app/
    App.tsx
    components/
server/
  database/
    postgres.js
  index.js
```
