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
**Status: COMPLETE** (exit gate passed 2026-10-17; backend + frontend)

### Build checklist
- [x] Argon2id hashing; JWT access (15 min) + rotating httpOnly refresh cookie; hashed token storage; reuse detection revokes all tokens
- [x] Endpoints: `register`, `login`, `refresh`, `logout`, `GET/PATCH /me` (with level, `xp_to_next`, streak fields)
- [x] Middleware: Auth, Admin, RateLimit (auth endpoints 10/min/IP), JSON body, validation → error envelope
- [x] Frontend: typed API client with silent refresh + one retry on 401; in-memory token store; session restore on boot; `/login`, `/register` pages (React Hook Form + Zod, field errors from API); protected/guest/admin route guards
- [x] Nav shows level chip and streak chip when signed in (values from `/me`)
- [x] Profile settings page (display name, avatar URL, timezone)

### Backend test coverage (29 new tests + 4 Phase 0)
- `RegisterTest` — session + cookie on 201, Argon2id hash persisted, `409 email_taken`, `422` field details, returned token works on `/me`
- `LoginTest` — session on 200, case-insensitive email, wrong password / unknown email → same `401 invalid_credentials`, empty password → `422`
- `RefreshTest` — rotation chain (old token dead), reuse of rotated token revokes ALL tokens, missing/unknown/expired → `401 invalid_refresh`, logout revokes
- `MeTest` — 401 without/garbage token, gamified profile shape (level 3 / xp_to_next 250 at 200 XP), PATCH + persistence, invalid timezone / empty name → `422`
- `AdminGuardTest` — learner → `403 forbidden`, admin → 200, unauthenticated → 401
- `RateLimitTest` — 11th auth request → `429 rate_limited`, per-IP budgets (X-Forwarded-For), non-auth routes unlimited

### Frontend test coverage (19 new tests + 11 Phase 0)
- `client.test.ts` — Bearer + `credentials: include` + JSON content type; 401 → one silent refresh → retry with fresh token; concurrent-refresh dedupe; failed refresh → session cleared + redirect `/login` (suppressed on auth pages); 422 field details surface on `ApiError`
- `validation.test.ts` — register / login / profile Zod schemas (per-field messages, 60-char name, URL avatar, IANA timezone)
- `authStore.test.ts` — setSession / setUser / clear; nothing persisted (token is memory-only, spec §9.3)

