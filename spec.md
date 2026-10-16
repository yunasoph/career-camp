# CareerCampus — Build Specification

> **Audience:** an AI coding agent. Follow this document literally. Where something is ambiguous, choose the simplest option that satisfies the acceptance criteria, and record the decision in `docs/DECISIONS.md`.

---

## 1. Product Overview

**CareerCampus** is a gamified career-roadmap web app. Learners pick a career path (e.g. "Frontend Developer", "Data Analyst"), see it as an interactive **skill tree** of topics, complete tasks inside each topic, and earn **XP, levels, streaks and badges**. Progress unlocks further nodes in the tree.

### Goals
- Make long career roadmaps feel like a game: clear next step, visible progress, small frequent rewards.
- Provide a clean admin/content workflow so roadmaps can be authored without code changes.

### Non-goals (MVP)
- No payments, no social feed, no real-time chat, no native mobile apps, no AI-generated content.
- No email-based notifications beyond password reset (optional).

### Personas
| Persona | Needs |
|---|---|
| **Learner** | Browse roadmaps, enroll, complete tasks, track XP/streak, see leaderboard |
| **Admin** | Create/edit roadmaps, nodes, prerequisites, tasks, badges; view basic stats |

---

## 2. Tech Stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Zustand, Tailwind CSS, `@xyflow/react` (React Flow) for the skill tree, Framer Motion for animations, Zod + React Hook Form for forms |
| Backend | PHP 8.3, Slim Framework 4, PHP-DI, PDO (pgsql), `firebase/php-jwt`, `vlucas/phpdotenv`, `respect/validation` (or `symfony/validator`), Monolog |
| Database | PostgreSQL 16 |
| Migrations | Plain versioned `.sql` files run by a small PHP CLI runner (`bin/migrate.php`) |
| Testing | Frontend: Vitest + React Testing Library + Playwright (smoke). Backend: PHPUnit 11 |
| Tooling | Docker Compose (php-fpm, nginx, postgres, node for dev), ESLint + Prettier, PHP-CS-Fixer + PHPStan (level 6) |

---

## 3. Repository Layout

```
careercampus/
├── docker-compose.yml
├── .env.example
├── README.md
├── spec.md
├── docs/
│   └── DECISIONS.md
├── backend/
│   ├── composer.json
│   ├── bin/migrate.php
│   ├── bin/seed.php
│   ├── public/index.php
│   ├── migrations/            # 001_init.sql, 002_...
│   ├── seeds/                 # roadmaps/*.json, badges.json
│   ├── src/
│   │   ├── Config/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Middleware/    # Auth, Admin, Cors, RateLimit, JsonBody, ErrorHandler
│   │   │   └── Requests/      # validation classes
│   │   ├── Domain/
│   │   │   ├── Gamification/  # XpCalculator, LevelCalculator, StreakService, BadgeEngine
│   │   │   ├── Progress/      # ProgressService, NodeStateResolver
│   │   │   └── ...
│   │   ├── Repositories/      # PDO-backed, one per aggregate
│   │   └── Support/           # Clock, Uuid, Response helpers
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api/               # typed fetch client + query hooks
        ├── components/        # ui/, roadmap/, gamification/
        ├── features/          # auth/, roadmaps/, progress/, leaderboard/, admin/
        ├── pages/
        ├── store/
        ├── routes.tsx
        └── main.tsx
```

---

## 4. Core Domain Concepts

- **Roadmap** — a career path. Contains **Nodes**.
- **Node** — a topic on the skill tree (e.g. "HTML Basics"). Has **prerequisites** (other nodes in the same roadmap; forms a DAG). Contains **Tasks**.
- **Task** — an atomic unit of work. Types: `reading`, `video`, `quiz`, `project`, `practice`.
- **Enrollment** — a user following a roadmap.
- **XP** — points earned from completing tasks, nodes, roadmaps, and quests. Immutable ledger (`xp_events`).
- **Level** — derived from total XP.
- **Streak** — consecutive days with ≥1 task completion.
- **Badge** — achievement awarded by rule.
- **Daily Quest** — simple daily goal (e.g. "Complete 2 tasks today") giving bonus XP.

### Node state (computed per user, never stored)
| State | Rule |
|---|---|
| `locked` | At least one prerequisite node is not `completed` |
| `available` | All prerequisites completed; no required task completed yet |
| `in_progress` | ≥1 task completed, but not all required tasks |
| `completed` | All required tasks completed |

A user may only complete tasks of nodes that are not `locked` (server enforced → `409`).

---

## 5. Gamification Rules (authoritative)

### 5.1 XP per task
Each task has an `xp` value set by content authors. Defaults by type if unspecified:

| Type | Default XP |
|---|---|
| reading | 10 |
| video | 15 |
| practice | 20 |
| quiz | 20 (+ up to 10 bonus: `round(10 * score)` where `score` ∈ [0,1], only if score ≥ 0.6 to pass) |
| project | 50 |

