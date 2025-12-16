# Proposta de Arquitetura: Monolito Modular (DDD)

Este documento descreve a reestruturação do backend do FitGen para uma arquitetura de **Monolito Modular** baseada em princípios de **Domain-Driven Design (DDD)**.

## 1. Objetivo
Organizar a aplicação em módulos coesos e desacoplados, facilitando a manutenção, testabilidade e escalabilidade, sem a complexidade prematura de microsserviços.

## 2. Estrutura de Diretórios Proposta

Atualmente, o projeto separa arquivos por *tipo* (`models`, `routes`, `services`). A nova estrutura agrupará por **Domínio** (Contexto Delimitado).

```
backend/app/
├── modules/                  # Módulos de Domínio (Bounded Contexts)
│   ├── identity/             # Gestão de Usuários, Auth, Perfil
│   │   ├── domain/           # Entidades e Lógica de Negócio Pura
│   │   ├── infrastructure/   # Persistência (SQLAlchemy), Repositórios
│   │   ├── application/      # Casos de Uso, Services, dtos
│   │   └── interface/        # Rotas (Blueprints), Serializers
│   │
│   ├── training/             # Treinos, Exercícios, Execução
│   │   ├── ... (mesma estrutura interna)
│   │
│   ├── nutrition/            # Dieta, Refeições, Hidratação
│   │   ├── ...
│   │
│   ├── gamification/         # XP, Níveis, Conquistas
│   │   ├── ...
│   │
│   ├── coach/                # AI Coach, Chat, Gemini Integration
│   │   ├── ...
│   │
│   └── communication/        # Notificações, WhatsApp, Webhooks
│       ├── ...
│
├── shared/                   # Código compartilhado entre módulos (Infrastructure, Utils)
│   ├── database.py           # Configuração do DB
│   ├── event_bus.py          # Barramento de Eventos (opcional)
│   └── api_client.py         # Clientes HTTP genéricos
│
└── main.py                   # Entrypoint sem lógica de negócio
```

## 3. Descrição dos Módulos (Bounded Contexts)

### 3.1. Identity (Identidade & Acesso)
Responsável por tudo relacionado a quem é o usuário.
- **Responsabilidades**: Autenticação (JWT), Cadastro, Recuperação de Senha, Perfil de Usuário, Onboarding.
- **Models**: `User`, `UserProfile`.
- **Rotas Atuais**: `auth.py`, `profile.py`, `onboarding.py`, `admin.py`.

### 3.2. Training (Treinamento)
O coração (Core Domain) da aplicação de fitness.
- **Responsabilidades**: Gerenciar biblioteca de exercícios, criar e gerenciar planos de treino, registrar logs de execução de treino.
- **Models**: `WorkoutPlan`, `WorkoutDay`, `Exercise`, `ExerciseLibrary`, `WorkoutSession`, `ExerciseLog`.
- **Rotas Atuais**: `workouts.py`, `exercises.py`.

### 3.3. Nutrition (Nutrição)
Outro domínio principal.
- **Responsabilidades**: Planos de dieta, registro de refeições, ingestão de água, preferências alimentares.
- **Models**: `DietPreference`, `DietPlan`, `Meal` (assumido), `HydrationLog`.
- **Rotas Atuais**: `diet.py`, `nutrition.py`, `hydration.py`, `nutrition_history.py`.

### 3.4. Coach (Inteligência Artificial)
Módulo focado na interação inteligente.
- **Responsabilidades**: Chat interface, integração com Gemini API, detecção de intenção, execução de comandos.
- **Services**: `CoachGeminiService`, `CoachFunctions`.
- **Rotas Atuais**: `chat.py`.

### 3.5. Gamification (Engajamento)
Domínio de suporte para aumentar a retenção.
- **Responsabilidades**: Calcular XP, streaks (ofensiva), conquistas, rankings.
- **Models**: `UserStreak`, `Achievement` (se houver).
- **Rotas Atuais**: `gamification.py`.

### 3.6. Communication (Comunicação)
Infraestrutura de contato com o usuário.
- **Responsabilidades**: Envio de emails, Push Notifications, Integração com WhatsApp.
- **Services**: `EmailService`, `FCMService`, `WhatsappService`.
- **Rotas Atuais**: `notifications.py`, `whatsapp.py`, `webhooks.py`.

### 3.7. Analytics (Métricas Corporais)
Acompanhamento de progresso.
- **Responsabilidades**: Registro de peso, medidas corporais, fotos de progresso.
- **Models**: `BodyMetric`, `ProgressSnapshot`.
- **Rotas Atuais**: `metrics.py`, `progress.py`.

## 4. Regras de Comunicação entre Módulos

Para evitar o "Monolito Espaguete", devemos seguir regras estritas:

1.  **Sem Imports Cruzados de Domínio**: O módulo `Training` não deve importar diretamente uma model do `Nutrition`.
2.  **Comunicação via Interface Pública (Services)**: Se `Training` precisa de dados do `Identity`, deve chamar `IdentityService.get_user_summary(user_id)`.
3.  **Uso de Eventos (Event-Driven)**: Para desacoplamento, usar eventos.
    *   *Exemplo*: Quando `Identity` finaliza um cadastro (`UserRegisteredEvent`), o módulo `Communication` escuta e envia o email de boas-vindas. O módulo `Gamification` escuta e cria o registro inicial de XP.

## 5. Plano de Migração

1.  **Fase 1: Setup**: Criar a estrutura de pastas.
2.  **Fase 2: Core Domains**: Mover `Training` e `Nutrition` para seus módulos.
3.  **Fase 3: Suporte**: Mover `Communication` e `Gamification`.
4.  **Fase 4: Refatoração de Rotas**: Atualizar o `app/__init__.py` para registrar os blueprints dos novos locais.

## 6. Benefícios
- **Clareza**: Cada pasta conta uma história completa de uma funcionalidade.
- **Escala de Time**: Desenvolvedores podem trabalhar em módulos diferentes sem conflitos.
- **Preparo para Microservices**: Se um dia o módulo `Coach` precisar de hardware dedicado (GPU), é fácil extraí-lo para um serviço separado pois já está isolado.
