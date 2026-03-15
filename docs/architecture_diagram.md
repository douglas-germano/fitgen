# Arquitetura Modular Monolith (DDD) - FitGen

Este diagrama ilustra a organização dos Bounded Contexts (Módulos) e as principais Entidades do sistema após a refatoração.

```mermaid
classDiagram
    direction TB

    %% Contexto: Identity
    namespace Identity {
        class User {
            +UUID id
            +String email
            +String role
            +Boolean is_active
        }
        class UserProfile {
            +UUID user_id
            +Float current_weight_kg
            +Integer xp
            +Integer level
        }
        class Subscription {
            +String status
            +String stripe_id
        }
    }

    %% Contexto: Training
    namespace Training {
        class WorkoutPlan {
            +UUID user_id
            +Date start_date
            +Date end_date
        }
        class WorkoutDay {
            +String day_of_week
            +String focus_group
        }
        class Exercise {
            +String name
            +Integer sets
            +Integer reps
        }
        class ExerciseLibrary {
            +String name
            +String muscle_groups
            +String video_url
        }
    }

    %% Contexto: Nutrition
    namespace Nutrition {
        class DietPlan {
            +UUID user_id
            +JSON weekly_menu
            +JSON macro_targets
        }
        class Meal {
            +String name
            +Float calories
            +Float protein
        }
        class HydrationLog {
            +Float amount_ml
            +DateTime timestamp
        }
    }

    %% Contexto: Analytics
    namespace Analytics {
        class BodyMetric {
            +Float weight_kg
            +Float body_fat_percentage
            +Float muscle_mass_kg
        }
        class Goal {
            +String type
            +Float target_value
            +Float current_value
        }
    }

    %% Contexto: Gamification
    namespace Gamification {
        class Achievement {
            +String name
            +String criteria
            +Integer xp_reward
        }
        class UserStreak {
            +Integer current_workout_streak
            +Integer current_nutrition_streak
        }
    }

    %% Contexto: Coach
    namespace Coach {
        class ChatMessage {
            +String role
            +String content
            +JSON function_call
        }
    }

    %% Relationships
    User "1" -- "1" UserProfile : possui
    User "1" -- "1" Subscription : assina
    User "1" -- "1" WorkoutPlan : segue
    WorkoutPlan "1" *-- "many" WorkoutDay : contem
    WorkoutDay "1" *-- "many" Exercise : lista
    Exercise --> ExerciseLibrary : baseia-se em
    
    User "1" -- "1" DietPlan : possui
    User "1" -- "many" Meal : registra
    User "1" -- "many" HydrationLog : registra
    
    User "1" -- "many" BodyMetric : monitora
    User "1" -- "many" Goal : define
    
    User "1" -- "1" UserStreak : mantem
    User "many" -- "many" Achievement : desbloqueia
    
    User "1" -- "many" ChatMessage : conversa
```

## Fluxo de Dependência

- **Núcleo (Core)**: `Training`, `Nutrition` e `Identity` são os pilares.
- **Suporte**: `Gamification` e `Analytics` observam os dados do núcleo para gerar valor (XP, Gráficos).
- **Interface**: `Coach` atua como uma interface conversacional que interage com todos os módulos via function calling.
