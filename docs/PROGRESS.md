# Progress

Status of each phase, verified against the exit gates in `phases.md`.

## Phase 0 — Foundation & Design System
**Status: COMPLETE** (started 2026-07-09, exit gate passed 2026-10-16)

### Build checklist
- [x] Monorepo layout, `.env.example`, Makefile + root npm scripts
- [x] `docker-compose.yml` (db, php, nginx, web)
- [x] Slim 4 bootstrap + DI + Monolog + error envelope + CORS + `GET /api/v1/health`
- [x] `bin/migrate.php` + `migrations/001_init.sql` (idempotent)
- [x] Vite/React/TS strict + Tailwind §9A tokens (light + dark) + fonts + router shell + Query provider
- [x] `PixelSprite` + first sprites + pill nav + sticker UI + theme toggle + paper background
- [x] `/_art` dev-only gallery
- [x] Lint configs (ESLint, Prettier, PHP-CS-Fixer, PHPStan L6) + CI skeleton

### Exit gate results (2026-10-16, Docker 29.8.2 / WSL2)
- [x] Clean clone → `npm run setup && npm run up`: all 4 services up (db healthy, php-fpm, nginx, Vite).
- [x] `npm run migrate` twice → run 1 applies `001_init.sql`, run 2 prints "No pending migrations."
- [x] `curl http://localhost:8080/api/v1/health` → `{"ok":true,"db":true}` (also through the Vite proxy on :5173).
- [x] `http://localhost:5173/_art` → 200, renders the sprite gallery (both themes verified by the PixelSprite/theme Vitest suites; final visual check in PR review).
- [x] `npm run test` → backend PHPUnit `OK (4 tests, 12 assertions)`; frontend Vitest `11 passed (11)`.
- [x] `npm run lint` → PHPStan L6 (v2.3.1) `[OK] No errors`; PHP-CS-Fixer `0 of 17 files to fix`; ESLint + Prettier clean.

### Issues found & fixed while running the gate
- Composer's security-advisory policy blocked `firebase/php-jwt` v6.x (advisory `PKSA-y2cr-5h3j-g3ys`); pinned `^7.0` (fix shipped in v7.0.0). See `docs/DECISIONS.md`.
- Slim 4.15 API drift: `App` constructor now takes a PSR-17 `ResponseFactory` first (made `App` generic over the container); `HttpException::getResponse()` removed (use `getCode()`); `RequestFactory::createServerRequest()` moved to `ServerRequestFactory`. All call sites updated.
- php-di 7: `useReflectionBasedAutowiring()` removed — `useAutowiring(true)` is sufficient here.
- PHPStan L6 findings fixed: `ServerRequestInterface` in middleware signatures (PSR-15 contract), generic `App<ContainerInterface>` annotation, `array<string, mixed>` docblocks. Upgraded `phpstan/phpstan` to `^2.2` (installed 2.3.1) — zero new findings.
- CS-Fixer config referenced a non-existent rule (`blank_line_at_end_of_file`) — removed (`@PSR12`/`line_ending` already enforces trailing newline).
- Line endings: PHP files were CRLF on the Windows working tree; normalized to LF via `php-cs-fixer fix` and pinned `*.php text eol=lf` in `.gitattributes`; `.php-cs-fixer.cache` added to `.gitignore`.

### Handoff to Phase 1
- Stack: `npm run up` from the repo root; API on :8080, Vite on :5173, Postgres 16 on :5432.
- Auth comes next: JWT with `firebase/php-jwt` v7 (HS256 API unchanged), password hashing via `password_hash()`, `respect/validation` for request validation.
- PHPUnit smoke tests use an in-memory SQLite PDO; add Postgres-backed tests (fresh test DB per run) per spec §11 in later phases.
- Tag: `phase-0-done`. PR opened per `git.md` workflow — stop for review.

## Phase 1 — Authentication & Accounts
**Status: IN PROGRESS** — backend complete (PHPUnit `OK (33 tests, 127 assertions)`, PHPStan L6 clean); frontend pending (plan: `docs/phases/PHASE_1_PLAN.md`, branch `phase-1-auth`)

### Build checklist
- [x] Argon2id hashing; JWT access (15 min) + rotating httpOnly refresh cookie; hashed token storage; reuse detection revokes all tokens
- [x] Endpoints: `register`, `login`, `refresh`, `logout`, `GET/PATCH /me` (with level, `xp_to_next`, streak fields)
- [x] Middleware: Auth, Admin, RateLimit (auth endpoints 10/min/IP), JSON body, validation → error envelope
- [ ] Frontend: typed API client with silent refresh + one retry on 401; in-memory token store; session restore on boot; `/login`, `/register` pages (React Hook Form + Zod, field errors from API); protected/guest/admin route guards
- [ ] Nav shows level chip and streak chip when signed in (values from `/me`)
- [ ] Profile settings page (display name, avatar URL, timezone)

### Backend test coverage (29 new tests + 4 Phase 0)
- `RegisterTest` — session + cookie on 201, Argon2id hash persisted, `409 email_taken`, `422` field details, returned token works on `/me`
- `LoginTest` — session on 200, case-insensitive email, wrong password / unknown email → same `401 invalid_credentials`, empty password → `422`
- `RefreshTest` — rotation chain (old token dead), reuse of rotated token revokes ALL tokens, missing/unknown/expired → `401 invalid_refresh`, logout revokes
- `MeTest` — 401 without/garbage token, gamified profile shape (level 3 / xp_to_next 250 at 200 XP), PATCH + persistence, invalid timezone / empty name → `422`
- `AdminGuardTest` — learner → `403 forbidden`, admin → 200, unauthenticated → 401
- `RateLimitTest` — 11th auth request → `429 rate_limited`, per-IP budgets (X-Forwarded-For), non-auth routes unlimited

### Exit gate results
(pending — frontend + manual gate)

### Handoff
(pending)
