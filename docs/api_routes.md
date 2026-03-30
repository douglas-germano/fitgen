# FitGen API Routes Map

Este documento lista todos os endpoints disponíveis na API do FitGen, agrupados por módulo funcional.

## Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Autenticar e obter JWT |
| POST | `/api/auth/refresh` | Renovar access token |
| GET | `/api/auth/me` | Dados do usuário atual |
| POST | `/api/auth/forgot-password` | Solicitar token de reset |
| POST | `/api/auth/reset-password` | Resetar senha com token |
| POST | `/api/auth/change-password` | Alterar senha existente |

## Onboarding (`/api/onboarding`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboarding` | Salvar dados do onboarding |
| POST | `/api/onboarding/generate-workout` | Gerar plano de treino inicial via IA |
| GET | `/api/onboarding/status` | Verificar status do onboarding |

## Workouts (`/api/workouts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts` | Listar planos de treino |
| POST | `/api/workouts` | Criar plano de treino |
| GET | `/api/workouts/<uuid:plan_id>` | Detalhes do plano (dias + exercícios) |
| PUT | `/api/workouts/<uuid:plan_id>/activate` | Ativar plano de treino |

## Exercises (`/api/exercises`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/exercises/sessions/start` | Iniciar sessão de treino |
| POST | `/api/exercises/sessions/<uuid:session_id>/log-set` | Registrar série de exercício |
| PUT | `/api/exercises/sessions/<uuid:session_id>/finish` | Finalizar sessão de treino |

## Nutrition (`/api/nutrition`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nutrition/analyze` | Analisar imagem de alimento (IA vision) |
| POST | `/api/nutrition/estimate` | Estimar macros a partir de texto/params |
| GET | `/api/nutrition/daily` | Resumo nutricional diário |
| POST | `/api/nutrition/log` | Registrar refeição |
| DELETE | `/api/nutrition/log/<meal_id>` | Excluir refeição registrada |
| GET | `/api/nutrition/history` | Histórico nutricional (timeline) |

## Diet (`/api/diet`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/diet/generate` | Gerar plano de dieta (12 semanas) |
| GET | `/api/diet/plan` | Obter plano atual |
| POST | `/api/diet/regenerate-day` | Regenerar refeições de um dia |
| POST | `/api/diet/onboarding` | Salvar preferências alimentares |

## Hydration (`/api/hydration`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hydration/daily` | Estatísticas diárias de hidratação |
| POST | `/api/hydration/log` | Registrar ingestão de água |
| POST | `/api/hydration/goal` | Definir meta diária (ml) |

## Metrics (`/api/metrics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/dashboard` | Métricas resumidas do dashboard |
| GET | `/api/metrics/history` | Histórico de métricas |
| POST | `/api/metrics/log` | Registrar métricas (peso, % gordura, massa muscular) |

## Gamification (`/api/gamification`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/achievements` | Listar conquistas |
| GET | `/api/gamification/progress` | Progresso (XP, nível, próximo nível) |
| GET | `/api/gamification/streaks` | Streaks (treino, nutrição, hidratação) |
| POST | `/api/gamification/debug/award-xp` | Conceder XP manualmente (debug) |

## Coach Virtual (`/api/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Enviar mensagem ao coach (Gemini + function calling) |
| GET | `/api/chat/history` | Histórico de conversas |
| DELETE | `/api/chat/clear` | Limpar histórico |

## Profile (`/api/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/me` | Obter perfil do usuário |
| PUT | `/api/profile/me` | Atualizar perfil |

## Progress (`/api/progress`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress/snapshots` | Fotos de progresso (antes/depois) |

## Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/` | Listar notificações |
| POST | `/api/notifications/<uuid:notification_id>/read` | Marcar como lida |

## Feedback (`/api/feedback`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback/` | Listar feedbacks do usuário |
| GET | `/api/feedback/<uuid:feedback_id>` | Obter feedback específico |

## Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions/checkout` | Criar sessão de checkout Stripe |
| GET | `/api/subscriptions/status` | Status da assinatura |
| POST | `/api/subscriptions/webhook` | Webhook do Stripe |

## WhatsApp (`/api/whatsapp`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whatsapp/webhook` | Webhook da Evolution API (WhatsApp) |

## Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Listar todos os usuários |
| GET | `/api/admin/stats` | Estatísticas do sistema |
| GET | `/api/admin/users/<uuid:user_id>` | Detalhes do usuário |
| PUT | `/api/admin/users/<uuid:user_id>` | Atualizar usuário |
| DELETE | `/api/admin/users/<uuid:user_id>` | Excluir usuário |
| PUT | `/api/admin/users/<uuid:user_id>/activate` | Reativar usuário |
| PUT | `/api/admin/users/<uuid:user_id>/suspend` | Suspender usuário |
| PUT | `/api/admin/users/<uuid:user_id>/role` | Alterar role do usuário |
| POST | `/api/admin/promote-self` | Promover a admin (dev only) |

## System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB status) |
| GET | `/apidocs` | Swagger UI (Flasgger) |
| GET | `/static/<path:filename>` | Arquivos estáticos |
