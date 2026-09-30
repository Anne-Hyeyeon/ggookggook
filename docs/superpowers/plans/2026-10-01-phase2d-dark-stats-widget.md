# Phase 2D: Dark Mode, My Records, and Home-Screen Widgets

> For agentic workers: execute with superpowers:subagent-driven-development. Read the files each task names and `docs/code-conventions.md` before editing.

**Goal:** Deliver the three follow-ups the owner approved on 2026-10-01: a dark mode that stays calm at night, a records screen that shows which routines helped the user (by their own feedback), and home-screen widgets that start a routine in one tap. The remaining 13 plate illustrations need the owner's ChatGPT and are out of scope; `docs/illustration-todo.md` stays the handoff.

## Global Constraints

- Plan 2A/2B/2C Global Constraints apply (tokens, fonts, hairlines, radius ≤ 4 except circular markers, polite Korean copy, no em dashes, no efficacy claims, `npm_config_os=darwin`, no `src/app/`, no `npx expo lint`, TDD, route tests in `__tests__/`, Co-Authored-By trailer naming the model).
- Records copy reports the user's own feedback, never effectiveness ("나아졌어요를 남긴 날", not "효과가 있었어요").
- Native widget code cannot be run on a device here; verify with unit tests, `npx expo prebuild --clean` in a temporary copy (never commit generated `ios/`/`android/`), `npx expo-doctor`, and typecheck. Say so in reports.

---

### Task 1: Dark mode

- Theme: light and dark token sets in `apps/mobile/src/theme.ts` (dark: background `#171614`, card `#211F1C`, ink `#ECE9E4`, sub `#B3ADA3`, faint `#8F897F` (≥ 4.5:1 on the dark background), rule `#34312C`, accent `#E0604C` (≥ 4.5:1), line `#D9D4CC`, scrim ink-based). A `useTheme()` hook returns the active tokens; `StyleSheet` factories take tokens (e.g. `makeStyles(t)` memoized per scheme).
- Setting "화면 모드": 시스템에 맞춤 (default) / 밝게 / 어둡게, stored in `Settings.appearance`, clamped on load.
- Illustrations: plate and map images are ink line art on transparency; in dark mode render them with `tintColor` = line token (expo-image supports tint). The cat keeps its red paw pads: show it on a small paper-colored rounded backing (card token of the light theme) in dark mode instead of tinting.
- Status bar style follows the scheme; navigation container background follows the scheme (no white flash).
- Every screen and primitive migrates to tokens from `useTheme()`; no hard-coded colors remain (`grep -rn "#[0-9A-Fa-f]\{6\}" apps/mobile/app apps/mobile/src` only finds theme.ts and generated files).
- Screenshot harness: add a dark pass (`colorScheme: 'dark'` in Playwright) writing `dark-*.png` for 03, 05, 06, 08, 12, 14, 20.

### Task 2: My records (나의 기록)

- Store queries (tested): `listSessionsBetween(db, fromIso, toIso)`, `statsByRoutine(db, fromIso)` → per routine ref: completed count, total seconds, feedback counts.
- Pure helpers in `apps/mobile/src/records.ts` (tested): last-28-days day buckets (local dates) with session count and whether any "better" feedback; this week vs last week totals; top routines by count with their "나아졌어요" share.
- Route `/records` reached from a "기록 전체 보기" row at the end of the 지난 기록 section in 내 루틴:
  - Summary line: "이번 주 N번 · M분" and the previous week in sub text.
  - A 4-week dot calendar (7 × 4 grid, dot size by count; accent ring on days with 나아졌어요), accessible as a list of day labels.
  - "자주 한 루틴" rows: name, count, total minutes, and "나아졌어요 N번" (never a percentage claim), tap → preview.
  - Empty state with the cat.

### Task 3: Home-screen widgets

- iOS via `expo-widgets` (read its installed docs and TypeScript types; config plugin in app.json). One small widget "꾹꾹": shows the most recent routine name with "다시 하기" and the current time-of-day suggestion; tapping each opens a deep link (`ggookggook://symptom/<id>` or `ggookggook://routine/<id>`).
- Android via `react-native-android-widget` (read its docs; config plugin; register the widget task handler). Same content and deep links.
- Data flow: after each completed session, settings change, or app foreground, write a small JSON snapshot (recent routine ref + title, suggestion ref + title, generatedAt) through a `src/widget/sync.ts` module that calls each platform's update API; web is a no-op. Unit-test the snapshot builder (pure) and the sync calls (mocked).
- Deep links: confirm the Expo Router scheme `ggookggook` resolves `symptom/<id>` and `routine/<id>`; add tests for the link parser if custom handling is needed; links must respect the disclaimer gate (open the welcome first when not accepted).
- Verification: `npx expo-doctor`, typecheck, and a throwaway `npx expo prebuild --clean` in a temp copy of `apps/mobile` to confirm both plugins generate without errors (report the output; do not commit native folders).

### Task 4: QA and final review

- Regenerate all screenshots including the dark pass; controller reviews; fix visual issues.
- Update `docs/store-listing.md` (dark mode, records, widgets) in the owner's style.
- Final whole-branch review and one fix wave; push.
