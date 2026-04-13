
## Logistica CATRAIA

Painel web para operacao logistica, com foco em controle de tripulantes, visao resumida de indicadores e base pronta para evolucao futura com persistencia em PostgreSQL.

O projeto atual roda como frontend em `Vite + React` e hoje utiliza dados simulados para alimentar a interface.

## Tecnologias

- Vite
- React
- TypeScript/TSX
- Tailwind CSS
- Componentes Radix UI

## Como rodar o projeto

### Requisitos

- Node.js LTS instalado
- npm disponivel no terminal

### Instalar dependencias

```bash
npm install
```

### Rodar em desenvolvimento

```bash
npm run dev
```

O Vite vai exibir a URL local no terminal, normalmente `http://localhost:5173/`.

### Gerar build de producao

```bash
npm run build
```

## Estrutura principal

```text
src/
  app/
    App.tsx
    components/
server/
  database/
    postgres.js
```

## Conexao com PostgreSQL

Foi adicionado o arquivo [server/database/postgres.js](server/database/postgres.js) como base para a conexao com o banco.

Importante:

- Esse arquivo deve ser usado apenas no backend.
- Nao coloque credenciais de banco dentro do frontend.
- Antes de usar a conexao em uma API/servidor Node, instale o driver do PostgreSQL:

```bash
npm install pg
```

Depois disso, preencha no arquivo:

- `host`
- `port`
- `database`
- `user`
- `password`
- `ssl`

O modulo ja deixa pronto:

- `postgresPool` para reaproveitar conexoes
- `testPostgresConnection()` para validar acesso ao banco
- `closePostgresConnection()` para encerrar o pool

## Estado atual do projeto

- Interface principal funcionando localmente
- Dados ainda em modo mock
- Sem backend integrado neste repositorio por enquanto

## Proximos passos sugeridos

1. Criar uma camada de API/backend para usar o arquivo de conexao com seguranca.
2. Substituir os dados mockados por consultas reais ao PostgreSQL.
3. Mover credenciais para variaveis de ambiente quando a integracao do backend for feita.
  
