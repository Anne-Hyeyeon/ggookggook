import {
  addStep as addStepPure,
  moveStep as moveStepPure,
  removeStep as removeStepPure,
  setStepSeconds as setStepSecondsPure,
  type RoutineStep,
  type UserRoutine,
} from '@ggookggook/shared';
import { create } from 'zustand';

export interface RoutineDraft {
  name: string;
  steps: RoutineStep[];
  sourceSymptomId: string | null;
}

const EMPTY_DRAFT: RoutineDraft = { name: '', steps: [], sourceSymptomId: null };

function toDraft(routine: UserRoutine): RoutineDraft {
  return { name: routine.name, steps: routine.steps, sourceSymptomId: routine.sourceSymptomId };
}

interface RoutineDraftState {
  original: UserRoutine | null;
  draft: RoutineDraft;
  startNew(): void;
  startEdit(routine: UserRoutine): void;
  setName(name: string): void;
  addAcupoint(step: RoutineStep): void;
  removeStep(index: number): void;
  moveStep(from: number, to: number): void;
  setStepSeconds(index: number, seconds: number): void;
}

export const useRoutineDraft = create<RoutineDraftState>((set) => ({
  original: null,
  draft: EMPTY_DRAFT,
  startNew() {
    set({ original: null, draft: EMPTY_DRAFT });
  },
  startEdit(routine) {
    set({ original: routine, draft: toDraft(routine) });
  },
  setName(name) {
    set((state) => ({ draft: { ...state.draft, name } }));
  },
  addAcupoint(step) {
    set((state) => ({ draft: { ...state.draft, steps: addStepPure(state.draft.steps, step) } }));
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

export function isRoutineDraftDirty(draft: RoutineDraft, original: UserRoutine | null): boolean {
  const originalDraft = original ? toDraft(original) : EMPTY_DRAFT;
  return draft.name !== originalDraft.name || !stepsEqual(draft.steps, originalDraft.steps);
}
