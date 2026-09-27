# Phase 2A: App Foundation and Core Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an offline Expo app where a first-time user accepts the disclaimer, picks a symptom on the Today tab, reviews its routine, follows the guided press-and-rest timer point by point, and records how they feel at the end.

**Architecture:** Platform-free logic lives in workspace packages tested with vitest: `packages/shared` gains the guide engine and symptom search, and a new `packages/store` holds SQLite migrations and repositories written against a small `SqlDatabase` interface (tested with better-sqlite3, run in the app through expo-sqlite). `apps/mobile` is an Expo SDK 57 app using Expo Router; it bundles the content produced by `content/dist` and keeps screens thin over those packages. The Browse and My Routines tabs are placeholders until Phase 2B.

**Tech Stack:** Expo SDK 57, Expo Router, React Native (template version), TypeScript ~6.0.3, expo-sqlite, expo-haptics, expo-keep-awake, expo-image, expo-font, zustand, jest-expo + @testing-library/react-native, vitest, better-sqlite3, Maestro.

**Spec:** `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md`
**Follow-ups this plan must honor:** `docs/superpowers/notes/2026-09-27-phase1-followups.md` (2단계 section)

## Global Constraints

- App name 꾹꾹 (ggookggook). New packages use the `@ggookggook/` scope. iOS bundle id and Android package `kr.ggookggook.app` (placeholder until store setup in phase 5).
- Expo SDK 57 (`expo` ~57.0.x). Use the versions `npx expo install` picks; never hand-pin React or React Native. TypeScript stays at the root's `~6.0.3`.
- Every install runs with `npm_config_os=darwin` in front (the user's `~/.npmrc` sets `os=linux`; never edit it). Example: `npm_config_os=darwin npx expo install expo-haptics`.
- Before using any Expo, Expo Router, expo-sqlite, or @testing-library/react-native API beyond what this plan shows, read that package's docs under `node_modules/<pkg>/` or https://docs.expo.dev and follow the installed version.
- No login and no network in 2A. Content comes only from the bundled copy.
- Colors: background `#F8F8F7`, ink `#23211E`, secondary text `#6A665E`, faint text `#8A857C`, hairline rule `#E2E2DF`, card `#FFFFFF`, accent 인주 `#C23B2A`, illustration line `#3A3732`.
- Fonts: Pretendard (Regular, SemiBold, Bold) for all UI text. Noto Serif KR Bold only for acupoint names.
- Visual rules: sections separated by hairline rules, not cards. Corner radius at most 4. No English uppercase labels, no gradients, no glassmorphism, no hashtag chips, no emoji icons.
- Copy: acupoint content keeps its `~입니다` / `~하세요` style. UI copy is short polite Korean (`~해요`, `~세요`). No em dashes. Never promise results ("치료", "완치", "효과").
- The guide screen shows no cat. The cat appears on the welcome and done screens.
- Commit messages follow conventional commits and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

```
package.json                        workspaces += "apps/*"
AGENTS.md                           mobile + store commands, npm_config_os note
packages/shared/src/
  guide.ts, guide.test.ts           resolveSteps, buildGuideSegments, rhythmAt, advanceGuide, guideElapsedTotal
  search.ts, search.test.ts         searchSymptoms
  index.ts                          re-exports
packages/store/
  package.json, tsconfig.json
  src/db.ts                         SqlDatabase interface
  src/migrate.ts                    migrations + migrate()
  src/kv.ts                         getValue, setValue
  src/settings.ts                   loadSettings, saveSettings, disclaimer helpers
  src/sessions.ts                   insertSession, setSessionFeedback, getSession, latestCompletedSession
  src/index.ts
  src/test-db.ts                    better-sqlite3 adapter (tests only, not exported)
  src/*.test.ts
apps/mobile/
  package.json, app.json, tsconfig.json, babel.config.js (only if the template has one)
  scripts/sync-content.mts          copies content/dist into the app
  assets/content/*.webp             generated, committed
  src/content/bundle.json           generated, committed
  src/content/images.ts             generated, committed
  src/content/index.ts              buildIndex(), content singleton
  src/theme.ts                      colors, fonts, space
  src/format.ts                     date and duration formatting
  src/routine.ts                    visibleSteps, sideLabel, firstSentence
  src/id.ts                         newId()
  src/ui/Txt.tsx, Button.tsx, Rule.tsx, TabBar.tsx, PlateView.tsx
  src/db/DbProvider.tsx             expo-sqlite open + migrate + context
  src/state/settings.ts             zustand settings store
  src/guide/useGuide.ts             interval hook over advanceGuide
  app/_layout.tsx                   fonts, providers, protected routes
  app/welcome.tsx                   2-step intro + disclaimer + pregnancy toggle
  app/(tabs)/_layout.tsx            custom tab bar
  app/(tabs)/index.tsx              Today
  app/(tabs)/browse.tsx             placeholder
  app/(tabs)/mine.tsx               placeholder
  app/symptom/[id].tsx              routine preview
  app/guide/[id].tsx                guided timer
  app/done.tsx                      completion + feedback
  e2e/core-flow.yaml                Maestro flow
  __tests__/*.test.tsx              jest-expo tests
```

---

### Task 1: Guide engine and symptom search in shared

**Files:**
- Create: `packages/shared/src/guide.ts`, `packages/shared/src/guide.test.ts`, `packages/shared/src/search.ts`, `packages/shared/src/search.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `Acupoint`, `RoutineStep`, `Symptom` (content.ts), `AcupointLookup` (routine.ts).
- Produces:
  - `type GuideSide = 'left' | 'right' | 'both' | 'center'`
  - `interface GuideSegment { stepIndex: number; acupointId: string; side: GuideSide; seconds: number }`
  - `resolveSteps(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[]`
  - `buildGuideSegments(steps: readonly RoutineStep[], lookup: AcupointLookup): GuideSegment[]`
  - `type RhythmPhase = 'press' | 'rest'`, `interface RhythmState { phase: RhythmPhase; secondsLeftInPhase: number; pressNumber: number; pressCount: number }`
  - `rhythmAt(elapsedSeconds: number, segmentSeconds: number, pressSeconds: number, restSeconds: number): RhythmState`
  - `interface GuideProgress { index: number; elapsed: number; finished: boolean }`, `type GuideEvent = 'press' | 'rest' | 'segment' | 'finish'`
  - `advanceGuide(progress: GuideProgress, segments: readonly GuideSegment[], pressSeconds: number, restSeconds: number): { progress: GuideProgress; events: GuideEvent[] }`
  - `guideElapsedTotal(progress: GuideProgress, segments: readonly GuideSegment[]): number`
  - `searchSymptoms(symptoms: readonly Symptom[], acupoints: ReadonlyMap<string, Pick<Acupoint, 'name'>>, query: string): Symptom[]`

- [ ] **Step 1: Write the failing guide tests**

`packages/shared/src/guide.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Acupoint } from './content';
import { advanceGuide, buildGuideSegments, guideElapsedTotal, resolveSteps, rhythmAt, type GuideProgress } from './guide';
import type { AcupointLookup } from './routine';

const lookup: AcupointLookup = new Map<string, Pick<Acupoint, 'sides' | 'cautions'>>([
  ['LI4', { sides: 'sequential', cautions: ['pregnancy'] }],
  ['EX-HN5', { sides: 'together', cautions: [] }],
  ['GV29', { sides: 'single', cautions: [] }],
]);

describe('resolveSteps', () => {
  it('drops steps whose acupoint no longer exists', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'ST36', seconds: 60 },
    ];
    expect(resolveSteps(steps, lookup)).toEqual([{ acupointId: 'LI4', seconds: 60 }]);
  });
});

describe('buildGuideSegments', () => {
  it('splits sequential points into left then right and keeps others whole', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'EX-HN5', seconds: 30 },
      { acupointId: 'GV29', seconds: 40 },
    ];
    expect(buildGuideSegments(steps, lookup)).toEqual([
      { stepIndex: 0, acupointId: 'LI4', side: 'left', seconds: 60 },
      { stepIndex: 0, acupointId: 'LI4', side: 'right', seconds: 60 },
      { stepIndex: 1, acupointId: 'EX-HN5', side: 'both', seconds: 30 },
      { stepIndex: 2, acupointId: 'GV29', side: 'center', seconds: 40 },
    ]);
  });
});

