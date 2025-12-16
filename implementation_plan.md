# Implementation Plan - DDD Modular Monolith Refactor

Este plano detalha os passos para realizar a migração da arquitetura atual para o Monolito Modular proposto em `DDD_ARCHITECTURE.md`. A migração será feita de forma incremental para minimizar quebras.

## User Review Required
> [!IMPORTANT]
> Esta é uma refatoração estrutural massiva. O sistema passará por um breve período de instabilidade se os passos não forem seguidos atomicamente. Recomenda-se fazer backup do banco de dados antes de iniciar.

## Proposed Changes

### Fase 1: Fundação e Estrutura
Preparar o terreno sem mover lógica de negócio ainda.

#### [NEW] Estrutura de Diretórios
- Criar pasta `backend/app/modules/`
- Criar pastas para cada contexto: `identity`, `training`, `nutrition`, `coach`, `gamification`, `communication`, `analytics`.
- Criar subpastas padrão em cada módulo: `domain`, `infrastructure`, `application`, `interface`.
- Criar `backend/app/shared/` para utilitários comuns.

#### [MODIFY] Shared Infrastructure
- Mover `extensions.py` e `config.py` para `backend/app/shared/`.
- Atualizar imports globais para apontar para o novo local de shared.

### Fase 2: Módulo Identity (Base)
O módulo de Identidade é dependência de quase todos os outros, então deve ser o primeiro.

#### [MOVE] Models & Schemas
- Mover `models/user.py` → `modules/identity/domain/models.py`
- Mover `schemas/user_schema.py` → `modules/identity/interface/schemas.py`

#### [MOVE] Routes & Services
- Mover `routes/auth.py`, `routes/profile.py`, `routes/admin.py`, `routes/onboarding.py` → `modules/identity/interface/routes/`
- Criar `IdentityService` em `modules/identity/application/service.py` encapsulando lógica de auth.

### Fase 3: Core Domains (Training & Nutrition)
Migrar os domínios principais da aplicação.

#### [MOVE] Training Module
- Mover `models/workout.py`, `models/exercise_library.py` → `modules/training/domain/models.py`
- Mover `routes/workouts.py`, `routes/exercises.py` → `modules/training/interface/routes.py`
- Mover `services/workout_generator.py` → `modules/training/application/services.py`

#### [MOVE] Nutrition Module
- Mover `models/diet.py`, `models/nutrition.py`, `models/hydration.py` → `modules/nutrition/domain/models.py`
- Mover `routes/diet.py`, `routes/nutrition.py`... → `modules/nutrition/interface/routes.py`

### Fase 4: Supporting Modules
Migrar módulos satélites.

#### [MOVE] Coach Module
- Mover serviços do Gemini e rotas de chat para `modules/coach/`.

#### [MOVE] Gamification, Communication, Analytics
- Mover respectivos models e rotas para suas pastas.

### Fase 5: Clean Up & Wiring
Fazer tudo funcionar junto.

#### [MODIFY] Main App Factory (`backend/app/__init__.py`)
- Atualizar a função `create_app` para registrar os Blueprints a partir dos novos locais nos módulos.
- Exemplo: `from app.modules.identity.interface.routes import auth_bp`

#### [DELETE] Pastas Antigas
- Remover pastas vazias `routes/`, `models/`, `services/` na raiz de `app/` após confirmar que tudo foi movido.

## Verification Plan

### Automated Tests
- Executar testes existentes (se houver) para garantir que a refatoração não quebrou lógica.
- Como não há muitos testes, verificaremos manualmente.

### Manual Verification
1.  **Build**: Tentar subir o container Docker (`docker-compose up backend`). Se houver `ImportError`, corrigir os caminhos.
2.  **Auth Flow**: Tentar fazer login e obter token JWT (valida Módulo Identity).
3.  **Core Flow**:
    - Criar um treino (valida Módulo Training).
    - Registrar uma refeição (valida Módulo Nutrition).
4.  **Coach**: Enviar mensagem para o chat (valida Módulo Coach e integração Shared).
