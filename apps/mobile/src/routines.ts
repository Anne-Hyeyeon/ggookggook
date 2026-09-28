import { USER_ROUTINE_LIMITS, type RoutineStep, type SessionRoutineRef, type Settings, type Symptom, type UserRoutine } from '@ggookggook/shared';
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

// "내 루틴으로 복사" copies the symptom's full step list, not the pregnancy-filtered view
// on screen: filtering is re-applied wherever the resulting user routine is shown or run.
export function symptomRoutineName(name: string): string {
  return name.trim().slice(0, USER_ROUTINE_LIMITS.nameMaxLength);
}

export function copySymptomToUserRoutine(symptom: Symptom, id: string, now: string): UserRoutine {
  return {
    id,
    name: symptomRoutineName(symptom.name),
    steps: symptom.steps,
    sourceSymptomId: symptom.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
