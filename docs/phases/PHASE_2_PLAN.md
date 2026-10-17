# Phase 2 Plan — Content & the Trail Map (read-only)

**Branch:** `phase-2-trails` (based on `phase-1-auth`; rebase onto `main` after PR #1 merges).
**Spec:** §4, §6, §7 (roadmap reads), §8.3, §9.2, §9A.6–9A.7, §9A.10, §10, §17.7.
**Phases:** `phases.md` → "Phase 2 — Content & the Trail Map (read-only)".

## Goal

Seeded roadmaps browsable in the app, with the skill tree rendered as the signature
Trail Map. **Read-only**: no enrolling, no completing tasks, no XP (Phase 3).

## Scope

**Build**
- Migration `002_differentiators.sql` (full §17.7 delta).
- Idempotent seeder (`bin/seed.php`): 12 badges (§5.5), **Frontend Developer** (≥12 nodes)
  and **Data Analyst** (≥10 nodes) with mixed task types and ≥3 quizzes each, dev users.
- Endpoints: `GET /roadmaps`, `GET /roadmaps/{slug}`, `GET /nodes/{id}` (quiz answers
  stripped). Roadmap detail must use ≤5 queries.
- `NodeStateResolver` (O(nodes+edges)) — states for authed users; guests get `null`.
- Frontend: landing with `CampusScene` hero (parallax, fade mask, dusk variant) + path
  picker; catalog (search + difficulty filter); `RoadmapPage` with React Flow Trail Map
  (dotted trail edges, landmark sprites, fog/lantern/ring/flag states), node drawer
  / bottom sheet on mobile; loading skeletons, Biscuit empty/error states.

**Out of scope:** enrolling/unenrolling, completing tasks, quiz-taking UI, XP,
dashboard, leaderboard, admin UI, badges UI.

## Key decisions

1. **Migration = full §17.7 delta, named `002_differentiators.sql`** (phases.md says
   `002_theme_landmark.sql`; the spec delta is authoritative and is a superset — applying
   it all now avoids a Phase 4 re-migration and honours "design for, don't block yet").
   Includes: `roadmaps.theme jsonb`, `nodes.landmark varchar(30)`, `nodes.test_out_quiz`,
   `tasks.est_minutes`, `task_completions.source`, `users.handle`/`is_public`, tables
   `user_goals`, `project_submissions`, `skills`, `node_skills`, `node_reviews`.
2. **Guest node state is `null`** (not a fifth "preview" state — spec §4 defines exactly
   four). Frontend renders `null` as the neutral preview look (full colour, no fog/lock).
3. **Seeder idempotency:** roadmaps upserted by `slug` (meta refreshed, node tree
   untouched); node tree inserted only when the roadmap has no nodes yet (progress is
   never wiped by re-seeding); badges `ON CONFLICT (code) DO NOTHING`; dev users
   `ON CONFLICT (email) DO NOTHING`; the seeder **refuses to create dev users when
   `APP_ENV=production`** (exit 1 with a message).
4. **Query budget — roadmap detail ≤5:** (1) roadmap by slug, (2) nodes by roadmap,
   (3) prerequisite edges for those node ids, (4) tasks for those node ids,
   (5) authed only: one query returning the enrollment flag plus per-node completed/total
   required-task counts (LEFT JOIN). Guests: 4 queries.
5. **Quiz stripping lives in the DTO mapper only** (`stripQuizAnswers()`): questions are
   sent as `{id, prompt, options}` — never `correct_index` or `explanation` (§6.1).
   Integration test asserts the raw response body does not contain `correct_index`.
6. **State rules (spec §4, required tasks only), evaluated in this order:**
   `completed` (all required tasks done) → `locked` (any prereq not completed)
   → `in_progress` (≥1 required task done) → `available`.
7. **`NodeStateResolver` algorithm:** memoized DFS over the DAG (each node resolved
   exactly once → O(nodes+edges); diamonds resolve correctly). A visiting-set makes
   cycles safe: nodes in a cycle report `locked` (cycles can only come from the Phase 5
   admin, which rejects them, so this is belt-and-braces).
8. **Layout:** seed `pos` as integers — columns ~240 px apart, rows ~150 px, trail reads
   top→bottom with parallel branches; React Flow positions use `pos_x/pos_y` 1:1.
9. **`roadmaps.theme` jsonb:** `{"tint": "ember", "landmarks": ["workshop", "tower",
   "bridge", "studio"]}` — `tint` is a token name mapped to `var(--tint)` on the
   frontend; Frontend Developer = ember/workshop region, Data Analyst = lagoon/
   observatory region, so the two roadmaps feel like different regions (§9A.7).
10. **Screenshots:** committed dev script `scripts/capture-screenshots.mjs` driven by
    `npx playwright` (Chromium, no permanent dep in `package.json`); dark theme set via
    `localStorage['careercampus-theme']` before load. 18 shots: landing, catalog,
    `/roadmaps/frontend-developer` × {375, 768, 1280} × {light, dark} →
    `docs/screenshots/phase-2/`.
11. **Unpublished roadmaps are invisible** to the learner API (list omits, detail →
    404). Seed sets `is_published = true`.

## Steps (one commit each)

### Step 1 — Migration 002 + seeder + seed content
- `backend/migrations/002_differentiators.sql` — the §17.7 delta verbatim.
- `backend/bin/seed.php` — CLI on the same PDO bootstrap as `migrate.php`:
  - `seeds/badges.json` — the 12 §5.5 badges with rule JSON
    (`{"type":"streak","value":7}`, `{"type":"xp","value":500}`,
    `{"type":"tasks_completed","value":1}`, `{"type":"nodes_completed","value":1}`,
    `{"type":"quizzes_perfect","value":3}`, `{"type":"roadmaps_completed","value":1}`,
    `{"type":"level","value":5}`, …).
  - `seeds/roadmaps/frontend-developer.json` — 12 nodes: `internet-basics → html → css
    → git → javascript → dom → responsive-design → react → typescript → testing →
    build-tools → deployment`; 3–6 tasks/node (reading/video/practice/quiz mix;
    §5.1 default XP), ≥3 quizzes with 3–5 real questions each (correct_index +
    explanation), difficulty `beginner`, `est_hours` ~80, theme ember/workshop,
    `is_published: true`.
  - `seeds/roadmaps/data-analyst.json` — 10 nodes: `data-fundamentals →
    csv-spreadsheets → sql-basics → sql-joins-aggregates → python-basics → pandas →
    data-cleaning → visualization → statistics → dashboards`; ≥3 quizzes, difficulty
    `intermediate`, `est_hours` ~90, theme lagoon/observatory.
  - Resource URLs: MDN, freeCodeCamp, official docs home pages (spec §10).
- `tests/Unit/SeedContentTest.php` (no DB): both JSON files parse; node counts ≥12/≥10;
  ≥3 quizzes per roadmap; every prerequisite references an existing node slug; no
  prerequisite cycles; task types valid; every quiz question has prompt/options/
  correct_index/explanation; xp ≥ 0; every node has a valid landmark + pos.
- **Accept:** fresh DB → `npm run migrate && npm run seed` → expected row counts;
  seed twice → identical counts; `APP_ENV=production php bin/seed.php` → refuses dev
  users, exit 1.

### Step 2 — NodeStateResolver (pure domain)
- `src/Domain/NodeState.php` (enum: locked/available/in_progress/completed).
- `src/Domain/NodeStateResolver.php` — input: per-node facts
  `{id, prereqIds[], requiredTaskCount, completedRequiredTasks}`; output
  `map<nodeId, NodeState>`; memoized DFS per decision 7.
- `tests/Unit/NodeStateResolverTest.php`: all four states; unlock chain A→B→C
  (completing A flips B to available); diamond A→{B,C}→D; in_progress boundary
  (0 vs 1 vs all required tasks, optional tasks ignored); locked cascade through
  chains; cycle safety (cycle nodes → locked, no infinite loop); 300-node stress
  (completes, correct states — no timing asserts).
- **Accept:** PHPUnit green; PHPStan L6.

### Step 3 — Repositories + DTO mappers
- `RoadmapRepository` — `listPublished()` (node_count/task_count via scalar
  subqueries, single query), `findBySlug()`, `enrollmentProgress(userId, roadmapId)`
  (one query: enrolled? + completed/total required tasks).
- `NodeRepository` — `findByRoadmap()`, `findById()` (joins roadmap for slug +
  published flag), `prerequisitesFor(array<uuid>)` → `map<nodeId, prereqIds[]>`
  (one `IN` query; empty-input guard).
- `TaskRepository` — `findByNodes(array<uuid>)` → `map<nodeId, tasks[]>`
  (one `IN` query, `ORDER BY sort_order`).
- `src/Http/Dto/` — `RoadmapListDto`, `RoadmapDetailDto` (nodes + edges + per-node
  state/counters), `NodeDetailDto` (tasks + `completed` flag + state + missing
  prereqs). **`stripQuizAnswers()` is the only place quiz jsonb is serialized.**
  `theme` jsonb decoded once, in repositories.
- **Accept:** PHPStan L6; CS-Fixer clean.

### Step 4 — Services + controllers + routes + integration tests
- `src/Http/Middleware/OptionalAuthMiddleware.php` — attaches `user_id` when a valid
  Bearer token is present; passes through (guest) otherwise. Reusable for future
  public-but-personalized endpoints.
- `RoadmapService` — `listFor(?userId)` (adds `enrolled` + `percent_complete` when
  authed), `detailFor(slug, ?userId)` (404 unknown/unpublished; runs
  NodeStateResolver), `nodeFor(id, ?userId)` (404 unknown; tasks with `completed`).
- `RoadmapController` (index/show) + `NodeController` (show) — thin, no SQL.
- Routes (public group + `OptionalAuthMiddleware`): `GET /roadmaps`,
  `GET /roadmaps/[slug]`, `GET /nodes/[id]`.
- Integration tests (fresh test DB, seed roadmap fixtures via a small test helper that
  inserts roadmap+nodes+tasks SQL):
  - `RoadmapsListTest` — published only; counts correct; guest payload has no
    `enrolled`; authed payload has `enrolled:false` + `percent_complete:0`.
  - `RoadmapDetailTest` — full shape (nodes/edges); 404 unknown slug; 404 unpublished;
    guest states `null`; authed states computed with completions inserted directly
    (mix of locked/available/in_progress/completed); edges match `node_prerequisites`;
    **raw body does not contain `correct_index`/`explanation`**; **query-count test:
    `CountingPdo` wrapper (counts `prepare()`) proves authed detail ≤5 queries**.
  - `NodeDetailTest` — task list + `completed` flags (guest: all false); quiz questions
    stripped; 404 unknown id.
- **Accept:** PHPUnit green; PHPStan L6; CS-Fixer clean.

### Step 5 — Art: landmarks, nature, Biscuit wave, CampusScene
- `sprites/landmarks.ts` — 8 landmarks on 24-px grids (library, lab, workshop, studio,
  observatory, garden-gate, bridge, tower); CSS-var palettes + warm fixed tones;
  ≤2 KB each.
- `sprites/nature.ts` — cloud, tree, flower, sprout, signpost, fog puff (pixel cloud),
  firefly dot; small helpers for the star field.
- `sprites/biscuit.ts` — add a `wave` pose (needed by the hero; other poses stay
  Phase 3+).
- `art/scene.ts` — `buildCampusScene(variant: 'day' | 'dusk', seed)`: procedural,
  deterministic (mulberry32 PRNG, fixed seed per variant): gradient sky, rasterised
  pixel sun / moon, cloud sprites, stepped hill silhouettes (3 parallax layers),
  3–4 landmark sprites, stepped dirt trail, foreground trees, Biscuit (wave) beside a
  signpost. Dusk: darker sky, star field, lit windows (landmark palette swap),
  fireflies.
- `art/CampusScene.tsx` — renders the three layers with scroll/mouse parallax
  (framer-motion `useScroll`/`useTransform`), fully static under
  `prefers-reduced-motion` (matchMedia hook). The fade-into-paper `mask-image`
  gradient lives on the wrapper (landing hero), left + bottom edges.
- Add everything to the `/_art` dev gallery (landmarks, nature, scene day/dusk).
- `art/sprites.test.ts` — data integrity for every sprite export: uniform row widths,
  rows use only palette keys, `.` = transparent.
- **Accept:** tsc + ESLint + Prettier; gallery shows everything; no raster assets.

### Step 6 — Landing page
- Rewrite `HomePage`:
  - Hero: eyebrow ("A campus for your next career"), Fraunces H1 (§9A.3 clamp),
    short sub-copy, **path picker** — TanStack `['roadmaps']` rendered as sticker
    cards linking to `/roadmaps/:slug` (loading = pixel shimmer; error = Biscuit +
    retry).
  - Right: `CampusScene` bleeding off the right edge with the mask fade; dusk variant
    in dark mode.
  - "How it works": three scattered sticker cards at −2°/1°/−1° with a dotted-trail
    connector (SVG): Pick a path → Walk the trail → Level up.
  - "Featured paths": landmark cards of differing sizes from `['roadmaps']`
    (2 seeded + 1 "more soon" card).
  - Skill Passport teaser: static sticker card ("Your public trail report — coming
    soon").
  - Footer: pixel horizon strip (dim landscape sprite row).
- **Accept:** Vitest (path picker renders from a query fixture, reduced-motion path),
  tsc, ESLint, Prettier.

### Step 7 — Catalog page
- `RoadmapCatalogPage` replaces the ComingSoon at `/roadmaps`:
  - `['roadmaps']` query; client-side search (title/summary) + difficulty pills
    (All / Beginner / Intermediate / Advanced).
  - Card: theme-tinted landmark cluster (3 sprites), title, summary, est.-hours chip,
    difficulty as 1–3 pixel stars, node/task counts.
  - Empty state: Biscuit (sleep) + "no paths match" + clear-filters button.
- **Accept:** Vitest (filter + search behaviour, empty state, star counts).

### Step 8 — RoadmapPage + Trail Map
- `RoadmapPage` at `/roadmaps/:slug` (public; personalised when authed):
  - Query `['roadmap', slug]` (client attaches Bearer when present).
  - Sticky header: back link, title + icon, difficulty + est. hours, overall %
    (completed nodes / total), "You are here" marker when authed.
  - React Flow (`@xyflow/react`, package CSS imported once):
    - Custom `TrailNode`: round tile + landmark sprite + title + `x/y` task chip;
      state dressing — locked: fog puff overlay + desaturated sprite + LOCK;
      available: LANTERN + lagoon glow pulse; in_progress: 20-segment pixel ring;
      completed: full colour + moss FLAG + sparkle; `null` (guest): full colour,
      neutral.
    - Custom `TrailEdge`: stepped/orthogonal dotted dirt path (`stroke-dasharray`);
      edge into the first `available` node gets a marching-ants marigold animation
      (authed only; off under reduced motion).
    - Parchment canvas: CSS on the React Flow container (parchment tint + faint
      contour SVG data-URI + dot grid); no default dot background.
    - Controls: MiniMap (tinted via CSS) + fitView button; `fitView` by default.
    - A11y: `nodesFocusable`, Enter opens the drawer, ARIA labels ("Locked: HTML",
      "Completed: CSS"), visible focus ring.
  - Node drawer (right, desktop) / bottom sheet (mobile, CSS breakpoint +
    framer-motion slide): title + landmark, description, prerequisite chips
    (check/lock), task list — type icon (5 new 8-px task-type sprites: book, clapper,
    question, hammer, pencil → `icons.ts`), title, XP chip, resource link (external),
    quiz → "N questions".
  - Loading: pixel-shimmer skeleton (header + map placeholder). Error / 404 slug:
    Biscuit + "lost on the trail" + retry.
- Route wiring: replace the `/roadmaps` ComingSoon; add `/roadmaps/:slug`.
- `api/types.ts`: `RoadmapSummary`, `RoadmapDetail`, `RoadmapNode`, `RoadmapEdge`,
  `NodeState`, `NodeDetail`, `TaskDto`.
- **Accept:** Vitest — `TrailNode` renders all four states + preview (RTL, no canvas);
  `TrailEdge` path shape; drawer renders a `NodeDetail` fixture (quiz shows question
  count, no answers); `RoadmapPage` with `vi.mock('@xyflow/react')` + fetch-mocked
  query (header + % + drawer open). tsc + ESLint.

### Step 9 — Polish + screenshots
- `prefers-reduced-motion` audit across all new components (parallax, pulse, ants,
  shimmer, drawer springs); contrast ≥4.5:1 in both themes; state never colour-only
  (icons + ARIA labels everywhere).
- `scripts/capture-screenshots.mjs` (committed; `npx playwright` Chromium, no
  package.json change): 3 pages × {375×812, 768×1024, 1280×800} × {light, dark} →
  `docs/screenshots/phase-2/` (18 PNGs, `01-landing-{theme}-{width}.png` etc.); theme
  via localStorage init script; wait for network idle + settle timeout.
- **Accept:** 18 screenshots present; visual review passes (no default-flowchart
  look; fog/lantern/flag/tints visible in both themes).

### Step 10 — Docs + full gate
- `docs/PROGRESS.md` Phase 2 section (checklist, test coverage, exit-gate results,
  handoff); `docs/DECISIONS.md` entries (migration 002 naming/scope, guest state
  `null`, seeder idempotency, OptionalAuthMiddleware, CountingPdo query-count
  technique, screenshot tooling).
- Root gates: `npm run lint` + `npm run test` green; exit-gate items below.
- Commit, tag `phase-2-done`, push, PR (stop for review).

## Exit gate (phases.md)

- [ ] `npm run seed` twice → no duplicates (row counts identical).
- [ ] `NodeStateResolver` unit tests: all four states + unlock chains.
- [ ] Query-count test: authed roadmap detail ≤5 queries (`CountingPdo`).
- [ ] Screenshots: landing, catalog, Trail Map at 375/768/1280 × light/dark →
      `docs/screenshots/phase-2/`.
- [ ] PHPStan L6 + CS-Fixer + ESLint + Prettier + `tsc --noEmit` + PHPUnit + Vitest
      all green from the root.

## Pitfalls

- **React Flow v12** (`@xyflow/react`): register `nodeTypes`/`edgeTypes` as stable
  refs outside the component (re-creation resets nodes); type custom node props via
  `NodeProps` with a `data` type parameter; import the package CSS once; don't render
  `<ReactFlow>` inside jsdom unit tests (mock the module for page tests).
- **Deterministic scene:** fixed PRNG seed per variant — per-render randomness would
  break screenshots and visual stability.
- **jsonb from PDO is a string** — decode exactly once in repositories.
- **Quiz leak:** assert on the *raw response body* (a mapper slip could hide in
  decoded fixtures).
- **Empty `IN ()`** is invalid SQL — guard zero-id inputs in the repositories.
- **CountingPdo** extends PDO and overrides `prepare()` only; it must stay a real
  PDO (delegates to the same DSN).
- **Theme for screenshots:** zustand-persist shape `{"state":{"theme":"dark"},
  "version":0}` under key `careercampus-theme`.
- **PowerShell:** all docker/composer commands via `npm run` from the root.

## Handoff

- Phase 3 (Progress & gamification) slots straight in: enroll endpoints,
  `ProgressService::completeTask`, XP toasts + level-up modal, dashboard. The Trail
  Map already renders states and the drawer; completion work invalidates
  `['roadmap', slug]`, `['me']`, `['quests','today']`.
- Seed already contains project tasks; Phase 3/4 project submissions, test-out and
  rusty nodes reuse the §17.7 columns landed in 002.

