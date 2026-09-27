# Phase 1: Content Review and Data Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the typed, validated, WHO-reviewed content set (acupoints, symptom routines, plates, body maps) plus the tooling to normalize illustrations, place coordinates, and build a versioned content bundle.

**Architecture:** An npm-workspaces monorepo. `packages/shared` holds zod schemas, inferred types, user-data types, and pure routine helpers that the Expo app (phase 2) and the sync API (phase 4) will import. `content` holds the JSON data, a validator, an image normalizer (sharp), a local coordinate-pinning web tool, a prompt generator for ChatGPT, and a bundle builder that writes `content/dist` for phase 3 to publish.

**Tech Stack:** Node 22, TypeScript (strict), npm workspaces, zod, vitest, tsx, sharp.

**Spec:** `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md`

## Global Constraints

- App name is 꾹꾹 (ggookggook). Package scope is `@ggookggook/`.
- Node 22 (`node -v` is v22.22.2 on this machine). ESM everywhere (`"type": "module"`).
- TypeScript `strict: true` and `noUncheckedIndexedAccess: true`.
- Install the latest versions with `npm install` (no pinned versions in this plan). Before using zod or sharp APIs beyond those shown here, read the installed package's docs in `node_modules/<pkg>/`.
- Content copy is Korean only. Location sentences end in `~입니다`. Technique sentences end in `~하세요`.
- Efficacy wording: never write "치료", "완치", "효과가 있습니다". Symptom routines never promise results.
- Every routine has 1 to 3 steps. Step seconds are multiples of 10 between 10 and 600.
- Acupoint codes follow WHO 2008 (kidney is `KI`, not `KD`; Yintang is `GV29`).
- Illustration line color `#3A3732`, accent `#C23B2A`, app background `#F8F8F7`.
- Map canvas 1024x1536 (2:3). Plate canvas 1024x1024. Coordinates are 0 to 1 fractions of the normalized canvas.
- Commit messages follow conventional commits and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

```
package.json                     root workspaces + scripts
tsconfig.base.json               shared compiler options
.gitignore                       rewritten for the monorepo
AGENTS.md                        updated with commands
packages/shared/
  package.json, tsconfig.json
  src/index.ts                   re-exports
  src/content.ts                 zod schemas + inferred content types + manifest
  src/content.test.ts
  src/routine.ts                 duration, minutes, pregnancy filter
  src/routine.test.ts
  src/user.ts                    user data types + DEFAULT_SETTINGS
content/
  package.json, tsconfig.json
  data/meta.json                 { "version": 1 }
  data/acupoints.json            37 reviewed acupoints
  data/symptoms.json             15 symptom routines
  data/plates.json               15 close-up plates
  data/maps.json                 body-front, body-back
  images/raw/                    ChatGPT originals (already has 3 files)
  images/out/                    normalized .webp (generated, committed)
  src/paths.ts                   directory constants + loaders
  src/fixtures.ts                minimal valid content for tests
  src/validate.ts                validateContent()
  src/validate.test.ts
  src/images.ts                  normalizeImage()
  src/images.test.ts
  src/prompt.ts                  buildPrompt()
  src/prompt.test.ts
  src/pins.ts                    setPin(), setRegionPosition()
  src/pins.test.ts
  src/build.ts                   buildBundle(), buildManifest()
  src/build.test.ts
  src/cli/validate.ts            npm run validate
  src/cli/images.ts              npm run images
  src/cli/prompt.ts              npm run prompt -- <id>
  src/cli/build.ts               npm run build
  tools/pin/server.ts            npm run pin
  tools/pin/index.html
docs/illustration-style-guide.md Korean guide for making images in ChatGPT
```

`content/draft/` is deleted in Task 4 once its data has been reviewed into `content/data/`.

---

### Task 1: Workspace scaffold and shared content schema

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/content.ts`, `packages/shared/src/content.test.ts`
- Modify: `.gitignore` (full rewrite), `AGENTS.md`

**Interfaces:**
- Produces (from `@ggookggook/shared`): `acupointSchema`, `routineStepSchema`, `symptomSchema`, `pinSchema`, `plateSchema`, `regionSchema`, `bodyMapSchema`, `contentBundleSchema`, `manifestSchema`, and types `Acupoint`, `Sides`, `Caution`, `RoutineStep`, `Symptom`, `Pin`, `Plate`, `Region`, `BodyMap`, `BodyMapId`, `ContentBundle`, `Manifest`. Constants `ACUPOINT_ID`, `SLUG`.

- [ ] **Step 1: Write the root workspace files**

`package.json`:
```json
{
  "name": "ggookggook",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "content"],
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  }
}
```

`.gitignore` (replace the whole file):
```
node_modules/
coverage/
*.tsbuildinfo
.DS_Store
.env*
!.env.example
content/dist/
.superpowers/
```

`packages/shared/package.json`:
```json
{
  "name": "@ggookggook/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install -D typescript vitest tsx @types/node
npm install zod -w @ggookggook/shared
```
Expected: `node_modules/` created, `package-lock.json` written, no errors.

- [ ] **Step 3: Write the failing schema tests**

`packages/shared/src/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { acupointSchema, contentBundleSchema, symptomSchema } from './content';

const hegu = {
  id: 'LI4',
  name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
  sides: 'sequential',
  location: '손등에서 엄지와 검지 뼈 사이입니다.',
  technique: '반대쪽 엄지로 꾹 누르세요.',
  defaultSeconds: 60,
  cautions: ['pregnancy'],
  whoLocation: 'On the dorsum of the hand, radial to the midpoint of the second metacarpal bone.',
};

describe('acupointSchema', () => {
  it('accepts a WHO-coded acupoint', () => {
    expect(acupointSchema.parse(hegu).id).toBe('LI4');
  });

  it('accepts extra points and GV29', () => {
    expect(acupointSchema.safeParse({ ...hegu, id: 'EX-HN5' }).success).toBe(true);
    expect(acupointSchema.safeParse({ ...hegu, id: 'GV29' }).success).toBe(true);
  });

  it('rejects the non-WHO kidney prefix KD', () => {
    expect(acupointSchema.safeParse({ ...hegu, id: 'KD1' }).success).toBe(false);
    expect(acupointSchema.safeParse({ ...hegu, id: 'KI1' }).success).toBe(true);
  });

  it('rejects seconds that are not a multiple of 10', () => {
    expect(acupointSchema.safeParse({ ...hegu, defaultSeconds: 45 }).success).toBe(false);
  });
});

describe('symptomSchema', () => {
  const step = { acupointId: 'LI4', seconds: 60 };
  const symptom = { id: 'food_stagnation', name: '체했을 때', steps: [step], seeDoctor: '가슴 통증이 함께 오면 119에 연락하세요.' };

  it('accepts 1 to 3 steps', () => {
    expect(symptomSchema.safeParse(symptom).success).toBe(true);
    expect(symptomSchema.safeParse({ ...symptom, steps: [step, step, step] }).success).toBe(true);
  });

  it('rejects empty and 4-step routines', () => {
    expect(symptomSchema.safeParse({ ...symptom, steps: [] }).success).toBe(false);
    expect(symptomSchema.safeParse({ ...symptom, steps: [step, step, step, step] }).success).toBe(false);
  });
});

describe('contentBundleSchema', () => {
  it('rejects pins outside 0..1', () => {
    const bundle = {
      version: 1,
      acupoints: [hegu],
      symptoms: [],
      plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 1.2, y: 0.5 }] }],
      maps: [],
    };
    expect(contentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('allows regions without a position yet', () => {
    const bundle = {
      version: 1,
      acupoints: [hegu],
      symptoms: [],
      plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [] }],
      maps: [{ id: 'body-front', name: '앞면', subject: 'a body', regions: [{ id: 'hand', name: '손', x: null, y: null, plateIds: ['hand-dorsal'] }] }],
    };
    expect(contentBundleSchema.safeParse(bundle).success).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -w @ggookggook/shared`
Expected: FAIL, cannot resolve `./content`.

- [ ] **Step 5: Implement the schema**

`packages/shared/src/content.ts`:
```ts
import { z } from 'zod';

const MERIDIANS = 'LU|LI|ST|SP|HT|SI|BL|KI|PC|TE|GB|LR|GV|CV';
export const ACUPOINT_ID = new RegExp(`^(?:(?:${MERIDIANS})\\d{1,2}|EX-(?:HN|CA|B|UE|LE)\\d{1,2})$`);
export const SLUG = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;

const acupointId = z.string().regex(ACUPOINT_ID);
const slug = z.string().regex(SLUG);
const unit = z.number().min(0).max(1);

export const sidesSchema = z.enum(['single', 'sequential', 'together']);
export const cautionSchema = z.enum(['pregnancy']);

export const acupointSchema = z.object({
  id: acupointId,
  name: z.object({ ko: z.string().min(1), hanja: z.string().min(1), en: z.string().min(1) }),
  sides: sidesSchema,
  location: z.string().min(1),
  technique: z.string().min(1),
  defaultSeconds: z.number().int().min(10).max(300).multipleOf(10),
  cautions: z.array(cautionSchema),
  whoLocation: z.string().min(1),
});

export const routineStepSchema = z.object({
  acupointId,
  seconds: z.number().int().min(10).max(600).multipleOf(10),
});

export const symptomSchema = z.object({
  id: slug,
  name: z.string().min(1),
  steps: z.array(routineStepSchema).min(1).max(3),
  seeDoctor: z.string().min(1),
});

export const pinSchema = z.object({ acupointId, x: unit, y: unit });

export const plateSchema = z.object({
  id: slug,
  name: z.string().min(1),
  subject: z.string().min(1),
  acupointIds: z.array(acupointId).min(1),
  pins: z.array(pinSchema),
});

export const regionSchema = z.object({
  id: slug,
  name: z.string().min(1),
  x: unit.nullable(),
  y: unit.nullable(),
  plateIds: z.array(slug).min(1),
});

export const bodyMapIdSchema = z.enum(['body-front', 'body-back']);

export const bodyMapSchema = z.object({
  id: bodyMapIdSchema,
  name: z.string().min(1),
  subject: z.string().min(1),
  regions: z.array(regionSchema).min(1),
});

export const contentBundleSchema = z.object({
  version: z.number().int().positive(),
  acupoints: z.array(acupointSchema),
  symptoms: z.array(symptomSchema),
  plates: z.array(plateSchema),
  maps: z.array(bodyMapSchema),
});

export const manifestSchema = z.object({
  version: z.number().int().positive(),
  bundlePath: z.string().min(1),
  imagesPath: z.string().min(1),
  publishedAt: z.string().min(1),
});

export type Sides = z.infer<typeof sidesSchema>;
export type Caution = z.infer<typeof cautionSchema>;
export type Acupoint = z.infer<typeof acupointSchema>;
export type RoutineStep = z.infer<typeof routineStepSchema>;
export type Symptom = z.infer<typeof symptomSchema>;
export type Pin = z.infer<typeof pinSchema>;
export type Plate = z.infer<typeof plateSchema>;
export type Region = z.infer<typeof regionSchema>;
export type BodyMapId = z.infer<typeof bodyMapIdSchema>;
export type BodyMap = z.infer<typeof bodyMapSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
```

`packages/shared/src/index.ts`:
```ts
export * from './content';
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test -w @ggookggook/shared && npm run typecheck -w @ggookggook/shared`
Expected: all tests PASS, tsc exits 0.

- [ ] **Step 7: Update AGENTS.md**

Append to `AGENTS.md`:
```markdown

## Commands

- `npm test`: run every workspace's tests
- `npm run typecheck`: typecheck every workspace
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json .gitignore AGENTS.md packages/shared
git commit -m "feat(shared): add workspace and content schema"
```

---

### Task 2: Routine helpers and user data types

**Files:**
- Create: `packages/shared/src/routine.ts`, `packages/shared/src/routine.test.ts`, `packages/shared/src/user.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `Acupoint`, `RoutineStep` from Task 1.
- Produces: `type AcupointLookup = ReadonlyMap<string, Pick<Acupoint, 'sides' | 'cautions'>>`, `stepDurationSeconds(step: RoutineStep, acupoint: Pick<Acupoint, 'sides'>): number`, `routineDurationSeconds(steps: readonly RoutineStep[], lookup: AcupointLookup): number`, `routineMinutes(seconds: number): number`, `stepsForPregnancy(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[]`. Types `UserRoutine`, `FavoriteAcupoint`, `SessionFeedback`, `SessionRoutineRef`, `SessionLog`, `Settings`, const `DEFAULT_SETTINGS: Settings`.

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/routine.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Acupoint } from './content';
import type { AcupointLookup } from './routine';
import { routineDurationSeconds, routineMinutes, stepDurationSeconds, stepsForPregnancy } from './routine';

const lookup: AcupointLookup = new Map<string, Pick<Acupoint, 'sides' | 'cautions'>>([
  ['LI4', { sides: 'sequential', cautions: ['pregnancy'] }],
  ['GV29', { sides: 'single', cautions: [] }],
  ['EX-HN5', { sides: 'together', cautions: [] }],
]);

describe('stepDurationSeconds', () => {
  it('doubles sequential points because each side gets the full time', () => {
    expect(stepDurationSeconds({ acupointId: 'LI4', seconds: 60 }, { sides: 'sequential' })).toBe(120);
  });

  it('keeps single and together points as is', () => {
    expect(stepDurationSeconds({ acupointId: 'GV29', seconds: 60 }, { sides: 'single' })).toBe(60);
    expect(stepDurationSeconds({ acupointId: 'EX-HN5', seconds: 60 }, { sides: 'together' })).toBe(60);
  });
});

describe('routineDurationSeconds', () => {
  it('sums every step', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'EX-HN5', seconds: 60 },
      { acupointId: 'GV29', seconds: 30 },
    ];
    expect(routineDurationSeconds(steps, lookup)).toBe(210);
  });

  it('throws on an unknown acupoint', () => {
    expect(() => routineDurationSeconds([{ acupointId: 'ST36', seconds: 60 }], lookup)).toThrow('ST36');
  });
});

