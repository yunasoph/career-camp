# Phase 1 Plan — Authentication & Accounts

**Scope** (phases.md Phase 1): Argon2id + JWT access (15 min) + rotating httpOnly
refresh cookie with reuse detection; `register`/`login`/`refresh`/`logout`,
`GET/PATCH /me`; Auth/Admin/RateLimit middleware; typed API client with silent
refresh + retry; `/login`, `/register`, `/profile`; nav level + streak chips.
**Out of scope:** password reset, social login, roadmaps.

## Decisions (mirrored in `docs/DECISIONS.md`)
1. **Tests move to a fresh Postgres test DB** (`careercampus_test`): `tests/bootstrap.php`
   drops + recreates + migrates it per run, replacing the Phase 0 SQLite stopgap
   (spec §11). CI already provisions a `careercampus_test` Postgres service.
2. **Refresh cookie `Secure` only in production** — dev runs on http://localhost,
   where browsers drop Secure cookies. Name: `cc_refresh`, path `/api/v1`,
   SameSite=Lax, 30 days, httpOnly.
3. **Rate limiter is file-based with `flock`** (spec allows "Postgres- or
   file-based"). Key = `group:client-ip`; dir overridable via `RATE_LIMIT_DIR`
   (tests point it at a temp path). Auth group: 10/min/IP.
4. **Admin probe route `GET /api/v1/admin/ping`** (admin-only, returns
   `{"ok":true}`) so the Admin middleware is testable now; full admin CRUD is
   Phase 5.
5. **Register also sets the refresh cookie** so "reload → still signed in"
   holds immediately after registration.
6. **Error codes:** duplicate email → `409 email_taken`; bad credentials →
   `401 invalid_credentials`; expired/missing refresh → `401 invalid_refresh`.
7. **`LevelCalculator` is a pure class introduced now** (needed by `/me`):
   `level = floor(sqrt(xp/50)) + 1`, `xp_to_next = 50·level² − xp`, plus the
   display title bands (§5.3). Phase 3 reuses it.
8. **Client IP** = first `X-Forwarded-For` entry, else `REMOTE_ADDR`
   (nginx is always in front in every environment).

## Backend
**New**
- `src/Auth/JwtService.php` — HS256 encode/decode (`sub`, 15 min `exp`, Clock).
- `src/Auth/PasswordService.php` — Argon2id `hash`/`verify`.
- `src/Auth/RefreshTokenService.php` — issue / rotate / revoke / reuse detection
  (SHA-256 hash stored; reuse → revoke **all** of the user's tokens).
- `src/Repository/UserRepository.php`, `src/Repository/RefreshTokenRepository.php`.
- `src/Service/AuthService.php` — register/login orchestration (no SQL in controllers).
- `src/Domain/LevelCalculator.php`.
- `src/Http/Controllers/AuthController.php` (register/login/refresh/logout),
  `MeController.php` (get/patch), `AdminController.php` (ping probe).
- `src/Http/Middleware/AuthMiddleware.php` (Bearer → `user_id` attribute),
  `AdminMiddleware.php` (role check → 403), `RateLimitMiddleware.php` (→ 429 envelope).
- `src/Support/RequestIp.php`, `src/Validation/FieldRules.php`
  (respect/validation 2.x → `{field: [messages]}` details map).

**Changed**
- `Settings.php` (+ refresh cookie name/TTL, rate-limit thresholds/dir).
- `Routes.php` (auth routes; `GET /me` + `PATCH /me` behind Auth; admin group behind Auth+Admin;
  RateLimit on `/auth/*`).
- `Container.php` (bindings for new services).
- `tests/bootstrap.php` (test DB lifecycle), `tests/AppTestCase.php`
  (Postgres test DB + `TRUNCATE users, refresh_tokens` per test; helper to
  capture `Set-Cookie`).

**Tests (PHPUnit)** — `RegisterTest`, `LoginTest` (incl. bad password → 401),
`RefreshTest` (rotation: old cookie dead, new works; reuse of revoked token
revokes all), `MeTest` (level/xp_to_next shape, PATCH), `AdminGuardTest`
(learner → 403, admin → 200), `RateLimitTest` (11th auth req → 429).

## Frontend
**New**
- `src/api/types.ts` (User, AuthResponse, ApiErrorEnvelope), `src/api/client.ts`
  (fetch wrapper: in-memory Bearer token; on 401 → `/auth/refresh` once → retry;
  failure → clear session + redirect `/login`; `credentials: 'include'`).
- `src/store/authStore.ts` (Zustand: `token`, `user`, status; never persisted).
- `src/lib/session.ts` (boot restore: `/auth/refresh` → token + `['me']`).
- `src/routes/guards.tsx` (`RequireAuth`, `GuestOnly`, `RequireAdmin`).
- `src/lib/validation.ts` (Zod: register / login / profile schemas).
- `src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `ProfilePage.tsx`
  (RHF + Zod, field errors from the API envelope, §9A sticker styling).

**Changed**
- `App.tsx` (routes + guards), `NavBar.tsx` (level chip + streak flame chip +
  sign-out, from `['me']`), `Input.tsx` (`error` prop).

## Order
1. Test infra (bootstrap + AppTestCase on Postgres) — existing health tests stay green.
2. Backend: services → repos → auth controllers/routes → middleware → PHPUnit gate.
3. Frontend: client + store + session restore → auth pages + guards → profile + nav chips → Vitest gate.
4. `npm run lint` (PHPStan L6 + CS-Fixer + ESLint/Prettier) → README/PROGRESS → exit gate.

## Risks
- **Cookies through the Vite proxy** — path `/api/v1`, origin `localhost:5173`;
  `SameSite=Lax` + same-origin proxy should work; verified in the manual gate.
- **Rotation in tests** — no real browser; parse `Set-Cookie` and resend manually.
- **Rate-limit test isolation** — per-run temp dir via `RATE_LIMIT_DIR`.
- **respect/validation 2.x API** — centralised in `FieldRules` so quirks live in one place.
- **PHPStan L6 on closures/DI bindings** — type explicitly from the start.

## Exit gate (phases.md)
- PHPUnit: register, login, bad password, refresh rotation, reuse detection, admin route → 403 for learner.
- Vitest: form validation; client refresh-retry.
- Manual: register → reload → still signed in; access token not in web storage.
