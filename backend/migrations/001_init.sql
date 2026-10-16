-- 001_init.sql — CareerCampus core schema (spec.md §6, verbatim).
-- PostgreSQL 16. uuid PKs via pgcrypto, timestamptz, snake_case.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('learner', 'admin');
CREATE TYPE task_type AS ENUM ('reading', 'video', 'quiz', 'project', 'practice');

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext UNIQUE NOT NULL,
  password_hash    text NOT NULL,
  display_name     varchar(60) NOT NULL,
  avatar_url       text,
  role             user_role NOT NULL DEFAULT 'learner',
  timezone         varchar(64) NOT NULL DEFAULT 'UTC',
  total_xp         integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak   integer NOT NULL DEFAULT 0,
  longest_streak   integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,         -- SHA-256 of the opaque token
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON refresh_tokens(user_id);

CREATE TABLE roadmaps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         varchar(80) UNIQUE NOT NULL,
  title        varchar(120) NOT NULL,
  summary      text NOT NULL,
  icon         varchar(40),                  -- lucide icon name or emoji
  difficulty   varchar(20) NOT NULL DEFAULT 'beginner',
  est_hours    integer,
  is_published boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  slug        varchar(80) NOT NULL,
  title       varchar(120) NOT NULL,
  description text NOT NULL DEFAULT '',
  pos_x       integer NOT NULL DEFAULT 0,    -- layout hint for the graph
  pos_y       integer NOT NULL DEFAULT 0,
  sort_order  integer NOT NULL DEFAULT 0,
  UNIQUE (roadmap_id, slug)
);

CREATE TABLE node_prerequisites (
  node_id          uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  prerequisite_id  uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, prerequisite_id),
  CHECK (node_id <> prerequisite_id)
);

CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type        task_type NOT NULL,
  title       varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  resource_url text,
  xp          integer NOT NULL CHECK (xp >= 0),
  is_required boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  quiz        jsonb                           -- only for type='quiz', see spec §6.1
);
CREATE INDEX ON tasks(node_id);

CREATE TABLE enrollments (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id  uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, roadmap_id)
);

CREATE TABLE task_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  score       numeric(4,3),                   -- quizzes: best score 0..1
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
CREATE INDEX ON task_completions(user_id, completed_at);

CREATE TABLE xp_events (                       -- immutable ledger
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      integer NOT NULL CHECK (amount > 0),
  source      varchar(30) NOT NULL,           -- task|node|roadmap|quest|badge
  source_id   uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON xp_events(user_id, created_at);
CREATE INDEX ON xp_events(created_at);         -- weekly leaderboard

CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(40) UNIQUE NOT NULL,
  name        varchar(80) NOT NULL,
  description text NOT NULL,
  icon        varchar(40),
  rule        jsonb NOT NULL
);

CREATE TABLE user_badges (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE daily_quests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_date  date NOT NULL,
  type        varchar(30) NOT NULL DEFAULT 'complete_tasks',
  target      integer NOT NULL,
  progress    integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  UNIQUE (user_id, quest_date, type)
);
