# CareerCampus — Phased Execution Plan

Companion to `spec.md` (the source of truth). This file tells the AI agent **what to build, in what order, and when it may move on.** If the two ever conflict, `spec.md` wins; note the conflict in `docs/DECISIONS.md`.

## How to use this file

1. Give the agent `spec.md` and `phases.md` once, then feed it **one phase at a time** using the "Agent prompt" block in each phase.
2. Do not start Phase N+1 until Phase N's **Exit gate** is fully green and you've reviewed it.
3. Each phase ends with a commit tagged `phase-N-done` and an updated `docs/PROGRESS.md`.

## Phase protocol (applies to every phase)

**Start**
- Read the spec sections listed under "Read".
- Write a short plan to `docs/phases/PHASE_N_PLAN.md` (files to create, order, risks). Keep it under one page.

**During**
- Work through the checklist top to bottom; commit after each logical chunk (`feat(auth): …`).
- Write tests alongside code, not afterwards.
- Style every UI piece with the §9A design system from the start. No unstyled placeholders.
- Stay in scope. Anything listed under "Out of scope" waits.

**End**
- Run the Exit gate commands and paste the results into `docs/PROGRESS.md`.
- Add a "Handoff" entry: what's done, what's stubbed, known issues, env/commands added.
- Update `README.md` with new commands or variables.
- Stop and wait for review.

---

## Phase 0 — Foundation & Design System
**Goal:** a running skeleton with infrastructure, database and the "Campus Paper" visual foundation, so every later screen looks right from day one.

**Read:** spec §2, §3, §6, §9A, §12.

**Build**
- [ ] Monorepo layout from §3; `.env.example`; Makefile (`up`, `migrate`, `seed`, `test`, `lint`).
- [ ] `docker-compose.yml`: postgres:16, php-fpm 8.3 (+`pdo_pgsql`), nginx, node/Vite.
- [ ] Backend: Slim 4 bootstrap, DI container, env config, Monolog, JSON error envelope, CORS, `GET /api/v1/health` (includes DB ping).
- [ ] `bin/migrate.php` runner (versioned, idempotent, records applied files) and `migrations/001_init.sql` (full §6 schema).
- [ ] Frontend: Vite + React + TS strict, Tailwind with §9A colour tokens (light + dark), self-hosted fonts (Fraunces, Figtree, Pixelify Sans), router shell, TanStack Query provider.
- [ ] Design foundation: `PixelSprite` renderer, first sprites (flame, shield, lock, flag, lantern, Biscuit idle), floating pill nav bar, sticker `Button`, `Card`, `Chip`, `Input`, theme toggle (persisted), paper grain + dot-grid background.
- [ ] Dev-only `/_art` gallery route showing every sprite in both themes.
- [ ] Lint/format configs (ESLint, Prettier, PHP-CS-Fixer, PHPStan L6); CI workflow skeleton.

**Out of scope:** auth, real pages, seed content, hero scene.

**Exit gate**
- `docker compose up` works from a clean clone; `make migrate` twice → second run is a no-op.
- `curl /api/v1/health` → `{ "ok": true, "db": true }`.
- `/_art` renders sprites correctly in light and dark.
- `make lint` and `make test` pass (a couple of smoke tests each side).

**Agent prompt**
> You are building CareerCampus. Read `spec.md` and `phases.md`. Execute **Phase 0 only** following the Phase protocol. Do not implement features from later phases. When the Exit gate passes, update `docs/PROGRESS.md`, tag `phase-0-done`, and stop.

---

## Phase 1 — Authentication & Accounts
**Goal:** secure registration, login, sessions and profile.

**Read:** spec §6 (users, refresh_tokens), §7 Auth, §8, §9.3, §11 (auth tests).

**Build**
- [ ] Argon2id hashing; JWT access (15 min) + rotating httpOnly refresh cookie; hashed token storage; reuse detection revokes all tokens.
- [ ] Endpoints: `register`, `login`, `refresh`, `logout`, `GET/PATCH /me` (with level, `xp_to_next`, streak fields).
- [ ] Middleware: Auth, Admin, RateLimit (auth endpoints 10/min/IP), JSON body, validation → error envelope.
- [ ] Frontend: typed API client with silent refresh + one retry on 401; in-memory token store; session restore on boot; `/login`, `/register` pages (React Hook Form + Zod, field errors from API); protected/guest/admin route guards.
- [ ] Nav shows level chip and streak chip when signed in (values from `/me`).
- [ ] Profile settings page (display name, avatar URL, timezone).

**Out of scope:** password reset, social login, roadmaps.

**Exit gate**
- PHPUnit: register, login, bad password, refresh rotation, reuse detection, admin route → 403 for learner.
- Vitest: form validation; client refresh-retry.
- Manual: register → reload page → still signed in; access token not in web storage.

**Agent prompt**
> Execute **Phase 1 only** from `phases.md`. Phase 0 is complete. Follow the Phase protocol, keep the access token in memory only, and stop when the Exit gate is green.

---