describe('rhythmAt', () => {
  it('alternates 5 seconds of pressing with 2 seconds of rest', () => {
    expect(rhythmAt(0, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 5, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(4, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 1, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(5, 60, 5, 2)).toEqual({ phase: 'rest', secondsLeftInPhase: 2, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(7, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 5, pressNumber: 2, pressCount: 9 });
  });

  it('never counts past the end of the segment', () => {
    expect(rhythmAt(56, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 4, pressNumber: 9, pressCount: 9 });
    expect(rhythmAt(60, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 0, pressNumber: 9, pressCount: 9 });
    expect(rhythmAt(90, 60, 5, 2).pressNumber).toBe(9);
  });
});

describe('advanceGuide', () => {
  const segments = buildGuideSegments([{ acupointId: 'GV29', seconds: 10 }, { acupointId: 'EX-HN5', seconds: 10 }], lookup);
  const start: GuideProgress = { index: 0, elapsed: 0, finished: false };

  it('emits rest and press when the rhythm phase changes', () => {
    let progress = start;
    const events: string[] = [];
    for (let i = 0; i < 7; i++) {
      const result = advanceGuide(progress, segments, 5, 2);
      progress = result.progress;
      events.push(...result.events);
    }
    expect(progress).toEqual({ index: 0, elapsed: 7, finished: false });
    expect(events).toEqual(['rest', 'press']);
  });

  it('moves to the next segment and emits segment then press', () => {
    const result = advanceGuide({ index: 0, elapsed: 9, finished: false }, segments, 5, 2);
    expect(result.progress).toEqual({ index: 1, elapsed: 0, finished: false });
    expect(result.events).toEqual(['segment', 'press']);
  });

  it('finishes after the last segment and then stays finished', () => {
    const result = advanceGuide({ index: 1, elapsed: 9, finished: false }, segments, 5, 2);
    expect(result.progress).toEqual({ index: 1, elapsed: 10, finished: true });
    expect(result.events).toEqual(['finish']);
    expect(advanceGuide(result.progress, segments, 5, 2).events).toEqual([]);
  });

  it('finishes immediately when there are no segments', () => {
    expect(advanceGuide(start, [], 5, 2)).toEqual({ progress: { index: 0, elapsed: 0, finished: true }, events: ['finish'] });
  });
});

describe('guideElapsedTotal', () => {
  it('adds finished segments to the current elapsed time', () => {
    const segments = buildGuideSegments([{ acupointId: 'LI4', seconds: 60 }], lookup);
    expect(guideElapsedTotal({ index: 1, elapsed: 15, finished: false }, segments)).toBe(75);
  });
});
```

- [ ] **Step 2: Write the failing search tests**

`packages/shared/src/search.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Acupoint, Symptom } from './content';
import { searchSymptoms } from './search';

const symptoms: Symptom[] = [
  { id: 'insomnia', name: '불면', aliases: ['잠이 안 올 때'], steps: [{ acupointId: 'HT7', seconds: 60 }], seeDoctor: '…' },
  { id: 'eye_fatigue', name: '눈 피로', aliases: [], steps: [{ acupointId: 'BL2', seconds: 60 }], seeDoctor: '…' },
  { id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '…' },
];
const acupoints = new Map<string, Pick<Acupoint, 'name'>>([
  ['HT7', { name: { ko: '신문', hanja: '神門', en: 'Shenmen' } }],
  ['BL2', { name: { ko: '찬죽', hanja: '攢竹', en: 'Cuanzhu' } }],
  ['LI4', { name: { ko: '합곡', hanja: '合谷', en: 'Hegu' } }],
]);

describe('searchSymptoms', () => {
  it('returns every symptom for an empty query', () => {
    expect(searchSymptoms(symptoms, acupoints, '  ')).toHaveLength(3);
  });

  it('matches aliases', () => {
    expect(searchSymptoms(symptoms, acupoints, '잠이 안').map((s) => s.id)).toEqual(['insomnia']);
  });

  it('ignores spaces', () => {
    expect(searchSymptoms(symptoms, acupoints, '눈피로').map((s) => s.id)).toEqual(['eye_fatigue']);
  });

  it('matches acupoint names used in the routine', () => {
    expect(searchSymptoms(symptoms, acupoints, '합곡').map((s) => s.id)).toEqual(['headache']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -w @ggookggook/shared`
Expected: FAIL, cannot resolve `./guide` and `./search`.

- [ ] **Step 4: Implement guide.ts**

`packages/shared/src/guide.ts`:
```ts
import type { RoutineStep } from './content';
import type { AcupointLookup } from './routine';

export type GuideSide = 'left' | 'right' | 'both' | 'center';

export interface GuideSegment {
  stepIndex: number;
  acupointId: string;
  side: GuideSide;
  seconds: number;
}

export function resolveSteps(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[] {
  return steps.filter((step) => lookup.has(step.acupointId));
}

export function buildGuideSegments(steps: readonly RoutineStep[], lookup: AcupointLookup): GuideSegment[] {
  const segments: GuideSegment[] = [];
  steps.forEach((step, stepIndex) => {
    const acupoint = lookup.get(step.acupointId);
    if (!acupoint) return;
    if (acupoint.sides === 'sequential') {
      segments.push({ stepIndex, acupointId: step.acupointId, side: 'left', seconds: step.seconds });
      segments.push({ stepIndex, acupointId: step.acupointId, side: 'right', seconds: step.seconds });
      return;
    }
    segments.push({ stepIndex, acupointId: step.acupointId, side: acupoint.sides === 'together' ? 'both' : 'center', seconds: step.seconds });
  });
  return segments;
}

export type RhythmPhase = 'press' | 'rest';

export interface RhythmState {
  phase: RhythmPhase;
  secondsLeftInPhase: number;
  pressNumber: number;
  pressCount: number;
}

export function rhythmAt(elapsedSeconds: number, segmentSeconds: number, pressSeconds: number, restSeconds: number): RhythmState {
  const cycle = pressSeconds + restSeconds;
  const pressCount = Math.max(1, Math.ceil(segmentSeconds / cycle));
  const clamped = Math.min(Math.max(elapsedSeconds, 0), segmentSeconds);
  const cycleIndex = Math.min(Math.floor(clamped / cycle), pressCount - 1);
  const position = clamped - cycleIndex * cycle;
  const segmentLeft = segmentSeconds - clamped;
  if (position < pressSeconds || segmentLeft === 0) {
    return { phase: 'press', secondsLeftInPhase: Math.min(pressSeconds - position, segmentLeft), pressNumber: cycleIndex + 1, pressCount };
  }
  return { phase: 'rest', secondsLeftInPhase: Math.min(cycle - position, segmentLeft), pressNumber: cycleIndex + 1, pressCount };
}

export interface GuideProgress {
  index: number;
  elapsed: number;
  finished: boolean;
}

export type GuideEvent = 'press' | 'rest' | 'segment' | 'finish';

export function advanceGuide(
  progress: GuideProgress,
  segments: readonly GuideSegment[],
  pressSeconds: number,
  restSeconds: number,
): { progress: GuideProgress; events: GuideEvent[] } {
  if (progress.finished) return { progress, events: [] };
  const segment = segments[progress.index];
  if (!segment) return { progress: { ...progress, finished: true }, events: ['finish'] };

  const elapsed = progress.elapsed + 1;
  if (elapsed >= segment.seconds) {
    if (progress.index + 1 >= segments.length) {
      return { progress: { index: progress.index, elapsed: segment.seconds, finished: true }, events: ['finish'] };
    }
    return { progress: { index: progress.index + 1, elapsed: 0, finished: false }, events: ['segment', 'press'] };
  }

  const before = rhythmAt(progress.elapsed, segment.seconds, pressSeconds, restSeconds).phase;
  const after = rhythmAt(elapsed, segment.seconds, pressSeconds, restSeconds).phase;
  return { progress: { ...progress, elapsed }, events: before === after ? [] : [after] };
}

export function guideElapsedTotal(progress: GuideProgress, segments: readonly GuideSegment[]): number {
  return segments.slice(0, progress.index).reduce((sum, segment) => sum + segment.seconds, 0) + progress.elapsed;
}
```

Note: `rhythmAt(60, 60, 5, 2)` has `position` 4 and `segmentLeft` 0, which falls into the press branch with 0 seconds left, as the test expects.

- [ ] **Step 5: Implement search.ts and re-export**

`packages/shared/src/search.ts`:
```ts
import type { Acupoint, Symptom } from './content';

const normalize = (text: string) => text.replace(/\s+/g, '').toLowerCase();

export function searchSymptoms(
  symptoms: readonly Symptom[],
  acupoints: ReadonlyMap<string, Pick<Acupoint, 'name'>>,
  query: string,
): Symptom[] {
  const needle = normalize(query);
  if (!needle) return [...symptoms];
  return symptoms.filter((symptom) => {
    const haystack = [symptom.name, ...symptom.aliases, ...symptom.steps.map((step) => acupoints.get(step.acupointId)?.name.ko ?? '')];
    return haystack.some((text) => normalize(text).includes(needle));
  });
}
```

`packages/shared/src/index.ts`:
```ts
export * from './content';
export * from './guide';
export * from './routine';
export * from './search';
export * from './user';
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test -w @ggookggook/shared && npm run typecheck -w @ggookggook/shared`
Expected: PASS, tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add guide engine and symptom search"
```

---

### Task 2: Local store package

**Files:**
- Create: `packages/store/package.json`, `packages/store/tsconfig.json`, `packages/store/src/{db,migrate,kv,settings,sessions,index,test-db}.ts`, `packages/store/src/{migrate,settings,sessions}.test.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `Settings`, `DEFAULT_SETTINGS`, `SessionLog`, `SessionFeedback` from `@ggookggook/shared`.
- Produces (from `@ggookggook/store`):
  - `type SqlValue = string | number | null`; `interface SqlDatabase { execAsync(source: string): Promise<void>; runAsync(source: string, params: SqlValue[]): Promise<unknown>; getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>; getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]> }`
  - `migrate(db: SqlDatabase): Promise<number>` (returns the schema version)
  - `getValue(db, key): Promise<string | null>`, `setValue(db, key, value, now: Date): Promise<void>`
  - `loadSettings(db): Promise<Settings>`, `saveSettings(db, settings: Settings, now: Date): Promise<void>`, `getDisclaimerAcceptedAt(db): Promise<string | null>`, `acceptDisclaimer(db, now: Date): Promise<string>`
  - `insertSession(db, log: SessionLog): Promise<void>`, `setSessionFeedback(db, id: string, feedback: SessionFeedback): Promise<void>`, `getSession(db, id: string): Promise<SessionLog | null>`, `latestCompletedSession(db): Promise<SessionLog | null>`

- [ ] **Step 1: Create the package and install**

`packages/store/package.json`:
```json
{
  "name": "@ggookggook/store",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@ggookggook/shared": "*"
  }
}
```

`packages/store/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

Run:
```bash
npm_config_os=darwin npm install
npm_config_os=darwin npm install -D better-sqlite3 @types/better-sqlite3 -w @ggookggook/store
```
Expected: installs cleanly; `node -e "require('better-sqlite3')(':memory:')"` from `packages/store` prints nothing and exits 0.

- [ ] **Step 2: Write the interface and the test adapter**

`packages/store/src/db.ts`:
```ts
export type SqlValue = string | number | null;

// Mirrors the subset of expo-sqlite's SQLiteDatabase that the store uses,
// so the app can pass an expo-sqlite database and tests can pass better-sqlite3.
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
}
```

`packages/store/src/test-db.ts`:
```ts
import Database from 'better-sqlite3';
import type { SqlDatabase } from './db';

export function openTestDb(): SqlDatabase {
  const db = new Database(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      return db.prepare(source).run(...params);
    },
    async getFirstAsync<T>(source: string, params: (string | number | null)[]) {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: (string | number | null)[]) {
      return db.prepare(source).all(...params) as T[];
    },
  };
}
```

- [ ] **Step 3: Write the failing tests**

`packages/store/src/migrate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

describe('migrate', () => {
  it('creates the schema once and is idempotent', async () => {
    const db = openTestDb();
    expect(await migrate(db)).toBe(1);
    expect(await migrate(db)).toBe(1);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(['kv', 'sessions']);
  });
});
```

`packages/store/src/settings.test.ts`:
```ts
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { setValue } from './kv';
import { migrate } from './migrate';
import { acceptDisclaimer, getDisclaimerAcceptedAt, loadSettings, saveSettings } from './settings';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('settings', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const settings = { ...DEFAULT_SETTINGS, pregnancyMode: true, pressSeconds: 6 };
    await saveSettings(db, settings, new Date('2026-09-28T00:00:00Z'));
    expect(await loadSettings(db)).toEqual(settings);
  });

  it('ignores unknown or mistyped keys and keeps defaults for them', async () => {
    await setValue(db, 'settings', JSON.stringify({ pregnancyMode: 'yes', rhythmHaptics: false, extra: 1 }), new Date());
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, rhythmHaptics: false });
  });

  it('falls back to defaults when the stored value is not JSON', async () => {
    await setValue(db, 'settings', 'not json', new Date());
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('disclaimer', () => {
  it('is unset until accepted', async () => {
    expect(await getDisclaimerAcceptedAt(db)).toBeNull();
    const at = await acceptDisclaimer(db, new Date('2026-09-28T01:02:03Z'));
    expect(at).toBe('2026-09-28T01:02:03.000Z');
    expect(await getDisclaimerAcceptedAt(db)).toBe(at);
  });
});
```

`packages/store/src/sessions.test.ts`:
```ts
import type { SessionLog } from '@ggookggook/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { migrate } from './migrate';
import { getSession, insertSession, latestCompletedSession, setSessionFeedback } from './sessions';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

const log = (id: string, completedAt: string | null): SessionLog => ({
  id,
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: '2026-09-28T00:00:00.000Z',
  completedAt,
  durationSeconds: 240,
  feedback: null,
});

describe('sessions', () => {
  it('round-trips a session', async () => {
    await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
    expect(await getSession(db, 'a')).toEqual(log('a', '2026-09-28T00:04:00.000Z'));
    expect(await getSession(db, 'missing')).toBeNull();
  });

  it('round-trips a user routine reference', async () => {
    await insertSession(db, { ...log('u', null), routine: { kind: 'user', routineId: 'r1' } });
    expect((await getSession(db, 'u'))?.routine).toEqual({ kind: 'user', routineId: 'r1' });
  });

  it('records feedback', async () => {
    await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
    await setSessionFeedback(db, 'a', 'better');
    expect((await getSession(db, 'a'))?.feedback).toBe('better');
  });

  it('finds the most recently completed session', async () => {
    await insertSession(db, log('old', '2026-09-27T00:04:00.000Z'));
    await insertSession(db, log('new', '2026-09-28T00:04:00.000Z'));
    await insertSession(db, log('open', null));
    expect((await latestCompletedSession(db))?.id).toBe('new');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -w @ggookggook/store`
Expected: FAIL, cannot resolve `./migrate`, `./kv`, `./settings`, `./sessions`.

- [ ] **Step 5: Implement migrate, kv, settings, sessions, index**

`packages/store/src/migrate.ts`:
```ts
import type { SqlDatabase } from './db';

const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    routine_kind TEXT NOT NULL CHECK (routine_kind IN ('symptom', 'user')),
    routine_ref TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_seconds INTEGER NOT NULL,
    feedback TEXT CHECK (feedback IN ('better', 'same', 'worse'))
  );
  CREATE INDEX sessions_completed_at ON sessions (completed_at);
  `,
];

export async function migrate(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw error;
    }
    version += 1;
  }
  return version;
}
```

`packages/store/src/kv.ts`:
```ts
import type { SqlDatabase } from './db';

export async function getValue(db: SqlDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setValue(db: SqlDatabase, key: string, value: string, now: Date): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, now.toISOString()],
  );
}
```

`packages/store/src/settings.ts`:
```ts
import { DEFAULT_SETTINGS, type Settings } from '@ggookggook/shared';
import type { SqlDatabase } from './db';
import { getValue, setValue } from './kv';

const SETTINGS_KEY = 'settings';
const DISCLAIMER_KEY = 'disclaimerAcceptedAt';

function parse(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function loadSettings(db: SqlDatabase): Promise<Settings> {
  const stored = parse(await getValue(db, SETTINGS_KEY));
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = stored[key];
    if (typeof value === typeof DEFAULT_SETTINGS[key]) (settings as Record<keyof Settings, unknown>)[key] = value;
  }
  return settings;
}

export async function saveSettings(db: SqlDatabase, settings: Settings, now: Date): Promise<void> {
  await setValue(db, SETTINGS_KEY, JSON.stringify(settings), now);
}

export async function getDisclaimerAcceptedAt(db: SqlDatabase): Promise<string | null> {
  return getValue(db, DISCLAIMER_KEY);
}

export async function acceptDisclaimer(db: SqlDatabase, now: Date): Promise<string> {
  const at = now.toISOString();
  await setValue(db, DISCLAIMER_KEY, at, now);
  return at;
}
```

`packages/store/src/sessions.ts`:
```ts
import type { SessionFeedback, SessionLog } from '@ggookggook/shared';
import type { SqlDatabase } from './db';

interface SessionRow {
  id: string;
  routine_kind: 'symptom' | 'user';
  routine_ref: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  feedback: SessionFeedback | null;
}

function toLog(row: SessionRow): SessionLog {
  return {
    id: row.id,
    routine: row.routine_kind === 'symptom' ? { kind: 'symptom', symptomId: row.routine_ref } : { kind: 'user', routineId: row.routine_ref },
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    feedback: row.feedback,
  };
}

export async function insertSession(db: SqlDatabase, log: SessionLog): Promise<void> {
  const ref = log.routine.kind === 'symptom' ? log.routine.symptomId : log.routine.routineId;
  await db.runAsync(
    'INSERT INTO sessions (id, routine_kind, routine_ref, started_at, completed_at, duration_seconds, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [log.id, log.routine.kind, ref, log.startedAt, log.completedAt, log.durationSeconds, log.feedback],
  );
}

export async function setSessionFeedback(db: SqlDatabase, id: string, feedback: SessionFeedback): Promise<void> {
  await db.runAsync('UPDATE sessions SET feedback = ? WHERE id = ?', [feedback, id]);
}

export async function getSession(db: SqlDatabase, id: string): Promise<SessionLog | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? toLog(row) : null;
}

