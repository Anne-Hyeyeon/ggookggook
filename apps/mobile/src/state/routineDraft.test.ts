import type { UserRoutine } from '@ggookggook/shared';
import { isRoutineDraftDirty, useRoutineDraft } from '@/state/routineDraft';

const routine: UserRoutine = {
  id: 'r1',
  name: '아침 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'ST36', seconds: 90 }],
  sourceSymptomId: null,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  useRoutineDraft.getState().startNew();
});

it('starts new with an empty draft and no original', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().startNew();
  expect(useRoutineDraft.getState()).toMatchObject({ original: null, draft: { name: '', steps: [], sourceSymptomId: null } });
});

it('starts edit with the routine loaded into both draft and original', () => {
  useRoutineDraft.getState().startEdit(routine);
  expect(useRoutineDraft.getState().original).toEqual(routine);
  expect(useRoutineDraft.getState().draft).toEqual({ name: '아침 루틴', steps: routine.steps, sourceSymptomId: null });
});

it('sets the name', () => {
  useRoutineDraft.getState().setName('저녁 루틴');
  expect(useRoutineDraft.getState().draft.name).toBe('저녁 루틴');
});

it('adds an acupoint, clamping and snapping its seconds', () => {
  useRoutineDraft.getState().addAcupoint({ acupointId: 'PC6', seconds: 34 });
  expect(useRoutineDraft.getState().draft.steps).toEqual([{ acupointId: 'PC6', seconds: 30 }]);
});

it('removes a step by index without mutating the previous array', () => {
  useRoutineDraft.getState().startEdit(routine);
  const before = useRoutineDraft.getState().draft.steps;
  useRoutineDraft.getState().removeStep(0);
  expect(useRoutineDraft.getState().draft.steps).toEqual([{ acupointId: 'ST36', seconds: 90 }]);
  expect(before).toEqual(routine.steps);
});

it('moves a step from one index to another', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().moveStep(0, 1);
  expect(useRoutineDraft.getState().draft.steps).toEqual([{ acupointId: 'ST36', seconds: 90 }, { acupointId: 'LI4', seconds: 60 }]);
});

it('sets a step seconds, clamped and snapped', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().setStepSeconds(0, 605);
  expect(useRoutineDraft.getState().draft.steps[0]).toEqual({ acupointId: 'LI4', seconds: 600 });
});

describe('isRoutineDraftDirty', () => {
  it('is false for a fresh new draft', () => {
    expect(isRoutineDraftDirty({ name: '', steps: [], sourceSymptomId: null }, null)).toBe(false);
  });

  it('is true once a new draft has a name or steps', () => {
    expect(isRoutineDraftDirty({ name: '루틴', steps: [], sourceSymptomId: null }, null)).toBe(true);
    expect(isRoutineDraftDirty({ name: '', steps: [{ acupointId: 'LI4', seconds: 60 }], sourceSymptomId: null }, null)).toBe(true);
  });

  it('is false when an edited draft matches its original', () => {
    expect(isRoutineDraftDirty({ name: routine.name, steps: routine.steps, sourceSymptomId: null }, routine)).toBe(false);
  });

  it('is true once an edited draft changes the name', () => {
    expect(isRoutineDraftDirty({ name: '다른 이름', steps: routine.steps, sourceSymptomId: null }, routine)).toBe(true);
  });

  it('is true once an edited draft changes a step', () => {
    const changed = [{ acupointId: 'LI4', seconds: 70 }, { acupointId: 'ST36', seconds: 90 }];
    expect(isRoutineDraftDirty({ name: routine.name, steps: changed, sourceSymptomId: null }, routine)).toBe(true);
  });

  it('is true once an edited draft changes the step count', () => {
    expect(isRoutineDraftDirty({ name: routine.name, steps: [routine.steps[0]!], sourceSymptomId: null }, routine)).toBe(true);
  });
});
