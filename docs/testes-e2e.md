# Testes de publicação

O CI roda os cenários de publicação de indicadores e relatórios no Chromium,
com a aplicação real e PostgreSQL. Os testes cadastram rascunhos pela área
administrativa, verificam a visibilidade em uma sessão anônima antes e depois
da publicação e confirmam que a remoção da publicação também remove o acesso
público. O cenário de relatórios confere setor, período e o PDF baixado.

Para executar localmente, instale as dependências com `npm ci` em
`backend` e em `frontend`. Use um banco **descartável**: os cenários criam
usuários, setores e outros registros de teste.

```bash
# Na raiz do projeto, com um PostgreSQL descartável já iniciado
export E2E_DATABASE_URL='postgresql://usuario:senha@localhost:5432/observatorio_e2e?schema=public'
cd backend
export DATABASE_URL="$E2E_DATABASE_URL"
npm exec prisma migrate deploy -- --config prisma7.config.ts
npm run generate:prisma
npm run build
cd ../frontend
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia o backend na porta 3000 e o frontend na porta 5173;
deixe as duas portas livres. As falhas geram traces em
`frontend/test-results`.
