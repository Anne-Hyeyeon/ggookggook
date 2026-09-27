# Phase 2A+: Overnight Polish Plan

> For agentic workers: executed with superpowers:subagent-driven-development. Each task is independently reviewable. Tasks give exact requirements and acceptance checks rather than full code; read the files named in each task before editing.

**Goal:** Make the 2A app feel like something a person wants to open again: clean functional code, correct romanization, a way to change settings after onboarding, one-hand guide ergonomics, real app icon and splash, visual QA through a web preview, and a store-listing draft.

**Inputs:**
- Owner requests (2026-09-28, before sleeping): clean code with a functional orientation (AxFlow docs), assets, "would users really want this" (web references), Korean romanization of acupoint names, UI/UX and marketing.
- Research: `.superpowers/research/code-conventions.md`, `.superpowers/research/ux-reference.md`, `.superpowers/research/romanization.md` (all git-ignored scratch; Task 1 promotes the conventions into `docs/`).
- Spec: `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md`. Plan 2A: `docs/superpowers/plans/2026-09-28-phase2a-app-core-flow.md` (its Global Constraints apply here too).

## Global Constraints

- Everything from plan 2A's Global Constraints applies (colors, fonts, copy rules, `npm_config_os=darwin` prefix, no `src/app/` directory, no `npx expo lint`).
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No network services, no accounts, no paid APIs, no new illustration generation. Assets are derived from existing files in `content/images/raw/` with sharp.
- Route files stay under `apps/mobile/app/`; their tests stay in `apps/mobile/__tests__/` (Expo Router would treat any file in `app/` as a route). Tests for `apps/mobile/src/**` move next to their source.
- Every task ends with `npm test` and `npm run typecheck` green from the repo root.

---

### Task 1: Code conventions doc and functional refactors

- Create `docs/code-conventions.md` from `.superpowers/research/code-conventions.md` (keep rules, drop the violations list, fix rule 6 to the test-placement rule above). Link it from `AGENTS.md`.
- Fix the violations listed in the research file:
  1. Replace `content.acupoints.get(...)!` in screens with a `requireAcupoint(id)` accessor on the content index that throws a descriptive error.
  2. Rewrite `buildGuideSegments` in `packages/shared/src/guide.ts` with `flatMap`, no mutation. Existing tests must pass unchanged.
  3. Move the `EXPO_PUBLIC_GUIDE_SPEED` read into `apps/mobile/src/config/env.ts` (parsed once, exported constant).
  4. `PlateView`: a single `PIN_SIZE` constant for style and offset.
  5. Replace `/** */` comments in `packages/shared/src/content.ts` with `//` lines.
  6. Move tests for `apps/mobile/src/**` next to their source; keep route tests in `__tests__/`.
  7. Split `useSettings` into `useSettings` (routine settings) and `useOnboarding` (disclaimer flag + accept); root layout loads both.
- Acceptance: no behavior change; all tests pass; grep shows no `!)` non-null assertions on content lookups in `apps/mobile/app`.

### Task 2: Korean romanization of acupoint names

- Replace every `name.en` in `content/data/acupoints.json` with the "new en" column of `.superpowers/research/romanization.md` (Revised Romanization with sound changes).
- Update fixtures and tests that use the old pinyin names so they use the new ones (e.g. `Hegu` → `Hapgok`, `Neiguan` → `Naegwan`).
- Rebuild and resync: `npm run sync-content -w @ggookggook/mobile`.
- Acceptance: `npm run validate -w @ggookggook/content` has 0 errors; `grep -E '"en": "(Hegu|Zusanli|Neiguan)"' content/data/acupoints.json` prints nothing; app bundle JSON matches content/dist.

### Task 3: Web preview harness for visual QA

- Goal: render the real app screens in a browser at 390×844 and save screenshots, so screens can be reviewed without a simulator. Dev-only; must not change native behavior.
- Add web support the Expo way (`npm_config_os=darwin npx expo install react-dom react-native-web` in `apps/mobile`).
- Make the local database work on web. Prefer expo-sqlite's own web support (follow its docs: wasm asset, required COOP/COEP headers). If that is not workable, add `apps/mobile/src/db/DbProvider.web.tsx` that implements `SqlDatabase` with an in-memory adapter good enough for the store's queries, and document why.
- Add `apps/mobile/scripts/screenshots.mjs`: exports the web build (`npx expo export --platform web`), serves it locally with the needed headers, drives it with Playwright (install as a root devDependency with the darwin prefix; `npx playwright install chromium`), walks: welcome (both steps) → Today → search "잠이 안" → symptom `headache` → guide (first frame, then after a few seconds on rest) → done (after the guide finishes with a speed-up) , and writes PNGs to `.superpowers/screens/<name>.png` (git-ignored).
- Add script `"screens": "node scripts/screenshots.mjs"` to `apps/mobile/package.json` and a line in `AGENTS.md`.
- Acceptance: `npm run screens -w @ggookggook/mobile` produces at least 8 PNGs; the controller opens them. Fonts render (Pretendard, Noto Serif KR for acupoint names).

