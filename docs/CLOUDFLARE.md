# Cloudflare (fitgen.pro)

| Recurso | Onde | Observações |
|---|---|---|
| Domínio | `fitgen.pro` (Cloudflare Registrar) | Zona ativa; certificado da zona pode demorar a ser emitido em domínios novos. |
| Túnel do backend | `fitgen-api` → `https://dev-api.fitgen.pro` | Aponta para `http://localhost:5003` (Docker). Config em `~/.cloudflared/fitgen-api.yml`. |
| Painel admin | Cloudflare Pages, projeto **`fitgen`** (`fitgen.pages.dev`) | Site estático gerado por TanStack Start e Vite. |
| Imagens | R2 (ver `docs/STORAGE.md`) | |

## Túnel

```bash
# subir (processo comum; não sobrevive a reinício)
cloudflared tunnel --no-autoupdate --config ~/.cloudflared/fitgen-api.yml run
# operações na zona fitgen.pro usam o certificado dedicado:
cloudflared tunnel --origincert ~/.cloudflared/cert-fitgen.pem list
```

## Painel admin (Pages)

O painel usa TanStack Start em modo SPA. O Pages serve o HTML estático e os assets, e o navegador
consulta a API Flask. Use Node.js 22.12 ou superior. A variável `NEXT_PUBLIC_API_URL` continua definindo
a URL da API no build.

```bash
cd frontend
npm run dev:admin          # Vite
npm run build:pages        # exporta o painel para out/
npm run check:admin        # repete o typecheck do painel
npm run preview:admin      # serve o out/ em http://localhost:3001
```

No projeto Pages `fitgen`, configure a raiz como `frontend`, o build como `npm run build:pages` e a
saída como `out`. Use `NODE_VERSION=22` ou uma versão específica igual ou superior a 22.12.
Para publicação manual autenticada, o comando é `npm run deploy:admin`.

O detalhe do usuário continua em `/admin/users/detail?id=<id>` e a recuperação de senha em
`/reset-password?token=<token>`. Os redirecionamentos e os headers do painel ficam em
`frontend/admin/pages/`. A landing usa `npm run build:lp` e o projeto Pages `fitgen-lp`.
Os dois comandos de build escrevem em `out/`; sirva ou publique o resultado correspondente ao último build.

A API deve liberar os domínios do painel em
`backend/app/__init__.py`, incluindo `https://admin.fitgen.pro` e `https://fitgen.pages.dev`.
