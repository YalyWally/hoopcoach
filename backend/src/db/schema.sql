-- HoopCoach schema

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  height_in REAL,
  weight_lb REAL,
  sex TEXT,
  position TEXT,
  experience_level TEXT,
  current_level TEXT,
  activity_level TEXT,
  goals_json TEXT DEFAULT '[]',
  schedule_json TEXT DEFAULT '{}',
  equipment_json TEXT DEFAULT '[]',
  food_prefs_json TEXT DEFAULT '{}',
  dietary_restrictions_json TEXT DEFAULT '[]',
  deadline_goal_json TEXT DEFAULT 'null',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_count INTEGER DEFAULT 0,
  last_active_date TEXT,
  onboarding_complete INTEGER DEFAULT 0,
  notification_prefs_json TEXT DEFAULT '{"workoutReminders":true,"mealReminders":true,"assessmentReminders":true,"milestones":true,"recoveryReminders":true}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL, -- initial | retest
  taken_at TEXT DEFAULT (datetime('now')),
  results_json TEXT NOT NULL, -- raw test results
  ratings_json TEXT NOT NULL, -- computed sub-ratings
  ovr INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS training_blocks (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phase TEXT NOT NULL, -- foundation | development | performance | deload
  block_index INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  weeks INTEGER NOT NULL,
  focus_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active', -- active | completed | superseded
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  block_id TEXT,
  scheduled_date TEXT NOT NULL,
  day_type TEXT NOT NULL, -- skills | gym | field | recovery | testing | game
  title TEXT NOT NULL,
  objective TEXT,
  est_duration_min INTEGER,
  equipment_json TEXT DEFAULT '[]',
  warmup_json TEXT DEFAULT '[]',
  main_json TEXT DEFAULT '[]',
  cooldown_json TEXT DEFAULT '[]',
  performance_targets_json TEXT DEFAULT '[]',
  difficulty TEXT DEFAULT 'moderate',
  status TEXT DEFAULT 'scheduled', -- scheduled | completed | skipped | modified
  created_by TEXT DEFAULT 'system', -- system | ai
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  completed_at TEXT DEFAULT (datetime('now')),
  difficulty_rating INTEGER,
  energy_level INTEGER,
  soreness_level INTEGER,
  pain_flag INTEGER DEFAULT 0,
  overall_rating INTEGER,
  notes TEXT,
  drill_results_json TEXT DEFAULT '[]',
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  workout_id TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL, -- no | sore | injured
  location TEXT,
  severity INTEGER,
  worsens_with_movement INTEGER,
  affected_previous INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS nutrition_targets (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  fiber_g INTEGER,
  sugar_g INTEGER,
  sodium_mg INTEGER,
  sat_fat_g INTEGER,
  cholesterol_mg INTEGER,
  calcium_mg INTEGER,
  iron_mg INTEGER,
  potassium_mg INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS meal_plan_days (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  date TEXT NOT NULL,
  breakfast_json TEXT DEFAULT 'null',
  lunch_json TEXT DEFAULT 'null',
  snack_json TEXT DEFAULT 'null',
  dinner_json TEXT DEFAULT 'null',
  training_context TEXT,
  UNIQUE(player_id, date),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  logged_at TEXT DEFAULT (datetime('now')),
  meal_type TEXT,
  description TEXT NOT NULL,
  source TEXT DEFAULT 'manual', -- manual | ai_estimate | plan
  is_estimate INTEGER DEFAULT 0,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fiber_g REAL,
  sugar_g REAL,
  sodium_mg REAL,
  raw_json TEXT DEFAULT '{}',
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  tool_calls_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS ai_change_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  change_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  source TEXT DEFAULT 'chat', -- chat | fix_my_plan | auto_adapt
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS external_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  uid TEXT,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  all_day INTEGER DEFAULT 1,
  source TEXT DEFAULT 'ics_import',
  imported_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  sent_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  badge_key TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  earned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_workouts_player_date ON workouts(player_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_assessments_player ON assessments(player_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_player_date ON nutrition_logs(player_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_chat_player ON chat_messages(player_id, created_at);
