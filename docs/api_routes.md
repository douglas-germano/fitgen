# FitGen API Routes Map

This document lists all available API endpoints in the FitGen backend, grouped by functional module.

## Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in a user |
| GET | `/api/auth/me` | Get current user's info |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/register` | Register a new user |

## Onboarding (`/api/onboarding`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboarding` | Save onboarding data |
| POST | `/api/onboarding/generate-workout` | Generate initial workout plan |
| GET | `/api/onboarding/status` | Get onboarding status |

## Workouts (`/api/workouts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts` | Get all workout plans |
| POST | `/api/workouts` | Create a workout plan |
| GET | `/api/workouts/<uuid:plan_id>` | Get workout details |
| PUT | `/api/workouts/<uuid:plan_id>/activate` | Activate a workout plan |

## Exercises (`/api/exercises`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/exercises/sessions/start` | Start a workout session |
| POST | `/api/exercises/sessions/<uuid:session_id>/log-set` | Log a set for an exercise |
| PUT | `/api/exercises/sessions/<uuid:session_id>/finish` | Finish a workout session |

## Nutrition (`/api/nutrition`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nutrition/analyze` | Analyze food image |
| POST | `/api/nutrition/estimate` | Estimate nutrition from text/params |
| GET | `/api/nutrition/daily` | Get daily nutrition summary |
| POST | `/api/nutrition/log` | Log a meal |
| DELETE | `/api/nutrition/log/<meal_id>` | Delete a logged meal |
| GET | `/api/nutrition/history` | Get nutrition history (via `nutrition_history`) |

## Diet (`/api/diet`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/diet/generate` | Generate diet plan |
| GET | `/api/diet/plan` | Get current diet plan |
| POST | `/api/diet/regenerate-day` | Regenerate a day's diet plan |
| POST | `/api/diet/onboarding` | Save diet preferences |

## Hydration (`/api/hydration`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hydration/daily` | Get daily hydration stats |
| POST | `/api/hydration/log` | Log water intake |
| POST | `/api/hydration/goal` | Set daily hydration goal |

## Metrics (`/api/metrics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/dashboard` | Get dashboard summary metrics |
| GET | `/api/metrics/history` | Get metrics history |
| POST | `/api/metrics/log` | Log new metrics |

## Gamification (`/api/gamification`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/achievements` | Get user achievements |
| GET | `/api/gamification/progress` | Get gamification progress (XP, level) |
| GET | `/api/gamification/streaks` | Get streak info |
| POST | `/api/gamification/debug/award-xp` | Debug: Award XP manually |

## Profile (`/api/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/me` | Get user profile |
| PUT | `/api/profile/me` | Update user profile |

## Progress (`/api/progress`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress/snapshots` | Get progress snapshots/photos |

## Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/` | Get user notifications |
| POST | `/api/notifications/<uuid:notification_id>/read` | Mark notification as read |

## Feedback (`/api/feedback`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback/` | Get user feedback |
| GET | `/api/feedback/<uuid:feedback_id>` | Get specific feedback |

## Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions/checkout` | Create Stripe checkout session |
| GET | `/api/subscriptions/status` | Get subscription status |
| POST | `/api/subscriptions/webhook` | Stripe webhook handler |

## Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/stats` | Get system stats |
| GET | `/api/admin/users/<uuid:user_id>` | Get user details |
| PUT | `/api/admin/users/<uuid:user_id>` | Update user |
| DELETE | `/api/admin/users/<uuid:user_id>` | Delete user |
| PUT | `/api/admin/users/<uuid:user_id>/activate` | Activate user |
| PUT | `/api/admin/users/<uuid:user_id>/suspend` | Suspend user |
| PUT | `/api/admin/users/<uuid:user_id>/role` | Update user role |
| POST | `/api/admin/promote-self` | Promote self (dev/debug) |

## System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/static/<path:filename>` | Static files |