export async function latestCompletedSession(db: SqlDatabase): Promise<SessionLog | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1', []);
  return row ? toLog(row) : null;
}
```

`packages/store/src/index.ts`:
```ts
export * from './db';
export * from './kv';
export * from './migrate';
export * from './sessions';
export * from './settings';
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test -w @ggookggook/store && npm run typecheck -w @ggookggook/store`
Expected: PASS (10 tests), tsc exits 0.

- [ ] **Step 7: Update AGENTS.md and commit**

Append under `## Commands` in `AGENTS.md`:
```markdown
- `npm test -w @ggookggook/store`: local SQLite store tests (better-sqlite3)
```
Append a new section:
```markdown
## Installing packages

The user's `~/.npmrc` sets `os=linux`. Prefix every install with `npm_config_os=darwin`, including `npx expo install`. Do not edit `~/.npmrc`.
```

```bash
git add packages/store package.json package-lock.json AGENTS.md
git commit -m "feat(store): add local SQLite store for settings and sessions"
```

---

### Task 3: Expo app scaffold, theme, and tab shell

**Files:**
- Create: `apps/mobile/**` from the Expo template, then `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx` (temporary stub), `apps/mobile/app/(tabs)/browse.tsx`, `apps/mobile/app/(tabs)/mine.tsx`, `apps/mobile/src/theme.ts`, `apps/mobile/src/ui/{Txt,Button,Rule,TabBar}.tsx`, `apps/mobile/__tests__/ui.test.tsx`
- Delete: template `App.tsx` and `index.ts`
- Modify: root `package.json` (workspaces), `AGENTS.md`

**Interfaces:**
- Produces:
  - `colors`, `fonts`, `space(n: number): number` from `@/theme`
  - `Txt` component: `<Txt variant="title" | "heading" | "body" | "sub" | "caption" | "point" | "pointSmall" | "number" style? numberOfLines? accessibilityRole?>`
  - `Button` component: `<Button label: string onPress kind?: 'primary' | 'secondary' disabled? />`
  - `Rule` component: hairline divider, `<Rule strong? />` (strong = 1.5px ink)
  - `TabBar` component for Expo Router `Tabs` `tabBar` prop
  - Path alias `@/` → `apps/mobile/src/`

- [ ] **Step 1: Generate the app from the SDK 57 template**

Add `"apps/*"` to the root `package.json` `workspaces` array (keep the existing entries).

Run from the repo root:
```bash
mkdir -p apps && cd apps && npm_config_os=darwin npx create-expo-app@latest mobile --template blank-typescript@sdk-57 --no-install && cd ..
```

Edit `apps/mobile/package.json`:
- `"name": "@ggookggook/mobile"`, `"private": true`, `"main": "expo-router/entry"`
- scripts: `"start": "expo start"`, `"ios": "expo run:ios"`, `"android": "expo run:android"`, `"test": "jest"`, `"typecheck": "tsc --noEmit -p tsconfig.json"`
- add `"@ggookggook/shared": "*"` and `"@ggookggook/store": "*"` to dependencies
- remove any `typescript` devDependency the template added (the root provides `~6.0.3`)

Delete `apps/mobile/App.tsx` and `apps/mobile/index.ts`.

Run:
```bash
npm_config_os=darwin npm install
cd apps/mobile
npm_config_os=darwin npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-font expo-sqlite expo-haptics expo-keep-awake expo-image react-native-reanimated react-native-worklets
npm_config_os=darwin npx expo install jest-expo @testing-library/react-native @types/jest -- --save-dev
npm_config_os=darwin npm install zustand pretendard @expo-google-fonts/noto-serif-kr
cd ../..
```
Expected: all installs succeed. `npx expo-doctor` (run in `apps/mobile`) reports no version mismatches; if it reports any, apply the fix it suggests with `npm_config_os=darwin npx expo install --fix`.

- [ ] **Step 2: Configure app.json, tsconfig, jest**