## Phase 2 — Content & the Trail Map (read-only)
**Goal:** seeded roadmaps browsable in the app, with the skill tree rendered as the signature Trail Map.

**Read:** spec §4, §6, §7 (roadmap reads), §9.2, §9A.6–9A.7, §9A.10, §10.

**Build**
- [ ] Migration `002_theme_landmark.sql`: add `roadmaps.theme` and `nodes.landmark` (from §17.7); update seed format accordingly.
- [ ] Seeder (`bin/seed.php`, idempotent, refuses dev users in production): badges, **Frontend Developer** (≥12 nodes) and **Data Analyst** (≥10 nodes) with mixed task types and ≥3 quizzes each; dev users.
- [ ] Endpoints: `GET /roadmaps`, `GET /roadmaps/{slug}`, `GET /nodes/{id}` (quiz answers stripped). Roadmap detail must use ≤5 queries.
- [ ] `NodeStateResolver` (O(nodes+edges)) — returns states for authed users; guests see all as `available`/preview.
- [ ] Frontend: landing page with `CampusScene` hero (parallax, fade mask, dusk variant), path picker; catalog page; `RoadmapPage` with React Flow Trail Map (dotted trail edges, landmark sprites, fog on locked, lantern on available), node drawer / bottom sheet on mobile.
- [ ] Loading skeletons, empty and error states with Biscuit.

**Out of scope:** enrolling, completing tasks, XP.

**Exit gate**
- `make seed` twice → no duplicates.
- `NodeStateResolver` unit tests for all four states and unlock chains.
- Query-count test: roadmap detail ≤5 queries.
- Visual check: screenshots of landing, catalog, Trail Map at 375/768/1280px in both themes saved to `docs/screenshots/phase-2/`.

**Agent prompt**
> Execute **Phase 2 only** from `phases.md`. Phases 0–1 are complete. Prioritise the Trail Map and landing hero visuals per §9A; they must not look like a default flowchart or template. Stop when the Exit gate is green.

---

## Phase 3 — Progress Engine & Gamification Core
**Goal:** learners can enroll and complete tasks; XP, levels, streaks, badges and daily quests all work and are celebrated in the UI.

**Read:** spec §5, §7 (progress + gamification), §8, §9.2 (task completion UX), §9A.8–9A.9, §11.

**Build**
- [ ] Enroll/unenroll endpoints; `GET /me/enrollments` with progress and next recommended node.
- [ ] Domain classes: `XpCalculator`, `LevelCalculator`, `StreakService` (timezone-aware, injectable `Clock`), `BadgeEngine` (rule registry), daily quest service.
- [ ] `ProgressService::completeTask` per §8 (single transaction, row lock, idempotent, locked-node → 409) returning the full `CompletionResult`.
- [ ] Endpoints: `POST /tasks/{id}/complete`, `GET /me/badges`, `GET /me/quests/today`, `GET /me/activity`.
- [ ] Frontend: enroll flow; mark-complete with optimistic UI; XP toast (sticker style) with breakdown; level-up modal with Biscuit + pixel confetti; badge-unlock toast; fog dissolve / trail draw unlock animation; reduced-motion fallbacks; query invalidation as in §9.3.
- [ ] Streak flame tiers and segmented XP bar in nav/dashboard components.

**Out of scope:** quizzes (grading), leaderboard, dashboard page, admin.

**Exit gate**
- PHPUnit: level boundaries (49→L1, 50→L2, 199→L2, 200→L3); XP per type and streak multipliers; streak same-day/next-day/gap/timezone; idempotent double-complete; **concurrent** double-submit awards once; locked node → 409; breakdown sums to `xp_awarded`.
- Manual: register → enroll → complete tasks → see XP toast, node completes, next node unlocks with animation, badge `first_step` appears.

**Agent prompt**
> Execute **Phase 3 only** from `phases.md`. This is the heart of the product: correctness and idempotency matter more than speed. Write the tests listed in the Exit gate before declaring done. Stop when green.

---

## Phase 4 — Learner Experience: Dashboard, Quizzes, Leaderboard, Profile
**Goal:** complete the learner-facing app.

**Read:** spec §5.3–5.6, §6.1, §7, §9.2, §9A.8, §9A.10.

**Build**
- [ ] Quizzes: `POST /tasks/{id}/submit-quiz` with server-side grading, pass threshold 0.6, best-score tracking, bonus XP once on first pass, no answer leakage; stepper UI with Biscuit `think`, results with per-question feedback and retry.
- [ ] `GET /leaderboard?period=weekly|all` with caller rank (exposes only display name, avatar, level, XP).
- [ ] Dashboard as a "campus notice board": Continue Learning, Today's Quest, Garden heatmap (§9A.8), recent badges, enrolled roadmaps.
- [ ] Leaderboard page with pixel-trophy podium and tabs.
- [ ] Profile page: badge shelf (tiered pixel medals, locked silhouettes), stats, settings.

**Out of scope:** admin, differentiators.

**Exit gate**
- Tests: quiz grading, answer never present in GET responses, retry doesn't double-award, leaderboard weekly window and rank.
- E2E smoke (Playwright): register → enroll → complete task → XP visible on dashboard.
- Screenshots of dashboard, quiz, leaderboard, profile (both themes, 375/1280px).

