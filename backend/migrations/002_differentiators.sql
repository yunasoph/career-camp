-- 002_differentiators.sql — schema deltas for spec §17 (verbatim §17.7).
-- Phase 2 only needs roadmaps.theme + nodes.landmark, but the full delta lands
-- now so later phases (test-out, submissions, skills, passport, goals) are not
-- blocked and this migration never runs twice.
--
-- Roadmap regions (§9A.7): roadmaps.theme = {"tint": "<token>", "landmarks": [...]}.

ALTER TABLE roadmaps ADD COLUMN theme jsonb NOT NULL DEFAULT '{}';       -- palette tint, landmark set
ALTER TABLE nodes    ADD COLUMN landmark varchar(30) NOT NULL DEFAULT 'library';
ALTER TABLE nodes    ADD COLUMN test_out_quiz jsonb;
ALTER TABLE tasks    ADD COLUMN est_minutes integer NOT NULL DEFAULT 15;
ALTER TABLE task_completions ADD COLUMN source varchar(20) NOT NULL DEFAULT 'manual';
ALTER TABLE users    ADD COLUMN handle varchar(30) UNIQUE;
ALTER TABLE users    ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE TABLE user_goals (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  hours_per_week numeric(4,1) NOT NULL CHECK (hours_per_week > 0),
  target_date date,
  PRIMARY KEY (user_id, roadmap_id)
);

CREATE TABLE project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url text NOT NULL,
  reflection text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(60) UNIQUE NOT NULL,
  name varchar(80) NOT NULL
);

CREATE TABLE node_skills (
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, skill_id)
);

CREATE TABLE node_reviews (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  last_reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);