`apps/mobile/app.json` (replace the template's):
```json
{
  "expo": {
    "name": "꾹꾹",
    "slug": "ggookggook",
    "scheme": "ggookggook",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "backgroundColor": "#F8F8F7",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#F8F8F7" },
    "ios": { "bundleIdentifier": "kr.ggookggook.app", "supportsTablet": false },
    "android": { "package": "kr.ggookggook.app", "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#F8F8F7" } },
    "plugins": ["expo-router", "expo-sqlite", "expo-font"],
    "experiments": { "typedRoutes": true }
  }
}
```
If the template's icon or splash file names differ, point these fields at the files the template actually created.

`apps/mobile/tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["scripts"]
}
```

Add to `apps/mobile/package.json`:
```json
"jest": {
  "preset": "jest-expo",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" }
}
```

- [ ] **Step 3: Write the theme and UI primitives**

`apps/mobile/src/theme.ts`:
```ts
export const colors = {
  bg: '#F8F8F7',
  ink: '#23211E',
  sub: '#6A665E',
  faint: '#8A857C',
  rule: '#E2E2DF',
  card: '#FFFFFF',
  accent: '#C23B2A',
  accentSoft: 'rgba(194, 59, 42, 0.16)',
  line: '#3A3732',
} as const;

export const fonts = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  serif: 'NotoSerifKR-Bold',
} as const;

export const space = (n: number) => n * 4;
```

`apps/mobile/src/ui/Txt.tsx`:
```tsx
import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts } from '@/theme';

export type TxtVariant = 'title' | 'heading' | 'body' | 'sub' | 'caption' | 'point' | 'pointSmall' | 'number';

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.4, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.sub },
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.faint },
  point: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 36, letterSpacing: -0.4, color: colors.ink },
  pointSmall: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18, color: colors.line },
  number: { fontFamily: fonts.bold, fontSize: 46, lineHeight: 52, letterSpacing: -1.2, color: colors.accent, fontVariant: ['tabular-nums'] },
});

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: TxtVariant }) {
  return <Text {...props} style={[styles[variant], style]} />;
}
```

`apps/mobile/src/ui/Rule.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function Rule({ strong = false }: { strong?: boolean }) {
  return <View style={strong ? styles.strong : styles.hairline} />;
}

const styles = StyleSheet.create({
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule },
  strong: { height: 1.5, backgroundColor: colors.ink },
});
```

`apps/mobile/src/ui/Button.tsx`:
```tsx
import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';
import { Txt } from './Txt';

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onPress, kind = 'primary', disabled = false }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, primary ? styles.primary : styles.secondary, (pressed || disabled) && styles.dim]}
    >
      <Txt style={[styles.label, { color: primary ? colors.bg : colors.ink }]}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.ink },
  secondary: { borderWidth: 1, borderColor: colors.ink },
  dim: { opacity: 0.6 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
});
```

`apps/mobile/src/ui/TabBar.tsx`:
```tsx
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';
import { Txt } from './Txt';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <Txt style={[styles.label, focused && styles.focused]}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.rule, backgroundColor: colors.bg, paddingTop: 12 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint },
  focused: { fontFamily: fonts.bold, color: colors.ink },
});
```

If the `TabBarProps` type derivation does not typecheck with the installed Expo Router, import `BottomTabBarProps` from the package Expo Router re-exports for tabs (check `node_modules/expo-router` typings) and note it in the report.

- [ ] **Step 4: Write the layouts and placeholder tabs**

`apps/mobile/app/_layout.tsx` (Task 5 replaces this with the gated version):
```tsx
import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    'NotoSerifKR-Bold': NotoSerifKR_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaProvider>
  );
}
```

`apps/mobile/app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: '오늘' }} />
      <Tabs.Screen name="browse" options={{ title: '찾아보기' }} />
      <Tabs.Screen name="mine" options={{ title: '내 루틴' }} />
    </Tabs>
  );
}
```

`apps/mobile/app/(tabs)/browse.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { Txt } from '@/ui/Txt';

export default function BrowseScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Txt variant="heading">찾아보기</Txt>
        <Txt variant="sub">전신 지도는 곧 열려요.</Txt>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(2) },
});
```

`apps/mobile/app/(tabs)/mine.tsx`: same as `browse.tsx` with the function named `MineScreen`, heading `내 루틴`, and sub text `내 루틴과 즐겨찾기는 곧 열려요.`

`apps/mobile/app/(tabs)/index.tsx` (temporary until Task 6): same shape, function `TodayScreen`, heading `어디가 불편하세요?`, no sub text.

- [ ] **Step 5: Write the failing UI test**

`apps/mobile/__tests__/ui.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@/ui/Button';
import { Txt } from '@/ui/Txt';

describe('ui primitives', () => {
  it('renders text', async () => {
    await render(<Txt variant="title">어디가 불편하세요?</Txt>);
    expect(screen.getByText('어디가 불편하세요?')).toBeTruthy();
  });

  it('calls onPress and respects disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="시작" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: '시작' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="시작" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: '시작' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

`render` and `fireEvent` are awaited so the test works whether the installed Testing Library version returns promises or not.

- [ ] **Step 6: Run the test, typecheck, and boot the bundler**

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: 3 tests PASS, tsc exits 0. This task is scaffolding, so the primitives come before their smoke test; later tasks return to test-first.

Run: `cd apps/mobile && npx expo export --platform ios --output-dir /tmp/ggook-export-check && cd ../..`
Expected: the bundle builds without module-resolution errors (this proves Metro resolves the workspace packages and font files). Delete `/tmp/ggook-export-check` afterwards.

- [ ] **Step 7: Update AGENTS.md and commit**

Append under `## Commands`:
```markdown
- `npm test -w @ggookggook/mobile`: app tests (jest-expo)
- `cd apps/mobile && npx expo start`: run the app (Expo Go or a dev build)
```

```bash
git add package.json package-lock.json apps/mobile AGENTS.md
git commit -m "feat(mobile): scaffold Expo SDK 57 app with theme and tab shell"
```

---

### Task 4: Bundled content in the app

**Files:**
- Create: `apps/mobile/scripts/sync-content.mts`, `apps/mobile/src/content/index.ts`, `apps/mobile/__tests__/content.test.ts`
- Create (generated, committed): `apps/mobile/src/content/bundle.json`, `apps/mobile/src/content/images.ts`, `apps/mobile/assets/content/*.webp`
- Modify: `apps/mobile/package.json` (script), `AGENTS.md`

**Interfaces:**
- Consumes: `content/dist/manifest.json`, `content/dist/v<n>/bundle.json`, `content/dist/v<n>/images/*.webp` (phase 1 build output); `contentBundleSchema` and content types from `@ggookggook/shared`.
- Produces (from `@/content`):
  - `interface PlateView { plate: Plate; pins: Pin[]; image: number | null }`
  - `interface ContentIndex { version: number; symptoms: Symptom[]; acupoints: ReadonlyMap<string, Acupoint>; symptom(id: string): Symptom | undefined; plateFor(acupointId: string): PlateView | null; image(id: string): number | null }`
  - `buildIndex(bundle: ContentBundle, images: Record<string, number>): ContentIndex`
  - `content: ContentIndex` (the bundled singleton)

- [ ] **Step 1: Write the sync script**

`apps/mobile/scripts/sync-content.mts`:
```ts
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const APP = path.resolve(import.meta.dirname, '..');
const DIST = path.resolve(APP, '../../content/dist');

const manifest = JSON.parse(await readFile(path.join(DIST, 'manifest.json'), 'utf8')) as {
  version: number;
  bundlePath: string;
  imagesPath: string;
};

const assetsDir = path.join(APP, 'assets', 'content');
const contentDir = path.join(APP, 'src', 'content');
await rm(assetsDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });
await mkdir(contentDir, { recursive: true });

await copyFile(path.join(DIST, manifest.bundlePath), path.join(contentDir, 'bundle.json'));

const images = (await readdir(path.join(DIST, manifest.imagesPath))).filter((file) => file.endsWith('.webp')).sort();
for (const file of images) await copyFile(path.join(DIST, manifest.imagesPath, file), path.join(assetsDir, file));

const entries = images.map((file) => `  '${file.slice(0, -'.webp'.length)}': require('../../assets/content/${file}'),`);
await writeFile(
  path.join(contentDir, 'images.ts'),
  `// Generated by scripts/sync-content.mts from content v${manifest.version}. Do not edit.\n\nexport const IMAGES: Record<string, number> = {\n${entries.join('\n')}\n};\n`,
);

console.log(`Synced content v${manifest.version}: ${images.length} images`);
```

Add to `apps/mobile/package.json` scripts:
```json
"sync-content": "npm run build -w @ggookggook/content && tsx scripts/sync-content.mts"
```

Run: `npm run sync-content -w @ggookggook/mobile`
Expected: `Built content v1: 37 acupoints, 16 symptoms, 3 images` then `Synced content v1: 3 images`. `apps/mobile/src/content/images.ts` lists `body-front`, `cat-shoulder`, `hand-dorsal`.

- [ ] **Step 2: Write the failing content index test**

`apps/mobile/__tests__/content.test.ts`:
```ts
import type { ContentBundle } from '@ggookggook/shared';
import { buildIndex, content } from '@/content';

const bundle: ContentBundle = {
  version: 1,
  acupoints: [
    {
      id: 'LI4',
      name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
      sides: 'sequential',
      location: '손등입니다.',
      technique: '누르세요.',
      defaultSeconds: 60,
      cautions: ['pregnancy'],
      whoLocation: 'dorsum',
    },
  ],
  symptoms: [{ id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '병원에 가세요.' }],
  plates: [
    { id: 'no-image', name: '그림 없음', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.1, y: 0.1 }] },
    { id: 'hand-dorsal', name: '손등', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.61, y: 0.59 }] },
  ],
  maps: [],
};

describe('buildIndex', () => {
  const index = buildIndex(bundle, { 'hand-dorsal': 42 });

  it('looks up symptoms and acupoints', () => {
    expect(index.symptom('headache')?.name).toBe('두통');
    expect(index.symptom('nope')).toBeUndefined();
    expect(index.acupoints.get('LI4')?.name.ko).toBe('합곡');
  });

  it('prefers a plate that has an image', () => {
    const view = index.plateFor('LI4');
    expect(view?.plate.id).toBe('hand-dorsal');
    expect(view?.image).toBe(42);
    expect(view?.pins).toEqual([{ acupointId: 'LI4', x: 0.61, y: 0.59 }]);
  });

  it('returns null for an acupoint on no plate', () => {
    expect(index.plateFor('ST36')).toBeNull();
  });
});

describe('bundled content', () => {
  it('parses and holds the reviewed data', () => {
    expect(content.symptoms).toHaveLength(16);
    expect(content.acupoints.size).toBe(37);
    expect(content.image('cat-shoulder')).not.toBeNull();
  });
});
```

Run: `npm test -w @ggookggook/mobile -- content`
Expected: FAIL, cannot resolve `@/content`.

- [ ] **Step 3: Implement the content index**

`apps/mobile/src/content/index.ts`:
```ts
import { contentBundleSchema, type Acupoint, type ContentBundle, type Pin, type Plate, type Symptom } from '@ggookggook/shared';
import raw from './bundle.json';
import { IMAGES } from './images';

export interface PlateView {
  plate: Plate;
  pins: Pin[];
  image: number | null;
}

export interface ContentIndex {
  version: number;
  symptoms: Symptom[];
  acupoints: ReadonlyMap<string, Acupoint>;
  symptom(id: string): Symptom | undefined;
  plateFor(acupointId: string): PlateView | null;
  image(id: string): number | null;
}

export function buildIndex(bundle: ContentBundle, images: Record<string, number>): ContentIndex {
  const acupoints = new Map(bundle.acupoints.map((acupoint) => [acupoint.id, acupoint]));
  const symptoms = new Map(bundle.symptoms.map((symptom) => [symptom.id, symptom]));
  const image = (id: string) => images[id] ?? null;
  const score = (plate: Plate, acupointId: string) =>
    (image(plate.id) !== null ? 2 : 0) + (plate.pins.some((pin) => pin.acupointId === acupointId) ? 1 : 0);

  return {
    version: bundle.version,
    symptoms: bundle.symptoms,
    acupoints,
    symptom: (id) => symptoms.get(id),
    plateFor(acupointId) {
      const plate = bundle.plates
        .filter((candidate) => candidate.acupointIds.includes(acupointId))
        .sort((a, b) => score(b, acupointId) - score(a, acupointId))[0];
      if (!plate) return null;
      return { plate, pins: plate.pins.filter((pin) => pin.acupointId === acupointId), image: image(plate.id) };
    },
    image,
  };
}

export const content = buildIndex(contentBundleSchema.parse(raw), IMAGES);
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 5: Update AGENTS.md and commit**

Append under `## Commands`:
```markdown
- `npm run sync-content -w @ggookggook/mobile`: rebuild content and copy it into the app (run after changing content/data or images)
```

```bash
git add apps/mobile AGENTS.md
git commit -m "feat(mobile): bundle reviewed content into the app"
```

---

### Task 5: Database provider, settings store, and first-run welcome

**Files:**
- Create: `apps/mobile/src/db/DbProvider.tsx`, `apps/mobile/src/state/settings.ts`, `apps/mobile/app/welcome.tsx`, `apps/mobile/__tests__/welcome.test.tsx`, `apps/mobile/__tests__/settings-store.test.ts`
- Modify: `apps/mobile/app/_layout.tsx` (full replacement)

**Interfaces:**
- Consumes: `migrate`, `loadSettings`, `saveSettings`, `getDisclaimerAcceptedAt`, `acceptDisclaimer`, `SqlDatabase` from `@ggookggook/store`; `Settings`, `DEFAULT_SETTINGS` from `@ggookggook/shared`; `content.image` from `@/content`.
- Produces:
  - `DbProvider` component and `useDb(): SqlDatabase` from `@/db/DbProvider`
  - `useSettings` zustand store from `@/state/settings`: state `{ loaded: boolean; settings: Settings; disclaimerAcceptedAt: string | null }`, actions `load(db): Promise<void>`, `update(db, patch: Partial<Settings>): Promise<void>`, `accept(db): Promise<void>`
  - Route `/welcome`; all other routes are protected until the disclaimer is accepted

