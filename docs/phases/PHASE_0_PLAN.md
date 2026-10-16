# Phase 0 Plan — Foundation & Design System

Scope: spec §2, §3, §6, §9A, §12. No features from later phases.

## Files (build order)
1. **Repo skeleton** — `.gitattributes`, `.gitignore`, `.env.example`, `Makefile`, root
   `package.json` (npm mirrors of the Makefile for Windows), `README.md`, `docs/`.
2. **Infra** — `docker-compose.yml` (db/php/nginx/web), `backend/Dockerfile`
   (php:8.3-fpm + pdo_pgsql/pdo_sqlite/opcache/bcmath + composer binary),
   `infra/nginx/nginx.conf` (`/api` → php-fpm, else → Vite).
3. **Backend** — `composer.json` (slim/psr7, php-di, monolog, firebase/php-jwt,
   phpdotenv, respect/validation; dev: phpunit 11, phpstan, cs-fixer);
   `public/index.php`; `src/Config/{Env,Settings,Routes,Container}.php`;
   `src/Http/Middleware/{Cors,ErrorHandler,JsonBody}.php`;
   `src/Http/Controllers/HealthController.php`; `src/Support/{ApiException,Clock,SystemClock}.php`;
   `migrations/001_init.sql` (exact spec §6 schema); `bin/migrate.php`
   (schema_migrations table, per-file transaction, idempotent); `bin/seed.php`
   placeholder; PHPUnit smoke tests (SQLite in-memory PDO — no live DB needed).
4. **Frontend** — Vite + React + TS strict; Tailwind v3.4 with §9A tokens mapped
   to CSS variables (light/dark); fontsource Fraunces/Figtree/Pixelify Sans;
   router shell + TanStack Query + Zustand theme store (persisted);
   `art/PixelSprite.tsx` (run-merged rects, crispEdges, themeable palettes);
   `art/sprites/{icons,biscuit}.ts` (flame, shield, lock, flag, lantern, star,
   cap, sun, moon; Biscuit idle 2-frame); `components/ui/{Button,Card,Chip,Input,
   Skeleton,NavBar,ThemeToggle}.tsx`; pages: Home placeholder, ComingSoon, 404,
   `/_art` gallery (dev-only); Vitest smoke tests.
5. **Lint/CI** — ESLint flat + Prettier; PHPStan level 6 + PHP-CS-Fixer;
   GitHub Actions (backend job with postgres:16 service, frontend job).

## Key risks
- Windows: LF endings enforced via `.gitattributes` (SQL/Dockerfile/conf/compose);
  Makefile not runnable on this box → root npm scripts are the primary interface.
- Two `node_modules` (host for Vitest, Docker volume for the `web` service) —
  intentional isolation, both Node 24.
- Health smoke test uses SQLite in-memory PDO; live Postgres is exercised by the
  exit gate (`migrate` ×2 + curl health).

## Exit gate runbook
1. `copy .env.example .env` (set a real `JWT_SECRET`)
2. `npm run setup` — build images + `composer install` in container
3. `npm run up` — start db, php, nginx, web
4. `npm run migrate` twice → second run must print "No pending migrations"
5. `npm run test` — PHPUnit (container) + Vitest (host) green
6. `npm run lint` — PHPStan L6 + CS-Fixer + ESLint/Prettier clean
7. `curl http://localhost:8080/api/v1/health` → `{"ok":true,"db":true}`
8. `http://localhost:5173/_art` renders every sprite, both themes
9. Update `docs/PROGRESS.md`, commit, tag `phase-0-done`, stop for review
