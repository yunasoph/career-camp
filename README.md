# CareerCampus

A gamified career-roadmap web app: pick a career path, walk it as an interactive
**skill tree** ("trail map"), complete tasks, and earn **XP, levels, streaks and
badges**.

**Stack:** React 18 + TypeScript + Vite · PHP 8.3 + Slim 4 · PostgreSQL 16
· Docker Compose for local dev.

Spec: [`spec.md`](./spec.md) · Phases: [`phases.md`](./phases.md)
· Decisions: [`docs/DECISIONS.md`](./docs/DECISIONS.md) · Status: [`docs/PROGRESS.md`](./docs/PROGRESS.md)

## Run it in 3 commands

```powershell
copy .env.example .env     # then set a real JWT_SECRET (see .env.example)
npm run setup              # builds images + installs PHP deps (in container)
npm run up                 # starts db, php-fpm, nginx, Vite dev server
```

Then open **http://localhost:5173** (API health: `http://localhost:8080/api/v1/health`).

> **Windows:** Docker Desktop with the WSL 2 backend is required (`wsl --install`).

## Commands

Run from the repo root (Makefile targets exist too for CI/Linux — `make <target>`):

| Command | What it does |
|---|---|
| `npm run setup` | `docker compose build` + `composer install` (inside container) |
| `npm run up` / `npm run down` | Start / stop the stack |
| `npm run migrate` | Apply pending SQL migrations (`bin/migrate.php`) |
| `npm run seed` | Load seed data (roadmaps, badges, dev users — idempotent) |
| `npm run test` | Backend PHPUnit (in container) + frontend Vitest (host) |
| `npm run lint` | PHPStan L6 + PHP-CS-Fixer + ESLint + Prettier |
| `node scripts/capture-screenshots.mjs` | Capture QA screenshots (Playwright; install with `npm i --no-save --no-package-lock playwright` + `npx -y playwright install chromium`) |

## Layout

```
├── backend/          # PHP 8.3 + Slim 4 API (controllers → services → repositories)
│   ├── bin/          #   migrate.php, seed.php (CLI)
│   ├── migrations/   #   versioned .sql files (001_init.sql = full core schema)
│   ├── public/       #   index.php (front controller)
│   └── src/          #   Config, Http, Domain, Repositories, Support
├── frontend/         # React 18 SPA (Vite, TanStack Query, Zustand, Tailwind)
│   └── src/          #   api, components, features, pages, store, art (pixel system)
├── infra/nginx/      # Dev gateway: /api → php-fpm, everything else → Vite
└── docs/             # DECISIONS, PROGRESS, phase plans, screenshots
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `development` \| `test` \| `production` |
| `DB_HOST` / `DB_PORT` | `db` / `5432` | Postgres host/port (docker network) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `careercampus` | Postgres credentials |
| `JWT_SECRET` | — | HS256 secret for access tokens (15 min TTL). **Must be set in production.** |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Only CORS origin allowed (with credentials) |

## Status

Phase 0 (foundation & design system), Phase 1 (authentication & accounts) and
Phase 2 (seeded content, landing, catalog and the Trail Map) are complete —
see [`docs/PROGRESS.md`](./docs/PROGRESS.md).