- [ ] **Step 1: Write the failing settings store test**

`apps/mobile/__tests__/settings-store.test.ts`:
```ts
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { useSettings } from '@/state/settings';

jest.mock('@ggookggook/store', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  getDisclaimerAcceptedAt: jest.fn(),
  acceptDisclaimer: jest.fn(),
}));

const db = {} as store.SqlDatabase;
const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: false, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: null });
});

it('loads settings and the disclaimer flag', async () => {
  mocked.loadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, pregnancyMode: true });
  mocked.getDisclaimerAcceptedAt.mockResolvedValue('2026-09-28T00:00:00.000Z');
  await useSettings.getState().load(db);
  expect(useSettings.getState()).toMatchObject({ loaded: true, settings: { pregnancyMode: true }, disclaimerAcceptedAt: '2026-09-28T00:00:00.000Z' });
});

it('updates and persists a partial change', async () => {
  await useSettings.getState().update(db, { rhythmHaptics: false });
  expect(useSettings.getState().settings.rhythmHaptics).toBe(false);
  expect(mocked.saveSettings).toHaveBeenCalledWith(db, { ...DEFAULT_SETTINGS, rhythmHaptics: false }, expect.any(Date));
});

it('accepts the disclaimer', async () => {
  mocked.acceptDisclaimer.mockResolvedValue('2026-09-28T01:00:00.000Z');
  await useSettings.getState().accept(db);
  expect(useSettings.getState().disclaimerAcceptedAt).toBe('2026-09-28T01:00:00.000Z');
});
```

- [ ] **Step 2: Write the failing welcome test**

`apps/mobile/__tests__/welcome.test.tsx`:
```tsx
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WelcomeScreen from '../app/welcome';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));

const update = jest.fn().mockResolvedValue(undefined);
const accept = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: null, update, accept });
});

it('walks through the intro, pregnancy toggle, and disclaimer', async () => {
  await render(<WelcomeScreen />);
  expect(screen.getByText('꾹꾹')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '다음' }));

  expect(screen.getByText('시작하기 전에 확인해 주세요')).toBeTruthy();
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  expect(update).toHaveBeenCalledWith({}, { pregnancyMode: true });

  await fireEvent.press(screen.getByRole('button', { name: '확인했어요' }));
  expect(accept).toHaveBeenCalledWith({});
});
```

Run: `npm test -w @ggookggook/mobile -- settings-store welcome`
Expected: FAIL, cannot resolve `@/state/settings` and `../app/welcome`.

- [ ] **Step 3: Implement the settings store**

`apps/mobile/src/state/settings.ts`:
```ts
import { DEFAULT_SETTINGS, type Settings } from '@ggookggook/shared';
import { acceptDisclaimer, getDisclaimerAcceptedAt, loadSettings, saveSettings, type SqlDatabase } from '@ggookggook/store';
import { create } from 'zustand';

interface SettingsState {
  loaded: boolean;
  settings: Settings;
  disclaimerAcceptedAt: string | null;
  load(db: SqlDatabase): Promise<void>;
  update(db: SqlDatabase, patch: Partial<Settings>): Promise<void>;
  accept(db: SqlDatabase): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,
  settings: { ...DEFAULT_SETTINGS },
  disclaimerAcceptedAt: null,
  async load(db) {
    const [settings, disclaimerAcceptedAt] = await Promise.all([loadSettings(db), getDisclaimerAcceptedAt(db)]);
    set({ settings, disclaimerAcceptedAt, loaded: true });
  },
  async update(db, patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await saveSettings(db, settings, new Date());
  },
  async accept(db) {
    const disclaimerAcceptedAt = await acceptDisclaimer(db, new Date());
    set({ disclaimerAcceptedAt });
  },
}));
```

- [ ] **Step 4: Implement the database provider**

`apps/mobile/src/db/DbProvider.tsx`:
```tsx
import { migrate, type SqlDatabase, type SqlValue } from '@ggookggook/store';
import * as SQLite from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import { Txt } from '@/ui/Txt';

const DbContext = createContext<SqlDatabase | null>(null);

function adapt(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync(source: string) {
      return db.execAsync(source);
    },
    runAsync(source: string, params: SqlValue[]) {
      return db.runAsync(source, params);
    },
    getFirstAsync<T>(source: string, params: SqlValue[]) {
      return db.getFirstAsync<T>(source, params);
    },
    getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.getAllAsync<T>(source, params);
    },
  };
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SqlDatabase | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = adapt(await SQLite.openDatabaseAsync('ggookggook.db'));
        await migrate(opened);
        if (!cancelled) setDb(opened);
      } catch (error) {
        console.error('Failed to open the local database', error);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <View style={styles.center}>
        <Txt variant="body">기록을 저장할 공간을 열지 못했어요. 앱을 다시 실행해 주세요.</Txt>
      </View>
    );
  }
  if (!db) return null;
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): SqlDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside DbProvider');
  return db;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(8), backgroundColor: colors.bg },
});
```

If the installed expo-sqlite types for `runAsync` / `getFirstAsync` differ (for example generic parameters or variadic params), adapt `adapt()` to them and keep the `SqlDatabase` interface unchanged.

- [ ] **Step 5: Implement the welcome screen**

`apps/mobile/app/welcome.tsx`:
```tsx
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { useSettings } from '@/state/settings';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const NOTICES = [
  '꾹꾹은 지압 방법을 안내하는 앱이에요. 진단이나 치료를 대신하지 않아요.',
  '통증이 심하거나 오래가면 병원 진료를 받으세요.',
  '지병이 있으면 전문가와 먼저 상의하세요.',
  '상처나 염증, 부기가 있는 곳은 누르지 마세요.',
];

export default function WelcomeScreen() {
  const db = useDb();
  const { settings, update, accept } = useSettings();
  const [step, setStep] = useState<0 | 1>(0);
  const cat = content.image('cat-shoulder');

  if (step === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.intro}>
          {cat !== null && <Image source={cat} style={styles.cat} contentFit="contain" accessibilityIgnoresInvertColors />}
          <Txt variant="title">꾹꾹</Txt>
          <Txt variant="body" style={styles.center}>
            불편한 곳을 고르면{'\n'}누를 곳을 순서대로 알려드려요.
          </Txt>
        </View>
        <View style={styles.footer}>
          <Button label="다음" onPress={() => setStep(1)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="heading">시작하기 전에 확인해 주세요</Txt>
        <View style={styles.list}>
          {NOTICES.map((notice) => (
            <View key={notice} style={styles.notice}>
              <Rule />
              <Txt variant="body" style={styles.noticeText}>
                {notice}
              </Txt>
            </View>
          ))}
          <Rule />
        </View>
        <View style={styles.toggle}>
          <View style={styles.toggleText}>
            <Txt variant="body">임신 중이에요</Txt>
            <Txt variant="sub">켜면 임신 중 피해야 할 혈자리를 빼고 안내해요.</Txt>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="임신 중이에요"
            value={settings.pregnancyMode}
            onValueChange={(value) => void update(db, { pregnancyMode: value })}
            trackColor={{ true: colors.accent, false: colors.rule }}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="확인했어요" onPress={() => void accept(db)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(4), padding: space(8) },
  cat: { width: 220, height: 220 },
  center: { textAlign: 'center', color: colors.sub },
  body: { padding: space(6), gap: space(6) },
  list: { gap: 0 },
  notice: { gap: space(3), paddingTop: 0 },
  noticeText: { paddingVertical: space(3) },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  toggleText: { flex: 1, gap: space(1) },
  footer: { padding: space(5) },
});
```

- [ ] **Step 6: Replace the root layout with the gated version**

`apps/mobile/app/_layout.tsx`:
```tsx
import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DbProvider, useDb } from '@/db/DbProvider';
import { useSettings } from '@/state/settings';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    'NotoSerifKR-Bold': NotoSerifKR_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DbProvider>
        <Routes />
      </DbProvider>
    </SafeAreaProvider>
  );
}

function Routes() {
  const db = useDb();
  const loaded = useSettings((state) => state.loaded);
  const accepted = useSettings((state) => state.disclaimerAcceptedAt !== null);
  const load = useSettings((state) => state.load);

  useEffect(() => {
    void load(db);
  }, [db, load]);

  if (!loaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={accepted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="symptom/[id]" />
        <Stack.Screen name="guide/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="done" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
```

`Stack.Protected` is Expo Router's protected-routes API. Confirm it exists in the installed version's docs; if it does not, gate with `<Redirect href="/welcome" />` in `app/(tabs)/_layout.tsx` when not accepted, and `router.replace('/')` from the welcome screen after `accept` resolves. Note which one you used in the report. The `symptom/[id]`, `guide/[id]`, and `done` screens do not exist until Tasks 7 to 9; if Expo Router warns about unknown screen names before then, leave those three `Stack.Screen` lines out and add each one in the task that creates its route.

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add local database, settings store, and first-run welcome"
```

---

### Task 6: Today screen

**Files:**
- Create: `apps/mobile/src/format.ts`, `apps/mobile/src/routine.ts`, `apps/mobile/__tests__/format.test.ts`, `apps/mobile/__tests__/routine.test.ts`, `apps/mobile/__tests__/today.test.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx` (full replacement)

**Interfaces:**
- Consumes: `searchSymptoms`, `resolveSteps`, `stepsForPregnancy`, `routineDurationSeconds`, `routineMinutes`, `Settings`, `Symptom`, `Sides` from `@ggookggook/shared`; `latestCompletedSession` from `@ggookggook/store`; `content`, `useDb`, `useSettings`.
- Produces:
  - `formatDateLine(date: Date): string` → `9월 28일 월요일`
  - `formatRelativeDay(iso: string, now: Date): string` → `오늘`, `어제`, `3일 전`
  - `formatDuration(seconds: number): string` → `3분 12초`, `4분`, `45초`
  - `visibleSteps(symptom: Symptom, settings: Settings): RoutineStep[]` (resolved, pregnancy-filtered)
  - `routineSummary(steps: RoutineStep[]): { count: number; minutes: number }`
  - `sideLabel(sides: Sides): string` → `양쪽 번갈아`, `양쪽 함께`, `''`
  - `firstSentence(text: string): string`
  - `topic(word: string): string` → appends the topic particle: `합곡은`, `삼음교는`

- [ ] **Step 1: Write the failing helper tests**

`apps/mobile/__tests__/format.test.ts`:
```ts
import { formatDateLine, formatDuration, formatRelativeDay } from '@/format';

it('formats the date line in Korean', () => {
  expect(formatDateLine(new Date(2026, 8, 28))).toBe('9월 28일 월요일');
});

it('formats relative days by calendar date', () => {
  const now = new Date(2026, 8, 28, 9, 0);
  expect(formatRelativeDay(new Date(2026, 8, 28, 1, 0).toISOString(), now)).toBe('오늘');
  expect(formatRelativeDay(new Date(2026, 8, 27, 23, 0).toISOString(), now)).toBe('어제');
  expect(formatRelativeDay(new Date(2026, 8, 25, 12, 0).toISOString(), now)).toBe('3일 전');
});

it('formats durations', () => {
  expect(formatDuration(192)).toBe('3분 12초');
  expect(formatDuration(240)).toBe('4분');
  expect(formatDuration(45)).toBe('45초');
});
```

`apps/mobile/__tests__/routine.test.ts`:
```ts
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { content } from '@/content';
import { firstSentence, routineSummary, sideLabel, topic, visibleSteps } from '@/routine';

