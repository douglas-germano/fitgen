/**
 * Shapes returned by the FitGen Flask API, as consumed by the web frontend.
 * Fields are optional where the backend is known to omit them.
 */

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  onboarding_completed?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user' | string;
  profile_picture?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | string | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  target_weight_kg?: number | null;
  fitness_goal?: string | null;
  activity_level?: string | null;
  experience_level?: string | null;
  level?: number;
  xp?: number;
  subscription_status?: string;
  /** False only in hard-gate mode, when the whole app is locked (freemium keeps it true). */
  has_access?: boolean;
  /** Premium (paid or trial running). Free users can log everything but not use the AI features. */
  is_premium?: boolean;
  plan?: 'free' | 'premium';
  freemium?: boolean;
  /** AI features locked for this user: coach, diet_plan, meal_estimate, workout_plan. */
  premium_features?: string[];
  /** Where Premium is billed: the site (Stripe), the App Store or Google Play. */
  subscription_source?: 'web' | 'app_store' | 'play_store' | null;
  subscription_required?: boolean;
  subscription_expires_at?: string | null;
  onboarding_completed?: boolean;
  onboarding_answers?: Record<string, string | string[]>;
  available_days?: string[];
  workout_duration_minutes?: number;
  equipment_available?: string[];
  injuries_limitations?: string | null;
  dietary_restrictions?: string | null;
  bmr?: number;
  tdee?: number;
}

export interface DashboardMetrics {
  consistency?: { workouts_last_7_days?: number; current_streak?: number };
  nutrition?: { calories?: number; goal?: number };
  hydration?: { consumed_ml?: number; goal_ml?: number };
  weight?: { current?: number | null; target?: number | null };
  workout_volume?: { volume_kg: number; change_percentage: number } | null;
  achievements?: { id?: string; name: string; description?: string; unlocked_at?: string }[];
  level?: number;
  xp?: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds?: number;
  notes?: string;
  muscle_group?: string;
  video_url?: string;
  animation_url?: string | null;
  /** Set when the exercise comes from the FitGen library. */
  exercise_library_id?: string | null;
}

/** An entry of the FitGen exercise library (GET /exercises/library). */
export interface LibraryExercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'plyometric';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  /** Keys; the first one is the primary muscle. */
  muscle_groups: string[];
  equipment_needed: string[];
  description?: string | null;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  video_url?: string | null;
  thumbnail_url?: string | null;
  animation_url?: string | null;
}

export interface LibraryExerciseHistory {
  sessions: {
    id: string;
    started_at: string;
    sets: { id: string; set_number: number; reps: number; weight_kg: number | null }[];
  }[];
  has_more: boolean;
}

export interface WorkoutDay {
  id: string;
  name?: string;
  day_of_week: string;
  focus?: string;
  muscle_groups?: string[];
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  difficulty?: string;
  is_active: boolean;
  created_at?: string | null;
  days?: WorkoutDay[];
}

export interface ExerciseSessionSummary {
  source?: string;
  from_health?: boolean;
  id: string;
  started_at: string;
  duration_seconds: number;
  workout_name: string;
  calories?: number;
}

