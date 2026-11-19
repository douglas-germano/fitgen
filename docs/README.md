# FitGen - Plataforma de Fitness & Nutrição com IA

Plataforma completa de fitness e nutrição impulsionada por IA (LLMs via OpenRouter). Cria treinos personalizados, planos de dieta, oferece um Coach Virtual interativo e gamificação.

## Tech Stack

### Backend
- **Flask 3.0+** com Flask-SQLAlchemy
- **PostgreSQL** (Supabase / Railway)
- **Redis** (cache + rate limiting)
- **JWT** (Flask-JWT-Extended) para autenticação
- **OpenRouter** para IA (treinos, dieta, coach)
- **Gunicorn** em produção
- **Python 3.13**

### Frontend

- **Admin** em TanStack Start e Vite
- **Landing e checkout** em Next.js
- **React 19**, TypeScript, Tailwind CSS 4 e Radix UI
- **TanStack Query** e **Recharts** no painel

### Mobile

- **React Native e Expo** para iOS, Android e PWA
- Identificador do app `com.douglas.fitgen`

## Estrutura do Projeto

```
fitgen/
├── backend/                  # API Flask (REST)
│   ├── app/
│   │   ├── modules/          # Bounded Contexts (DDD)
│   │   │   ├── identity/     # Usuários, Auth, Perfil, Assinaturas
│   │   │   ├── training/     # Treinos, Exercícios, Sessões
│   │   │   ├── nutrition/    # Refeições, Dieta, Hidratação
│   │   │   ├── analytics/    # Métricas, Progresso, Metas
│   │   │   ├── gamification/ # XP, Níveis, Conquistas, Streaks
│   │   │   ├── coach/        # Coach Virtual (OpenRouter + Function Calling)
│   │   │   └── communication/# Notificações, Push, Email, WhatsApp
│   │   ├── services/         # Serviços compartilhados (IA, Firebase, etc.)
│   │   └── extensions.py     # Extensões Flask (DB, JWT, Migrate, etc.)
│   ├── migrations/           # Alembic migrations
│   ├── requirements.txt
│   └── wsgi.py
├── frontend/                 # Aplicações web
│   ├── admin/                # Painel administrativo (TanStack Start)
│   ├── src/app/              # Landing, checkout e páginas legais (Next.js)
│   └── src/components/       # Componentes de interface
├── mobile/                   # App Expo para iOS, Android e PWA
├── docs/                     # Documentação
└── ecosystem.config.js       # PM2 config (dev local)
```

## Desenvolvimento Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
python -m flask run --port 5001
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # landing em http://localhost:3000
npm run dev:admin    # painel em http://localhost:3001
```

### Variáveis de Ambiente

Consulte [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) para a lista completa de variáveis necessárias.

## Deploy

- **Backend**: Railway (ver [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md))
- **Admin e landing** no [Cloudflare Pages](CLOUDFLARE.md), com `npm run build:pages` e `npm run build:lp`
- **App iOS e Android** com EAS Build. O [PWA Expo](PWA.md) é publicado no Cloudflare Workers.

## Documentação

- [API Routes](api_routes.md) — Mapa completo de endpoints
- [Regras de Negócio](BUSINESS_RULES.md) — Lógica e restrições do sistema
- [Arquitetura](architecture_diagram.md) — Diagrama DDD com Mermaid
- [Deploy Railway](RAILWAY_DEPLOY.md) — Guia de deploy do backend
