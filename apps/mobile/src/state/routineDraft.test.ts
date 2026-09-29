import type { UserRoutine } from '@ggookggook/shared';
import { isRoutineDraftDirty, toRoutineSteps, useRoutineDraft, type DraftStep } from '@/state/routineDraft';

const routine: UserRoutine = {
  id: 'r1',
  name: '아침 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'ST36', seconds: 90 }],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

const draftStep = (acupointId: string, seconds = 60, key = 'k'): DraftStep => ({ acupointId, seconds, key });

beforeEach(() => {
  useRoutineDraft.getState().startNew();
});

it('starts new with an empty draft, no original, and a matching empty baseline', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().startNew();
  expect(useRoutineDraft.getState()).toMatchObject({
    original: null,
    draft: { name: '', steps: [], sourceSymptomId: null, repeat: 1 },
    baseline: { name: '', steps: [], sourceSymptomId: null, repeat: 1 },
  });
});

it('starts edit with the routine loaded into draft, original, and baseline, assigning each step a fresh key', () => {
  useRoutineDraft.getState().startEdit(routine);
  expect(useRoutineDraft.getState().original).toEqual(routine);
  const { draft, baseline } = useRoutineDraft.getState();
  expect(draft.name).toBe('아침 루틴');
  expect(draft.repeat).toBe(1);
  expect(toRoutineSteps(draft.steps)).toEqual(routine.steps);
  expect(draft.steps.map((step) => step.key).every((key) => typeof key === 'string' && key.length > 0)).toBe(true);
  expect(new Set(draft.steps.map((step) => step.key)).size).toBe(draft.steps.length);
  expect(baseline).toBe(draft);
});

it('commits the current draft as the new baseline, so it no longer counts as dirty', () => {
  useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  expect(isRoutineDraftDirty(useRoutineDraft.getState().draft, useRoutineDraft.getState().baseline)).toBe(true);

  useRoutineDraft.getState().commitBaseline();
  expect(isRoutineDraftDirty(useRoutineDraft.getState().draft, useRoutineDraft.getState().baseline)).toBe(false);

  useRoutineDraft.getState().setName('아침 루틴');
  expect(isRoutineDraftDirty(useRoutineDraft.getState().draft, useRoutineDraft.getState().baseline)).toBe(true);
});

it('sets the name', () => {
  useRoutineDraft.getState().setName('저녁 루틴');
  expect(useRoutineDraft.getState().draft.name).toBe('저녁 루틴');
});

it('carries a non-default repeat count into the draft on edit', () => {
  useRoutineDraft.getState().startEdit({ ...routine, repeat: 3 });
  expect(useRoutineDraft.getState().draft.repeat).toBe(3);
});

it('sets the repeat count', () => {
  useRoutineDraft.getState().setRepeat(4);
  expect(useRoutineDraft.getState().draft.repeat).toBe(4);
});

it('adds an acupoint, clamping and snapping its seconds, and assigning it a key', () => {
  useRoutineDraft.getState().addAcupoint({ acupointId: 'PC6', seconds: 34 });
  const { steps } = useRoutineDraft.getState().draft;
  expect(toRoutineSteps(steps)).toEqual([{ acupointId: 'PC6', seconds: 30 }]);
  expect(typeof steps[0]?.key).toBe('string');
});

it('gives each added acupoint its own key, even for the same acupoint twice', () => {
  useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 90 });
  const { steps } = useRoutineDraft.getState().draft;
  expect(steps[0]?.key).not.toBe(steps[1]?.key);
});

it('removes a step by index without mutating the previous array', () => {
  useRoutineDraft.getState().startEdit(routine);
  const before = useRoutineDraft.getState().draft.steps;
  useRoutineDraft.getState().removeStep(0);
  expect(toRoutineSteps(useRoutineDraft.getState().draft.steps)).toEqual([{ acupointId: 'ST36', seconds: 90 }]);
  expect(toRoutineSteps(before)).toEqual(routine.steps);
});