/** In-progress workout session, as returned by `GET /exercises/sessions/active`. */
export interface ActiveWorkoutSession {
  session_id: string;
  workout_day_id: string;
  plan_id: string;
  started_at: string;
  elapsed_seconds: number;
  logs: { exercise_id: string; set_number: number; weight_used_kg: number; reps_done: number }[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LoggedMeal {
  id: string;
  name: string;
  meal_type: MealType | string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at?: string | null;
}

export interface DailyNutrition {
  totals?: { calories?: number; protein?: number; carbs?: number; fats?: number };
  meals?: LoggedMeal[];
}

export interface MealEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion_size?: string;
}

export interface PlannedMeal {
  nome: string;
  calorias: number;
  ingredientes?: string[];
  preparo?: string;
}

export type PlannedDay = Partial<Record<'cafe' | 'lanche_manha' | 'pre_treino' | 'almoco' | 'lanche' | 'pos_treino' | 'jantar' | 'ceia', PlannedMeal>>;

export interface ShoppingItem {
  item: string;
  quantidade: string;
  preco_aprox?: number;
  checked?: boolean;
}

export interface DietPlan {
  id: string;
  weekly_plan?: Record<string, PlannedDay>;
  shopping_list?: ShoppingItem[];
  macro_targets?: { protein: number; carbs: number; fats: number };
  calories?: number;
}

export interface HydrationDaily {
  date: string;
  total_intake_ml: number;
  daily_goal_ml: number;
  percentage: number;
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link_type?: string | null;
  link_id?: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
  xp_reward?: number;
}

export interface GamificationProgress {
  xp: number;
  level: number;
  next_level_xp: number;
  progress_percent: number;
}

export interface Streaks {
  workout_streak: number;
  nutrition_streak: number;
  hydration_streak: number;
}

// ---------- Community ----------

export interface CommunityUser {
  id: string;
  name: string;
  profile_picture: string | null;
  level: number;
}

export type ReactionKind = 'fire' | 'clap' | 'muscle' | 'heart';
export type ActivityType = 'workout_completed' | 'streak' | 'achievement' | 'hydration_goal' | 'challenge_completed' | 'post' | 'group_joined';
export type ImageRatio = '4:5' | '9:16';
export type Audience = 'network' | 'group' | 'public';

export interface CommunityActivity {
  id: string;
  type: ActivityType | string;
  audience: Audience;
  group: { id: string; name: string | null } | null;
  user: CommunityUser;
  payload: Record<string, unknown>;
  text: string | null;
  image: string | null;
  created_at: string;
  reactions: Partial<Record<ReactionKind, number>>;
  reaction_total: number;
  my_reaction: ReactionKind | null;
  comment_count: number;
  is_mine: boolean;
}

export interface FeedPage {
  items: CommunityActivity[];
  next_cursor: string | null;
}

export interface CommunityComment {
  id: string;
  text: string;
  created_at: string;
  user: CommunityUser;
  is_mine: boolean;
}

export interface CommunityGroup {
  is_public: boolean;
  profile_picture?: string | null;
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  my_role: 'admin' | 'member' | null;
  invite_code?: string;
  created_at: string;
  my_rank?: number | null;
  week_workouts?: number;
}

export interface GroupPreview extends CommunityGroup {
  is_member: boolean;
  is_full: boolean;
}

export interface GroupMemberStats {
  user: CommunityUser;
  role: 'admin' | 'member';
  rank: number;
  workouts: number;
  minutes: number;
  active_days: number;
  last_workout_at: string | null;
  inactive: boolean;
  is_me: boolean;
  blocked: boolean;
}

export interface GroupDetail extends CommunityGroup {
  members: GroupMemberStats[];
  week: { start: string; end: string } | null;
  challenges: Challenge[];
}

export type ChallengeMetric = 'workouts' | 'active_days' | 'workout_minutes' | 'hydration_days' | 'meals';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: ChallengeMetric;
  metric_label: string;
  target: number;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'ended';
  is_public: boolean;
  group: { id: string; name: string | null } | null;
  participant_count: number;
  joined: boolean;
  my_progress: number | null;
  completed: boolean;
  completed_at: string | null;
}

export interface ChallengeDetail extends Challenge {
  can_delete: boolean;
  leaderboard: { rank: number; user: CommunityUser; progress: number; completed: boolean; is_me: boolean }[];
}

export type FriendshipState = 'none' | 'friends' | 'sent' | 'received' | 'self';

export interface FriendCard {
  id: string;
  user: CommunityUser;
  created_at: string;
}

export interface FriendsList {
  friends: FriendCard[];
  received: FriendCard[];
  sent: FriendCard[];
}

export interface CommunityProfile extends CommunityUser {
  stats: { month_workouts?: number; month_minutes?: number; workout_streak?: number };
  friend_count: number;
  /** Added later: older servers omit these. */
  follower_count?: number;
  follows_me?: boolean;
  shared_group_list?: { id: string; name: string }[];
  following: boolean;
  follow_state: 'none' | 'pending' | 'accepted' | 'self';
  follow_request_id: string | null;
  incoming_request_id: string | null;
  shared_groups: number;
  friendship: FriendshipState;
  friendship_id: string | null;
  blocked_by_me: boolean;
}

export interface UserSearchResult extends CommunityUser {
  follow_state: 'none' | 'pending' | 'accepted' | 'self';
  friendship: FriendshipState;
}

export interface CommunitySettings {
  share_workouts: boolean;
  share_achievements: boolean;
  share_streaks: boolean;
  share_challenges: boolean;
  share_hydration: boolean;
  discoverable: boolean;
}
