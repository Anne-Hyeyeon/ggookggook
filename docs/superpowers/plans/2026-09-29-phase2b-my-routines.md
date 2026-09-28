# Phase 2B: My Routines, Favorites, and Reminders Plan

> For agentic workers: execute with superpowers:subagent-driven-development. Tasks give exact requirements and acceptance checks; read the named files before editing and follow `docs/code-conventions.md`.

**Goal:** Let people build and run their own acupressure routines, keep favorite acupoints, copy a symptom routine to edit it, add a point to a routine from its detail screen, and get an optional daily reminder that opens a routine.

**Spec:** `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md` (화면 구성: 루틴 편집, 즐겨찾는 혈자리, 내 루틴 탭; 사용자 데이터). Owner request 2026-09-29: "나만의 루틴 만들기, 즐겨찾기 완성" plus reminders; home-screen widget is deferred.

## Global Constraints

- Plan 2A's Global Constraints apply: colors, fonts (serif only for acupoint names), hairline rules, radius ≤ 4, polite Korean UI copy (`~해요`/`~세요`), no em dashes, never promise results, `npm_config_os=darwin` prefix for installs, never create `apps/mobile/src/app/`, no `npx expo lint`.
- Route tests in `apps/mobile/__tests__/`; tests of `apps/mobile/src/**` next to their source; store tests with better-sqlite3. TDD.
- Offline only. No accounts. Data lives in the device SQLite through `packages/store`.
- User routines: name 1–20 characters (trimmed), 1–10 steps, each step's seconds a multiple of 10 in 10–600, the same acupoint may appear more than once (list keys use the step index, never the acupoint id).
- Deletes are soft (`deleted_at`), matching the spec's sync rule.
- Commit messages: conventional commits with a `Co-Authored-By:` trailer naming the model that wrote them.
- Every task ends with `npm test` and `npm run typecheck` green.

---

### Task 1: Store and pure routine helpers

- `packages/shared/src/user-routine.ts` (pure, vitest): `USER_ROUTINE_LIMITS` (name 20, steps 10, seconds 10..600 step 10); `validateUserRoutine(input): { ok: true; value } | { ok: false; errors: string[] }` with Korean error strings ("이름을 적어 주세요.", "혈자리를 하나 이상 넣어 주세요.", "혈자리는 10개까지 넣을 수 있어요."); immutable step helpers `addStep`, `removeStep(index)`, `moveStep(from, to)`, `setStepSeconds(index, seconds)` (clamped and snapped to 10).
- `packages/store`: migration 2 adds `user_routines (id TEXT PK, name TEXT, steps TEXT JSON, source_symptom_id TEXT NULL, created_at, updated_at, deleted_at NULL)` and `favorites (acupoint_id TEXT PK, created_at, updated_at, deleted_at NULL)`. Repos: `listUserRoutines(db)` (not deleted, newest updated first), `getUserRoutine(db, id)`, `saveUserRoutine(db, routine, now)` (upsert, bumps updated_at), `deleteUserRoutine(db, id, now)` (soft), `listFavorites(db)`, `isFavorite(db, id)`, `setFavorite(db, acupointId, on, now)` (soft delete/restore). Steps JSON parsed defensively (bad JSON → empty steps, logged).
- Acceptance: migration from version 1 keeps existing sessions; all repos tested including soft delete and restore.

### Task 2: One guide for symptoms and my routines

- Pure resolver in `apps/mobile/src/routines.ts`: `type RoutineRef = { kind: 'symptom'; id: string } | { kind: 'user'; id: string }`; `resolveRoutine(ref, deps): { title: string; steps: RoutineStep[] } | null` where deps provide content and a loaded user routine. Steps go through the same `visibleSteps` rules (drop unknown acupoints, pregnancy filter).
- Routes: keep `/guide/[id]` for symptoms (no breaking change) and add `/guide/routine/[id]` for user routines; both render one shared guide component. Session logs use `{ kind: 'user', routineId }` for user routines.
- Done screen and the 내 루틴 history list show user-routine names (a deleted routine shows "지운 루틴").
- Acceptance: existing guide tests unchanged and green; new tests run a two-step user routine to the done screen and see it in history.

