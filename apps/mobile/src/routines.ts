import type { RoutineStep, SessionRoutineRef, Settings, UserRoutine } from '@ggookggook/shared';
import { content } from '@/content';
import { visibleStepsFor } from '@/routine';

export type RoutineRef = { kind: 'symptom'; id: string } | { kind: 'user'; id: string };

export interface ResolvedRoutine {
  title: string;
  steps: RoutineStep[];
}

export interface ResolveRoutineDeps {
  settings: Settings;
  userRoutine?: UserRoutine | null;
}

// A stable reference so callers falling back on a missing routine don't hand the guide a
// fresh [] every render.
export const NO_STEPS: RoutineStep[] = [];

export function resolveRoutine(ref: RoutineRef, deps: ResolveRoutineDeps): ResolvedRoutine | null {
  if (ref.kind === 'symptom') {
    const symptom = content.symptom(ref.id);
    if (!symptom) return null;
    return { title: symptom.name, steps: visibleStepsFor(symptom.steps, deps.settings) };
  }
  const routine = deps.userRoutine;
  if (!routine || routine.deletedAt !== null) return null;
  return { title: routine.name, steps: visibleStepsFor(routine.steps, deps.settings) };
}

export function toSessionRoutineRef(ref: RoutineRef): SessionRoutineRef {
  return ref.kind === 'symptom' ? { kind: 'symptom', symptomId: ref.id } : { kind: 'user', routineId: ref.id };
}
