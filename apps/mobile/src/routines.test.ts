import { DEFAULT_SETTINGS, type Symptom, type UserRoutine } from '@ggookggook/shared';
import {
  copySymptomToUserRoutine,
  isUserRoutineUsable,
  NO_STEPS,
  resolveRoutine,
  resolveRoutineRefTitle,
  symptomRoutineName,
  toSessionRoutineRef,
} from '@/routines';

const userRoutine: UserRoutine = {
  id: 'r1',
  name: '내 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'PC6', seconds: 30 }],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

it('resolves a symptom routine by id', () => {
  const resolved = resolveRoutine({ kind: 'symptom', id: 'food_stagnation' }, { settings: DEFAULT_SETTINGS });
  expect(resolved).toEqual({ title: '체했을 때', steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'PC6', seconds: 60 }] });
});

it('drops contraindicated symptom steps in pregnancy mode', () => {
  const resolved = resolveRoutine(
    { kind: 'symptom', id: 'food_stagnation' },
    { settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } },
  );
  expect(resolved?.steps.map((s) => s.acupointId)).toEqual(['PC6']);
});

it('returns null for an unknown symptom id', () => {
  expect(resolveRoutine({ kind: 'symptom', id: 'nope' }, { settings: DEFAULT_SETTINGS })).toBeNull();
});

it('resolves a user routine by its loaded row', () => {
  const resolved = resolveRoutine({ kind: 'user', id: 'r1' }, { settings: DEFAULT_SETTINGS, userRoutine });
  expect(resolved).toEqual({ title: '내 루틴', steps: userRoutine.steps });
});

it('drops contraindicated user routine steps in pregnancy mode', () => {
  const resolved = resolveRoutine(
    { kind: 'user', id: 'r1' },
    { settings: { ...DEFAULT_SETTINGS, pregnancyMode: true }, userRoutine },
  );
  expect(resolved?.steps.map((s) => s.acupointId)).toEqual(['PC6']);
});

it('returns null when the user routine is missing', () => {
  expect(resolveRoutine({ kind: 'user', id: 'r1' }, { settings: DEFAULT_SETTINGS, userRoutine: null })).toBeNull();
});

it('returns null when the user routine is soft-deleted', () => {
  const resolved = resolveRoutine(
    { kind: 'user', id: 'r1' },
    { settings: DEFAULT_SETTINGS, userRoutine: { ...userRoutine, deletedAt: '2026-09-29T00:00:00.000Z' } },
  );
  expect(resolved).toBeNull();
});

it('maps a routine ref to the session log ref shape', () => {
  expect(toSessionRoutineRef({ kind: 'symptom', id: 'food_stagnation' })).toEqual({ kind: 'symptom', symptomId: 'food_stagnation' });
  expect(toSessionRoutineRef({ kind: 'user', id: 'r1' })).toEqual({ kind: 'user', routineId: 'r1' });
});

it('exposes a stable empty-steps constant', () => {
  expect(NO_STEPS).toEqual([]);
});

it('treats a soft-deleted row the same as a missing one', () => {
  expect(isUserRoutineUsable(userRoutine)).toBe(true);
  expect(isUserRoutineUsable({ ...userRoutine, deletedAt: '2026-09-29T00:00:00.000Z' })).toBe(false);
  expect(isUserRoutineUsable(null)).toBe(false);
  expect(isUserRoutineUsable(undefined)).toBe(false);
});

describe('resolveRoutineRefTitle', () => {
  it('resolves a symptom ref to its content name and symptom preview link', () => {
    expect(resolveRoutineRefTitle({ kind: 'symptom', symptomId: 'food_stagnation' }, new Map())).toEqual({
      title: '체했을 때',
      href: '/symptom/food_stagnation',
    });
  });

  it('returns null for a symptom id no longer in content', () => {
    expect(resolveRoutineRefTitle({ kind: 'symptom', symptomId: 'no_such_symptom' }, new Map())).toBeNull();
  });

  it('resolves a user routine ref to its stored name and routine preview link', () => {
    const routines = new Map([['r1', userRoutine]]);
    expect(resolveRoutineRefTitle({ kind: 'user', routineId: 'r1' }, routines)).toEqual({
      title: '내 루틴',
      href: '/routine/r1',
    });
  });

  it('resolves a missing or soft-deleted user routine to the deleted label with no link', () => {
    expect(resolveRoutineRefTitle({ kind: 'user', routineId: 'gone' }, new Map())).toEqual({ title: '지운 루틴', href: null });
    const routines = new Map([['r1', { ...userRoutine, deletedAt: '2026-09-29T00:00:00.000Z' }]]);
    expect(resolveRoutineRefTitle({ kind: 'user', routineId: 'r1' }, routines)).toEqual({ title: '지운 루틴', href: null });
  });
});

describe('symptomRoutineName', () => {
  it('trims surrounding whitespace', () => {
    expect(symptomRoutineName('  머리가 아플 때  ')).toBe('머리가 아플 때');
  });

  it('cuts a name longer than 20 characters down to 20', () => {
    const long = '가'.repeat(25);
    const trimmed = symptomRoutineName(long);
    expect(trimmed).toHaveLength(20);
    expect(trimmed).toBe('가'.repeat(20));
  });
});

describe('copySymptomToUserRoutine', () => {
  const symptom: Symptom = {
    id: 'food_stagnation',
    name: '체했을 때',
    aliases: [],
    steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'PC6', seconds: 30 }],
    seeDoctor: '3일 넘게 안 나아지면 병원에 가세요.',
    group: 'digestion',
  };

  it('copies the full, unfiltered step list and sets the source symptom id', () => {
    const copy = copySymptomToUserRoutine(symptom, 'new-id', '2026-09-29T00:00:00.000Z');
    expect(copy).toEqual({
      id: 'new-id',
      name: '체했을 때',
      steps: symptom.steps,
      sourceSymptomId: 'food_stagnation',
      repeat: 1,
      createdAt: '2026-09-29T00:00:00.000Z',
      updatedAt: '2026-09-29T00:00:00.000Z',
      deletedAt: null,
    });
  });

  it('trims a long symptom name to 20 characters', () => {
    const longSymptom: Symptom = { ...symptom, name: '가'.repeat(25) };
    const copy = copySymptomToUserRoutine(longSymptom, 'new-id', '2026-09-29T00:00:00.000Z');
    expect(copy.name).toHaveLength(20);
  });

  it('clamps to at most 10 steps and snaps seconds into range, via the shared limits', () => {
    const manySteps = Array.from({ length: 12 }, () => ({ acupointId: 'LI4', seconds: 605 }));
    const bigSymptom: Symptom = { ...symptom, steps: manySteps };
    const copy = copySymptomToUserRoutine(bigSymptom, 'new-id', '2026-09-29T00:00:00.000Z');
    expect(copy.steps).toHaveLength(10);
    expect(copy.steps.every((step) => step.seconds === 600)).toBe(true);
  });
});
