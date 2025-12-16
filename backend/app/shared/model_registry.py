# Centrally register all models to ensure SQLAlchemy relationships work
# This file must be imported in app/__init__.py

# Identity
from app.modules.identity.domain.models import User, UserProfile
from app.modules.identity.domain.subscription import Subscription

# Training
from app.modules.training.domain.models import WorkoutPlan, WorkoutDay, Exercise, WorkoutSession, ExerciseLog
from app.modules.training.domain.exercise_library import ExerciseLibrary

# Nutrition
from app.modules.nutrition.domain.models import Meal
from app.modules.nutrition.domain.diet import DietPreference, DietPlan
from app.modules.nutrition.domain.hydration import HydrationLog, HydrationGoal

# Analytics
from app.modules.analytics.domain.body_metrics import BodyMetric
from app.modules.analytics.domain.goals import Goal
from app.modules.analytics.domain.progress_snapshot import ProgressSnapshot

# Gamification
from app.modules.gamification.domain.achievements import Achievement, UserAchievement
from app.modules.gamification.domain.user_streak import UserStreak

# Communication
from app.modules.communication.domain.notification import Notification
from app.modules.communication.domain.feedback import Feedback
from app.modules.communication.domain.device_token import DeviceToken

# Coach
from app.modules.coach.domain.chat_message import ChatMessage