const headache = content.symptom('headache')!;

it('keeps every step outside pregnancy mode', () => {
  expect(visibleSteps(headache, DEFAULT_SETTINGS).map((s) => s.acupointId)).toEqual(['LI4', 'EX-HN5', 'GB20']);
});

it('drops contraindicated steps in pregnancy mode', () => {
  expect(visibleSteps(headache, { ...DEFAULT_SETTINGS, pregnancyMode: true }).map((s) => s.acupointId)).toEqual(['EX-HN5', 'GB20']);
});

it('summarizes count and minutes, counting both sides of sequential points', () => {
  expect(routineSummary(visibleSteps(headache, DEFAULT_SETTINGS))).toEqual({ count: 3, minutes: 4 });
});

it('labels sides', () => {
  expect(sideLabel('sequential')).toBe('양쪽 번갈아');
  expect(sideLabel('together')).toBe('양쪽 함께');
  expect(sideLabel('single')).toBe('');
});

it('picks 은 or 는 by the final consonant', () => {
  expect(topic('합곡')).toBe('합곡은');
  expect(topic('삼음교')).toBe('삼음교는');
  expect(topic('합곡, 삼음교')).toBe('합곡, 삼음교는');
});

it('takes the first sentence', () => {
  expect(firstSentence('손등입니다. 누르면 뻐근합니다.')).toBe('손등입니다.');
  expect(firstSentence('한 문장입니다.')).toBe('한 문장입니다.');
});
```

Run: `npm test -w @ggookggook/mobile -- format routine`
Expected: FAIL, cannot resolve `@/format` and `@/routine`.

- [ ] **Step 2: Implement the helpers**

`apps/mobile/src/format.ts`:
```ts
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateLine(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function formatRelativeDay(iso: string, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}초`;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}
```

`apps/mobile/src/routine.ts`:
```ts
import {
  resolveSteps,
  routineDurationSeconds,
  routineMinutes,
  stepsForPregnancy,
  type RoutineStep,
  type Settings,
  type Sides,
  type Symptom,
} from '@ggookggook/shared';
import { content } from '@/content';

export function visibleSteps(symptom: Symptom, settings: Settings): RoutineStep[] {
  const resolved = resolveSteps(symptom.steps, content.acupoints);
  return settings.pregnancyMode ? stepsForPregnancy(resolved, content.acupoints) : resolved;
}

export function routineSummary(steps: RoutineStep[]): { count: number; minutes: number } {
  return { count: steps.length, minutes: routineMinutes(routineDurationSeconds(steps, content.acupoints)) };
}

export function sideLabel(sides: Sides): string {
  if (sides === 'sequential') return '양쪽 번갈아';
  if (sides === 'together') return '양쪽 함께';
  return '';
}

export function firstSentence(text: string): string {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
}

export function topic(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul && (last - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? '은' : '는'}`;
}
```

Run: `npm test -w @ggookggook/mobile -- format routine`
Expected: PASS.

- [ ] **Step 3: Write the failing Today screen test**

`apps/mobile/__tests__/today.test.tsx`:
```tsx
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import TodayScreen from '../app/(tabs)/index';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ latestCompletedSession: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: 'x' });
  mocked.latestCompletedSession.mockResolvedValue(null);
});

it('lists every symptom with its minutes and opens one', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('두통')).toBeTruthy();
  expect(screen.getByText('급똥참기')).toBeTruthy();
  await fireEvent.press(screen.getByText('두통'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('filters by alias and by acupoint name, and shows an empty state', async () => {
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '잠이 안');
  expect(screen.getByText('불면')).toBeTruthy();
  expect(screen.queryByText('두통')).toBeNull();

  await fireEvent.changeText(input, '합곡');
  expect(screen.getByText('두통')).toBeTruthy();

  await fireEvent.changeText(input, '없는말');
  expect(screen.getByText('찾는 증상이 없어요. 다른 말로 찾아보세요.')).toBeTruthy();
});

it('shows the most recent routine', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: 'better',
  });
  await render(<TodayScreen />);
  expect(await screen.findByText('최근 · 두통 · 오늘')).toBeTruthy();
});
```

Run: `npm test -w @ggookggook/mobile -- today`
Expected: FAIL (the stub screen has no list).

- [ ] **Step 4: Implement the Today screen**

`apps/mobile/app/(tabs)/index.tsx`:
```tsx
import { searchSymptoms, type SessionLog, type Settings, type Symptom } from '@ggookggook/shared';
import { latestCompletedSession } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine, formatRelativeDay } from '@/format';
import { routineSummary, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function TodayScreen() {
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<SessionLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      latestCompletedSession(db).then((session) => {
        if (active) setRecent(session);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const results = useMemo(() => searchSymptoms(content.symptoms, content.acupoints, query), [query]);
  const recentSymptom = recent?.routine.kind === 'symptom' ? content.symptom(recent.routine.symptomId) : undefined;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(symptom) => symptom.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Txt variant="caption">{formatDateLine(new Date())}</Txt>
            <Txt variant="title" style={styles.title}>
              어디가{'\n'}불편하세요?
            </Txt>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="증상이나 혈자리 이름"
              placeholderTextColor={colors.faint}
              returnKeyType="search"
              style={styles.search}
            />
            {recent && recentSymptom && query.trim() === '' && (
              <Pressable onPress={() => router.push(`/symptom/${recentSymptom.id}`)} style={styles.recent}>
                <Txt variant="sub">{`최근 · ${recentSymptom.name} · ${formatRelativeDay(recent.completedAt ?? recent.startedAt, new Date())}`}</Txt>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => <SymptomRow symptom={item} settings={settings} />}
        ItemSeparatorComponent={Rule}
        ListEmptyComponent={<Txt variant="sub" style={styles.empty}>찾는 증상이 없어요. 다른 말로 찾아보세요.</Txt>}
      />
    </SafeAreaView>
  );
}

function SymptomRow({ symptom, settings }: { symptom: Symptom; settings: Settings }) {
  const steps = visibleSteps(symptom, settings);
  const { minutes } = routineSummary(steps);
  const names = steps.map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '').join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/symptom/${symptom.id}`)} style={styles.row}>
      <View style={styles.rowText}>
        <Txt style={styles.rowName}>{symptom.name}</Txt>
        <Txt variant="pointSmall">{names}</Txt>
      </View>
      <Txt style={styles.minutes}>{`${minutes}분`}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space(5), paddingBottom: space(10) },
  header: { paddingTop: space(4), paddingBottom: space(2), gap: space(2) },
  title: { marginTop: space(1), marginBottom: space(3) },
  search: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingVertical: space(2),
  },
  recent: { paddingVertical: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3.5), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  minutes: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  empty: { paddingVertical: space(8), textAlign: 'center' },
});
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add Today screen with search and recent routine"
```

---

### Task 7: Symptom detail screen

**Files:**
- Create: `apps/mobile/app/symptom/[id].tsx`, `apps/mobile/__tests__/symptom.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx` only if Task 5 left out the `symptom/[id]` screen line

**Interfaces:**
- Consumes: `content`, `visibleSteps`, `routineSummary`, `sideLabel`, `topic`, `useSettings`.
- Produces: route `/symptom/[id]`; its 시작 button pushes `/guide/<id>`.

- [ ] **Step 1: Write the failing test**

`apps/mobile/__tests__/symptom.test.tsx`:
```tsx
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import SymptomScreen from '../app/symptom/[id]';
import { useSettings } from '@/state/settings';

let params: { id: string } = { id: 'headache' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => params,
}));

beforeEach(() => {
  jest.clearAllMocks();
  params = { id: 'headache' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: 'x' });
});

it('shows the routine, the pregnancy caution, and when to see a doctor', async () => {
  await render(<SymptomScreen />);
  expect(screen.getByText('두통')).toBeTruthy();
  expect(screen.getByText('머리 아플 때')).toBeTruthy();
  expect(screen.getByText('3곳 · 약 4분')).toBeTruthy();
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('임신 중이면 합곡은 누르지 마세요.')).toBeTruthy();
  expect(screen.getByText('이럴 땐 병원에 가세요')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '시작' }));
  expect(router.push).toHaveBeenCalledWith('/guide/headache');
});

it('leaves out contraindicated points in pregnancy mode and says so', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  await render(<SymptomScreen />);
  expect(screen.queryByText('합곡')).toBeNull();
  expect(screen.getByText('임신 중이라 합곡은 뺐어요.')).toBeTruthy();
  expect(screen.getByText('2곳 · 약 2분')).toBeTruthy();
});

it('handles an unknown symptom', async () => {
  params = { id: 'nope' };
  await render(<SymptomScreen />);
  expect(screen.getByText('찾을 수 없는 증상이에요.')).toBeTruthy();
});
```

Run: `npm test -w @ggookggook/mobile -- symptom`
Expected: FAIL, cannot resolve `../app/symptom/[id]`.

- [ ] **Step 2: Implement the screen**

`apps/mobile/app/symptom/[id].tsx`:
```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { routineSummary, sideLabel, topic, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const nameOf = (id: string) => content.acupoints.get(id)?.name.ko ?? id;

export default function SymptomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings((state) => state.settings);
  const symptom = content.symptom(id);

  if (!symptom) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink />
          <Txt variant="body">찾을 수 없는 증상이에요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const steps = visibleSteps(symptom, settings);
  const { count, minutes } = routineSummary(steps);
  const contraindicated = symptom.steps
    .filter((step) => content.acupoints.get(step.acupointId)?.cautions.includes('pregnancy'))
    .map((step) => nameOf(step.acupointId));
  const cautionText =
    contraindicated.length === 0
      ? null
      : settings.pregnancyMode
        ? `임신 중이라 ${topic(contraindicated.join(', '))} 뺐어요.`
        : `임신 중이면 ${topic(contraindicated.join(', '))} 누르지 마세요.`;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink />
        <View style={styles.head}>
          <Txt variant="title">{symptom.name}</Txt>
          {symptom.aliases.length > 0 && <Txt variant="sub">{symptom.aliases.join(' · ')}</Txt>}
          <Txt style={styles.summary}>{`${count}곳 · 약 ${minutes}분`}</Txt>
        </View>

        <View>
          {steps.map((step, index) => {
            const acupoint = content.acupoints.get(step.acupointId)!;
            const sides = sideLabel(acupoint.sides);
            return (
              <View key={step.acupointId}>
                <Rule />
                <View style={styles.step}>
                  <Txt variant="caption" style={styles.stepNo}>{String(index + 1).padStart(2, '0')}</Txt>
                  <View style={styles.stepText}>
                    <View style={styles.stepName}>
                      <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
                      <Txt variant="caption">{acupoint.name.hanja}</Txt>
                    </View>
                    <Txt variant="sub">{acupoint.location}</Txt>
                  </View>
                  <Txt variant="caption" style={styles.seconds}>
                    {`${step.seconds}초${acupoint.sides === 'sequential' ? '씩' : ''}${sides ? `\n${sides}` : ''}`}
                  </Txt>
                </View>
              </View>
            );
          })}
          <Rule />
        </View>

        {cautionText && <Txt variant="sub" style={styles.caution}>{cautionText}</Txt>}

        <View style={styles.doctor}>
          <Rule strong />
          <Txt style={styles.doctorTitle}>이럴 땐 병원에 가세요</Txt>
          <Txt variant="sub">{symptom.seeDoctor}</Txt>
        </View>

        <Txt variant="caption">지압은 불편함을 덜어줄 수 있지만 진료를 대신하지 않아요.</Txt>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="시작" onPress={() => router.push(`/guide/${symptom.id}`)} disabled={steps.length === 0} />
      </View>
    </SafeAreaView>
  );
}

function BackLink() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => router.back()} hitSlop={12}>
      <Txt variant="sub">← 뒤로</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
  head: { gap: space(1.5) },
  summary: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent, marginTop: space(1) },
  step: { flexDirection: 'row', gap: space(3), paddingVertical: space(3.5) },
  stepNo: { width: 20, paddingTop: 10 },
  stepText: { flex: 1, gap: space(1) },
  stepName: { flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) },
  pointName: { fontSize: 21, lineHeight: 28 },
  seconds: { textAlign: 'right', paddingTop: 8 },
  caution: { color: colors.accent },
  doctor: { gap: space(2) },
  doctorTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(2) },
  footer: { padding: space(5), paddingTop: space(2) },
});
```

The test expects `합곡` to appear as its own text node; `Txt variant="point"` renders only the name, so `getByText('합곡')` matches.

- [ ] **Step 3: Register the route and run checks**

If Task 5 left the `symptom/[id]` line out of `app/_layout.tsx`, add `<Stack.Screen name="symptom/[id]" />` inside the accepted guard now.

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add symptom routine preview"
```

---

### Task 8: Guided timer

**Files:**
- Create: `apps/mobile/src/guide/useGuide.ts`, `apps/mobile/src/ui/PlateView.tsx`, `apps/mobile/src/id.ts`, `apps/mobile/app/guide/[id].tsx`, `apps/mobile/__tests__/use-guide.test.tsx`, `apps/mobile/__tests__/guide.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx` only if the `guide/[id]` screen line is missing

**Interfaces:**
- Consumes: `buildGuideSegments`, `advanceGuide`, `guideElapsedTotal`, `rhythmAt`, `GuideSegment`, `GuideEvent`, `GuideProgress`, `GuideSide`, `SessionLog` from `@ggookggook/shared`; `insertSession` from `@ggookggook/store`; `content`, `visibleSteps`, `firstSentence`, `useSettings`, `useDb`.
- Produces:
  - `useGuide(options: { segments: GuideSegment[]; pressSeconds: number; restSeconds: number; tickMs: number; onEvent(event: Exclude<GuideEvent, 'finish'>): void; onFinish(elapsedTotal: number): void }): { progress: GuideProgress; paused: boolean; setPaused(paused: boolean): void }`
  - `PlateView` component: `<PlateView view: PlateView | null side: GuideSide size: number />`
  - `newId(): string`
  - Route `/guide/[id]`; on finish it inserts a completed session and replaces the route with `/done?sessionId=<id>`
  - Env `EXPO_PUBLIC_GUIDE_SPEED` (default 1) divides the tick interval, for E2E runs only

- [ ] **Step 1: Write the failing hook test**

`apps/mobile/__tests__/use-guide.test.tsx`:
```tsx
import type { GuideSegment } from '@ggookggook/shared';
import { act, renderHook } from '@testing-library/react-native';
import { useGuide } from '@/guide/useGuide';

const segments: GuideSegment[] = [
  { stepIndex: 0, acupointId: 'GV29', side: 'center', seconds: 3 },
  { stepIndex: 1, acupointId: 'EX-HN5', side: 'both', seconds: 2 },
];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('ticks through segments, reports events, and finishes once', async () => {
  const onEvent = jest.fn();
  const onFinish = jest.fn();
  const { result } = await renderHook(() => useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent, onFinish }));

  expect(onEvent).toHaveBeenCalledWith('press');
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.progress).toEqual({ index: 1, elapsed: 0, finished: false });
  expect(onEvent.mock.calls.map((call) => call[0])).toEqual(['press', 'rest', 'press', 'segment', 'press']);

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(result.current.progress.finished).toBe(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(5);
});

it('stops ticking while paused', async () => {
  const onFinish = jest.fn();
  const { result } = await renderHook(() => useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }));
  await act(async () => {
    result.current.setPaused(true);
  });
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(result.current.progress).toEqual({ index: 0, elapsed: 0, finished: false });
  expect(onFinish).not.toHaveBeenCalled();
});
```

Run: `npm test -w @ggookggook/mobile -- use-guide`
Expected: FAIL, cannot resolve `@/guide/useGuide`.

- [ ] **Step 2: Implement the hook and id helper**

`apps/mobile/src/guide/useGuide.ts`:
```ts
import { advanceGuide, guideElapsedTotal, type GuideEvent, type GuideProgress, type GuideSegment } from '@ggookggook/shared';
import { useEffect, useRef, useState } from 'react';

