# Observatório do Turismo de Santa Rita do Sapucaí

Plataforma web desenvolvida para o Observatório do Turismo de Santa Rita do
Sapucaí no projeto HEIComp 2026.2 do Inatel. Usa React e Vite no frontend,
NestJS e Prisma no backend e PostgreSQL 17 como banco de dados.

## Instalação

Você precisa de Git, **Node.js 24** com npm (mesma versão principal usada no CI)
e Docker com o comando `docker compose`.

```bash
git clone https://github.com/GabrielGuimaraes12/observatorio-turismo-srs.git
cd observatorio-turismo-srs

cp .env.example .env
cp backend/.env.example backend/.env
npm --prefix backend ci
npm --prefix frontend ci

docker compose up -d --wait postgres
cd backend
npm run generate:prisma
npm exec prisma migrate deploy -- --config prisma7.config.ts
```

O `.env` da raiz configura o usuário, a senha e o banco do Compose. O
`backend/.env` configura a API. Se alterar as credenciais do banco, ajuste
também `DATABASE_URL` em `backend/.env`. As credenciais dos exemplos são
para desenvolvimento local. Para outros ambientes, configure uma senha e um
`JWT_SECRET` próprios. Não versione arquivos `.env` com credenciais.

## Executar localmente

Na raiz do repositório, execute em terminais separados:

```bash
npm --prefix backend run start:dev
```

```bash
npm --prefix frontend run dev -- --strictPort
```

- Portal: <http://localhost:5173>.
- Swagger da API: <http://localhost:3000/api/docs>.
- Saúde da API e do banco: `curl --fail http://localhost:3000/api/health`.

O frontend usa `http://localhost:3000/api` por padrão. Se alterar a porta
da API, defina `VITE_API_URL` em `frontend/.env.local` com a URL completa,
incluindo `/api`, e reinicie o Vite. O backend local permite requisições da
origem `http://localhost:5173`.

Para acessar a área administrativa em um banco novo, pegue o convite inicial
de RH no log do backend, cadastre a primeira conta em `/cadastro` e use o
painel de RH para gerar um convite de administrador. O convite inicial só é
emitido se ainda não houver conta de RH nem convite inicial válido.

Para encerrar, pare os dois processos e rode `docker compose stop postgres`
na raiz. Os dados locais ficam no volume do Compose.

## Testes e integração contínua

Na raiz do projeto, depois da instalação:

```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend test

npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend test

docker compose --env-file .env.example config --quiet
```

Para rodar as suítes que usam PostgreSQL e navegador, siga o
[guia de testes ponta a ponta](docs/testes-e2e.md).

O workflow [CI](.github/workflows/ci.yml) roda em PRs para `main` e em pushes
na `main`. No GitHub, abra **Actions → CI → execução** para ver os logs de
backend, frontend e Docker Compose. Os builds bem-sucedidos dos respectivos
jobs ficam disponíveis em **Artifacts** por sete dias.
