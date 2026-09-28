import {
  addStep as addStepPure,
  moveStep as moveStepPure,
  removeStep as removeStepPure,
  setStepSeconds as setStepSecondsPure,
  type RoutineStep,
  type UserRoutine,
} from '@ggookggook/shared';
import { create } from 'zustand';
import { newId } from '@/id';

// A local, unpersisted identity for a step while it lives in the draft: acts as the React
// key and the target move/remove/setSeconds resolve to a live index by, instead of the
// step's render-time index (which a fast double tap can race past, see routineNew.test.tsx).
export interface DraftStep extends RoutineStep {
  key: string;
}

export interface RoutineDraft {
  name: string;
  steps: DraftStep[];
  sourceSymptomId: string | null;
}

const EMPTY_DRAFT: RoutineDraft = { name: '', steps: [], sourceSymptomId: null };

function toDraft(routine: UserRoutine): RoutineDraft {
  return { name: routine.name, steps: routine.steps.map((step) => ({ ...step, key: newId() })), sourceSymptomId: routine.sourceSymptomId };
}

export function toRoutineSteps(steps: readonly DraftStep[]): RoutineStep[] {
  return steps.map(({ acupointId, seconds }) => ({ acupointId, seconds }));
}

interface RoutineDraftState {
  original: UserRoutine | null;
  draft: RoutineDraft;
  // What `draft` is compared against for dirtiness. Usually the same shape `original`
  // would produce, but a fresh draft prefilled from an acupoint (routine/new's
  // prefillAcupointId) commits that prefill as its own baseline via `commitBaseline`, so
  // arriving with one step already in it doesn't itself count as an unsaved change.
  baseline: RoutineDraft;
  startNew(): void;
  startEdit(routine: UserRoutine): void;
  commitBaseline(): void;
  setName(name: string): void;
  addAcupoint(step: RoutineStep): void;
  removeStep(index: number): void;
  moveStep(from: number, to: number): void;
  setStepSeconds(index: number, seconds: number): void;
}

export const useRoutineDraft = create<RoutineDraftState>((set, get) => ({
  original: null,
  draft: EMPTY_DRAFT,
  baseline: EMPTY_DRAFT,
  startNew() {
    set({ original: null, draft: EMPTY_DRAFT, baseline: EMPTY_DRAFT });
  },
  startEdit(routine) {
    const draft = toDraft(routine);
    set({ original: routine, draft, baseline: draft });
  },
  commitBaseline() {
    set({ baseline: get().draft });
  },
  setName(name) {
    set((state) => ({ draft: { ...state.draft, name } }));
  },
  addAcupoint(step) {
    set((state) => ({ draft: { ...state.draft, steps: addStepPure(state.draft.steps, { ...step, key: newId() }) } }));
  },
  removeStep(index) {
    set((state) => ({ draft: { ...state.draft, steps: removeStepPure(state.draft.steps, index) } }));
  },
  moveStep(from, to) {
    set((state) => ({ draft: { ...state.draft, steps: moveStepPure(state.draft.steps, from, to) } }));
  },
  setStepSeconds(index, seconds) {
    set((state) => ({ draft: { ...state.draft, steps: setStepSecondsPure(state.draft.steps, index, seconds) } }));
  },
}));

function stepsEqual(a: readonly RoutineStep[], b: readonly RoutineStep[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, i) => step.acupointId === b[i]?.acupointId && step.seconds === b[i]?.seconds);
}

export function isRoutineDraftDirty(draft: RoutineDraft, baseline: RoutineDraft): boolean {
  return draft.name !== baseline.name || !stepsEqual(draft.steps, baseline.steps);
}
