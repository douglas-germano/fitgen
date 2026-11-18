# Cloudflare (fitgen.pro)

| Recurso | Onde | Observações |
|---|---|---|
| Domínio | `fitgen.pro` (Cloudflare Registrar) | Zona ativa; certificado da zona pode demorar a ser emitido em domínios novos. |
| Túnel do backend | `fitgen-api` → `https://dev-api.fitgen.pro` | Aponta para `http://localhost:5003` (Docker). Config em `~/.cloudflared/fitgen-api.yml`. |
| Painel admin | Cloudflare Pages, projeto **`fitgen`** (`fitgen.pages.dev`) | Site 100% estático (`next build` com `NEXT_OUTPUT=export`). |
| Imagens | R2 (ver `docs/STORAGE.md`) | |

## Túnel

```bash
# subir (processo comum; não sobrevive a reinício)
cloudflared tunnel --no-autoupdate --config ~/.cloudflared/fitgen-api.yml run
# operações na zona fitgen.pro usam o certificado dedicado:
cloudflared tunnel --origincert ~/.cloudflared/cert-fitgen.pem list
```

## Painel admin (Pages)

Build estático: `cd frontend && npm run build:pages` (gera `out/`). A URL da API é fixada no build
(`NEXT_PUBLIC_API_URL`). Publicar sem passar pelo GitHub:

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://dev-api.fitgen.pro/api npm run deploy:pages   # exige `npx wrangler login`
```

O projeto `fitgen` também está ligado ao GitHub (`douglas-germano/fitgen`, branch `main`). Configuração no Pages:
build `npm run build:pages`, saída `out`, raiz `frontend`, variáveis `NEXT_PUBLIC_API_URL` e `NODE_VERSION=22`.
**Só dê push depois de commitar as mudanças do `frontend/`**: o repositório remoto ainda tem o script antigo
`pages:build`, e o build disparado pelo push falharia (o site no ar não é afetado).

A rota de detalhe do usuário é `/admin/users/detail?id=<id>` (site estático não tem rota dinâmica com servidor).
O CORS do backend (`backend/app/__init__.py`) já libera `fitgen-admin.pages.dev`, `admin.fitgen.pro` e `fitgen.pro`;
**inclua `https://fitgen.pages.dev`** (já está na lista) se o admin ficar nesse endereço.