it('moves a step from one index to another', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().moveStep(0, 1);
  expect(toRoutineSteps(useRoutineDraft.getState().draft.steps)).toEqual([
    { acupointId: 'ST36', seconds: 90 },
    { acupointId: 'LI4', seconds: 60 },
  ]);
});

it('sets a step seconds, clamped and snapped', () => {
  useRoutineDraft.getState().startEdit(routine);
  useRoutineDraft.getState().setStepSeconds(0, 605);
  expect(toRoutineSteps(useRoutineDraft.getState().draft.steps)[0]).toEqual({ acupointId: 'LI4', seconds: 600 });
});

describe('toRoutineSteps', () => {
  it('strips the draft-only key, leaving just acupointId and seconds', () => {
    expect(toRoutineSteps([draftStep('LI4', 60, 'a'), draftStep('ST36', 90, 'b')])).toEqual([
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'ST36', seconds: 90 },
    ]);
  });
});

describe('isRoutineDraftDirty', () => {
  const emptyBaseline = { name: '', steps: [], sourceSymptomId: null, repeat: 1 };
  const originalBaseline = {
    name: routine.name,
    steps: routine.steps.map((step, i) => draftStep(step.acupointId, step.seconds, `orig-${i}`)),
    sourceSymptomId: null,
    repeat: 1,
  };

  it('is false for a fresh new draft against an empty baseline', () => {
    expect(isRoutineDraftDirty(emptyBaseline, emptyBaseline)).toBe(false);
  });

  it('is true once a new draft has a name or steps the empty baseline does not', () => {
    expect(isRoutineDraftDirty({ name: '루틴', steps: [], sourceSymptomId: null, repeat: 1 }, emptyBaseline)).toBe(true);
    expect(isRoutineDraftDirty({ name: '', steps: [draftStep('LI4')], sourceSymptomId: null, repeat: 1 }, emptyBaseline)).toBe(true);
  });

  it('is true once a new draft changes the repeat count', () => {
    expect(isRoutineDraftDirty({ name: '', steps: [], sourceSymptomId: null, repeat: 2 }, emptyBaseline)).toBe(true);
  });

  it('is false for a prefilled baseline compared against itself, regardless of the draft keys', () => {
    const prefilled = { name: '', steps: [draftStep('LI4', 60, 'a')], sourceSymptomId: null, repeat: 1 };
    const sameStepsDifferentKeys = { name: '', steps: [draftStep('LI4', 60, 'b')], sourceSymptomId: null, repeat: 1 };
    expect(isRoutineDraftDirty(sameStepsDifferentKeys, prefilled)).toBe(false);
  });

  it('is false when an edited draft matches its original baseline, regardless of the draft keys', () => {
    const steps = routine.steps.map((step, i) => draftStep(step.acupointId, step.seconds, `key-${i}`));
    expect(isRoutineDraftDirty({ name: routine.name, steps, sourceSymptomId: null, repeat: 1 }, originalBaseline)).toBe(false);
  });

  it('is true once an edited draft changes the name', () => {
    const steps = routine.steps.map((step) => draftStep(step.acupointId, step.seconds));
    expect(isRoutineDraftDirty({ name: '다른 이름', steps, sourceSymptomId: null, repeat: 1 }, originalBaseline)).toBe(true);
  });

  it('is true once an edited draft changes a step', () => {
    const changed = [draftStep('LI4', 70), draftStep('ST36', 90)];
    expect(isRoutineDraftDirty({ name: routine.name, steps: changed, sourceSymptomId: null, repeat: 1 }, originalBaseline)).toBe(true);
  });

  it('is true once an edited draft changes the repeat count', () => {
    const steps = routine.steps.map((step) => draftStep(step.acupointId, step.seconds));
    expect(isRoutineDraftDirty({ name: routine.name, steps, sourceSymptomId: null, repeat: 2 }, originalBaseline)).toBe(true);
  });

  it('is true once an edited draft changes the step count', () => {
    expect(isRoutineDraftDirty({ name: routine.name, steps: [draftStep('LI4', 60)], sourceSymptomId: null, repeat: 1 }, originalBaseline)).toBe(true);
  });
});