### Task 4: Settings screen

Gap: after onboarding there is no way to change pregnancy mode or haptics.
- Add route `app/settings.tsx` (inside the accepted guard) reached from a quiet "설정" text button in the Today header (top right).
- Rows separated by hairlines: 리듬 진동 (switch), 누르는 시간 (5초, − / + in 1-second steps, 3–10), 쉬는 시간 (2초, 1–5), 임신 중이에요 (switch, with the same sub text as welcome), 안내 다시 보기 (shows the four disclaimer notices on a sub-screen or expands inline), 앱 정보 (version from expo-constants, content version).
- Persist through `useSettings.update`. Tests: toggles persist; steppers clamp at bounds; pregnancy toggle changes the Today list minutes.

### Task 5: Guide ergonomics and correctness

- One-hand use: the pause/resume control becomes a full-width button at the bottom of the screen (thumb zone, ≥ 56pt tall); 닫기 stays top-right but asks for confirmation ("루틴을 그만할까요?" with 그만하기 / 계속하기) when the routine has started.
- While the session is saving after the last segment, show "기록하는 중…" instead of the frozen countdown.
- Segment change: fire one Success notification only (drop the extra Heavy press haptic on the same tick).
- `PlateView`: make the halo visible (separate halo view behind the dot), and mirror the plate image horizontally when the segment side is the opposite of the plate's `depicts` side (e.g. a `left` plate during a `right` segment), mirroring pin x as well.
- "다시 저장": disable while a save is in flight.
- Tests for each change.

### Task 6: Today screen that invites a return

- Header: date line, title, and the 설정 link from Task 4.
- Recent routine row stays. Add a quiet line under it when there is history: "나아졌어요 N번" (count of sessions with feedback `better`, all time). No streaks, no guilt.
- Put the most-used symptoms first when there is history (sort by completed session count desc, ties keep content order); with no history keep content order.
- Row touch targets ≥ 48pt; font scaling allowed but capped (maxFontSizeMultiplier 1.4) on the title and number styles.
- Store additions in `packages/store`: `countSessionsByFeedback(db, feedback)`, `countSessionsBySymptom(db): Promise<Record<string, number>>`, with tests.

### Task 7: App icon, splash, and store-listing draft

- Generate from `content/images/raw/cat-shoulder.png` with a sharp script `apps/mobile/scripts/make-icons.mjs`:
  - `assets/icon.png` 1024×1024: paper background `#F8F8F7`, the cat cropped to its head and paws, centered, line color kept; a small vermilion `#C23B2A` seal square with "꾹" in the bottom-right corner is optional only if it stays legible at 60px, otherwise omit.
  - `assets/adaptive-icon.png` 1024×1024 transparent foreground within the 66% safe zone.
  - `assets/splash-icon.png` the cat on transparent background, ~600px wide.
- Configure the splash with the `expo-splash-screen` config plugin (SDK 57 schema; background `#F8F8F7`), verify with `npx expo-doctor`.
- Write `docs/store-listing.md` (Korean, owner's writing style: bullets, short `~합니다` sentences): app name, subtitle (≤30 chars) options, short description, full description, keywords, screenshot storyboard with captions, safe-wording rules and the disclaimer sentence, based on `.superpowers/research/ux-reference.md`.
- Write `docs/illustration-todo.md`: the 13 missing plates and `body-back`, each with its ready-to-paste ChatGPT prompt from `npm run prompt -w @ggookggook/content -- <id>`.

### Task 8: Visual QA pass

- Run `npm run screens -w @ggookggook/mobile`; the controller reviews every PNG against the spec's visual direction and the research, lists concrete defects (spacing, hierarchy, truncation, contrast, copy), and dispatches fixes. Repeat until no Important visual defects remain.
