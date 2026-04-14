## Logistica CATRAIA

Painel web para controle de operacoes, com frontend em `Vite + React`, backend em `Node.js` e persistencia em `PostgreSQL`.

## Tecnologias

- Vite
- React
- TypeScript/TSX
- Tailwind CSS
- Node.js
- PostgreSQL
- Electron

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

Configuracao minima obrigatoria hoje:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSL=false`

No modo desktop empacotado, essas mesmas variaveis ficam em:

```text
%APPDATA%\Logistica CATRAIA\database.env
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

### Rodar como software desktop no PC

```bash
npm run dev:desktop
```

Esse comando sobe o frontend em modo desenvolvimento e abre o aplicativo
Electron consumindo a mesma API Node + PostgreSQL.

Frontend local: `http://localhost:5173`

API local: `http://localhost:3001/api/health`

## Build de producao

```bash
npm run build
```

## Build desktop para Windows

### Executavel portatil

```bash
npm run pack:portable
```

Gera o arquivo:

- `release/Logistica CATRAIA 0.0.1.exe`

### Instalador Windows

```bash
npm run pack:desktop
```

Gera os arquivos:

- `release/Logistica CATRAIA Setup 0.0.1.exe`
- `release/Logistica CATRAIA Setup 0.0.1.exe.blockmap`

### Configuracao do banco no desktop

No modo desenvolvimento o app usa o arquivo `.env` da raiz do projeto.

Quando empacotado como software Windows, o Electron cria um arquivo de
configuracao do banco em:

```text
%APPDATA%\Logistica CATRAIA\database.env
```

Use esse arquivo como base para apontar o PostgreSQL da empresa.

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

## Configuracao mais leve para agora

Para manter o app leve neste momento, use este caminho:

- PostgreSQL local ou em um unico servidor da empresa
- app desktop via Electron
- sem hospedagem web externa
- sem SSL no banco local: `PGSSL=false`
- uma unica API local embutida no desktop em producao

O que e realmente necessario para rodar:

- Node.js LTS apenas para desenvolvimento e empacotamento
- PostgreSQL
- arquivo `.env` no projeto ou `database.env` no desktop empacotado

O que nao e necessario agora:

- variaveis de deploy web
- servidor publico