### 5.2 Bonuses
- **Node completion:** +25 XP
- **Roadmap completion:** +200 XP
- **Daily quest completion:** +20 XP
- **Streak multiplier** (applied to *task* XP only, not bonuses): streak ≥ 3 days → ×1.1, ≥ 7 → ×1.25, ≥ 30 → ×1.5. Round down.

### 5.3 Levels
```
xp_required_for_level(n) = 50 * (n - 1)^2
level(total_xp) = floor(sqrt(total_xp / 50)) + 1
```
Level 1 = 0 XP, Level 2 = 50, Level 3 = 200, Level 4 = 450 …
Titles (display only): 1–4 "Freshman", 5–9 "Sophomore", 10–19 "Junior", 20–34 "Senior", 35+ "Graduate".

### 5.4 Streaks
- A **day** is calculated in the user's `timezone` (IANA string stored on user, default `UTC`).
- Completing ≥1 task on a day marks that day active.
- If last active day == yesterday → `current_streak += 1`; if == today → unchanged; otherwise reset to 1.
- Track `longest_streak`.
- Streak-freeze is **out of scope** for MVP.

### 5.5 Badges (seeded; evaluated after every XP-granting action)
| Code | Name | Rule |
|---|---|---|
| `first_step` | First Step | Complete 1 task |
| `node_master` | Node Master | Complete 1 node |
| `streak_3` / `streak_7` / `streak_30` | On Fire | Reach that streak |
| `xp_500` / `xp_2000` / `xp_10000` | XP Hunter | Reach total XP |
| `quiz_ace` | Quiz Ace | Score 100% on 3 quizzes |
| `roadmap_complete` | Pathfinder | Complete a roadmap |
| `level_5` / `level_10` | Rising Star | Reach level |

Badge rules are defined as JSON in `badges.rule` (`{ "type": "streak", "value": 7 }`) and evaluated by `BadgeEngine` with a registry of rule handlers. Awarding is idempotent (unique `(user_id, badge_id)`).

### 5.6 Daily quests
Each day, lazily generate one quest per user on first request: `complete_tasks` with target = 2. Progress increments on task completion. Completing grants +20 XP once.

### 5.7 Anti-abuse
- A task can be completed **once per user** (unique constraint; endpoint is idempotent and returns the existing completion with `xp_awarded: 0`).
- Quiz tasks can be retried; only the **best** score counts and XP is only granted on first pass (bonus XP granted once, on first pass).
- All XP-granting operations run in a **single DB transaction**.

---

## 6. Database Schema (PostgreSQL 16)

Create in `migrations/001_init.sql`. Use `uuid` primary keys (`gen_random_uuid()` via `pgcrypto`), `timestamptz`, and snake_case.

```sql
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
  quiz        jsonb                           -- only for type='quiz', see §6.1
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
```

### 6.1 Quiz JSON shape (`tasks.quiz`)
```json
{
  "questions": [
    {
      "id": "q1",
      "prompt": "What does HTML stand for?",
      "options": ["HyperText Markup Language", "High Tech ML", "Home Tool ML"],
      "correct_index": 0,
      "explanation": "…"
    }
  ]
}
```
**Never** send `correct_index` or `explanation` to the client before submission. Grading happens server-side.

---

## 7. REST API

Base path `/api/v1`. JSON only. Dates ISO-8601 UTC. Errors use a uniform envelope:

```json
{ "error": { "code": "validation_failed", "message": "…", "details": { "email": ["Invalid"] } } }
```
Status codes: `200/201/204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

### Auth
Access token: JWT (HS256, 15 min) sent as `Authorization: Bearer`. Refresh token: opaque random 256-bit, stored hashed, in an **httpOnly, Secure, SameSite=Lax** cookie (30 days, rotated on every refresh; reuse of a revoked token revokes all the user's tokens).

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `{email, password, display_name}` → user + access token. Password ≥ 10 chars. Argon2id hashing |
| POST | `/auth/login` | → user + access token, sets refresh cookie |
| POST | `/auth/refresh` | cookie → new access token, rotates cookie |
| POST | `/auth/logout` | revokes refresh token |
| GET | `/me` | profile + `total_xp`, `level`, `xp_to_next`, streak |
| PATCH | `/me` | `display_name`, `avatar_url`, `timezone` |

### Roadmaps & progress (learner)
| Method | Path | Notes |
|---|---|---|
| GET | `/roadmaps` | Published list with `node_count`, `task_count`; if authed, include `enrolled` and `percent_complete` |
| GET | `/roadmaps/{slug}` | Roadmap + nodes + edges (`prerequisites`). If authed, each node has `state` and `completed_tasks/total_tasks` |
| POST | `/roadmaps/{slug}/enroll` | Idempotent. 201/200 |
| DELETE | `/roadmaps/{slug}/enroll` | Unenroll (progress retained) |
| GET | `/me/enrollments` | Enrolled roadmaps with progress and "next recommended node" |
| GET | `/nodes/{id}` | Node detail + tasks with per-task `completed` flag (quiz questions without answers) |
| POST | `/tasks/{id}/complete` | For non-quiz tasks. Body empty. Returns `CompletionResult` |
| POST | `/tasks/{id}/submit-quiz` | `{answers: {q1: 0, q2: 2}}` → `{score, passed, per_question:[{id,correct,explanation?}], completion?: CompletionResult}` |

**`CompletionResult`** (drives all celebration UI):
```json
{
  "xp_awarded": 33,
  "breakdown": [
    {"label": "Task", "xp": 20},
    {"label": "Streak ×1.1", "xp": 2},
    {"label": "Node completed", "xp": 25}
  ],
  "total_xp": 480,
  "level": {"before": 3, "after": 4, "leveled_up": true},
  "streak": {"current": 4, "longest": 4},
  "node": {"id": "…", "state": "completed", "unlocked_node_ids": ["…"]},
  "roadmap_completed": false,
  "quest": {"progress": 2, "target": 2, "completed": true},
  "new_badges": [{"code": "first_step", "name": "First Step", "icon": "…"}]
}
```
(Breakdown items must sum to `xp_awarded`.)

### Gamification
| Method | Path | Notes |
|---|---|---|
| GET | `/me/badges` | All badges with `earned`/`awarded_at` |
| GET | `/me/quests/today` | Lazily creates today's quest |
| GET | `/me/activity?days=90` | `[{date, tasks_completed, xp}]` for heatmap |
| GET | `/leaderboard?period=weekly\|all` | Top 50 + the caller's rank. Weekly = sum of `xp_events` since Monday 00:00 UTC. Expose only `display_name`, `avatar_url`, `level`, `xp` |

### Admin (`role = admin`)
CRUD under `/admin`:
- `/admin/roadmaps` (GET, POST), `/admin/roadmaps/{id}` (GET, PUT, DELETE), `POST /admin/roadmaps/{id}/publish|unpublish`
- `/admin/roadmaps/{id}/nodes` (POST), `/admin/nodes/{id}` (PUT, DELETE)
- `PUT /admin/nodes/{id}/prerequisites` — body `{prerequisite_ids: []}`; **reject cycles** with 422 (DFS check) and cross-roadmap links.
- `/admin/nodes/{id}/tasks` (POST), `/admin/tasks/{id}` (PUT, DELETE)
- `/admin/badges` (GET, POST, PUT)
- `GET /admin/stats` — user count, enrollments, completions per day (last 30 days)

### Cross-cutting
- Rate limit: auth endpoints 10 req/min/IP; others 120 req/min/user (simple Postgres- or file-based limiter is fine).
- CORS: allow only `FRONTEND_ORIGIN` from env, with credentials.
- Security headers via nginx (`X-Content-Type-Options`, `Referrer-Policy`, CSP for the SPA).
- All SQL uses **prepared statements**. No string-interpolated queries.

---

## 8. Backend Implementation Notes

1. **Layering:** Controller → Service (domain logic) → Repository (PDO). Controllers contain no SQL or business rules.
2. **`ProgressService::completeTask(userId, taskId, ?score)`** — the single entry point for XP. Steps, inside one transaction with `SELECT … FOR UPDATE` on the user row:
   1. Load task + node; verify user is enrolled and node state ≠ `locked`.
   2. Insert completion (`ON CONFLICT DO NOTHING`); if no row inserted → return idempotent result with 0 XP.
   3. Update streak (`StreakService`).
   4. Compute XP (`XpCalculator`), write `xp_events`, update `users.total_xp`.
   5. Re-evaluate node state; if newly completed → +25 XP event, compute newly unlocked nodes.
   6. If all nodes in roadmap completed → +200 XP, set `enrollments.completed_at`.
   7. Update daily quest; grant quest XP if newly completed.
   8. Run `BadgeEngine`; insert new `user_badges`.
   9. Commit, return `CompletionResult`.
3. **`NodeStateResolver`** computes states for all nodes of a roadmap in **O(nodes + edges)** using 2–3 queries (nodes, edges, completions grouped by node), not N+1.
4. Inject a `Clock` interface so streak/quest logic is testable.
5. Config from `.env`: `DB_*`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `APP_ENV`. Never commit secrets.
6. Error handler maps domain exceptions to the error envelope; never leak stack traces in production.

---

## 9. Frontend Specification

### 9.1 Routes
| Path | Page | Access |
|---|---|---|
| `/` | Landing (hero, how it works, featured roadmaps) | public |
| `/roadmaps` | Roadmap catalog with search + difficulty filter | public |
| `/roadmaps/:slug` | **Skill tree** view | public (read-only) / auth (progress) |
| `/roadmaps/:slug/nodes/:nodeId` | Node detail (can also be a side drawer from tree) | auth |
| `/dashboard` | Dashboard | auth |
| `/leaderboard` | Leaderboard | auth |
| `/profile` | Profile, badges, settings | auth |
| `/login`, `/register` | Auth forms | guest only |
| `/admin/*` | Roadmap/node/task/badge editors | admin |
| `*` | 404 | — |

### 9.2 Key screens

**Skill tree (`RoadmapPage`)** — the centerpiece.
- React Flow canvas, nodes positioned by `pos_x/pos_y`, edges = prerequisites; pan/zoom, mini-map, fit-to-view button.
- Custom node component showing icon, title, `x/y tasks`, and a progress ring. Visual state per node: `locked` (greyed + lock icon), `available` (pulsing glow), `in_progress` (partial ring), `completed` (gold check).
- Clicking a node opens a right-side drawer with description and the task checklist. Locked nodes show which prerequisites are missing.
- Sticky header: roadmap title, overall % complete, **Enroll** button when not enrolled.
- Mobile: tree remains pannable; the drawer becomes a bottom sheet.

**Dashboard**
- Greeting, level badge, XP bar to next level, streak flame counter.
- "Continue learning" card (next recommended node of the most recent enrollment).
- Daily quest card with progress.
- Activity heatmap (last 90 days; build with plain divs/SVG, no heavy chart lib).
- Recent badges, enrolled roadmaps with progress bars.

**Task completion UX**
- Non-quiz: "Mark complete" button → optimistic UI → on response, show **XP toast** with breakdown; if `leveled_up` show a full-screen level-up modal with confetti (Framer Motion; respect `prefers-reduced-motion`); for each `new_badges` show a badge-unlock toast; if nodes unlocked, animate the edge/node unlock in the tree.
- Quiz: stepper UI, one question at a time, results screen with per-question feedback and "Retry" if failed.

**Leaderboard** — tabs Weekly / All-time, highlight current user row, show rank, avatar, name, level, XP.

**Admin** — table + form editors; a simple node list with a prerequisite multi-select is sufficient (visual graph editing is optional/stretch).

### 9.3 Frontend conventions
- Typed API client (`fetch` wrapper) that attaches the access token, transparently calls `/auth/refresh` once on `401`, then retries; on failure, redirects to `/login`.
- Keep the access token **in memory only** (Zustand), never `localStorage`. On app boot, call `/auth/refresh` to restore the session.
- TanStack Query keys: `['roadmaps']`, `['roadmap', slug]`, `['node', id]`, `['me']`, `['quests','today']`, `['leaderboard', period]`. After a completion, invalidate `roadmap`, `me`, `quests`, `activity`.
- Forms: React Hook Form + Zod; show field-level errors from the API envelope.
- Accessibility: keyboard-navigable tree nodes (`Enter` opens drawer), ARIA labels for state ("Locked", "Completed"), color contrast ≥ 4.5:1, never rely on color alone.
- Design: follow **§9A (Campus Paper)** strictly: tokens, fonts, sticker UI, pixel art, Trail Map. Light + dark ("Night campus") via CSS variables. Provide pixel-shimmer skeletons and mascot-led empty/error states for every data view.

---

## 9A. Visual Design System — "Campus Paper"

**This section overrides any generic styling instinct. Read it before writing a single component.**

### 9A.1 Art direction
CareerCampus looks like **a hand-made, sunlit campus trail map**: warm paper, chunky friendly type, pixel-art illustrations, and tactile "sticker" UI. The mood reference is warm-cream indie sites with pixel mascots and heavy display type. Take the *mood only*: do **not** reuse any bee, flower, pollen, robot, easel or pier imagery, and do not copy any layout 1:1.

**Anti-generic rules (hard requirements):**
- No default Tailwind/shadcn look. No Inter/Roboto/system fonts. No purple-to-blue gradients. No glassmorphism. No emoji used as illustration.
- No grids of identical icon-above-title-above-text cards. Vary card sizes, rotations and layout.
- Every page has at least one pixel illustration or sprite (hero scene, mascot in empty state, badge, etc.).
- Raster images are not used for art. All art is **code-generated SVG** (see 9A.6) so it stays crisp, themeable and tiny.

### 9A.2 Colour tokens
Define as CSS variables on `:root` / `.dark`, map into `tailwind.config` as semantic names (`bg-paper`, `text-ink`, `bg-marigold`, …). Never hardcode hex in components.

| Token | Day ("Daylight") | Night ("Night campus") | Use |
|---|---|---|---|
| `--paper` | `#F3E9D8` | `#17120D` | Page background |
| `--paper-2` | `#EADFCB` | `#211A13` | Sunken areas, tracks |
| `--card` | `#FFFAF0` | `#2A2118` | Surfaces |
| `--ink` | `#2A1F16` | `#F6EBD9` | Text, sticker borders |
| `--ink-soft` | `#6B5B4B` | `#B8A892` | Secondary text |
| `--marigold` | `#FFC63D` | `#FFD056` | Primary accent, active pills, CTAs |
| `--ember` | `#F2683C` | `#FF7F55` | Streaks, urgency |
| `--moss` | `#4F8A4B` | `#6FAE69` | Completed, success |
| `--lagoon` | `#2E9FA6` | `#4FC0C7` | Info, available-node glow, links accent |
| `--berry` | `#B8467A` | `#D86A9C` | Rare/epic badges |
| `--fog` | `#CFC6B8` | `#3A3025` | Locked nodes |

Text on `--marigold` is always `--ink` (contrast ≥ 4.5:1; verify). Page background gets a faint **graph-paper dot grid** (1px dots every 24px at ~6% ink) and a ~4% SVG-noise paper grain.

### 9A.3 Typography
Self-host via `@fontsource-variable/*` (this is the one allowed addition to §2's stack).
- **Display:** *Fraunces* variable — weight 900, `SOFT` 100, `WONK` 1, tracking `-0.03em`, line-height `0.95`, size `clamp(3rem, 9vw, 7rem)`. Soft heavy serif = warm and memorable, deliberately unlike a generic grotesk.
- **Body/UI:** *Figtree* 400/600/700.
- **Game numerals & labels** (XP, level, streak, badge names, timers): *Pixelify Sans* 600.
- **Eyebrow labels:** Figtree 700, uppercase, `letter-spacing: 0.18em`, `--ink-soft`, small, placed above big headings (e.g. `CAREER PATHS, PLAYABLE`).
- Links: `--ink` text with a thick (3px) `--marigold` underline offset 3px; underline fills on hover.

### 9A.4 Shape, elevation, components
- **Pills everywhere interactive:** nav items, tabs, chips, buttons (`border-radius: 999px`). Cards `28px`, inputs `16px`.
- **Two elevation languages** (this creates hierarchy):
  - *Containers* — soft: `1.5px` border at ~12% ink, shadow `0 10px 30px -12px rgb(42 31 22 / .25)`.
  - *Interactive/game elements* (CTAs, badges, XP toasts, quest cards) — **sticker**: `2px solid var(--ink)` border + hard shadow `0 4px 0 var(--ink)`; on press `translateY(3px)` and shadow `0 1px 0`.
- **Nav:** floating pill bar. Left: pixel logo mark + `Home · Paths · Quests · Leaderboard`; active item = marigold pill. Right (authed): a **level chip** (shield sprite + `Lv 7` + mini XP bar), streak chip (flame sprite + days), sun/moon theme switch. Guest: `Sign in` pill + `Start free` sticker button.
- **Path picker** (landing + catalog): row of pill tabs (e.g. Frontend · Data · Design · Backend) above a large dropdown pill; selection swaps a live mini trail-map preview card.
- **Chips:** small pills with a sprite + number (XP, streak, badges count), Pixelify Sans.
- **Inputs:** cream fill, 2px ink border on focus with marigold focus ring (3px, offset 2px). Never remove focus outlines.
- **Skeletons:** a pixel checker shimmer, not grey bars.

### 9A.5 Mascot — "Biscuit" the capybara
A calm pixel-art capybara with a tiny backpack. Poses (2–4 frame sprites): `idle` (breathing bob), `wave`, `cheer`, `think`, `sleep`.
Appears in: hero, empty states (`sleep`), level-up modal (`cheer`), quiz screen (`think`), 404 ("Lost on the trail"), error states (broken-bridge scene), first-run onboarding (`wave`). Speech bubbles use sticker style. Tone of copy: friendly, a bit witty, never childish; no more than one short line.

### 9A.6 Pixel art system (code-generated)
Create `frontend/src/art/` containing:
- `PixelSprite.tsx` — renders a sprite from `{ palette: Record<string,string>, rows: string[] }` to inline SVG using horizontally merged `<rect>` runs, `shape-rendering="crispEdges"`, integer `scale` prop. `.` = transparent. Palette values may reference CSS variables so sprites theme automatically.
- `sprites/` — one file per sprite family: `biscuit.ts`, `landmarks.ts`, `icons.ts` (flame, shield, lock, flag, lantern, star, cap), `badges.ts`, `nature.ts` (trees, flowers, sprouts, clouds).
- `scene.ts` + `CampusScene.tsx` — the hero/background scene, composed **procedurally** (no hand-drawn megagrid): gradient sky, rasterised pixel sun, cloud sprites, stepped hill silhouettes (seeded noise), 3–4 landmark sprites, a stepped dirt trail, foreground trees, Biscuit waving beside a trail signpost. 3 parallax layers (slow drift on scroll/mouse; disabled under `prefers-reduced-motion`).

Sprite format example (8×8 flame):
```ts
export const FLAME = {
  palette: { o: 'var(--ember)', y: 'var(--marigold)', w: '#FFF3C4' },
  rows: [
    '...oo...',
    '..ooo...',
    '.oooyo..',
    '.ooyyoo.',
    'ooyyywoo',
    'ooyywwoo',
    '.ooyyoo.',
    '..oooo..',
  ],
};
```
Sizes: icons 8–16px grid, landmarks 24–32px grid, badges 24px grid. Keep every sprite ≤ 2 KB. Provide a dev-only `/_art` gallery route that shows every sprite, pose and palette swap (also serves as visual regression check).

**Hero composition:** big Fraunces headline + eyebrow + short sub-copy + path picker on the left; `CampusScene` bleeds off the right edge and **fades into the paper background** using a CSS `mask-image` gradient (left edge and bottom edge). Night mode swaps to dusk: stars, lit windows, fireflies.

### 9A.7 The skill tree as a "Trail Map"
Replace the default flowchart look in React Flow:
- Canvas background = parchment map with faint contour lines and dot grid.
- **Edges** = dotted dirt trail (`stroke-dasharray`), stepped/orthogonal pixel feel. The path to the *next recommended node* animates "marching ants" in `--marigold`.
- **Nodes** = landmark sprites on a small round tile (library, lab, workshop, studio, observatory, garden gate, bridge, tower…), chosen via `nodes.landmark` (§17.7). Each roadmap has a `theme` (palette tint + landmark set) so Frontend and Data feel like different regions.
- **States:**
  | State | Visual |
  |---|---|
  | `locked` | Covered by **fog of war** (pixel cloud overlay, desaturated sprite, tiny lock). Fog parts with a stepped dissolve when it unlocks |
  | `available` | Lantern glow in `--lagoon`, 2-frame pulse |
  | `in_progress` | Colour sprite with a **segmented pixel ring** showing `x/y` tasks |
  | `completed` | Full colour, `--moss` flag planted on top, small sparkle |
  | `rusty` (§17.4) | Moss/vine overlay on a completed node |
- Unlocking plays: fog dissolves → trail draws toward the node → lantern lights up (≈1.2s, skippable).
- Biscuit walks along the trail to the user's current node (position persisted on the map header "You are here" marker).

### 9A.8 Gamification visuals
- **XP bar:** chunky, 20 discrete pixel segments with a notch pattern; fills in stepped animation.
- **Level:** pixel shield with number in Pixelify Sans; level-up modal = Biscuit tosses a graduation cap, pixel-square confetti (`marigold/ember/lagoon/berry` 6–10px squares), title card ("Sophomore!").
- **Streak:** flame sprite that evolves by tier (spark → flame → bonfire at 7 → blue flame at 30).
- **Badges:** 24px pixel medals; tier frame via palette swap (bronze/silver/gold); unearned = dark silhouette with `?`.
- **Activity heatmap → "Learning Garden":** each day cell is soil; 1 task = sprout, 2–3 = flower, 4+ = small tree. Tooltip shows date, tasks, XP.
- **XP toast:** sticker pop-in from the bottom-right with breakdown lines; auto-dismiss 4s; stackable.

### 9A.9 Motion & sound
- Sprite animation uses `steps()` timing at 4–6 fps (deliberate "pixel" feel). UI transitions use springs (Framer Motion) 150–250 ms.
- Everything decorative must stop under `prefers-reduced-motion: reduce` (static frames, no parallax, instant unlocks, no confetti).
- Optional 8-bit sound effects synthesised with WebAudio (tiny blips for XP/level-up/unlock). **Off by default**, toggle in profile; no audio files.

### 9A.10 Page-level direction
- **Landing:** eyebrow + Fraunces headline + path picker + `CampusScene`; then "How it works" as **three scattered sticker cards** at different rotations (−2°, 1°, −1°) with connecting dotted trail; "Featured paths" as landmark cards of differing sizes; "Your Skill Passport" preview (§17.5); footer = pixel horizon strip.
- **Catalog:** each roadmap card shows its theme landmark cluster, est. hours, difficulty as 1–3 pixel stars.
- **Dashboard:** laid out like a **campus notice board** (cork/paper pinned cards with slight rotation): Continue Learning, Today's Quest, Weekly Plan, Garden, Badges.
- **Leaderboard:** podium with pixel trophies for top 3; weekly "Season" theme banner.
- **Admin:** same tokens but calmer — no mascot, no rotation, denser tables.

### 9A.11 Quality bar
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on landing and roadmap pages. Total art payload < 60 KB gzipped.
- Contrast ≥ 4.5:1 for text in both themes; state is never colour-only (icons + labels).
- Visual review step per milestone: screenshot key pages at 375px, 768px, 1280px in both themes and save to `docs/screenshots/`. If any page looks like a default template, redo it.

## 10. Seed Data

`bin/seed.php` must idempotently load:
- **Badges** from `seeds/badges.json` (§5.5).
- **Two complete roadmaps** from `seeds/roadmaps/*.json`:
  1. *Frontend Developer* — ≥ 12 nodes (e.g. Internet & Web Basics → HTML → CSS → Git → JavaScript → DOM → Responsive Design → React → TypeScript → Testing → Build Tools → Deployment), each with 3–6 tasks of mixed types, at least 3 quizzes with 3–5 questions each.
  2. *Data Analyst* — ≥ 10 nodes similarly.
- Resource URLs must point to reputable free resources (MDN, official docs, freeCodeCamp, etc.). If unsure of a URL, link to the official docs home page instead of inventing deep links.
- **Users:** `admin@careercampus.test` (admin) and `learner@careercampus.test` (learner), password `ChangeMe123!` — **dev/test environments only**; the seeder must refuse to create these when `APP_ENV=production`.

JSON seed format:
```json
{
  "slug": "frontend-developer",
  "title": "Frontend Developer",
  "summary": "…",
  "nodes": [
    {
      "slug": "html",
      "title": "HTML",
      "pos": [200, 120],
      "prerequisites": ["internet-basics"],
      "tasks": [
        {"type": "reading", "title": "…", "url": "…", "xp": 10},
        {"type": "quiz", "title": "HTML quiz", "xp": 20, "quiz": { "questions": [] }}
      ]
    }
  ]
}
```

---

## 11. Testing Requirements

**Backend (PHPUnit)** — must cover at minimum:
- `LevelCalculator` boundaries (49→L1, 50→L2, 199→L2, 200→L3).
- `XpCalculator`: each task type, quiz bonus, streak multipliers.
- `StreakService`: same day, next day, gap, timezone boundary.
- `NodeStateResolver`: locked/available/in_progress/completed and unlock chains.
- Cycle detection in prerequisites.
- `completeTask`: idempotency (double call → single XP award), locked-node rejection (409), concurrent double-submit does not double-award.
- Auth: register/login/refresh rotation/reuse detection; admin routes reject learners (403).
- Use a separate test database, migrated fresh per test run.

**Frontend (Vitest + RTL)**: auth form validation, `NodeCard` state rendering, XP toast/level-up modal rendering from a `CompletionResult` fixture, API client 401-refresh-retry behaviour.

**E2E (Playwright, smoke):** register → enroll in Frontend Developer → complete first task → see XP toast and dashboard XP update.

---

## 12. DevOps

- `docker-compose.yml` services: `db` (postgres:16), `php` (php:8.3-fpm with `pdo_pgsql`, composer), `nginx` (serves `/api` → php-fpm, everything else → built SPA or proxy to Vite in dev), `web` (node, Vite dev server).
- `.env.example` documenting every variable.
- Makefile (or npm scripts) with: `make up`, `make migrate`, `make seed`, `make test`, `make lint`.
- GitHub Actions workflow: lint + backend tests (with Postgres service) + frontend tests + build.
- README must contain a **"Run it in 3 commands"** quick start.

---

## 13. Build Order (milestones)

> **Execution:** the agent works through these milestones grouped into 7 phases (0–6) defined in `phases.md`, one phase at a time. Mapping: Phase 0 = M1–2, Phase 1 = M3, Phase 2 = M4, Phase 3 = M5–6, Phase 4 = M7–8, Phase 5 = M9 + M12, Phase 6 = M10–11.

Complete each milestone, run its tests, and commit before moving on.

| # | Milestone | Done when |
|---|---|---|
| 1 | **Scaffold, infra & design foundation** | `docker compose up` serves the SPA and `GET /api/v1/health` returns `{ok:true}`; §9A tokens, fonts, `PixelSprite`, nav pill bar and `/_art` gallery exist in both themes |
| 2 | **Schema & migrations** | `make migrate` creates all tables; rerun is a no-op |
| 3 | **Auth** | Register/login/refresh/logout/me work; backend auth tests pass; frontend login/register pages work with silent refresh |
| 4 | **Content read APIs + seed** | Seeded roadmaps visible on `/roadmaps`; skill tree renders from API (static states) |
| 5 | **Enrollment & progress engine** | `NodeStateResolver` + `completeTask` implemented with tests; tree shows real states and unlocks |
| 6 | **Gamification** | XP, levels, streaks, badges, daily quest, `CompletionResult` UI (toast, level-up, badge unlock) |
| 7 | **Dashboard, leaderboard, profile** | All three pages functional with real data |
| 8 | **Quizzes** | Server-side grading, quiz UI, best-score logic |
| 9 | **Admin** | CRUD for roadmaps/nodes/tasks/badges with cycle prevention |
| 10 | **Polish & hardening** | Rate limiting, a11y pass, dark mode, loading/empty/error states, E2E smoke, README |
| 11 | **Visual identity pass** | Landing hero scene, Trail Map (fog, lantern, flags), Learning Garden, level-up/XP toasts, mascot states; §9A.11 quality bar met, screenshots saved |
| 12 | **Differentiators MVP** | §17.1–17.6 implemented with tests and §17.9 criteria passing |

---

## 14. Acceptance Criteria (global)

- [ ] A new user can register, enroll, complete tasks, and see XP, level, streak and badges update correctly.
- [ ] Locked nodes cannot be progressed via API even with a crafted request.
- [ ] Completing the same task twice never awards XP twice (including concurrent requests).
- [ ] Quiz answers are never exposed to the client before submission.
- [ ] No N+1 queries on roadmap detail (verify ≤ 5 queries per request).
- [ ] Access token is never persisted to web storage; refresh cookie is httpOnly.
- [ ] All lists have loading, empty and error states; app is usable at 375px width.
- [ ] No page looks like a default template: §9A anti-generic rules hold, art is code-generated SVG, both themes complete.
- [ ] Lighthouse Performance ≥ 90 and Accessibility ≥ 95 on landing and roadmap pages.
- [ ] `make test` and `make lint` pass cleanly.
- [ ] Fresh clone → working app in ≤ 3 documented commands.

---

## 15. Agent Working Rules

1. Build milestone by milestone in order; don't start the next until tests for the current one pass.
2. Don't add libraries beyond §2 without recording the reason in `docs/DECISIONS.md`.
3. Keep functions small and typed (TS strict mode; PHP `declare(strict_types=1)` everywhere).
4. Never hardcode secrets; never log passwords, tokens, or full request bodies.
5. When the spec is silent, pick the simplest secure option and document it.
6. After each milestone, update `README.md` with any new commands or env variables.
7. If something in this spec is contradictory or infeasible, stop and note it in `docs/DECISIONS.md` rather than silently diverging.
8. Visual identity is a requirement, not polish: build the §9A foundation in milestone 1 and style every later screen with it from the start. Never leave unstyled default components.

---

## 16. Stretch Goals (only after all milestones pass)

- Visual drag-and-drop roadmap editor for admins.
- Streak freezes earned with XP.
- Roadmap "certificates" (printable PDF/page).
- Social login (Google/GitHub).
- Task notes and bookmarks.
- Email reminders for broken streaks.

---

## 17. Differentiators — Why CareerCampus Beats a Static Roadmap

Normal roadmaps are flowcharts with checkboxes: nothing proves you learned, nothing adapts to you, nothing brings you back. CareerCampus fixes that with the features below. **MVP** items are part of the build; **Phase 2** items are listed only so the architecture doesn't block them.

### 17.1 MVP — Personalised plan with a real ETA
- On enrolling, ask: hours per week available and (optional) target date. Store in `user_goals`.
- Each task has `est_minutes`. Dashboard "Weekly Plan" card shows projected finish date, this week's suggested tasks, and a gentle "on track / behind / ahead" indicator.
- `GET /me/enrollments` returns `eta_date` and `weekly_plan[]`.

### 17.2 MVP — Test-out (skip what you already know)
- Nodes may have an optional `test_out_quiz` (same shape as §6.1). `POST /nodes/{id}/test-out {answers}`.
- Pass ≥ 80% → node's non-project required tasks are marked complete with `source='test_out'` at **50% XP**, once per node. Failing has a 24-hour cooldown.
- Prevents boredom for experienced users and lets career-switchers jump ahead.

### 17.3 MVP — Proof of skill, not self-ticking
- `project` tasks require a **submission**: a URL (GitHub/live demo) and a reflection (≥ 100 chars: "what I built, what was hard"). Completion is granted on valid submission; submissions appear on the user's public Skill Passport.
- Quiz XP uses server-side grading (§7). Validate URLs (http/https only, no private IPs).
- Phase 2: peer review of projects (§17.8).

### 17.4 MVP — "Rusty" nodes (spaced review)
- A completed node becomes `rusty` (visual overlay only, never re-locks anything) 30 days after its last review/completion.
- User can restore it with a 3-question refresher drawn from that node's quiz tasks: `POST /nodes/{id}/review` → +10 XP, resets timer. Table: `node_reviews`.
- This turns the roadmap from a one-time checklist into retention training.

### 17.5 MVP — Public Skill Passport
- Optional public profile at `/u/{handle}` (`users.handle` unique, `users.is_public` default false). Shows level, badges, **skills earned**, completed project submissions, and the Learning Garden.
- Skills: `skills` table + `node_skills`; completing a node grants its skills (derived, not stored per user).
- Shareable link + auto OG title/description (image generation is a stretch).

### 17.6 MVP — Career overlap ("You're already 38% there")
- `GET /roadmaps/{slug}/overlap` (authed): percent of the roadmap's skills the user already holds, via `node_skills`. Shown on catalog cards and when considering a switch.
- Encourages exploration and shows non-linear career progress.

### 17.7 Schema deltas (new migration `002_differentiators.sql`)
```sql
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
```

### 17.8 Phase 2 (design for, don't build yet)
- **Squads:** 3–6 people on the same roadmap with a shared weekly goal and squad streak.
- **Seasons ("Semesters"):** 8-week competitive seasons with themed banners and end-of-season badges.
- **Peer review** of project submissions for bonus XP.
- **Community resources:** users suggest/upvote learning links per node; admin moderates.
- **Boss nodes:** capstone project at the end of each roadmap with a special badge and certificate.

### 17.9 Additional acceptance criteria
- [ ] Setting 5 hrs/week yields a plausible ETA that updates as tasks complete.
- [ ] Test-out cannot be farmed (once per node, cooldown enforced server-side) and awards 50% XP.
- [ ] Project tasks cannot be completed without a valid URL and reflection.
- [ ] A node 30+ days old shows `rusty`; review restores it and never blocks prerequisites.
- [ ] A user's Skill Passport is invisible (404) unless `is_public = true`.