**Agent prompt**
> Execute **Phase 4 only** from `phases.md`. Do not expose `correct_index` or `explanation` before submission. Stop when the Exit gate is green.

---

## Phase 5 — Admin & Differentiators
**Goal:** content can be authored without code, and the features that make CareerCampus better than a static roadmap are live.

**Read:** spec §7 (Admin), §17 (all), §9A.10 (admin direction).

**Build — Admin**
- [ ] Admin CRUD for roadmaps (publish/unpublish), nodes, prerequisites (**cycle detection → 422**, no cross-roadmap links), tasks, badges; `GET /admin/stats`.
- [ ] Admin UI: calm tables/forms using the same tokens (no mascot/rotation); prerequisite multi-select; quiz JSON editor with validation.

**Build — Differentiators (migration `003_differentiators.sql` = remaining §17.7 deltas)**
- [ ] §17.1 Weekly plan + ETA (`user_goals`, `est_minutes`), onboarding question on enroll, Weekly Plan card.
- [ ] §17.2 Test-out (`POST /nodes/{id}/test-out`, 80% pass, 50% XP, once, 24h cooldown).
- [ ] §17.3 Project submissions (URL + reflection ≥100 chars, URL validation, no private IPs).
- [ ] §17.4 Rusty nodes + `POST /nodes/{id}/review` (+10 XP), vine overlay on the Trail Map.
- [ ] §17.5 Public Skill Passport at `/u/{handle}` (404 unless public); skills tagging in seeds.
- [ ] §17.6 Career overlap endpoint and catalog badge.

**Out of scope:** Phase-2-of-product items in §17.8 (squads, seasons, peer review…).

**Exit gate**
- Tests: cycle rejection, learner → 403 on admin routes, test-out cooldown/once-only/50% XP, project submission validation, rusty after 30 days (Clock injected), passport privacy, ETA calculation.
- All items in spec §17.9 checked.

**Agent prompt**
> Execute **Phase 5 only** from `phases.md`. Build admin first, then differentiators in the listed order. Re-use `ProgressService` for any XP so rules stay in one place. Stop when green.

---

## Phase 6 — Polish, Hardening & Release
**Goal:** production-ready quality, performance, accessibility and documentation.

**Read:** spec §9A.9, §9A.11, §12, §14, §15.

**Build**
- [ ] Security pass: rate limits on all routes, security headers + CSP in nginx, prepared-statement audit, no secrets/tokens in logs, production seeder guard.
- [ ] Accessibility pass: keyboard-navigable Trail Map nodes, ARIA state labels, focus rings, contrast ≥4.5:1 in both themes, reduced-motion everywhere, state never colour-only.
- [ ] Performance: route-level code splitting, lazy-load scene and React Flow, art payload <60 KB gzipped, Lighthouse Perf ≥90 / A11y ≥95 on landing and roadmap pages.
- [ ] Optional 8-bit sound toggle (off by default).
- [ ] Visual QA: review every page against §9A; replace anything that looks generic; save final screenshots.
- [ ] CI: lint + backend tests (Postgres service) + frontend tests + build + Playwright smoke.
- [ ] README with "Run it in 3 commands", env reference, architecture overview, and how to add a roadmap via seed JSON or admin.

**Exit gate**
- Everything in spec §14 and §17.9 is checked off.
- `make test` and `make lint` pass; CI green on a fresh clone.
- Final `docs/PROGRESS.md` summarises all phases and known limitations.

**Agent prompt**
> Execute **Phase 6 only** from `phases.md`. Audit the whole app against `spec.md` §14 and §9A.11, fix gaps, and produce a final report listing anything not met and why.

---

## Quick reference

| Phase | Theme | Rough size | Key risk |
|---|---|---|---|
| 0 | Foundation & design system | Small | Skipping design tokens now → generic UI later |
| 1 | Auth | Small | Token handling mistakes |
| 2 | Content & Trail Map | Medium | Trail Map looking like a default flowchart |
| 3 | Progress & gamification | Large | Double-awarding XP, race conditions |
| 4 | Dashboard, quizzes, leaderboard | Medium | Leaking quiz answers |
| 5 | Admin & differentiators | Large | Scope creep into §17.8 |
| 6 | Polish & hardening | Medium | Skipping accessibility/perf checks |

## Master kickoff prompt (paste once at the start)

> You are a senior full-stack engineer building **CareerCampus** (React + TypeScript, PHP 8.3 + Slim 4, PostgreSQL 16). `spec.md` is the source of truth and `phases.md` defines the order of work. Work on **one phase at a time**, only when I tell you which. For every phase: read the listed spec sections, write a short plan, build the checklist, write tests alongside code, run the Exit gate, update `docs/PROGRESS.md`, then stop and report. Never exceed the current phase's scope. If the spec is ambiguous, choose the simplest secure option and log it in `docs/DECISIONS.md`. Visual identity (§9A) is a requirement, not polish.
