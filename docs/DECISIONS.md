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
