# Testes ponta a ponta

O CI executa testes HTTP do backend contra um PostgreSQL real e testes no
Chromium que validam o cadastro e a publicação de indicadores e relatórios.
No navegador, uma sessão anônima confere que os rascunhos ficam ocultos, os
dados aparecem ao publicar e somem ao retirar a publicação. O cenário de
relatórios também confere setor, período e o PDF baixado.

## Executar localmente

Siga a [instalação do projeto](../README.md#instalação). Rode os comandos
abaixo em um terminal na raiz do repositório. Eles usam as credenciais dos
arquivos de exemplo; se você as alterou, ajuste o usuário e a URL.

Crie um banco de testes separado no PostgreSQL do Compose. Execute o
`createdb` uma vez por banco; para repetir com dados limpos, use outro nome
no comando e na URL. Use apenas um banco descartável: ambas as suítes
escrevem dados, e o Playwright cria um usuário administrador de teste.

```bash
docker compose up -d --wait postgres
docker compose exec -T postgres createdb -U observatorio observatorio_e2e
export E2E_DATABASE_URL='postgresql://observatorio:observatorio@localhost:5432/observatorio_e2e?schema=public'

cd backend
DATABASE_URL="$E2E_DATABASE_URL" npm exec prisma migrate deploy -- --config prisma7.config.ts
DATABASE_URL="$E2E_DATABASE_URL" JWT_SECRET=local-e2e-only npm run test:e2e
npm run build
cd ../frontend

npx playwright install chromium
npm run test:e2e
```

No Linux, use `npx playwright install --with-deps chromium` se as
bibliotecas do navegador ainda não estiverem instaladas. Deixe as portas
3000 e 5173 livres: o Playwright inicia a API e o Vite. Os rastros de falha
ficam em `frontend/test-results`.

Depois dos testes, com os servidores de teste encerrados, o banco pode ser
removido com `docker compose exec -T postgres dropdb -U observatorio observatorio_e2e`
a partir da raiz. O banco local `observatorio` fica intacto.
