# Decisions Log

Running log of decisions made where `spec.md` was ambiguous or silent (spec §15.5:
"pick the simplest secure option and document it").

## Phase 0 — Foundation & Design System

- **`firebase/php-jwt` uses v7, not v6.** Spec §2 names the library without a major
  version. Packagist advisory `PKSA-y2cr-5h3j-g3ys` affects every v6.x release
  (v6.10.0–v6.11.1); the fix shipped in v7.0.0 (key-size validation,
  `SensitiveParameter`, `iat`/`nbf` validation). Composer's advisory policy blocks
  the vulnerable v6 range, so we pin `^7.0` (latest v7.2.1). Public API for HS256
  encode/decode is unchanged, so Phase 1 auth code is unaffected.
- **Validator: `respect/validation`.** Spec §2 allows `respect/validation` or
  `symfony/validator`; we pick the one listed first.
- **Tailwind CSS v3.4** with the classic `tailwind.config.js`. v4 moved config to
  CSS-first syntax; v3.4 gives the simplest, most stable mapping of §9A tokens to
  semantic utilities (`bg-paper`, `text-ink`, …).
- **Windows-friendly commands: root `package.json` scripts mirror the Makefile.**
  Spec §12 allows "Makefile (or npm scripts)". The Makefile is kept for CI/Linux
  parity; on this Windows dev box `npm run …` is the primary interface (npm runs
  the `docker compose` commands for us).
- **Dev proxy chain: Vite (:5173) → nginx (:8080) → php-fpm.** Vite cannot speak
  FastCGI, so the SPA dev server proxies `/api` to the nginx container. The CORS
  middleware is implemented regardless (spec §7 cross-cutting).
- **Slim routes include the `/api/v1` prefix** (no nginx rewrite), so URLs are
  identical through nginx, the Vite proxy, and in PHPUnit.
- **Backend PHP deps install at container runtime** (`docker compose run --rm php
  composer install`) rather than baked into the image — keeps the image small and
  the lockfile authoritative, per the agreed container-only workflow.
- **PHPUnit smoke tests use a SQLite in-memory PDO** for the health endpoint so
  smoke tests run without a live Postgres. Postgres-backed tests (fresh test DB
  per run) arrive with later phases per spec §11.
- **Frontend `node_modules` for the `web` service lives in a Docker volume** (not
  the host mount) to avoid Windows/WSL2 file-locking and dual-install confusion.
  The host runs its own `npm install` for Vitest/lint.
- **Migrations runner records applied files in `schema_migrations`** and wraps
  each file in one transaction (Postgres DDL is transactional), making re-runs
  no-ops and failed migrations roll back cleanly.

## Phase 1 — Authentication & Accounts

- **PHPUnit now uses a fresh Postgres test database** (`careercampus_test`,
  dropped + recreated + migrated per run in `tests/bootstrap.php`), replacing
  the Phase 0 in-memory SQLite stopgap per spec §11. The CI workflow already
  provisions a `careercampus_test` Postgres service, so dev and CI match.
- **Refresh cookie (`cc_refresh`) sets the `Secure` flag only when
  `APP_ENV=production`.** Dev runs on http://localhost where browsers refuse
  Secure cookies; the spec's cookie contract (httpOnly, Secure, SameSite=Lax,
  30 d) is fully in force in production.
