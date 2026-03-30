# Railway Deployment Guide - FitGen Backend

## Pre-requisitos

1. Conta na Railway ([railway.app](https://railway.app))
2. Repositório GitHub conectado
3. PostgreSQL (provisionado na Railway)
4. Redis (provisionado na Railway)

## Deploy

### 1. Criar Projeto na Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha o repositório `fitgen`
5. Defina o root directory como `/backend`

### 2. Adicionar PostgreSQL

1. Clique "New" → "Database" → "PostgreSQL"
2. Railway cria automaticamente a variável `DATABASE_URL`

### 3. Adicionar Redis

1. Clique "New" → "Database" → "Redis"
2. Railway cria automaticamente a variável `REDIS_URL`

### 4. Configurar Variáveis de Ambiente

Vá em Service → Variables e adicione:

```bash
# Obrigatório - Aplicação
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ACCESS_TOKEN_EXPIRES=1800
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Obrigatório - Database (auto-set pela Railway PostgreSQL)
# DATABASE_URL=postgresql://user:password@host:port/database

# Obrigatório - Redis (auto-set pela Railway Redis)
# REDIS_URL=redis://host:port

# Obrigatório - Frontend (CORS)
FRONTEND_URL=https://fitgen.suacozinha.site

# Obrigatório - Google Gemini IA
GEMINI_API_KEY=your_gemini_api_key

# Opcional - Firebase (push notifications)
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY_FILE=/app/vapid-private-key.pem
VAPID_SUBJECT=mailto:your@email.com

# Opcional - Evolution API (WhatsApp)
EVOLUTION_API_URL=https://your-evolution-api-url
EVOLUTION_API_KEY=your_evolution_api_key
EVOLUTION_INSTANCE_NAME=FitGen

# Opcional - Brevo (Email)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your@email.com
BREVO_SENDER_NAME=FitGen

# Opcional - Stripe (Pagamentos)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 5. Deploy

Railway automaticamente:
1. Detecta aplicação Python
2. Instala dependências do `requirements.txt`
3. Executa migrations do banco
4. Inicia a aplicação via Gunicorn

**Procfile**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app`

### 6. Migrations

Após o primeiro deploy, execute as migrations se necessário:

```bash
railway run flask db upgrade
```

## Health Check

Endpoint: `/health` — Railway usa para monitorar o serviço.

```bash
curl https://your-app.railway.app/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "service": "fitgen-backend",
  "database": "healthy",
  "timestamp": "2026-01-09T..."
}
```

## Frontend (Cloudflare Pages)

O frontend é deployado separadamente no Cloudflare Pages:

```bash
npm run pages:build   # Gera export estático em out/
```

- Rewrites de `/api/*` apontam para o backend na Railway
- PWA habilitado em produção

## CORS

Origens permitidas:
- `localhost:3000` / `localhost:3001` (dev)
- `fitgen.suacozinha.site` (produção)
- `fitgen.pages.dev` (Cloudflare)

## Database

- **Pool size**: 10 (base) + 20 (overflow)
- **Pool recycle**: 300s
- **Validation**: pool_pre_ping habilitado

## Deploy Automático

Railway faz deploy automático a cada push na branch `main` do GitHub.

## Arquivos Importantes

- `Procfile` — Como iniciar a aplicação
- `railway.toml` — Configuração Railway
- `runtime.txt` — Versão do Python (3.13)
- `requirements.txt` — Dependências Python
- `.railwayignore` — Arquivos excluídos do deploy

## Troubleshooting

### Build falha
- Verifique versões incompatíveis no `requirements.txt`
- Confirme versão do Python no `runtime.txt`

### Aplicação crasha
- Verifique logs no dashboard Railway
- Confirme que todas as variáveis obrigatórias estão definidas
- Verifique `DATABASE_URL`

### Problemas de conexão com banco
- Confirme que o serviço PostgreSQL está rodando
- Verifique formato do `DATABASE_URL`
- Execute as migrations

### Problemas de porta
- Railway fornece `$PORT` automaticamente
- Aplicação faz bind em `0.0.0.0:$PORT`