### Exit gate results (2026-10-17)
- [x] PHPUnit: `OK (33 tests, 127 assertions)` — register, login, bad password → 401, refresh rotation, reuse detection (revokes all), learner on admin route → 403.
- [x] Vitest: `30 passed (30)` — form validation schemas; client refresh-retry (incl. dedupe + redirect on failure).
- [x] Manual: live-stack smoke run (curl through nginx :8080 and the Vite proxy :5173): register → `201` + `Set-Cookie: cc_refresh=…; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=2592000`; `GET /me` with the Bearer token → 200; `POST /auth/refresh` with the cookie (exactly what a page reload triggers) → 200 + **rotated** cookie ⇒ register → reload → still signed in. Cookies verified through the Vite dev proxy (the plan's top risk). Access token is in no web storage: `authStore` has no persist middleware (asserted in `authStore.test.ts`); only `careercampus-theme` lives in localStorage.
- [x] `npm run lint` / `npm run test` from the root: green (see commit).

### Issues found & fixed while building
- Slim 4.15 route groups: `group($pattern, $callback)` requires a callback and returns `RouteGroupInterface` (no route methods); static closures crash `CallableResolver::bindToContainer()` (null + PHP warning) → group callbacks are public static method refs (`[Routes::class, 'method']`).
- php-di 8: `Clock::class => SystemClock::class` is a literal string (`ValueDefinition`), not an instantiation — bound via closure (latent Phase 0 bug, first `Clock` consumer surfaced it).
- `firebase/php-jwt` v7: no `JWTException` base class — `AuthMiddleware` catches `\UnexpectedValueException`.
- slim/psr7 1.8: `Stream::create()` removed (PSR-17 `StreamFactory::createStream()`); `getCookieParams()` never parses the `Cookie` header (tests use `withCookieParams()`; production gets cookies from `$_COOKIE`).
All four are documented in `docs/DECISIONS.md`.

### Handoff
- Phase 2 (trail maps) can lean on: `useAuthStore` (session state), `api()` (silent-refresh fetch), `RequireAuth`/`GuestOnly`/`RequireAdmin` guards, and the `LevelCalculator`/`/me` XP shape for level-up detection.
- Dev DB now contains the smoke users (`smoke.phase1@example.com`, `smoke.proxy@example.com`) — dev data only.
- Tag: `phase-1-done`. PR opened per `git.md` workflow — stop for review.

## Phase 2 — Content & the Trail Map (read-only)
**Status: COMPLETE** (started 2026-10-17, exit gate passed 2026-10-18) — plan at `docs/phases/PHASE_2_PLAN.md`, branch `phase-2-trails` (based on `phase-1-auth`)

### Build checklist
- [x] Migration `002_differentiators.sql` (full §17.7 delta: theme, landmark, est_minutes, handle/is_public, 5 new tables)
- [x] Idempotent seeder + seed JSON: 12 badges, Frontend Developer (12 nodes, 49 tasks, 7 quizzes) + Data Analyst (10 nodes, 30 tasks, 3 quizzes), dev users, production guard
- [x] `GET /roadmaps`, `GET /roadmaps/{slug}` (≤5 queries), `GET /nodes/{id}` (quiz answers stripped)
- [x] `NodeStateResolver` (O(nodes+edges), memoized DFS, cycle-safe) + unit tests (8 tests: 4 states, chains, diamond, boundaries, cycles, 300-node stress)
- [x] Landing: `CampusScene` hero (procedural, 3 parallax layers, fade mask, dusk variant), path picker, how-it-works stickers, featured paths, passport teaser, horizon footer
- [x] Catalog: search + difficulty filter, theme-tinted landmark cards, pixel-star difficulty
- [x] `RoadmapPage`: React Flow Trail Map (dotted trail edges, landmarks, fog/lantern/ring/flag states), node drawer / mobile bottom sheet, a11y
- [x] Loading skeletons + Biscuit empty/error states
- [x] Screenshots → `docs/screenshots/phase-2/` (3 pages × 375/768/1280 × light/dark = 18)
- [x] Reduced-motion: skeleton checker shimmer added to the `prefers-reduced-motion` rule (`.animate-checker-shimmer`)

### Exit gate results (2026-10-18, Docker stack live, branch `phase-2-trails`)
- [x] `npm run seed` twice → no duplicates. Row counts identical after both runs:
      roadmaps 2, nodes 22, node_prerequisites 26, tasks 79, badges 12, users 2,
      skills 0, node_skills 0.
- [x] `NodeStateResolver` unit tests: `OK` — 8 tests covering locked / available /
      in_progress / completed, unlock chains, diamond DAG, state boundaries,
      cycle safety, and a 300-node stress run (part of the full suite below).
- [x] Query-count test: `RoadmapDetailTest::testAuthedDetailUsesAtMostFiveQueries`
      (`CountingPdo` counts `prepare()`) — authed detail ≤5 queries, guests 4.
- [x] Screenshots: 18 PNGs in `docs/screenshots/phase-2/` via
      `scripts/capture-screenshots.mjs` (Playwright Chromium, theme seeded via
      init script). Visual review passed: parchment Trail Map with dotted-trail
      edges and landmark sprites (no default-flowchart look), dusk hero variant,
      catalog theme tints; guest preview state renders neutral (no fog/lock).
      Trail-map frames refreshed 2026-10-19 after the trailhead-zoom + node
      drawer fix (below).
      Minor polish noted for Phase 6: nav bar wraps to two rows at 375px.
- [x] Full gate from the root: `npm run lint` → PHPStan L6 `[OK] No errors`,
      PHP-CS-Fixer `0 files to fix`, ESLint + Prettier clean; `npm run test` →
      backend PHPUnit `OK (59 tests, 1824 assertions)`, frontend Vitest
      `13 files / 60 tests passed`; `tsc --noEmit` clean.

### Issues found & fixed while closing the gate
- Stray untracked `frontend/scripts/capture-screenshots.mjs` from an earlier
  session sat at the wrong path (inside `frontend/`, outside the repo-root
  `scripts/` the plan specifies) and broke `eslint .`; removed.
- The skeleton checker shimmer was not stopped under
  `prefers-reduced-motion: reduce` — added `.animate-checker-shimmer` to the
  reduced-motion rule (spec §9A.9).
- Trail Map opened at fit-all zoom — a 12-node trail squashes to ~0.4 at
  laptop sizes, so node titles were unreadable. Replaced the auto
  fit-to-view with a trailhead start: the map now opens at full-size zoom
  centred on the first stop (guests) or the learner's current node (authed);
  scroll/pan to explore, "Fit view" for the full map, MiniMap for orientation. Node
  tiles grew `w-40` → `w-48` with `text-base` titles; the MiniMap got the
  sticker border, rounded corners and a fixed 144×100 size (2026-10-19).
- The node drawer was anchored at `top: 0`, hiding the node title behind the
  floating nav bar. It is now a floating sticker card below the nav
  (`top-20`, right margin, rounded, 2px ink border + hard shadow) that slides
  in from the right on desktop; the mobile bottom sheet is unchanged
  (2026-10-19). Frontend gate re-verified after both fixes: Vitest
  `13 files / 60 tests passed`, ESLint + Prettier clean, `tsc --noEmit` clean.
- Trail nodes overlapped: seed rows were 150px apart but node tiles (w-48,
  up to ~183px tall with two-line titles) are taller than that, so
  same-column neighbours touched/overlapped. Re-spaced both seeds to 220px
  row pitch (columns keep x = 0/240/480) and re-seeded the dev DB
  (`DELETE FROM nodes` — all children cascade, no user progress yet — then
  `npm run seed`: 22 nodes / 26 prereqs / 79 tasks, same counts as the gate).
  Verified with a Playwright pairwise node-rect intersection check: 0
  overlaps on both trails (2026-10-19).
- Trail Map interaction: the map now opens at **zoom 1** (full-size nodes,
  never squashed to fit) and the trail travels by **scrolling** —
  `zoomOnScroll={false}` + `panOnScroll` + `panOnScrollMode={Vertical}` so
  wheel/trackpad pan like a page (verified: wheel pans at constant zoom
  1.0); pinch/ctrl+wheel still zooms, drag pans, `minZoom` raised to 0.3 so
  the trail can't be zoomed unreadable, "Fit view" shows the full trail
  (2026-10-19).

### Handoff
- Read-only content flow is done: landing → catalog → Trail Map, guest and
  (stateless) preview. Phase 3 slots straight in: enroll endpoints
  (`POST/DELETE /roadmaps/{slug}/enroll`, `GET /me/enrollments`),
  `ProgressService::completeTask`, XP toast + level-up modal, dashboard.
  The Trail Map already renders all four states from `GET /roadmaps/{slug}`;
  completion work invalidates `['roadmap', slug]`, `['me']`, `['quests','today']`.
- `NodeStateResolver` is shared with the admin cycle check in Phase 5
  (memoized DFS, cycle-safe).
- Migration 002 already landed the whole §17.7 delta — Phase 5 differentiators
  (test-out, project submissions, rusty nodes, passport, overlap) need no
  further schema work.
- QA tooling: `scripts/capture-screenshots.mjs` is reusable for later phases
  (point `PAGES` at the new routes; bump the output dir to `phase-N`).
- Dev DB contains the seeded content plus Phase 1 smoke users — dev data only.
- Tag: `phase-2-done`. PR opened per `git.md` workflow — stop for review.