interface UseGuideOptions {
  segments: GuideSegment[];
  pressSeconds: number;
  restSeconds: number;
  tickMs: number;
  onEvent(event: Exclude<GuideEvent, 'finish'>): void;
  onFinish(elapsedTotal: number): void;
}

export function useGuide({ segments, pressSeconds, restSeconds, tickMs, onEvent, onFinish }: UseGuideOptions) {
  const [progress, setProgress] = useState<GuideProgress>({ index: 0, elapsed: 0, finished: false });
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(progress);
  const callbacks = useRef({ onEvent, onFinish });
  callbacks.current = { onEvent, onFinish };

  useEffect(() => {
    if (segments.length > 0) callbacks.current.onEvent('press');
  }, [segments]);

  useEffect(() => {
    if (paused || progressRef.current.finished) return;
    const timer = setInterval(() => {
      const { progress: next, events } = advanceGuide(progressRef.current, segments, pressSeconds, restSeconds);
      progressRef.current = next;
      setProgress(next);
      for (const event of events) {
        if (event === 'finish') callbacks.current.onFinish(guideElapsedTotal(next, segments));
        else callbacks.current.onEvent(event);
      }
      if (next.finished) clearInterval(timer);
    }, tickMs);
    return () => clearInterval(timer);
  }, [paused, segments, pressSeconds, restSeconds, tickMs]);

  return { progress, paused, setPaused };
}
```

`apps/mobile/src/id.ts`:
```ts
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

Run: `npm test -w @ggookggook/mobile -- use-guide`
Expected: PASS.

- [ ] **Step 3: Implement PlateView**

`apps/mobile/src/ui/PlateView.tsx`:
```tsx
import type { GuideSide } from '@ggookggook/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { PlateView as PlateData } from '@/content';
import { colors, space } from '@/theme';
import { Txt } from './Txt';

interface PlateViewProps {
  view: PlateData | null;
  side: GuideSide;
  size: number;
}

export function PlateView({ view, side, size }: PlateViewProps) {
  if (!view || view.image === null) {
    return (
      <View style={[styles.frame, styles.placeholder, { width: size, height: size }]}>
        <Txt variant="caption">{view ? `${view.plate.name} 그림 준비 중` : '그림 준비 중'}</Txt>
      </View>
    );
  }
  const pins = view.pins.filter((pin) => pin.side === undefined || side === 'both' || side === 'center' || pin.side === side);
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessibilityLabel={`${view.plate.name} 그림`}>
      <Image source={view.image} style={StyleSheet.absoluteFill} contentFit="contain" />
      {pins.map((pin) => (
        <View
          key={`${pin.acupointId}-${pin.side ?? 'one'}`}
          testID="pin"
          style={[styles.pin, { left: pin.x * size - 8, top: pin.y * size - 8 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule, alignSelf: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: space(4) },
  pin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.accentSoft,
  },
});
```

The plate images are square, so fractional coordinates map directly onto `size`.

- [ ] **Step 4: Write the failing guide screen test**

`apps/mobile/__tests__/guide.test.tsx`:
```tsx
import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import GuideScreen from '../app/guide/[id]';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ insertSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'food_stagnation' }),
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: 'x' });
});
afterEach(() => jest.useRealTimers());

it('guides through each side of each point and records the session', async () => {
  await render(<GuideScreen />);
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('왼쪽')).toBeTruthy();
  expect(screen.getByText('꾹 누르세요')).toBeTruthy();
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText('잠시 떼세요')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(55_000);
  });
  expect(screen.getByText('오른쪽')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(180_000);
  });
  expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ routine: { kind: 'symptom', symptomId: 'food_stagnation' }, durationSeconds: 240, feedback: null }));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});

it('pauses and resumes', async () => {
  await render(<GuideScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '일시정지' }));
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '계속' }));
  await act(async () => {
    jest.advanceTimersByTime(7000);
  });
  expect(screen.getByText('2 / 9회')).toBeTruthy();
});

it('skips haptics when rhythm haptics are off', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: false } });
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});
```

Run: `npm test -w @ggookggook/mobile -- guide.test`
Expected: FAIL, cannot resolve `../app/guide/[id]`.

- [ ] **Step 5: Implement the guide screen**

