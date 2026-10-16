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