describe('routineMinutes', () => {
  it('rounds up to whole minutes with a floor of 1', () => {
    expect(routineMinutes(240)).toBe(4);
    expect(routineMinutes(150)).toBe(3);
    expect(routineMinutes(30)).toBe(1);
  });
});

describe('stepsForPregnancy', () => {
  it('drops steps whose acupoint is contraindicated in pregnancy', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'GV29', seconds: 60 },
    ];
    expect(stepsForPregnancy(steps, lookup)).toEqual([{ acupointId: 'GV29', seconds: 60 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @ggookggook/shared`
Expected: FAIL, cannot resolve `./routine`.

- [ ] **Step 3: Implement routine helpers**

`packages/shared/src/routine.ts`:
```ts
import type { Acupoint, RoutineStep } from './content';

export type AcupointLookup = ReadonlyMap<string, Pick<Acupoint, 'sides' | 'cautions'>>;

export function stepDurationSeconds(step: RoutineStep, acupoint: Pick<Acupoint, 'sides'>): number {
  return acupoint.sides === 'sequential' ? step.seconds * 2 : step.seconds;
}

function requireAcupoint(lookup: AcupointLookup, id: string): Pick<Acupoint, 'sides' | 'cautions'> {
  const acupoint = lookup.get(id);
  if (!acupoint) throw new Error(`Unknown acupoint: ${id}`);
  return acupoint;
}

export function routineDurationSeconds(steps: readonly RoutineStep[], lookup: AcupointLookup): number {
  return steps.reduce((sum, step) => sum + stepDurationSeconds(step, requireAcupoint(lookup, step.acupointId)), 0);
}

export function routineMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

export function stepsForPregnancy(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[] {
  return steps.filter((step) => !requireAcupoint(lookup, step.acupointId).cautions.includes('pregnancy'));
}
```

- [ ] **Step 4: Add user data types**

`packages/shared/src/user.ts`:
```ts
import type { RoutineStep } from './content';

export interface UserRoutine {
  id: string;
  name: string;
  steps: RoutineStep[];
  sourceSymptomId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FavoriteAcupoint {
  acupointId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SessionFeedback = 'better' | 'same' | 'worse';

export type SessionRoutineRef =
  | { kind: 'symptom'; symptomId: string }
  | { kind: 'user'; routineId: string };

export interface SessionLog {
  id: string;
  routine: SessionRoutineRef;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  feedback: SessionFeedback | null;
}

export interface Settings {
  rhythmHaptics: boolean;
  pressSeconds: number;
  restSeconds: number;
  pregnancyMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  rhythmHaptics: true,
  pressSeconds: 5,
  restSeconds: 2,
  pregnancyMode: false,
};
```

`packages/shared/src/index.ts`:
```ts
export * from './content';
export * from './routine';
export * from './user';
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -w @ggookggook/shared && npm run typecheck -w @ggookggook/shared`
Expected: PASS, tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add routine helpers and user data types"
```

---

### Task 3: Content validator

**Files:**
- Create: `content/package.json`, `content/tsconfig.json`, `content/src/paths.ts`, `content/src/fixtures.ts`, `content/src/validate.ts`, `content/src/validate.test.ts`, `content/src/cli/validate.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `contentBundleSchema`, `ContentBundle` from `@ggookggook/shared`.
- Produces:
  - `paths.ts`: `CONTENT_ROOT`, `DATA_DIR`, `RAW_IMAGE_DIR`, `OUT_IMAGE_DIR`, `DIST_DIR` (strings), `readJson(file: string): Promise<unknown>`, `loadRawContent(dataDir?: string): Promise<Record<string, unknown>>`, `listImageIds(dir?: string): Promise<Set<string>>`.
  - `fixtures.ts`: `validContent(): ContentBundle`.
  - `validate.ts`: `interface Issue { level: 'error' | 'warning'; message: string }`, `interface ValidateOptions { release: boolean; imageIds?: ReadonlySet<string> }`, `validateContent(raw: unknown, options: ValidateOptions): Issue[]`.

- [ ] **Step 1: Create the content package**

`content/package.json`:
```json
{
  "name": "@ggookggook/content",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json",
    "validate": "tsx src/cli/validate.ts"
  },
  "dependencies": {
    "@ggookggook/shared": "*"
  }
}
```

`content/tsconfig.json`:
```json
{ "extends": "../tsconfig.base.json", "include": ["src", "tools"] }
```

Run: `npm install` (links the workspace).

- [ ] **Step 2: Write paths and fixtures**

`content/src/paths.ts`:
```ts
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const CONTENT_ROOT = path.resolve(import.meta.dirname, '..');
export const DATA_DIR = path.join(CONTENT_ROOT, 'data');
export const RAW_IMAGE_DIR = path.join(CONTENT_ROOT, 'images', 'raw');
export const OUT_IMAGE_DIR = path.join(CONTENT_ROOT, 'images', 'out');
export const DIST_DIR = path.join(CONTENT_ROOT, 'dist');

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function loadRawContent(dataDir: string = DATA_DIR): Promise<Record<string, unknown>> {
  const meta = (await readJson(path.join(dataDir, 'meta.json'))) as { version?: unknown };
  return {
    version: meta.version,
    acupoints: await readJson(path.join(dataDir, 'acupoints.json')),
    symptoms: await readJson(path.join(dataDir, 'symptoms.json')),
    plates: await readJson(path.join(dataDir, 'plates.json')),
    maps: await readJson(path.join(dataDir, 'maps.json')),
  };
}

export async function listImageIds(dir: string = OUT_IMAGE_DIR): Promise<Set<string>> {
  try {
    const files = await readdir(dir);
    return new Set(files.filter((file) => file.endsWith('.webp')).map((file) => file.slice(0, -'.webp'.length)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
}
```

`content/src/fixtures.ts`:
```ts
import type { ContentBundle } from '@ggookggook/shared';

export function validContent(): ContentBundle {
  return {
    version: 1,
    acupoints: [
      {
        id: 'LI4',
        name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
        sides: 'sequential',
        location: '손등에서 엄지와 검지 뼈 사이입니다.',
        technique: '반대쪽 엄지로 꾹 누르세요.',
        defaultSeconds: 60,
        cautions: ['pregnancy'],
        whoLocation: 'On the dorsum of the hand, radial to the midpoint of the second metacarpal bone.',
      },
      {
        id: 'PC6',
        name: { ko: '내관', hanja: '內關', en: 'Neiguan' },
        sides: 'sequential',
        location: '손목 안쪽 주름에서 손가락 세 개 너비만큼 올라온 곳입니다.',
        technique: '반대쪽 엄지로 지그시 누르세요.',
        defaultSeconds: 60,
        cautions: [],
        whoLocation:
          'On the anterior aspect of the forearm, between the tendons of palmaris longus and flexor carpi radialis, 2 B-cun proximal to the palmar wrist crease.',
      },
    ],
    symptoms: [
      {
        id: 'food_stagnation',
        name: '체했을 때',
        steps: [
          { acupointId: 'LI4', seconds: 60 },
          { acupointId: 'PC6', seconds: 60 },
        ],
        seeDoctor: '가슴 통증이나 식은땀이 함께 오면 바로 119에 연락하세요.',
      },
    ],
    plates: [
      { id: 'hand-dorsal', name: '손등', subject: 'the back of a hand', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.6, y: 0.56 }] },
      { id: 'wrist-inner', name: '손목 안쪽', subject: 'the inner wrist', acupointIds: ['PC6'], pins: [{ acupointId: 'PC6', x: 0.5, y: 0.4 }] },
    ],
    maps: [
      {
        id: 'body-front',
        name: '앞면',
        subject: 'a full body',
        regions: [{ id: 'hand', name: '손', x: 0.15, y: 0.53, plateIds: ['hand-dorsal', 'wrist-inner'] }],
      },
    ],
  };
}
```

- [ ] **Step 3: Write the failing validator tests**

`content/src/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { validContent } from './fixtures';
import { validateContent, type Issue } from './validate';

const allImages = new Set(['hand-dorsal', 'wrist-inner', 'body-front']);
const errors = (issues: Issue[]) => issues.filter((i) => i.level === 'error').map((i) => i.message);
const warnings = (issues: Issue[]) => issues.filter((i) => i.level === 'warning').map((i) => i.message);

describe('validateContent', () => {
  it('passes valid content in release mode', () => {
    expect(validateContent(validContent(), { release: true, imageIds: allImages })).toEqual([]);
  });

  it('reports schema errors with their path', () => {
    const content = validContent();
    (content.acupoints[0] as { id: string }).id = 'li4';
    expect(errors(validateContent(content, { release: false }))[0]).toContain('acupoints.0.id');
  });

  it('reports unknown acupoints in symptom steps', () => {
    const content = validContent();
    content.symptoms[0]!.steps.push({ acupointId: 'ST36', seconds: 60 });
    expect(errors(validateContent(content, { release: false }))).toContain('Symptom food_stagnation uses unknown acupoint ST36');
  });

  it('reports duplicate ids', () => {
    const content = validContent();
    content.acupoints.push({ ...content.acupoints[0]! });
    expect(errors(validateContent(content, { release: false }))).toContain('Duplicate acupoint id: LI4');
  });

  it('reports acupoints that are on no plate', () => {
    const content = validContent();
    content.plates[1]!.acupointIds = ['LI4'];
    content.plates[1]!.pins = [];
    expect(errors(validateContent(content, { release: false }))).toContain('Acupoint PC6 is not on any plate');
  });

  it('reports pins for acupoints the plate does not list', () => {
    const content = validContent();
    content.plates[0]!.pins.push({ acupointId: 'PC6', x: 0.1, y: 0.1 });
    expect(errors(validateContent(content, { release: false }))).toContain('Plate hand-dorsal has a pin for PC6, which it does not list');
  });

  it('reports plates no region links to', () => {
    const content = validContent();
    content.maps[0]!.regions[0]!.plateIds = ['hand-dorsal'];
    expect(errors(validateContent(content, { release: false }))).toContain('Plate wrist-inner is not reachable from any body map region');
  });

  it('treats missing pins as warnings until release', () => {
    const content = validContent();
    content.plates[0]!.pins = [];
    expect(warnings(validateContent(content, { release: false }))).toContain('Plate hand-dorsal has no pin for LI4');
    expect(errors(validateContent(content, { release: true, imageIds: allImages }))).toContain('Plate hand-dorsal has no pin for LI4');
  });

  it('treats missing images as warnings until release', () => {
    const images = new Set(['wrist-inner', 'body-front']);
    expect(warnings(validateContent(validContent(), { release: false, imageIds: images }))).toContain('Plate hand-dorsal has no image');
    expect(errors(validateContent(validContent(), { release: true, imageIds: images }))).toContain('Plate hand-dorsal has no image');
  });

  it('treats regions without a position as warnings until release', () => {
    const content = validContent();
    content.maps[0]!.regions[0]!.x = null;
    expect(warnings(validateContent(content, { release: false }))).toContain('Region body-front/hand has no position');
    expect(errors(validateContent(content, { release: true, imageIds: allImages }))).toContain('Region body-front/hand has no position');
  });

  it('warns when pregnancy mode would empty a routine', () => {
    const content = validContent();
    content.symptoms[0]!.steps = [{ acupointId: 'LI4', seconds: 60 }];
    expect(warnings(validateContent(content, { release: false }))).toContain('Symptom food_stagnation has no steps left in pregnancy mode');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -w @ggookggook/content`
Expected: FAIL, cannot resolve `./validate`.

- [ ] **Step 5: Implement the validator**

`content/src/validate.ts`:
```ts
import { contentBundleSchema, type ContentBundle } from '@ggookggook/shared';

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}

export interface ValidateOptions {
  release: boolean;
  imageIds?: ReadonlySet<string>;
}

export function validateContent(raw: unknown, options: ValidateOptions): Issue[] {
  const parsed = contentBundleSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({ level: 'error', message: `${issue.path.join('.')}: ${issue.message}` }));
  }
  return checkReferences(parsed.data, options);
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

function checkReferences(content: ContentBundle, { release, imageIds }: ValidateOptions): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });
  const gap = release ? error : warn;
  const checkUnique = (kind: string, ids: string[]) => duplicates(ids).forEach((id) => error(`Duplicate ${kind} id: ${id}`));

  checkUnique('acupoint', content.acupoints.map((a) => a.id));
  checkUnique('symptom', content.symptoms.map((s) => s.id));
  checkUnique('plate', content.plates.map((p) => p.id));
  checkUnique('map', content.maps.map((m) => m.id));
  for (const map of content.maps) checkUnique(`region in ${map.id}`, map.regions.map((r) => r.id));

  const acupoints = new Map(content.acupoints.map((a) => [a.id, a]));
  const plateIds = new Set(content.plates.map((p) => p.id));

  for (const symptom of content.symptoms) {
    for (const step of symptom.steps) {
      if (!acupoints.has(step.acupointId)) error(`Symptom ${symptom.id} uses unknown acupoint ${step.acupointId}`);
    }
    const allContraindicated = symptom.steps.every((step) => acupoints.get(step.acupointId)?.cautions.includes('pregnancy'));
    if (allContraindicated) warn(`Symptom ${symptom.id} has no steps left in pregnancy mode`);
  }

  const onPlate = new Set<string>();
  for (const plate of content.plates) {
    for (const id of plate.acupointIds) {
      if (!acupoints.has(id)) error(`Plate ${plate.id} lists unknown acupoint ${id}`);
      onPlate.add(id);
    }
    const pinned = new Set<string>();
    for (const pin of plate.pins) {
      if (!plate.acupointIds.includes(pin.acupointId)) error(`Plate ${plate.id} has a pin for ${pin.acupointId}, which it does not list`);
      if (pinned.has(pin.acupointId)) error(`Plate ${plate.id} pins ${pin.acupointId} twice`);
      pinned.add(pin.acupointId);
    }
    for (const id of plate.acupointIds) {
      if (!pinned.has(id)) gap(`Plate ${plate.id} has no pin for ${id}`);
    }
    if (imageIds && !imageIds.has(plate.id)) gap(`Plate ${plate.id} has no image`);
  }
  for (const acupoint of content.acupoints) {
    if (!onPlate.has(acupoint.id)) error(`Acupoint ${acupoint.id} is not on any plate`);
  }

  const reachable = new Set<string>();
  for (const map of content.maps) {
    if (imageIds && !imageIds.has(map.id)) gap(`Map ${map.id} has no image`);
    for (const region of map.regions) {
      for (const id of region.plateIds) {
        if (!plateIds.has(id)) error(`Region ${map.id}/${region.id} links unknown plate ${id}`);
        reachable.add(id);
      }
      if (region.x === null || region.y === null) gap(`Region ${map.id}/${region.id} has no position`);
    }
  }
  for (const plate of content.plates) {
    if (!reachable.has(plate.id)) error(`Plate ${plate.id} is not reachable from any body map region`);
  }

  return issues;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -w @ggookggook/content`
Expected: PASS (11 tests).

- [ ] **Step 7: Write the validate CLI**

`content/src/cli/validate.ts`:
```ts
import { listImageIds, loadRawContent } from '../paths';
import { validateContent } from '../validate';

const release = process.argv.includes('--release');
const issues = validateContent(await loadRawContent(), { release, imageIds: await listImageIds() });

for (const issue of issues) {
  console.log(`${issue.level === 'error' ? 'ERROR' : 'warn '} ${issue.message}`);
}
const errorCount = issues.filter((issue) => issue.level === 'error').length;
console.log(`${errorCount} error(s), ${issues.length - errorCount} warning(s)${release ? ' [release]' : ''}`);
process.exitCode = errorCount > 0 ? 1 : 0;
```

The CLI cannot run until Task 4 creates `content/data/`. Typecheck it now:

Run: `npm run typecheck -w @ggookggook/content`
Expected: tsc exits 0.

- [ ] **Step 8: Update AGENTS.md**

Append under `## Commands`:
```markdown
- `npm run validate -w @ggookggook/content`: check content data (add `-- --release` before shipping)
```

- [ ] **Step 9: Commit**

```bash
git add content/package.json content/tsconfig.json content/src package-lock.json AGENTS.md
git commit -m "feat(content): add content validator"
```

---

### Task 4: Reviewed content data

This task turns `content/draft/` into reviewed data. It is data authoring, so there is no new test file. The validator from Task 3 is the test.

**Files:**
- Create: `content/data/meta.json`, `content/data/acupoints.json`, `content/data/symptoms.json`, `content/data/plates.json`, `content/data/maps.json`
- Delete: `content/draft/acupoints.json`, `content/draft/symptoms.json`

**Interfaces:**
- Consumes: schema from Task 1, validator CLI from Task 3.
- Produces: the data files every later task reads. Plate ids and map ids here are the image file names used in Tasks 5 to 8.

- [ ] **Step 1: Write meta.json**

`content/data/meta.json`:
```json
{ "version": 1 }
```

- [ ] **Step 2: Write acupoints.json from the reviewed table**

Write one record per row below (37 records, same order), with this shape:
```json
{
  "id": "LI4",
  "name": { "ko": "합곡", "hanja": "合谷", "en": "Hegu" },
  "sides": "sequential",
  "location": "…",
  "technique": "…",
  "defaultSeconds": 60,
  "cautions": ["pregnancy"],
  "whoLocation": "…"
}
```

Rules for the two Korean fields:
- `location` is one or two short sentences ending in `~입니다`. Use landmarks a layperson can find by touch (뼈, 주름, 오목한 곳, 힘줄). Never use B-cun. Convert with these finger widths: 1 B-cun = 엄지 한 개 너비. 1.5 B-cun = 손가락 두 개(검지와 중지) 너비. 2 B-cun = 손가락 세 개(검지부터 약지) 너비. 3 B-cun = 손가락 네 개(검지부터 새끼) 너비. 5 B-cun and above: use a landmark instead (for GV20, the line joining the tops of both ears).
- `technique` is one or two short sentences ending in `~하세요`. Say which finger and which direction. Say how strong ("뻐근할 정도"). Do not mention duration (the timer handles it). For back points that are hard to reach alone, suggest a tennis ball against a wall.
- Neither field may claim an effect.
- `defaultSeconds` is 60 for every record.
- `whoLocation` is copied exactly from the table.

Three finished examples (use these verbatim):
```json
{
  "id": "LI4",
  "name": { "ko": "합곡", "hanja": "合谷", "en": "Hegu" },
  "sides": "sequential",
  "location": "손등에서 엄지와 검지 뼈 사이입니다. 검지 뼈 가운데쯤, 엄지 쪽 가장자리를 누르면 뻐근합니다.",
  "technique": "반대쪽 엄지로 검지 뼈 쪽을 향해 꾹 누르세요. 뻐근할 정도가 적당합니다.",
  "defaultSeconds": 60,
  "cautions": ["pregnancy"],
  "whoLocation": "On the dorsum of the hand, radial to the midpoint of the second metacarpal bone."
}
```
```json
{
  "id": "GB20",
  "name": { "ko": "풍지", "hanja": "風池", "en": "Fengchi" },
  "sides": "together",
  "location": "뒷머리뼈 바로 아래, 목 뒤 굵은 근육 두 개 사이의 오목한 곳입니다. 양쪽에 하나씩 있습니다.",
  "technique": "양손 엄지를 양쪽에 대고 머리 쪽 위를 향해 지그시 누르세요.",
  "defaultSeconds": 60,
  "cautions": [],
  "whoLocation": "In the nape, inferior to the occipital bone, in the depression between the upper attachments of the sternocleidomastoid and trapezius muscles."
}
```
```json
{
  "id": "ST36",
  "name": { "ko": "족삼리", "hanja": "足三里", "en": "Zusanli" },
  "sides": "sequential",
  "location": "무릎뼈 아래 바깥쪽 오목한 곳에서 손가락 네 개 너비만큼 내려온 곳입니다. 정강이뼈에서 손가락 하나 너비 바깥쪽입니다.",
  "technique": "엄지로 꾹 누르거나 작은 원을 그리며 누르세요.",
  "defaultSeconds": 60,
  "cautions": [],
  "whoLocation": "On the anterior aspect of the leg, on the line connecting ST35 with ST41, 3 B-cun inferior to ST35."
}
```

Reviewed table. `sides`: `single` is on the midline, `sequential` means one side then the other, `together` means both sides at once. `P` in the caution column means `"cautions": ["pregnancy"]`, blank means `[]`.

| id | ko | hanja | en | sides | caution | whoLocation |
|---|---|---|---|---|---|---|
| LI4 | 합곡 | 合谷 | Hegu | sequential | P | On the dorsum of the hand, radial to the midpoint of the second metacarpal bone. |
| SI3 | 후계 | 後谿 | Houxi | sequential | | On the dorsum of the hand, in the depression proximal to the fifth metacarpophalangeal joint, at the border of the red and white flesh on the ulnar side. |
| PC6 | 내관 | 內關 | Neiguan | sequential | | On the anterior aspect of the forearm, between the tendons of palmaris longus and flexor carpi radialis, 2 B-cun proximal to the palmar wrist crease. |
| HT7 | 신문 | 神門 | Shenmen | sequential | | On the anteromedial aspect of the wrist, radial to the flexor carpi ulnaris tendon, on the palmar wrist crease. |
| LU7 | 열결 | 列缺 | Lieque | sequential | | On the radial aspect of the forearm, between the tendons of abductor pollicis longus and extensor pollicis brevis, in the groove for the abductor pollicis longus tendon, 1.5 B-cun superior to the palmar wrist crease. |
| TE5 | 외관 | 外關 | Waiguan | sequential | | On the posterior aspect of the forearm, midpoint of the interosseous space between the radius and the ulna, 2 B-cun proximal to the dorsal wrist crease. |
| LI11 | 곡지 | 曲池 | Quchi | sequential | | On the lateral aspect of the elbow, at the midpoint of the line connecting LU5 with the lateral epicondyle of the humerus. |
| LI15 | 견우 | 肩髃 | Jianyu | sequential | | On the shoulder girdle, in the depression between the anterior end of the lateral border of the acromion and the greater tubercle of the humerus. |
| GV20 | 백회 | 百會 | Baihui | single | | On the head, 5 B-cun superior to the anterior hairline, on the anterior median line. |
| GV29 | 인당 | 印堂 | Yintang | single | | On the head, in the depression between the medial ends of the two eyebrows. |
| BL2 | 찬죽 | 攢竹 | Cuanzhu | together | | On the head, in the depression at the medial end of the eyebrow. |
| ST2 | 사백 | 四白 | Sibai | together | | On the face, in the infraorbital foramen. |
| LI20 | 영향 | 迎香 | Yingxiang | together | | On the face, in the nasolabial sulcus, at the same level as the midpoint of the lateral border of the ala of the nose. |
| EX-HN5 | 태양 | 太陽 | Taiyang | together | | In the depression about one finger-breadth posterior to the midpoint between the lateral end of the eyebrow and the outer canthus. |
| GB20 | 풍지 | 風池 | Fengchi | together | | In the nape, inferior to the occipital bone, in the depression between the upper attachments of the sternocleidomastoid and trapezius muscles. |
| GV14 | 대추 | 大椎 | Dazhui | single | | In the posterior region of the neck, in the depression inferior to the spinous process of the seventh cervical vertebra (C7), on the posterior median line. |
| GB21 | 견정 | 肩井 | Jianjing | sequential | P | In the posterior region of the neck, at the midpoint of the line connecting the spinous process of C7 with the lateral end of the acromion. |
| BL13 | 폐수 | 肺兪 | Feishu | together | | In the upper back region, at the same level as the inferior border of the spinous process of the third thoracic vertebra (T3), 1.5 B-cun lateral to the posterior median line. |
| SI11 | 천종 | 天宗 | Tianzong | sequential | | In the scapular region, in the depression between the upper one third and lower two thirds of the line connecting the midpoint of the spine of the scapula with the inferior angle of the scapula. |
| BL23 | 신수 | 腎兪 | Shenshu | together | | In the lumbar region, at the same level as the inferior border of the spinous process of the second lumbar vertebra (L2), 1.5 B-cun lateral to the posterior median line. |
| GV4 | 명문 | 命門 | Mingmen | single | | In the lumbar region, in the depression inferior to the spinous process of the second lumbar vertebra (L2), on the posterior median line. |
| GB30 | 환도 | 環跳 | Huantiao | sequential | | In the buttock region, at the junction of the lateral one third and medial two thirds of the line connecting the prominence of the greater trochanter with the sacral hiatus. |
| CV17 | 전중 | 膻中 | Danzhong | single | | In the anterior thoracic region, at the same level as the fourth intercostal space, on the anterior median line. |
| CV12 | 중완 | 中脘 | Zhongwan | single | | In the upper abdomen, 4 B-cun superior to the centre of the umbilicus, on the anterior median line. |
| CV6 | 기해 | 氣海 | Qihai | single | P | In the lower abdomen, 1.5 B-cun inferior to the centre of the umbilicus, on the anterior median line. |
| CV4 | 관원 | 關元 | Guanyuan | single | P | In the lower abdomen, 3 B-cun inferior to the centre of the umbilicus, on the anterior median line. |
| ST25 | 천추 | 天樞 | Tianshu | together | P | On the abdomen, 2 B-cun lateral to the centre of the umbilicus. |
| ST36 | 족삼리 | 足三里 | Zusanli | sequential | | On the anterior aspect of the leg, on the line connecting ST35 with ST41, 3 B-cun inferior to ST35. |
| GB34 | 양릉천 | 陽陵泉 | Yanglingquan | sequential | | On the fibular aspect of the leg, in the depression anterior and distal to the head of the fibula. |
| BL40 | 위중 | 委中 | Weizhong | sequential | | On the posterior aspect of the knee, at the midpoint of the popliteal crease. |
| BL57 | 승산 | 承山 | Chengshan | sequential | | On the posterior aspect of the leg, at the connecting point of the calcaneal tendon with the two muscle bellies of the gastrocnemius muscle. |
| SP6 | 삼음교 | 三陰交 | Sanyinjiao | sequential | P | On the tibial aspect of the leg, posterior to the medial border of the tibia, 3 B-cun superior to the prominence of the medial malleolus. |
| KI3 | 태계 | 太谿 | Taixi | sequential | | On the posteromedial aspect of the ankle, in the depression between the prominence of the medial malleolus and the calcaneal tendon. |
| SP4 | 공손 | 公孫 | Gongsun | sequential | | On the medial aspect of the foot, anteroinferior to the base of the first metatarsal bone, at the border of the red and white flesh. |
| BL60 | 곤륜 | 崑崙 | Kunlun | sequential | P | On the posterolateral aspect of the ankle, in the depression between the prominence of the lateral malleolus and the calcaneal tendon. |
| LR3 | 태충 | 太衝 | Taichong | sequential | | On the dorsum of the foot, between the first and second metatarsal bones, in the depression distal to the junction of the bases of the two bones, over the dorsalis pedis artery. |
| KI1 | 용천 | 湧泉 | Yongquan | sequential | | On the sole of the foot, in the deepest depression of the sole when the toes are flexed. |

Corrections against the draft that the Korean text must reflect:
- `KD1` and `KD3` become `KI1` and `KI3`. `EX-HN3` becomes `GV29`.
- ST25 is 2 B-cun from the navel, so "손가락 세 개 너비" (the draft said two).
- CV6 is 1.5 B-cun below the navel, so "손가락 두 개 너비" (the draft said one and a half).
- TE5 is 2 B-cun above the wrist crease, so "손가락 세 개 너비" (the draft said two).
- CV17 is at the level of the fourth intercostal space on the breastbone. Do not use the nipple line.
- ST2 is directly below the pupil on the cheekbone, in the small depression you feel there.
- GB30 is one third of the way from the hip bone bump (greater trochanter) toward the tailbone.
- SI11 is about one third of the way down the shoulder blade from its ridge, not the "center".

- [ ] **Step 3: Write symptoms.json**

`content/data/symptoms.json` (use verbatim):
```json
[
  {
    "id": "headache",
    "name": "두통",
    "steps": [
      { "acupointId": "LI4", "seconds": 60 },
      { "acupointId": "EX-HN5", "seconds": 60 },
      { "acupointId": "GB20", "seconds": 60 }
    ],
    "seeDoctor": "평생 처음 겪는 갑작스럽고 심한 두통이거나, 말이 어눌해지거나 팔다리에 힘이 빠지면 바로 119에 연락하세요."
  },
  {
    "id": "insomnia",
    "name": "잠이 안 올 때",
    "steps": [
      { "acupointId": "HT7", "seconds": 60 },
      { "acupointId": "GV29", "seconds": 60 },
      { "acupointId": "KI1", "seconds": 60 }
    ],
    "seeDoctor": "잠들기 어려운 날이 3주 넘게 이어지거나 낮 생활이 힘들 정도면 병원 진료를 받으세요."
  },
  {
    "id": "stress",
    "name": "스트레스",
    "steps": [
      { "acupointId": "PC6", "seconds": 60 },
      { "acupointId": "GV29", "seconds": 60 }
    ],
    "seeDoctor": "우울하거나 불안한 기분이 2주 넘게 이어지면 전문가와 상담하세요. 도움이 필요하면 자살예방 상담전화 109로 연락하세요."
  },
  {
    "id": "indigestion",
    "name": "소화불량",
    "steps": [
      { "acupointId": "PC6", "seconds": 60 },
      { "acupointId": "ST36", "seconds": 60 },
      { "acupointId": "CV12", "seconds": 60 }
    ],
    "seeDoctor": "검은 변을 보거나 피를 토하면, 또는 이유 없이 체중이 줄면 병원 진료를 받으세요."
  },
  {
    "id": "shoulder_pain",
    "name": "어깨 결림",
    "steps": [
      { "acupointId": "GB21", "seconds": 60 },
      { "acupointId": "SI3", "seconds": 60 }
    ],
    "seeDoctor": "왼쪽 어깨나 팔로 번지는 가슴 통증이 함께 오면 바로 119에 연락하세요. 팔 저림이 계속되면 병원 진료를 받으세요."
  },
  {
    "id": "back_pain",
    "name": "허리 통증",
    "steps": [
      { "acupointId": "BL23", "seconds": 60 },
      { "acupointId": "BL40", "seconds": 60 }
    ],
    "seeDoctor": "다리 저림이나 감각 이상, 대소변 장애가 함께 오면 바로 병원에 가세요."
  },
  {
    "id": "eye_fatigue",
    "name": "눈 피로",
    "steps": [
      { "acupointId": "BL2", "seconds": 60 },
      { "acupointId": "EX-HN5", "seconds": 60 },
      { "acupointId": "GB20", "seconds": 60 }
    ],
    "seeDoctor": "시야가 갑자기 흐려지거나 눈 통증이 심하면 안과 진료를 받으세요."
  },
  {
    "id": "nausea",
    "name": "메스꺼움",
    "steps": [
      { "acupointId": "PC6", "seconds": 60 },
      { "acupointId": "ST36", "seconds": 60 }
    ],
    "seeDoctor": "구토가 하루 넘게 이어지거나 심한 복통, 탈수 증상이 있으면 병원에 가세요."
  },
  {
    "id": "neck_pain",
    "name": "목 결림",
    "steps": [
      { "acupointId": "GB20", "seconds": 60 },
      { "acupointId": "GB21", "seconds": 60 },
      { "acupointId": "TE5", "seconds": 60 }
    ],
    "seeDoctor": "목 통증과 함께 열이 나거나 팔 저림이 있으면 병원 진료를 받으세요."
  },
  {
    "id": "menstrual_pain",
    "name": "생리통",
    "steps": [
      { "acupointId": "SP6", "seconds": 60 },
      { "acupointId": "LR3", "seconds": 60 },
      { "acupointId": "CV4", "seconds": 60 }
    ],
    "seeDoctor": "통증이 점점 심해지거나 진통제로도 조절되지 않으면 산부인과 진료를 받으세요."
  },
  {
    "id": "cold_extremities",
    "name": "손발이 찰 때",
    "steps": [
      { "acupointId": "KI1", "seconds": 60 },
      { "acupointId": "ST36", "seconds": 60 }
    ],
    "seeDoctor": "손발 색이 하얗거나 파랗게 변하면서 저리면 병원 진료를 받으세요."
  },
  {
    "id": "concentration",
    "name": "집중이 안 될 때",
    "steps": [
      { "acupointId": "GV20", "seconds": 60 },
      { "acupointId": "GV29", "seconds": 60 }
    ],
    "seeDoctor": "기억력이 떨어지거나 멍한 상태가 계속되면 병원 진료를 받으세요."
  },
  {
    "id": "food_stagnation",
    "name": "체했을 때",
    "steps": [
      { "acupointId": "LI4", "seconds": 60 },
      { "acupointId": "PC6", "seconds": 60 }
    ],
    "seeDoctor": "가슴 통증이나 식은땀이 함께 오면 체한 것이 아닐 수 있습니다. 바로 119에 연락하세요."
  },
  {
    "id": "constipation",
    "name": "변비",
    "steps": [
      { "acupointId": "ST25", "seconds": 60 },
      { "acupointId": "LI4", "seconds": 60 },
      { "acupointId": "ST36", "seconds": 60 }
    ],
    "seeDoctor": "변에 피가 섞이거나 배변 습관이 갑자기 바뀌면 병원 진료를 받으세요."
  },
  {
    "id": "facial_swelling",
    "name": "얼굴 부기",
    "steps": [
      { "acupointId": "LI20", "seconds": 60 },
      { "acupointId": "ST36", "seconds": 60 }
    ],
    "seeDoctor": "부기가 며칠 넘게 빠지지 않거나 소변량이 줄면 병원 진료를 받으세요."
  }
]
```

The draft's `urgent_bowel` (급똥참기) is intentionally dropped: no standard source supports it, and its draft routine pressed on the lower abdomen, which works against the goal.

- [ ] **Step 4: Write plates.json**

`content/data/plates.json` (use verbatim):
```json
[
  { "id": "head-top", "name": "정수리", "subject": "the top of a Korean adult's head seen from directly above, short neat hair drawn as a simple outline, the tip of the nose and both ears just visible at the edges", "acupointIds": ["GV20"], "pins": [] },
  { "id": "face-front", "name": "얼굴", "subject": "the face of a Korean adult seen from the front, eyes gently closed, eyebrows, nose, and mouth drawn with minimal lines, hair pulled back so the forehead and both temples are visible", "acupointIds": ["GV29", "BL2", "ST2", "LI20", "EX-HN5"], "pins": [] },
  { "id": "neck-back", "name": "뒷목과 어깨", "subject": "the back of a Korean adult's head, neck, and both shoulders seen from behind, short hair drawn as a simple outline, a plain seamless bodysuit on the shoulders", "acupointIds": ["GB20", "GV14", "GB21"], "pins": [] },
  { "id": "upper-back", "name": "등 위쪽", "subject": "the upper back of a Korean adult seen from behind, from the neck to below the shoulder blades, arms relaxed at the sides, a plain seamless bodysuit, faint outlines of the spine and shoulder blades", "acupointIds": ["BL13", "SI11"], "pins": [] },
  { "id": "lower-back", "name": "허리와 엉덩이", "subject": "the lower back and buttocks of a Korean adult seen from behind, from the bottom of the ribs to the top of the thighs, a plain seamless bodysuit, a faint outline of the spine", "acupointIds": ["BL23", "GV4", "GB30"], "pins": [] },
  { "id": "torso-front", "name": "가슴과 배", "subject": "the front of a Korean adult's torso from the collarbones to the hips, a plain seamless bodysuit, the navel shown as a small simple mark, a faint center line of the breastbone", "acupointIds": ["CV17", "CV12", "CV6", "CV4", "ST25"], "pins": [] },
  { "id": "arm-outer", "name": "팔 바깥쪽", "subject": "the outer side of a Korean adult's left arm seen from the side, from the shoulder to the back of the hand, elbow slightly bent, a plain seamless sleeve ending at the wrist", "acupointIds": ["LI15", "LI11", "TE5"], "pins": [] },
  { "id": "wrist-inner", "name": "손목 안쪽", "subject": "the palm side of a Korean adult's left forearm and hand, palm facing up, from mid-forearm to the fingertips, two faint wrist creases", "acupointIds": ["PC6", "HT7", "LU7"], "pins": [] },
  { "id": "hand-dorsal", "name": "손등", "subject": "the back of a relaxed left hand of a Korean adult, viewed straight from above, wrist at the bottom center, fingers slightly apart", "acupointIds": ["LI4", "SI3"], "pins": [] },
  { "id": "leg-front", "name": "무릎 아래 앞쪽", "subject": "the front of a Korean adult's right lower leg seen slightly from the outer side, from above the knee to the ankle, the kneecap and shin drawn with minimal lines, a plain seamless legging", "acupointIds": ["ST36", "GB34"], "pins": [] },
  { "id": "leg-back", "name": "오금과 종아리", "subject": "the back of a Korean adult's right leg from mid-thigh to the ankle, the crease behind the knee and the calf muscle drawn with minimal lines, a plain seamless legging", "acupointIds": ["BL40", "BL57"], "pins": [] },
  { "id": "leg-inner", "name": "종아리 안쪽과 발 안쪽", "subject": "the inner side of a Korean adult's right lower leg and foot seen from the inside, from mid-calf to the big toe, the inner ankle bone visible, a plain seamless legging ending above the ankle", "acupointIds": ["SP6", "KI3", "SP4"], "pins": [] },
  { "id": "ankle-outer", "name": "발목 바깥쪽", "subject": "the outer side of a Korean adult's right ankle and foot seen from the outside, from the lower calf to the little toe, the outer ankle bone and the Achilles tendon visible", "acupointIds": ["BL60"], "pins": [] },
  { "id": "foot-dorsal", "name": "발등", "subject": "the top of a Korean adult's right foot viewed from above, toes at the top, ankle at the bottom", "acupointIds": ["LR3"], "pins": [] },
  { "id": "foot-sole", "name": "발바닥", "subject": "the sole of a Korean adult's right foot viewed straight on, toes at the top, heel at the bottom, toes slightly curled", "acupointIds": ["KI1"], "pins": [] }
]
```

- [ ] **Step 5: Write maps.json**

`content/data/maps.json` (use verbatim):
```json
[
  {
    "id": "body-front",
    "name": "앞면",
    "subject": "a full-body front view of a standing Korean adult in anatomical position: facing forward, arms slightly away from the body, palms facing forward, feet slightly apart; gender-neutral, slim and soft build, no muscle definition lines, a calm neutral face with minimal features, short black hair drawn as a simple outline; wearing a plain, seamless, skin-tight bodysuit that ends at the wrists and ankles with a simple neckline, so the hands, feet, face, and neck are uncovered",
    "regions": [
      { "id": "head", "name": "머리", "x": null, "y": null, "plateIds": ["head-top"] },
      { "id": "face", "name": "얼굴", "x": null, "y": null, "plateIds": ["face-front"] },
      { "id": "shoulder", "name": "어깨", "x": null, "y": null, "plateIds": ["arm-outer", "neck-back"] },
      { "id": "torso", "name": "가슴과 배", "x": null, "y": null, "plateIds": ["torso-front"] },
      { "id": "arm", "name": "팔", "x": null, "y": null, "plateIds": ["arm-outer"] },
      { "id": "wrist", "name": "손목", "x": null, "y": null, "plateIds": ["wrist-inner"] },
      { "id": "hand", "name": "손", "x": null, "y": null, "plateIds": ["hand-dorsal", "wrist-inner"] },
      { "id": "knee", "name": "무릎 아래", "x": null, "y": null, "plateIds": ["leg-front"] },
      { "id": "ankle", "name": "발목 안쪽", "x": null, "y": null, "plateIds": ["leg-inner"] },
      { "id": "foot", "name": "발", "x": null, "y": null, "plateIds": ["foot-dorsal", "foot-sole"] }
    ]
  },
  {
    "id": "body-back",
    "name": "뒷면",
    "subject": "a full-body back view of a standing Korean adult: facing away, arms slightly away from the body, palms facing backward, feet slightly apart; gender-neutral, slim and soft build, no muscle definition lines, short black hair drawn as a simple outline; wearing a plain, seamless, skin-tight bodysuit that ends at the wrists and ankles with a simple neckline, so the hands, feet, and neck are uncovered, with a faint line for the spine",
    "regions": [
      { "id": "head", "name": "머리", "x": null, "y": null, "plateIds": ["head-top"] },
      { "id": "neck", "name": "뒷목과 어깨", "x": null, "y": null, "plateIds": ["neck-back"] },
      { "id": "upper-back", "name": "등", "x": null, "y": null, "plateIds": ["upper-back"] },
      { "id": "lower-back", "name": "허리와 엉덩이", "x": null, "y": null, "plateIds": ["lower-back"] },
      { "id": "leg", "name": "오금과 종아리", "x": null, "y": null, "plateIds": ["leg-back"] },
      { "id": "ankle", "name": "발목 바깥쪽", "x": null, "y": null, "plateIds": ["ankle-outer"] },
      { "id": "sole", "name": "발바닥", "x": null, "y": null, "plateIds": ["foot-sole"] }
    ]
  }
]
```

- [ ] **Step 6: Run the validator**

Run: `npm run validate -w @ggookggook/content`
Expected: `0 error(s)`. Warnings list missing pins, missing images, and regions without positions. There must be no pregnancy-mode warning (every routine keeps at least one step).

If there are errors, fix the data and re-run until there are none.

- [ ] **Step 7: Review the Korean text against the table**

For each of the 37 records, read `location` next to `whoLocation` and confirm: the finger-width conversion is right, the landmark matches, the sentence ends in `~입니다`, `technique` ends in `~하세요`, and neither claims an effect. Run:
```bash
grep -nE '치료|완치|효과' content/data/*.json
```
Expected: no output.

- [ ] **Step 8: Delete the drafts and commit**

```bash
git rm -r content/draft
git add content/data
git commit -m "feat(content): add WHO-reviewed acupoints, routines, plates, and maps"
```

---

### Task 5: Image normalization pipeline

**Files:**
- Create: `content/src/images.ts`, `content/src/images.test.ts`, `content/src/cli/images.ts`, `content/images/out/*.webp` (generated)
- Modify: `content/package.json` (dependency + script), `AGENTS.md`

**Interfaces:**
- Consumes: `RAW_IMAGE_DIR`, `OUT_IMAGE_DIR` from `paths.ts`.
- Produces: `type CanvasKind = 'map' | 'square'`, `CANVAS: Record<CanvasKind, { width: number; height: number }>`, `canvasKindFor(id: string): CanvasKind`, `normalizeImage(input: string | Buffer, output: string, kind: CanvasKind): Promise<void>`. Output files `content/images/out/<id>.webp` where `<id>` is the raw file's base name.

- [ ] **Step 1: Install sharp**

Run: `npm install sharp -w @ggookggook/content`
Expected: installs without errors (prebuilt binary for darwin-arm64).

- [ ] **Step 2: Write the failing tests**

`content/src/images.test.ts`:
```ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { canvasKindFor, normalizeImage } from './images';

async function alphaAt(file: string, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3]!;
}

async function lightBackgroundWithInk(): Promise<Buffer> {
  const ink = await sharp({ create: { width: 50, height: 80, channels: 3, background: '#3A3732' } }).png().toBuffer();
  return sharp({ create: { width: 200, height: 300, channels: 3, background: '#F8F8F7' } })
    .composite([{ input: ink, left: 60, top: 100 }])
    .png()
    .toBuffer();
}

describe('canvasKindFor', () => {
  it('uses the tall canvas for body maps', () => {
    expect(canvasKindFor('body-front')).toBe('map');
    expect(canvasKindFor('hand-dorsal')).toBe('square');
    expect(canvasKindFor('cat-shoulder')).toBe('square');
  });
});

describe('normalizeImage', () => {
  it('keys out a light background, trims, and centers on the map canvas', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    const out = path.join(dir, 'body-front.webp');
    await normalizeImage(await lightBackgroundWithInk(), out, 'map');

    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1536]);
    expect(await alphaAt(out, 2, 2)).toBe(0);
    expect(await alphaAt(out, 512, 768)).toBeGreaterThan(200);
  });

  it('keeps existing transparency on the square canvas', async () => {
    const ink = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 58, g: 55, b: 50, alpha: 1 } } }).png().toBuffer();
    const input = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: ink, left: 30, top: 30 }])
      .png()
      .toBuffer();
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    const out = path.join(dir, 'hand-dorsal.webp');
    await normalizeImage(input, out, 'square');

    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(await alphaAt(out, 2, 2)).toBe(0);
    expect(await alphaAt(out, 512, 512)).toBeGreaterThan(200);
  });

  it('refuses an image with nothing on it', async () => {
    const blank = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#F8F8F7' } }).png().toBuffer();
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    await expect(normalizeImage(blank, path.join(dir, 'x.webp'), 'square')).rejects.toThrow('empty');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -w @ggookggook/content`
Expected: FAIL, cannot resolve `./images`.

- [ ] **Step 4: Implement the normalizer**

`content/src/images.ts`:
```ts
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type CanvasKind = 'map' | 'square';

export const CANVAS: Record<CanvasKind, { width: number; height: number }> = {
  map: { width: 1024, height: 1536 },
  square: { width: 1024, height: 1024 },
};

const MARGIN = 0.06;
// Background (#F8F8F7, 248) minus line ink (#3A3732, 58): a pixel this far from the background is fully opaque.
const INK_RANGE = 190;
// Alpha below this (out of 255) is noise from JPEG-style artifacts or soft halos.
const ALPHA_FLOOR = 16;

export function canvasKindFor(id: string): CanvasKind {
  return id.startsWith('body-') ? 'map' : 'square';
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

function hasTransparency(data: Buffer): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) return true;
  }
  return false;
}

function cornerColor({ data, width, height }: RawImage): [number, number, number] {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of corners) {
    r += data[pixel * 4]!;
    g += data[pixel * 4 + 1]!;
    b += data[pixel * 4 + 2]!;
  }
  return [r / 4, g / 4, b / 4];
}

function keyOutBackground(image: RawImage): void {
  const bg = cornerColor(image);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const diff = Math.max(Math.abs(data[i]! - bg[0]), Math.abs(data[i + 1]! - bg[1]), Math.abs(data[i + 2]! - bg[2]));
    const alpha = Math.min(1, diff / INK_RANGE);
    if (alpha === 0) {
      data[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) {
      const unmixed = (data[i + c]! - (1 - alpha) * bg[c]!) / alpha;
      data[i + c] = Math.max(0, Math.min(255, Math.round(unmixed)));
    }
    data[i + 3] = Math.round(alpha * 255);
  }
}

function alphaBounds({ data, width, height }: RawImage): { left: number; top: number; width: number; height: number } | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function readRgba(input: string | Buffer): Promise<RawImage> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function normalizeImage(input: string | Buffer, output: string, kind: CanvasKind): Promise<void> {
  const image = await readRgba(input);
  if (!hasTransparency(image.data)) keyOutBackground(image);
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i]! < ALPHA_FLOOR) image.data[i] = 0;
  }

  const box = alphaBounds(image);
  if (!box) throw new Error('Image is empty after removing the background');

  const canvas = CANVAS[kind];
  const fitted = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } })
    .extract(box)
    .resize(Math.round(canvas.width * (1 - 2 * MARGIN)), Math.round(canvas.height * (1 - 2 * MARGIN)), { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });

  await mkdir(path.dirname(output), { recursive: true });
  await sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      {
        input: fitted.data,
        left: Math.round((canvas.width - fitted.info.width) / 2),
        top: Math.round((canvas.height - fitted.info.height) / 2),
      },
    ])
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(output);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w @ggookggook/content`
Expected: PASS.

- [ ] **Step 6: Write the images CLI and add the script**

`content/src/cli/images.ts`:
```ts
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { canvasKindFor, normalizeImage } from '../images';
import { OUT_IMAGE_DIR, RAW_IMAGE_DIR } from '../paths';

const INPUT = /\.(png|jpe?g|webp)$/i;
const only = process.argv[2];

for (const file of await readdir(RAW_IMAGE_DIR)) {
  if (!INPUT.test(file)) continue;
  const id = file.replace(INPUT, '');
  if (only && id !== only) continue;
  const kind = canvasKindFor(id);
  await normalizeImage(path.join(RAW_IMAGE_DIR, file), path.join(OUT_IMAGE_DIR, `${id}.webp`), kind);
  console.log(`${id}.webp (${kind})`);
}
```

Add to `content/package.json` scripts:
```json
"images": "tsx src/cli/images.ts"
```

- [ ] **Step 7: Normalize the three first-pass images**

Run: `npm run images -w @ggookggook/content`
Expected output:
```
body-front.webp (map)
cat-shoulder.webp (square)
hand-dorsal.webp (square)
```

Then composite each output on the app background and open the PNGs with the Read tool, to confirm the background is gone and the lines are intact:
```bash
node -e "
const sharp = require('sharp');
const path = require('path');
const dir = require('os').tmpdir();
for (const id of ['body-front', 'hand-dorsal', 'cat-shoulder']) {
  const out = path.join(dir, 'check-' + id + '.png');
  sharp('content/images/out/' + id + '.webp').flatten({ background: '#F8F8F7' }).png().toFile(out).then(() => console.log(out));
}"
```
Expected: clean line art on the light background, no grey box, no halo, cat paw pads still red. If the cat's red pads came out washed out, that is acceptable for a first pass; note it in the commit body.

Run: `npm run validate -w @ggookggook/content`
Expected: `0 error(s)`. The "has no image" warnings for `hand-dorsal` and `body-front` are gone.

- [ ] **Step 8: Update AGENTS.md and commit**

Append under `## Commands`:
```markdown
- `npm run images -w @ggookggook/content [-- <id>]`: normalize `content/images/raw/*` into `content/images/out/<id>.webp`
```

```bash
git add content/package.json content/src content/images/out package-lock.json AGENTS.md
git commit -m "feat(content): add image normalization pipeline"
```

---

### Task 6: Prompt generator and illustration style guide

**Files:**
- Create: `content/src/prompt.ts`, `content/src/prompt.test.ts`, `content/src/cli/prompt.ts`, `docs/illustration-style-guide.md`
- Modify: `content/package.json` (script), `AGENTS.md`

**Interfaces:**
- Consumes: `loadRawContent` from `paths.ts`; plate and map `subject` fields from Task 4.
- Produces: `buildPrompt(subject: string, kind: CanvasKind): string`.

- [ ] **Step 1: Write the failing tests**

`content/src/prompt.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('wraps a plate subject in the fixed style and a square frame', () => {
    const prompt = buildPrompt('the sole of a right foot', 'square');
    expect(prompt.startsWith('A clean illustration of the sole of a right foot.')).toBe(true);
    expect(prompt).toContain('#3A3732');
    expect(prompt).toContain('Transparent background');
    expect(prompt.endsWith('Square 1:1.')).toBe(true);
  });

  it('uses a portrait frame for body maps', () => {
    expect(buildPrompt('a full body', 'map').endsWith('Portrait 2:3.')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @ggookggook/content`
Expected: FAIL, cannot resolve `./prompt`.

- [ ] **Step 3: Implement the prompt builder and CLI**

`content/src/prompt.ts`:
```ts
import type { CanvasKind } from './images';

const STYLE = [
  'Style: fine single-weight ink line art in warm charcoal (#3A3732).',
  'No color fill, no shading, no hatching, no color anywhere.',
  'No text, labels, arrows, or markers.',
  'Anatomically accurate: exactly five fingers and five toes wherever hands or feet appear.',
  'No visible veins or tendons, and only a faint line per joint.',
  'Transparent background, with no glow, vignette, shadow, ground line, or gradient.',
].join(' ');

const FRAME: Record<CanvasKind, string> = {
  map: 'Centered with generous margin. Portrait 2:3.',
  square: 'Centered with generous margin. Square 1:1.',
};

export function buildPrompt(subject: string, kind: CanvasKind): string {
  return `A clean illustration of ${subject}. ${STYLE} ${FRAME[kind]}`;
}
```

`content/src/cli/prompt.ts`:
```ts
import type { BodyMap, Plate } from '@ggookggook/shared';
import { canvasKindFor } from '../images';
import { loadRawContent } from '../paths';
import { buildPrompt } from '../prompt';

const id = process.argv[2];
const raw = await loadRawContent();
const items = [...(raw.plates as Plate[]), ...(raw.maps as BodyMap[])];

if (!id) {
  console.log(items.map((item) => `${item.id}  ${item.name}`).join('\n'));
} else {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    console.error(`Unknown plate or map: ${id}`);
    process.exitCode = 1;
  } else {
    console.log(buildPrompt(item.subject, canvasKindFor(item.id)));
  }
}
```

Add to `content/package.json` scripts:
```json
"prompt": "tsx src/cli/prompt.ts"
```

- [ ] **Step 4: Run tests and try the CLI**

Run: `npm test -w @ggookggook/content && npm run prompt -w @ggookggook/content -- foot-sole`
Expected: tests PASS, then one line starting `A clean illustration of the sole of a Korean adult's right foot`.

- [ ] **Step 5: Write the style guide**

`docs/illustration-style-guide.md` (use verbatim; it follows the owner's Korean writing style):
````markdown
# 일러스트 제작 가이드

꾹꾹의 부위 그림과 전신 지도를 ChatGPT로 만드는 방법입니다.

## 스타일

- 모든 그림은 가는 먹선 선화입니다.
- 선 색은 `#3A3732`입니다.
- 면 채색, 음영, 빗금은 넣지 않습니다.
- 사람은 한국인 성인입니다.
- 근육 선, 핏줄, 힘줄은 그리지 않습니다.
- 몸통, 팔, 다리는 무늬 없는 바디슈트로 덮습니다.
- 손, 발, 얼굴, 목은 드러냅니다.
- 배경은 투명입니다.
- 혈자리 점은 그림에 넣지 않습니다. 앱이 코드로 올립니다.

## 프롬프트 뽑기

- 목록을 보려면 `npm run prompt -w @ggookggook/content`를 실행합니다.
- 특정 그림의 프롬프트는 `npm run prompt -w @ggookggook/content -- <id>`로 뽑습니다.
- 예를 들어 발바닥은 `-- foot-sole`입니다.
- 그림마다 다른 부분은 `content/data/plates.json`과 `maps.json`의 `subject` 한 줄뿐입니다.
- 스타일 문구를 바꾸려면 `content/src/prompt.ts`를 고칩니다.

## ChatGPT에서 만들기

- 프롬프트마다 새 채팅을 엽니다. 앞 그림의 스타일이 섞이지 않게 하기 위해서입니다.
- 손가락이나 발가락 개수가 틀리면 다시 생성합니다.
- ChatGPT는 투명 배경을 검은 바탕에 보여줍니다. 빛이 번진 것처럼 보여도 대부분 정상입니다.
- 사람을 그릴 때 안전 필터에 막히면 바디슈트 조건을 다시 강조합니다.

## 앱에 넣기

- 받은 파일 이름을 그림 id로 바꿉니다. 예를 들어 `foot-sole.png`입니다.
- 파일을 `content/images/raw/`에 넣습니다.
- `npm run images -w @ggookggook/content -- foot-sole`을 실행합니다.
- 결과는 `content/images/out/foot-sole.webp`로 나옵니다.
- `npm run pin -w @ggookggook/content`로 좌표 찍기 도구를 엽니다.
- 그림을 고르고 혈자리마다 위치를 찍습니다.
- 마지막으로 `npm run validate -w @ggookggook/content`로 빠진 좌표가 없는지 확인합니다.

## 그림을 교체할 때

- 같은 파일 이름으로 `raw`에 덮어쓰고 `images`를 다시 실행합니다.
- 그림이 바뀌면 좌표도 달라집니다. 좌표 찍기 도구에서 모든 점을 다시 찍습니다.
- `content/data/meta.json`의 `version`을 1 올립니다.

## 고양이 캐릭터

- 고양이는 콘텐츠 데이터가 아니라서 프롬프트 생성기에 없습니다.
- 스타일은 같은 먹선 선화이고, 인주색(`#C23B2A`)은 발바닥에만 씁니다.
- 1차 그림은 `content/images/raw/cat-shoulder.png`입니다.
- 1차 그림은 사람 어깨를 꾹꾹 누르는 고양이입니다.
````

- [ ] **Step 6: Update AGENTS.md and commit**

Append under `## Commands`:
```markdown
- `npm run prompt -w @ggookggook/content [-- <id>]`: print the ChatGPT prompt for a plate or map (see `docs/illustration-style-guide.md`)
```

```bash
git add content/package.json content/src docs/illustration-style-guide.md AGENTS.md
git commit -m "feat(content): add prompt generator and illustration guide"
```

---

### Task 7: Coordinate pinning tool and first pins

**Files:**
- Create: `content/src/pins.ts`, `content/src/pins.test.ts`, `content/tools/pin/server.ts`, `content/tools/pin/index.html`
- Modify: `content/package.json` (script), `content/data/plates.json`, `content/data/maps.json`, `AGENTS.md`

**Interfaces:**
- Consumes: `Plate`, `BodyMap` from `@ggookggook/shared`; `DATA_DIR`, `OUT_IMAGE_DIR`, `readJson` from `paths.ts`.
- Produces: `setPin(plates: Plate[], plateId: string, acupointId: string, x: number, y: number): Plate[]`, `setRegionPosition(maps: BodyMap[], mapId: string, regionId: string, x: number, y: number): BodyMap[]`. HTTP API on `http://127.0.0.1:4321`: `GET /api/data`, `GET /images/<id>.webp`, `PUT /api/plates/<plateId>/pins/<acupointId>`, `PUT /api/maps/<mapId>/regions/<regionId>`, both PUT bodies `{ "x": number, "y": number }`.

- [ ] **Step 1: Write the failing tests**

`content/src/pins.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { validContent } from './fixtures';
import { setPin, setRegionPosition } from './pins';

describe('setPin', () => {
  it('adds or replaces a pin, rounded to 3 decimals', () => {
    const plates = validContent().plates;
    const next = setPin(plates, 'hand-dorsal', 'LI4', 0.61234, 0.55555);
    expect(next[0]!.pins).toEqual([{ acupointId: 'LI4', x: 0.612, y: 0.556 }]);
    expect(plates[0]!.pins[0]!.x).toBe(0.6);
  });

  it('keeps pins in the same order as acupointIds', () => {
    const plates = validContent().plates;
    plates[0]!.acupointIds = ['LI4', 'SI3'];
    plates[0]!.pins = [];
    const next = setPin(setPin(plates, 'hand-dorsal', 'SI3', 0.3, 0.5), 'hand-dorsal', 'LI4', 0.6, 0.5);
    expect(next[0]!.pins.map((pin) => pin.acupointId)).toEqual(['LI4', 'SI3']);
  });

  it('rejects unknown plates, unlisted acupoints, and out-of-range values', () => {
    const plates = validContent().plates;
    expect(() => setPin(plates, 'nope', 'LI4', 0.5, 0.5)).toThrow('Unknown plate');
    expect(() => setPin(plates, 'hand-dorsal', 'PC6', 0.5, 0.5)).toThrow('does not list');
    expect(() => setPin(plates, 'hand-dorsal', 'LI4', 1.5, 0.5)).toThrow(RangeError);
  });
});

describe('setRegionPosition', () => {
  it('sets a region center', () => {
    const next = setRegionPosition(validContent().maps, 'body-front', 'hand', 0.1504, 0.53);
    expect(next[0]!.regions[0]).toMatchObject({ x: 0.15, y: 0.53 });
  });

  it('rejects unknown maps and regions', () => {
    const maps = validContent().maps;
    expect(() => setRegionPosition(maps, 'body-back', 'hand', 0.5, 0.5)).toThrow('Unknown map');
    expect(() => setRegionPosition(maps, 'body-front', 'knee', 0.5, 0.5)).toThrow('Unknown region');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @ggookggook/content`
Expected: FAIL, cannot resolve `./pins`.

- [ ] **Step 3: Implement pins.ts**

`content/src/pins.ts`:
```ts
import type { BodyMap, Plate } from '@ggookggook/shared';

const round = (value: number) => Math.round(value * 1000) / 1000;

function assertUnit(x: number, y: number): void {
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) throw new RangeError(`Coordinates must be within 0..1, got (${x}, ${y})`);
}

export function setPin(plates: Plate[], plateId: string, acupointId: string, x: number, y: number): Plate[] {
  assertUnit(x, y);
  const plate = plates.find((candidate) => candidate.id === plateId);
  if (!plate) throw new Error(`Unknown plate: ${plateId}`);
  if (!plate.acupointIds.includes(acupointId)) throw new Error(`Plate ${plateId} does not list ${acupointId}`);

  const pins = [...plate.pins.filter((pin) => pin.acupointId !== acupointId), { acupointId, x: round(x), y: round(y) }];
  pins.sort((a, b) => plate.acupointIds.indexOf(a.acupointId) - plate.acupointIds.indexOf(b.acupointId));
  return plates.map((candidate) => (candidate.id === plateId ? { ...candidate, pins } : candidate));
}

export function setRegionPosition(maps: BodyMap[], mapId: string, regionId: string, x: number, y: number): BodyMap[] {
  assertUnit(x, y);
  const map = maps.find((candidate) => candidate.id === mapId);
  if (!map) throw new Error(`Unknown map: ${mapId}`);
  if (!map.regions.some((region) => region.id === regionId)) throw new Error(`Unknown region ${regionId} in ${mapId}`);

  const regions = map.regions.map((region) => (region.id === regionId ? { ...region, x: round(x), y: round(y) } : region));
  return maps.map((candidate) => (candidate.id === mapId ? { ...candidate, regions } : candidate));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @ggookggook/content`
Expected: PASS.

- [ ] **Step 5: Write the pin server**

`content/tools/pin/server.ts`:
```ts
import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import type { BodyMap, Plate } from '@ggookggook/shared';
import { DATA_DIR, OUT_IMAGE_DIR, readJson } from '../../src/paths';
import { setPin, setRegionPosition } from '../../src/pins';

const PORT = 4321;
const dataFile = (name: string) => path.join(DATA_DIR, name);
const writeJson = (name: string, value: unknown) => writeFile(dataFile(name), `${JSON.stringify(value, null, 2)}\n`);

async function readBody(req: IncomingMessage): Promise<{ x: number; y: number }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { x?: unknown; y?: unknown };
  if (typeof body.x !== 'number' || typeof body.y !== 'number') throw new Error('Body must be { x: number, y: number }');
  return { x: body.x, y: body.y };
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && parts.length === 0) {
      send(res, 200, 'text/html; charset=utf-8', await readFile(path.join(import.meta.dirname, 'index.html')));
    } else if (req.method === 'GET' && url.pathname === '/api/data') {
      const data = {
        acupoints: await readJson(dataFile('acupoints.json')),
        plates: await readJson(dataFile('plates.json')),
        maps: await readJson(dataFile('maps.json')),
      };
      send(res, 200, 'application/json', JSON.stringify(data));
    } else if (req.method === 'GET' && parts[0] === 'images' && parts.length === 2) {
      send(res, 200, 'image/webp', await readFile(path.join(OUT_IMAGE_DIR, path.basename(parts[1]!))));
    } else if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'plates' && parts[3] === 'pins' && parts.length === 5) {
      const { x, y } = await readBody(req);
      const plates = (await readJson(dataFile('plates.json'))) as Plate[];
      await writeJson('plates.json', setPin(plates, parts[2]!, parts[4]!, x, y));
      send(res, 200, 'application/json', '{"ok":true}');
    } else if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'maps' && parts[3] === 'regions' && parts.length === 5) {
      const { x, y } = await readBody(req);
      const maps = (await readJson(dataFile('maps.json'))) as BodyMap[];
      await writeJson('maps.json', setRegionPosition(maps, parts[2]!, parts[4]!, x, y));
      send(res, 200, 'application/json', '{"ok":true}');
    } else {
      send(res, 404, 'text/plain', 'Not found');
    }
  } catch (error) {
    send(res, 400, 'text/plain; charset=utf-8', error instanceof Error ? error.message : String(error));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Pin tool: http://127.0.0.1:${PORT}`));
```

- [ ] **Step 6: Write the pin tool page**

`content/tools/pin/index.html`:
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>꾹꾹 좌표 찍기</title>
<style>
  body { margin: 0; font-family: -apple-system, sans-serif; background: #F8F8F7; color: #23211E; display: flex; height: 100vh; }
  aside { width: 360px; overflow: auto; padding: 16px; border-right: 1px solid #E2E2DF; box-sizing: border-box; }
  main { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; }
  select { width: 100%; font-size: 14px; padding: 6px; margin-bottom: 12px; }
  .item { padding: 8px; border-bottom: 1px solid #E2E2DF; cursor: pointer; font-size: 13px; }
  .item.on { background: #23211E; color: #F8F8F7; }
  .item b { font-size: 14px; }
  .item small { display: block; margin-top: 4px; opacity: .75; line-height: 1.4; }
  .item .done { color: #C23B2A; font-weight: 700; }
  .item.on .done { color: #F8F8F7; }
  #stage { position: relative; background: #fff; box-shadow: 0 0 0 1px #E2E2DF; }
  #stage img { display: block; max-height: 90vh; max-width: 70vw; cursor: crosshair; }
  .dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #C23B2A; pointer-events: none; }
  .dot.on { box-shadow: 0 0 0 5px rgba(194, 59, 42, .25); }
  .label { position: absolute; font-size: 11px; color: #C23B2A; font-weight: 700; transform: translate(8px, -6px); pointer-events: none; }
  #msg { font-size: 12px; color: #6A665E; margin-top: 12px; min-height: 1em; }
</style>
</head>
<body>
<aside>
  <select id="picker"></select>
  <div id="list"></div>
  <div id="msg">왼쪽에서 항목을 고르고 그림을 클릭하세요.</div>
</aside>
<main><div id="stage"><img id="img" alt=""></div></main>
<script>
let data, target, selected;
const $ = (id) => document.getElementById(id);

async function load() {
  data = await (await fetch('/api/data')).json();
  const options = [
    ...data.maps.map((m) => ({ kind: 'map', id: m.id, name: `지도 · ${m.name}` })),
    ...data.plates.map((p) => ({ kind: 'plate', id: p.id, name: `부위 · ${p.name}` })),
  ];
  if (!$('picker').options.length) {
    $('picker').innerHTML = options.map((o) => `<option value="${o.kind}:${o.id}">${o.name} (${o.id})</option>`).join('');
  }
  render();
}

function items() {
  const [kind, id] = $('picker').value.split(':');
  if (kind === 'map') {
    const map = data.maps.find((m) => m.id === id);
    return { kind, id, entries: map.regions.map((r) => ({ key: r.id, title: r.name, detail: r.plateIds.join(', '), x: r.x, y: r.y })) };
  }
  const plate = data.plates.find((p) => p.id === id);
  return {
    kind, id,
    entries: plate.acupointIds.map((aid) => {
      const a = data.acupoints.find((x) => x.id === aid);
      const pin = plate.pins.find((p) => p.acupointId === aid);
      return { key: aid, title: `${a.name.ko} ${aid}`, detail: `${a.location}\n${a.whoLocation}`, x: pin?.x ?? null, y: pin?.y ?? null };
    }),
  };
}

function render() {
  target = items();
  if (!target.entries.some((e) => e.key === selected)) selected = target.entries[0]?.key;
  $('img').src = `/images/${target.id}.webp?t=${Date.now()}`;
  $('img').onerror = () => { $('msg').textContent = `이미지가 없습니다: content/images/out/${target.id}.webp`; };
  $('list').innerHTML = target.entries.map((e) => `
    <div class="item ${e.key === selected ? 'on' : ''}" data-key="${e.key}">
      <b>${e.title}</b> ${e.x === null ? '' : '<span class="done">●</span>'}
      <small>${e.detail.replace(/\n/g, '<br>')}</small>
    </div>`).join('');
  document.querySelectorAll('.item').forEach((el) => el.onclick = () => { selected = el.dataset.key; render(); });
  document.querySelectorAll('.dot, .label').forEach((el) => el.remove());
  for (const e of target.entries) {
    if (e.x === null) continue;
    const dot = document.createElement('div');
    dot.className = `dot ${e.key === selected ? 'on' : ''}`;
    dot.style.left = `${e.x * 100}%`; dot.style.top = `${e.y * 100}%`;
    const label = document.createElement('div');
    label.className = 'label'; label.textContent = e.title.split(' ')[0];
    label.style.left = dot.style.left; label.style.top = dot.style.top;
    $('stage').append(dot, label);
  }
}

$('picker').onchange = () => { selected = undefined; render(); };
$('img').onclick = async (event) => {
  if (!selected) return;
  const rect = $('img').getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const path = target.kind === 'map'
    ? `/api/maps/${target.id}/regions/${selected}`
    : `/api/plates/${target.id}/pins/${encodeURIComponent(selected)}`;
  const res = await fetch(path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x, y }) });
  $('msg').textContent = res.ok ? `${selected} 저장 (${x.toFixed(3)}, ${y.toFixed(3)})` : await res.text();
  await load();
};

load();
</script>
</body>
</html>
```

Add to `content/package.json` scripts:
```json
"pin": "tsx tools/pin/server.ts"
```

- [ ] **Step 7: Smoke-test the server**

Run in the background: `npm run pin -w @ggookggook/content`
Then:
```bash
curl -s http://127.0.0.1:4321/api/data | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/images/hand-dorsal.webp
curl -s -X PUT http://127.0.0.1:4321/api/plates/hand-dorsal/pins/PC6 -H 'content-type: application/json' -d '{"x":0.5,"y":0.5}'
```
Expected: JSON starting `{"acupoints":[`, then `200`, then `Plate hand-dorsal does not list PC6`.

- [ ] **Step 8: Place first pins on the two existing images**

Composite `content/images/out/hand-dorsal.webp` and `body-front.webp` on `#F8F8F7` (same `node -e` snippet as Task 5 Step 7) and open them with the Read tool. Estimate each position from the WHO locations, then send them through the API (so rounding and ordering match the tool):

- `hand-dorsal`: `LI4` on the dorsum between the thumb and index metacarpals, at the midpoint of the index metacarpal on its thumb side. `SI3` on the little-finger edge of the hand, just below (toward the wrist from) the knuckle of the little finger.
- `body-front` regions: `head` on the crown, `face` on the forehead, `shoulder` on the right shoulder tip, `torso` on the upper abdomen, `arm` on the right elbow, `wrist` on the right wrist, `hand` on the right palm, `knee` just below the right knee, `ankle` on the right inner ankle, `foot` on the top of the right foot. "Right" means the figure's right, which is the viewer's left.

Example call:
```bash
curl -s -X PUT http://127.0.0.1:4321/api/plates/hand-dorsal/pins/LI4 -H 'content-type: application/json' -d '{"x":0.6,"y":0.57}'
```

Then draw every pin onto a copy of the image to check placement:
```bash
node -e "
const sharp = require('sharp');
const path = require('path');
const dir = require('os').tmpdir();
const plates = require('./content/data/plates.json');
const maps = require('./content/data/maps.json');
async function mark(id, points) {
  const meta = await sharp('content/images/out/' + id + '.webp').metadata();
  const dots = points.filter(p => p.x !== null).map(p => '<circle cx=\"' + p.x * meta.width + '\" cy=\"' + p.y * meta.height + '\" r=\"14\" fill=\"#C23B2A\"/>').join('');
  const svg = Buffer.from('<svg width=\"' + meta.width + '\" height=\"' + meta.height + '\" xmlns=\"http://www.w3.org/2000/svg\">' + dots + '</svg>');
  const out = path.join(dir, 'pins-' + id + '.png');
  await sharp('content/images/out/' + id + '.webp').flatten({ background: '#F8F8F7' }).composite([{ input: svg }]).png().toFile(out);
  console.log(out);
}
mark('hand-dorsal', plates.find(p => p.id === 'hand-dorsal').pins);
mark('body-front', maps.find(m => m.id === 'body-front').regions);
"
```
Open the two printed PNG paths with the Read tool. Adjust any point that is off and re-check.

Stop the server.

- [ ] **Step 9: User checkpoint**

Ask the user to run `npm run pin -w @ggookggook/content`, open `http://127.0.0.1:4321`, and check the `hand-dorsal` pins and `body-front` regions. Apply any corrections they make (the tool writes the JSON directly).

- [ ] **Step 10: Validate, update AGENTS.md, and commit**

Run: `npm run validate -w @ggookggook/content`
Expected: `0 error(s)`. No "has no pin" warnings remain for `hand-dorsal`, and no "has no position" warnings remain for `body-front`.

Append under `## Commands`:
```markdown
- `npm run pin -w @ggookggook/content`: coordinate pinning tool at http://127.0.0.1:4321
```

```bash
git add content/package.json content/src content/tools content/data AGENTS.md
git commit -m "feat(content): add coordinate pinning tool and first pins"
```

---

### Task 8: Content bundle builder

**Files:**
- Create: `content/src/build.ts`, `content/src/build.test.ts`, `content/src/cli/build.ts`
- Modify: `content/package.json` (script), `AGENTS.md`

**Interfaces:**
- Consumes: `validateContent` (Task 3), `contentBundleSchema`, `ContentBundle`, `Manifest` (Task 1), paths (Task 3).
- Produces: `buildBundle(raw: unknown): ContentBundle`, `buildManifest(version: number, publishedAt: Date): Manifest`. Output layout that phase 3 uploads as is:
  ```
  content/dist/manifest.json
  content/dist/v<version>/bundle.json
  content/dist/v<version>/images/<id>.webp
  ```

- [ ] **Step 1: Write the failing tests**

`content/src/build.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildBundle, buildManifest } from './build';
import { validContent } from './fixtures';

describe('buildBundle', () => {
  it('returns the parsed bundle for valid content', () => {
    const bundle = buildBundle(validContent());
    expect(bundle.version).toBe(1);
    expect(bundle.symptoms[0]!.id).toBe('food_stagnation');
  });

  it('refuses content with errors and lists them', () => {
    const content = validContent();
    content.symptoms[0]!.steps.push({ acupointId: 'ST36', seconds: 60 });
    expect(() => buildBundle(content)).toThrow('Symptom food_stagnation uses unknown acupoint ST36');
  });

  it('does not refuse content that only has warnings', () => {
    const content = validContent();
    content.plates[0]!.pins = [];
    expect(() => buildBundle(content)).not.toThrow();
  });
});

describe('buildManifest', () => {
  it('points at versioned paths', () => {
    expect(buildManifest(3, new Date('2026-09-27T00:00:00Z'))).toEqual({
      version: 3,
      bundlePath: 'v3/bundle.json',
      imagesPath: 'v3/images/',
      publishedAt: '2026-09-27T00:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @ggookggook/content`
Expected: FAIL, cannot resolve `./build`.

- [ ] **Step 3: Implement build.ts**

`content/src/build.ts`:
```ts
import { contentBundleSchema, type ContentBundle, type Manifest } from '@ggookggook/shared';
import { validateContent } from './validate';

export function buildBundle(raw: unknown): ContentBundle {
  const errors = validateContent(raw, { release: false }).filter((issue) => issue.level === 'error');
  if (errors.length > 0) {
    throw new Error(`Content has errors:\n${errors.map((issue) => issue.message).join('\n')}`);
  }
  return contentBundleSchema.parse(raw);
}

export function buildManifest(version: number, publishedAt: Date): Manifest {
  return {
    version,
    bundlePath: `v${version}/bundle.json`,
    imagesPath: `v${version}/images/`,
    publishedAt: publishedAt.toISOString(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @ggookggook/content`
Expected: PASS.

- [ ] **Step 5: Write the build CLI and add the script**

`content/src/cli/build.ts`:
```ts
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildBundle, buildManifest } from '../build';
import { DIST_DIR, loadRawContent, OUT_IMAGE_DIR } from '../paths';

const bundle = buildBundle(await loadRawContent());
const manifest = buildManifest(bundle.version, new Date());

await rm(DIST_DIR, { recursive: true, force: true });
const imagesDir = path.join(DIST_DIR, manifest.imagesPath);
await mkdir(imagesDir, { recursive: true });

await writeFile(path.join(DIST_DIR, manifest.bundlePath), JSON.stringify(bundle));
const images = (await readdir(OUT_IMAGE_DIR)).filter((file) => file.endsWith('.webp'));
for (const file of images) await copyFile(path.join(OUT_IMAGE_DIR, file), path.join(imagesDir, file));
await writeFile(path.join(DIST_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built content v${bundle.version}: ${bundle.acupoints.length} acupoints, ${bundle.symptoms.length} symptoms, ${images.length} images`);
```

Add to `content/package.json` scripts:
```json
"build": "tsx src/cli/build.ts"
```

- [ ] **Step 6: Build the real content**

Run: `npm run build -w @ggookggook/content && ls -R content/dist`
Expected: `Built content v1: 37 acupoints, 15 symptoms, 3 images`, and the listing shows `manifest.json`, `v1/bundle.json`, and three `.webp` files under `v1/images`.

Run: `git status --short content/dist`
Expected: no output (dist is gitignored).

- [ ] **Step 7: Full check, update AGENTS.md, and commit**

Run: `npm test && npm run typecheck`
Expected: every workspace PASSES and tsc exits 0.

Append under `## Commands`:
```markdown
- `npm run build -w @ggookggook/content`: write the versioned bundle to `content/dist/` (phase 3 uploads it)
```

```bash
git add content/package.json content/src AGENTS.md
git commit -m "feat(content): add versioned content bundle builder"
```

---

## Out of scope for phase 1

- Generating the 13 missing plates and `body-back`. That runs in parallel using `docs/illustration-style-guide.md`. Release validation (`-- --release`) stays red until they exist, which is expected.
- Anything under `apps/mobile` or `infra` (phases 2 to 4).