- **Rate limiting is file-based with `flock`** (spec §7: "Postgres- or
  file-based is fine"). Sliding 60 s window, key `group:client-ip`; the
  storage dir is env-overridable (`RATE_LIMIT_DIR`) so tests run in a temp dir.
- **`GET /api/v1/admin/ping`** is a minimal admin-only probe route registered in
  Phase 1 so the Admin middleware (learner → 403) is testable; full admin CRUD
  arrives in Phase 5.
- **`POST /auth/register` sets the refresh cookie too** (spec only spells it
  out for login) so the "register → reload → still signed in" flow works.
- **Error codes:** duplicate email → `409 email_taken`; bad credentials →
  `401 invalid_credentials`; missing/expired/revoked refresh token →
  `401 invalid_refresh`; reuse of an already-rotated token revokes **all** of
  the user's refresh tokens (spec §7).
- **Client IP** comes from the first `X-Forwarded-For` entry, falling back to
  `REMOTE_ADDR` — nginx is always in front (dev proxy chain and production).
- **`LevelCalculator` (pure, `src/Domain/`) introduced in Phase 1** because
  `GET /me` must return `level` and `xp_to_next`: `level = floor(sqrt(xp/50)) +
  1`, `xp_to_next = 50·level² − xp`, title bands per §5.3. Phase 3 reuses the
  same class for level-up detection.
- **Slim 4.15 route groups use a callback API, and group callbacks are public
  static methods.** `group($pattern, $callback)` requires the callback (which
  receives the group's route collector); the returned `RouteGroupInterface` has
  no route methods. The callback is resolved through Slim's
  `CallableResolver::bindToContainer()`, which calls `Closure::bindTo()` — that
  returns null (with a PHP warning) for STATIC closures and crashes the app, so
  `Routes` passes `[Routes::class, 'method']` references instead of closures.
- **php-di 8: a plain class-string definition value is a LITERAL string.**
  `Clock::class => SystemClock::class` no longer instantiates `SystemClock`
  (it normalizes to a `ValueDefinition`); interface→implementation bindings use
  closures (`Clock::class => static fn (): Clock => new SystemClock()`).
  The Phase 0 string alias was latent — Phase 1 is the first container
  consumer of `Clock`.
- **`firebase/php-jwt` v7 has no common exception base class.** `JWTException`
  was removed; `ExpiredException` / `BeforeValidException` /
  `SignatureInvalidException` each extend `\UnexpectedValueException` directly,
  so `AuthMiddleware` catches that.
- **slim/psr7 1.8:** `Stream::create()` is gone (use PSR-17
  `StreamFactory::createStream()`), and `Request::getCookieParams()` never
  parses the `Cookie` header — tests set cookie params explicitly with
  `withCookieParams()` (production gets them from `$_COOKIE` via
  `createFromGlobals()`).

## Phase 2 — Content & the Trail Map (read-only)

- **Migration 002 is the full §17.7 delta, named `002_differentiators.sql`.**
  `phases.md` asked for `002_theme_landmark.sql` (only `roadmaps.theme` +
  `nodes.landmark`), but spec §17.7 defines the complete schema delta and is
  authoritative. Applying the whole delta now (theme, landmark,
  `test_out_quiz`, `est_minutes`, `task_completions.source`,
  `users.handle`/`is_public`, plus the `user_goals`, `project_submissions`,
  `skills`, `node_skills`, `node_reviews` tables) avoids a Phase 5
  re-migration and honours §17.8's "design for, don't build yet".
- **Guest node state is `null`, not a fifth state.** Spec §4 defines exactly
  four computed states, and the roadmap reads are public (spec §7). For
  guests, `GET /roadmaps/{slug}` returns `state: null` on every node; the
  frontend renders `null` as the neutral preview look (full colour, no
  fog/lock). No client ever sees a state outside the four in §4.
- **`OptionalAuthMiddleware` for public-but-personalised reads.** No
  `Authorization` header → request passes through as a guest; a PRESENT but
  invalid Bearer token → 401, because the client's silent-refresh flow
  (spec §9.3) needs that signal to refresh and retry once. Used on
  `GET /roadmaps`, `GET /roadmaps/{slug}` and `GET /nodes/{id}`.
- **Seeder idempotency strategy.** Badges: `ON CONFLICT (code) DO NOTHING`.
  Roadmaps: upserted by `slug` — meta (title, summary, theme, …) refreshed,
  node tree untouched. Node tree: inserted only while the roadmap has zero
  nodes, so re-seeding never wipes learner progress. Dev users:
  `ON CONFLICT (email) DO NOTHING`; the seeder exits 1 with a message when
  `APP_ENV=production` (spec §10). Verified by running `npm run seed` twice:
  row counts identical (roadmaps 2, nodes 22, prerequisites 26, tasks 79,
  badges 12, users 2).
- **Query-count proof via `CountingPdo`.** `RoadmapDetailTest` swaps the
  app's PDO for a subclass that counts `prepare()` calls (it stays a real
  PDO on the same DSN, so behaviour is unchanged) and asserts the roadmap
  detail stays inside its budget: ≤5 prepared statements authed
  (roadmap, nodes, edges, tasks, enrollment+per-node counts) and 4 for
  guests. Satisfies spec §14 "verify ≤ 5 queries per request".
- **Screenshot tooling: Playwright without a package.json change.**
  `scripts/capture-screenshots.mjs` (repo root) drives Playwright Chromium to
  capture the three public pages × 3 viewports × 2 themes →
  `docs/screenshots/phase-2/` (18 PNGs, exit-gate visual record). Playwright
  is installed with `npm i --no-save --no-package-lock playwright` at the
  repo root — `node_modules/` is gitignored and no manifest or lockfile
  changes, keeping it a QA tool rather than an app dependency. The theme is
  seeded via an `addInitScript` that writes the zustand-persist value
  (`careercampus-theme`) before app boot, so the first paint is already in
  the right theme.
- **Reduced-motion: skeleton shimmer stops too.** `.animate-checker-shimmer`
  (pixel skeleton shimmer, spec §9A.4/§9A.9) is added to the
  `prefers-reduced-motion: reduce` rule alongside `.trail-ants`, so no
  decorative animation runs for reduced-motion users.
- **Trail Map viewport: full-size, scroll-first, centred (user feedback,
  2026-10-19).** The trails are taller than the viewport (12-node trail ≈
  1.7k flow px), and auto fit-to-view squashed them to ~0.4 at laptop sizes —
  titles unreadable; wheel-zoom then shrank the trail further, which read as
  a bug; and centering on the x=0 trailhead left the path hugging the left
  side. Decision: open at **zoom 1**, horizontally centred on the trail's
  bounding box and vertically on the trail start (guests) or the learner's
  current node (authed); `zoomOnScroll={false}` + `panOnScroll`
  (`PanOnScrollMode.Free`) so wheel/trackpad pan the canvas like scrolling a
  page on both axes; pinch/ctrl+wheel still zooms (`minZoom` 0.3 so the trail
  can't be shrunk unreadable), drag pans, "Fit view" + MiniMap give the
  overview. Seed rows re-spaced to a 220px pitch (node tiles are up to ~183px
  tall) so same-column nodes never overlap — verified with a Playwright
  pairwise node-rect intersection check (0 overlaps on both trails) and a
  left/right margin check (equal gaps).
- **Dev API perf: optimized autoloader + opcache revalidate_freq 60 (perf fix,
  2026-10-19).** User reported slow page loads ("paths take time to load").
  Measured: every `GET /api/v1/*` took **0.6–2.1s** for 1–5 trivial queries —
  the DB was never the problem. Root cause: on this Windows dev box the app
  source is a 9P bind mount (./backend:/app), and each request paid two
  cross-boundary filesystem costs: (1) the default PSR-4 autoloader ran
  `file_exists` probes for ~100 classes per request (steady ~0.6s), and (2)
  stock opcache (`revalidate_freq=2`) re-stat'ed every cached file every ~2s,
  spiking requests to ~2s. Fixes (dev-only, no app code touched):
  `composer dump-autoload -o` (optimized classmap — 3427 classes, no per-request
  probing; now part of `npm run setup` / `make setup`) and
  `backend/php-opcache-dev.ini` (mounted as `conf.d/zz-opcache-dev.ini`,
  `revalidate_freq=60` — a PHP code change takes up to 60s to apply, or
  `docker compose restart php` to apply instantly). Result: **~21–38ms**
  per request (first hit on a freshly forked FPM worker is still ~1s cold).
  The remaining perceived load is Vite dev mode: the first page load after a
  container restart re-transforms every module from the 9P mount (~3.8s);
  later loads are ~0.8s (dev has no bundle). A production build (Phase 6)
  removes both costs; not changed now because the plan's dev workflow is
  `npm run dev` in-container.