`apps/mobile/app/guide/[id].tsx`:
```tsx
import { buildGuideSegments, rhythmAt, type GuideSegment, type SessionLog } from '@ggookggook/shared';
import { insertSession } from '@ggookggook/store';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { useGuide } from '@/guide/useGuide';
import { newId } from '@/id';
import { firstSentence, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const SPEED = Math.max(1, Number(process.env.EXPO_PUBLIC_GUIDE_SPEED ?? '1') || 1);
const SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽 함께', center: '' } as const;

export default function GuideScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const symptom = content.symptom(id);
  const startedAt = useRef(new Date().toISOString());

  const segments = useMemo<GuideSegment[]>(
    () => (symptom ? buildGuideSegments(visibleSteps(symptom, settings), content.acupoints) : []),
    // Built once per symptom: a settings change mid-routine must not rebuild the plan.
    [symptom],
  );
  const totalSeconds = useMemo(() => segments.reduce((sum, segment) => sum + segment.seconds, 0), [segments]);

  const onEvent = useCallback(
    (event: 'press' | 'rest' | 'segment') => {
      if (!settings.rhythmHaptics) return;
      if (event === 'press') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (event === 'rest') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [settings.rhythmHaptics],
  );

  const onFinish = useCallback(
    async (elapsedTotal: number) => {
      if (!symptom) return;
      const log: SessionLog = {
        id: newId(),
        routine: { kind: 'symptom', symptomId: symptom.id },
        startedAt: startedAt.current,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedTotal,
        feedback: null,
      };
      await insertSession(db, log);
      router.replace({ pathname: '/done', params: { sessionId: log.id } });
    },
    [db, symptom],
  );

  const { progress, paused, setPaused } = useGuide({
    segments,
    pressSeconds: settings.pressSeconds,
    restSeconds: settings.restSeconds,
    tickMs: 1000 / SPEED,
    onEvent,
    onFinish,
  });

  const { width } = useWindowDimensions();
  const segment = segments[progress.index];
  if (!symptom || !segment) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Txt variant="body">안내할 혈자리가 없어요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const acupoint = content.acupoints.get(segment.acupointId)!;
  const stepCount = new Set(segments.map((s) => s.stepIndex)).size;
  const rhythm = rhythmAt(progress.elapsed, segment.seconds, settings.pressSeconds, settings.restSeconds);
  const doneSeconds = segments.slice(0, progress.index).reduce((sum, s) => sum + s.seconds, 0) + progress.elapsed;
  const next = segments[progress.index + 1];
  const nextLabel = !next
    ? '마지막이에요'
    : next.acupointId === segment.acupointId
      ? `다음 ${SIDE_LABEL[next.side]}`
      : `다음 ${content.acupoints.get(next.acupointId)?.name.ko ?? ''}`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.top}>
          <Txt style={styles.topName}>{symptom.name}</Txt>
          <Txt variant="caption">{`${segment.stepIndex + 1} / ${stepCount}`}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => router.back()} hitSlop={12}>
            <Txt variant="sub">닫기</Txt>
          </Pressable>
        </View>

        <PlateView view={content.plateFor(segment.acupointId)} side={segment.side} size={Math.min(width - space(10), 320)} />

        <View style={styles.nameRow}>
          <Txt variant="point">{acupoint.name.ko}</Txt>
          <Txt variant="caption">{acupoint.id}</Txt>
          {SIDE_LABEL[segment.side] !== '' && <Txt style={styles.side}>{SIDE_LABEL[segment.side]}</Txt>}
        </View>
        <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>

        <View style={styles.timer}>
          <Rule strong />
          <View style={styles.timerRow}>
            <Txt variant="number" style={styles.number}>{String(rhythm.secondsLeftInPhase)}</Txt>
            <View style={styles.timerText}>
              <Txt style={styles.action}>{rhythm.phase === 'press' ? '꾹 누르세요' : '잠시 떼세요'}</Txt>
              <Txt variant="sub">{`${rhythm.pressNumber} / ${rhythm.pressCount}회`}</Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? '계속' : '일시정지'}
              onPress={() => setPaused(!paused)}
              style={styles.pause}
            >
              <Txt style={styles.pauseLabel}>{paused ? '계속' : '일시정지'}</Txt>
            </Pressable>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (doneSeconds / totalSeconds) * 100)}%` }]} />
          </View>
          <View style={styles.nextRow}>
            <Txt variant="caption">{nextLabel}</Txt>
            <Txt variant="caption">{`약 ${Math.max(1, Math.ceil((totalSeconds - doneSeconds) / 60))}분 남음`}</Txt>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: space(5), gap: space(3) },
  top: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  topName: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space(2), marginTop: space(2) },
  side: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  timer: { marginTop: 'auto', gap: space(3) },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(2) },
  number: { minWidth: 40 },
  timerText: { flex: 1, gap: 2 },
  action: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  pause: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 2, paddingHorizontal: space(3), paddingVertical: space(2) },
  pauseLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  track: { height: 2, backgroundColor: colors.rule },
  fill: { height: 2, backgroundColor: colors.accent },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
```

The haptics effect in `useGuide` fires `press` on mount, which is why the first test expects `impactAsync('heavy')` before any tick. The food_stagnation routine is LI4 and PC6, both `sequential`, so 4 segments of 60 seconds = 240 seconds.

- [ ] **Step 6: Register the route and run checks**

If the `guide/[id]` line is missing from `app/_layout.tsx`, add `<Stack.Screen name="guide/[id]" options={{ gestureEnabled: false }} />` inside the accepted guard.

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add guided press-and-rest timer"
```

---

### Task 9: Done screen with feedback

**Files:**
- Create: `apps/mobile/app/done.tsx`, `apps/mobile/__tests__/done.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx` only if the `done` screen line is missing

**Interfaces:**
- Consumes: `getSession`, `setSessionFeedback` from `@ggookggook/store`; `SessionFeedback`, `SessionLog`; `content`, `formatDuration`, `useDb`.
- Produces: route `/done?sessionId=<id>`; 처음으로 replaces the stack with `/`.

- [ ] **Step 1: Write the failing test**

`apps/mobile/__tests__/done.test.tsx`:
```tsx
import * as store from '@ggookggook/store';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import DoneScreen from '../app/done';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ getSession: jest.fn(), setSessionFeedback: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: () => ({ sessionId: 's1' }) }));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'food_stagnation' },
    startedAt: '2026-09-28T00:00:00.000Z',
    completedAt: '2026-09-28T00:04:00.000Z',
    durationSeconds: 240,
    feedback: null,
  });
});

it('shows the result and records feedback', async () => {
  await render(<DoneScreen />);
  expect(await screen.findByText('식체 루틴을 마쳤어요')).toBeTruthy();
  expect(screen.getByText('4분')).toBeTruthy();
  expect(screen.getByText('합곡 · 내관')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '나아졌어요' }));
  expect(mocked.setSessionFeedback).toHaveBeenCalledWith({}, 's1', 'better');
  expect(screen.getByRole('button', { name: '나아졌어요' }).props.accessibilityState).toMatchObject({ selected: true });

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.replace).toHaveBeenCalledWith('/');
});
```

Run: `npm test -w @ggookggook/mobile -- done`
Expected: FAIL, cannot resolve `../app/done`.

- [ ] **Step 2: Implement the screen**

`apps/mobile/app/done.tsx`:
```tsx
import type { SessionFeedback, SessionLog } from '@ggookggook/shared';
import { getSession, setSessionFeedback } from '@ggookggook/store';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDuration } from '@/format';
import { colors, fonts, space } from '@/theme';
import { Txt } from '@/ui/Txt';

const OPTIONS: { value: SessionFeedback; label: string }[] = [
  { value: 'better', label: '나아졌어요' },
  { value: 'same', label: '비슷해요' },
  { value: 'worse', label: '더 불편해요' },
];

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const db = useDb();
  const [session, setSession] = useState<SessionLog | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);

  useEffect(() => {
    getSession(db, sessionId).then((loaded) => {
      setSession(loaded);
      setFeedback(loaded?.feedback ?? null);
    });
  }, [db, sessionId]);

  const symptom = session?.routine.kind === 'symptom' ? content.symptom(session.routine.symptomId) : undefined;
  const names = symptom ? symptom.steps.map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '').filter(Boolean).join(' · ') : '';
  const cat = content.image('cat-shoulder');

  const choose = (value: SessionFeedback) => {
    setFeedback(value);
    void setSessionFeedback(db, sessionId, value);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        {cat !== null && <Image source={cat} style={styles.cat} contentFit="contain" />}
        <Txt variant="heading" style={styles.center}>{symptom ? `${symptom.name} 루틴을 마쳤어요` : '루틴을 마쳤어요'}</Txt>
        {names !== '' && <Txt variant="pointSmall" style={styles.center}>{names}</Txt>}
        {session && <Txt variant="sub" style={styles.center}>{formatDuration(session.durationSeconds)}</Txt>}

        <Txt style={styles.question}>지금은 좀 어때요?</Txt>
        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const selected = feedback === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => choose(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Txt style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="처음으로" onPress={() => router.replace('/')} style={styles.home}>
        <Txt variant="sub" style={styles.homeLabel}>처음으로</Txt>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(6), gap: space(2) },
  cat: { width: 200, height: 200, marginBottom: space(2) },
  center: { textAlign: 'center' },
  question: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(6) },
  options: { flexDirection: 'row', gap: space(2), marginTop: space(2) },
  option: { borderWidth: 1, borderColor: colors.ink, borderRadius: 2, paddingHorizontal: space(3), paddingVertical: space(2.5) },
  optionSelected: { backgroundColor: colors.ink },
  optionLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  optionLabelSelected: { color: colors.bg },
  home: { alignItems: 'center', padding: space(6) },
  homeLabel: { textDecorationLine: 'underline' },
});
```

The spec's third option was "더 아파요"; this plan uses "더 불편해요" because not every symptom is pain (for example 불면 or 집중력).

- [ ] **Step 3: Register the route and run checks**

If the `done` line is missing from `app/_layout.tsx`, add `<Stack.Screen name="done" options={{ gestureEnabled: false }} />` inside the accepted guard.

Run: `npm test -w @ggookggook/mobile && npm run typecheck -w @ggookggook/mobile`
Expected: PASS, tsc exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add completion screen with feedback"
```

---

### Task 10: Run the app and the core-flow E2E

**Files:**
- Create: `apps/mobile/e2e/core-flow.yaml`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the app from Tasks 3 to 9.
- Produces: a Maestro flow that exercises welcome → Today → symptom → guide → done.

- [ ] **Step 1: Full checks**

Run from the repo root: `npm test && npm run typecheck && cd apps/mobile && npx expo-doctor && cd ../..`
Expected: every workspace PASSES, tsc exits 0 everywhere, expo-doctor reports no issues. Fix anything it flags.

- [ ] **Step 2: Write the Maestro flow**

`apps/mobile/e2e/core-flow.yaml`:
```yaml
appId: kr.ggookggook.app
---
- clearState
- launchApp
- tapOn: "다음"
- assertVisible: "시작하기 전에 확인해 주세요"
- tapOn: "확인했어요"
- assertVisible: "어디가.*"
- tapOn: "식체"
- assertVisible: "이럴 땐 병원에 가세요"
- tapOn: "시작"
- assertVisible: "합곡"
- extendedWaitUntil:
    visible: "식체 루틴을 마쳤어요"
    timeout: 60000
- tapOn: "나아졌어요"
- tapOn: "처음으로"
- assertVisible: "최근 · 식체 · 오늘"
```

- [ ] **Step 3: Build and run on the iOS simulator, if available**

Check tools: `xcrun simctl list devices available | head -5` and `maestro --version`.

If both exist:
```bash
cd apps/mobile
EXPO_PUBLIC_GUIDE_SPEED=60 npx expo run:ios
maestro test e2e/core-flow.yaml
cd ../..
```
Expected: the build installs on a simulator and Maestro reports the flow passed (the guide's 240 seconds run in about 4 seconds at speed 60).

If Xcode or Maestro is missing, do not install them. Record in the report which tool is missing and skip to Step 4; the user will run the flow on their machine.

- [ ] **Step 4: Update AGENTS.md and commit**

Append under `## Commands`:
```markdown
- `cd apps/mobile && EXPO_PUBLIC_GUIDE_SPEED=60 npx expo run:ios && maestro test e2e/core-flow.yaml`: core-flow E2E on the iOS simulator (speed only for tests)
```

```bash
git add apps/mobile/e2e AGENTS.md
git commit -m "test(mobile): add core-flow Maestro E2E"
```

- [ ] **Step 5: User checkpoint**

Ask the user to run `cd apps/mobile && npx expo start` and open the app in Expo Go (or the simulator) to try one routine by hand: fonts render, the plate image and pin show for 합곡, haptics fire on a real phone, and the screen stays awake. Record anything they report as follow-ups.

---

## Out of scope for 2A (Phase 2B)

- 찾아보기: body map, zoom transition into plates, plate screen with pins, acupoint detail.
- 즐겨찾기 and 내 루틴: favorites, routine editor, copying a symptom routine, the history list.
- 설정 screen (rhythm haptics, press/rest seconds, pregnancy mode, disclaimer text, data deletion).
- Subsetting the Noto Serif KR font (only acupoint names use it; the full file is large).