### Task 3: Favorites

- Heart toggle on `/acupoint/[id]` (top right, accessible label "즐겨찾기에 추가" / "즐겨찾기에서 빼기", accessibilityState selected), optimistic with rollback on failure.
- Zustand `useFavorites` store in `src/state/favorites.ts` loaded at startup with the other stores.
- Acceptance: toggling persists across a remount; failure rolls back and shows "저장하지 못했어요. 다시 눌러 주세요.".

### Task 4: Routine editor and acupoint picker

- `/routine/new` and `/routine/[id]/edit` share one editor: name input (placeholder "루틴 이름", max 20), step rows (serif acupoint name, "60초" stepper −/+ by 10, 위로 / 아래로 buttons, 빼기), "혈자리 추가" row, 저장 button disabled while invalid, inline validation messages from Task 1.
- `/routine/pick`: search acupoints by Korean name, hanja, or romanization; favorites listed first under "즐겨찾는 혈자리"; tapping adds the acupoint with its `defaultSeconds` to the editor draft and returns.
- Draft state lives in a small zustand store (`src/state/routineDraft.ts`) so the picker can append; leaving the editor with unsaved changes asks "저장하지 않고 나갈까요?" (그만두기 / 계속 편집) using the same in-screen confirmation style as the guide.
- Acceptance: create, reorder, change seconds, remove, save, edit again; invalid states blocked; picker search and favorites-first order tested.

### Task 5: My routine preview, copy, and add-to-routine

- `/routine/[id]`: like the symptom preview (steps with numbers, serif names, seconds, side labels, "N곳 · 약 M분", pregnancy note when points are skipped) with 시작 (→ `/guide/routine/<id>`), 편집, and 지우기 (confirm "이 루틴을 지울까요?").
- Symptom preview gets "내 루틴으로 복사": creates a user routine named after the symptom (trimmed to 20), `source_symptom_id` set, then opens its editor.
- Acupoint detail gets "루틴에 추가": an in-screen sheet listing my routines plus "새 루틴 만들기"; choosing one appends the point (with `defaultSeconds`, respecting the 10-step limit with a message) and shows "추가했어요".
- Acceptance: tests for each path including the 10-step limit.

### Task 6: 내 루틴 tab

- Sections separated by hairlines: 즐겨찾는 혈자리 (rows → acupoint detail; empty line "하트를 누른 혈자리가 여기에 모여요."), 내 루틴 (rows with name and "N곳 · 약 M분" → routine preview; a "새 루틴 만들기" row), 지난 기록 (existing).
- Remove the "나만의 루틴 만들기는 준비 중이에요." footer.
- Refresh on focus; rejection falls back to empty sections.

### Task 7: Daily reminder

- `npm_config_os=darwin npx expo install expo-notifications`; configure the plugin per its installed docs.
- Settings section "알림": switch "매일 알려 주기", time (hour and minute steppers, 10-minute steps, default 오후 3:00), and which routine (a picker listing symptoms and my routines; default 눈이 뻑뻑할 때).
- Turning it on requests permission; if denied, the switch returns to off with "알림 권한이 꺼져 있어요. 기기 설정에서 켜 주세요.".
- Schedule one repeating daily local notification (cancel and reschedule on any change). Copy: title "꾹꾹", body "잠깐 {routine name} 루틴을 해 볼까요?". Tapping opens the routine's preview (symptom or user routine) via a response listener in the root layout.
- Settings persist in `Settings` (add `reminder: { enabled, hour, minute, routine: RoutineRef } | null` with defaults and clamping in the store).
- Acceptance: tests with expo-notifications mocked: schedule on enable, cancel on disable, reschedule on change, permission denied path, tap routing.

### Task 8: QA and E2E

- Extend `apps/mobile/scripts/screenshots.mjs`: 15-mine-empty-sections, 16-routine-editor, 17-routine-picker, 18-routine-preview, 19-mine-full, 20-settings-reminder. The controller reviews every PNG and dispatches fixes.
- Add `apps/mobile/e2e/my-routine.yaml`: create a routine from the 내 루틴 tab with two points, run it at `EXPO_PUBLIC_GUIDE_SPEED=10`, see it in history.
