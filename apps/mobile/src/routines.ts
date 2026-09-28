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

export const DELETED_ROUTINE_LABEL = '지운 루틴';

// getUserRoutine returns a soft-deleted row rather than null (its deleted_at is set): that
// reads the same as one that no longer exists at all, everywhere a user routine is displayed.
export function isUserRoutineUsable(routine: UserRoutine | null | undefined): routine is UserRoutine {
  return routine !== null && routine !== undefined && routine.deletedAt === null;
}

export function resolveRoutine(ref: RoutineRef, deps: ResolveRoutineDeps): ResolvedRoutine | null {
  if (ref.kind === 'symptom') {
    const symptom = content.symptom(ref.id);
    if (!symptom) return null;
    return { title: symptom.name, steps: visibleStepsFor(symptom.steps, deps.settings) };
  }
  if (!isUserRoutineUsable(deps.userRoutine)) return null;
  return { title: deps.userRoutine.name, steps: visibleStepsFor(deps.userRoutine.steps, deps.settings) };
}

export function toSessionRoutineRef(ref: RoutineRef): SessionRoutineRef {
  return ref.kind === 'symptom' ? { kind: 'symptom', symptomId: ref.id } : { kind: 'user', routineId: ref.id };
}
