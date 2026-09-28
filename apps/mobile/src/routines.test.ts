import { DEFAULT_SETTINGS, type UserRoutine } from '@ggookggook/shared';
import { NO_STEPS, resolveRoutine, toSessionRoutineRef } from '@/routines';

const userRoutine: UserRoutine = {
  id: 'r1',
  name: '내 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'PC6', seconds: 30 }],
  sourceSymptomId: null,
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
