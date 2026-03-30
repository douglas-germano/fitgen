# FitGen - Plataforma de Fitness & Nutrição com IA

Plataforma completa de fitness e nutrição impulsionada por IA (Google Gemini). Cria treinos personalizados, planos de dieta, oferece um Coach Virtual interativo e gamificação.

## Tech Stack

### Backend
- **Flask 3.0+** com Flask-SQLAlchemy
- **PostgreSQL** (Supabase / Railway)
- **Redis** (cache + rate limiting)
- **JWT** (Flask-JWT-Extended) para autenticação
- **Google Gemini** para IA (treinos, dieta, coach)
- **Gunicorn** em produção
- **Python 3.13**

### Frontend
- **Next.js 16** com React 19
- **TypeScript**
- **Tailwind CSS 4** + shadcn/ui (Radix UI)
- **React Query** (@tanstack/react-query)
- **Recharts** para gráficos
- **Framer Motion** para animações
- **PWA** habilitado

### Mobile
- **Capacitor 8** (iOS + Android)
- **App ID**: `com.douglas.fitgen`

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
│   │   │   ├── coach/        # Coach Virtual (Gemini + Function Calling)
│   │   │   └── communication/# Notificações, Push, Email, WhatsApp
│   │   ├── services/         # Serviços compartilhados (Gemini, Firebase, etc.)
│   │   └── extensions.py     # Extensões Flask (DB, JWT, Migrate, etc.)
│   ├── migrations/           # Alembic migrations
│   ├── requirements.txt
│   └── wsgi.py
├── frontend/                 # Pasta raiz do Next.js (src/)
│   ├── src/
│   │   ├── app/              # App Router (páginas)
│   │   ├── components/       # Componentes React
│   │   ├── lib/              # Utilitários (API client, etc.)
│   │   ├── services/         # Chamadas à API
│   │   ├── contexts/         # React Contexts
│   │   ├── hooks/            # Custom Hooks
│   │   ├── types/            # TypeScript types
│   │   └── providers/        # Context Providers
│   ├── ios/                  # Capacitor iOS
│   ├── android/              # Capacitor Android
│   └── capacitor.config.ts
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
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Variáveis de Ambiente

Consulte [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) para a lista completa de variáveis necessárias.

## Deploy

- **Backend**: Railway (ver [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md))
- **Frontend**: Cloudflare Pages (`npm run pages:build` → output `out/`)
- **Mobile**: Capacitor → App Store / Play Store

## Documentação

- [API Routes](api_routes.md) — Mapa completo de endpoints
- [Regras de Negócio](BUSINESS_RULES.md) — Lógica e restrições do sistema
- [Arquitetura](architecture_diagram.md) — Diagrama DDD com Mermaid
- [Deploy Railway](RAILWAY_DEPLOY.md) — Guia de deploy do backend
