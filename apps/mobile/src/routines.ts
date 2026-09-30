import {
  addStep,
  USER_ROUTINE_LIMITS,
  type RoutineStep,
  type SessionRoutineRef,
  type Settings,
  type Symptom,
  type UserRoutine,
} from '@ggookggook/shared';
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

export interface ResolvedRoutineRefTitle {
  title: string;
  // Navigation target for this ref's preview screen; null for a deleted user routine,
  // which has nothing left to preview.
  href: `/symptom/${string}` | `/routine/${string}` | null;
}

// Shared by 내 루틴's session history and 나의 기록's 자주 한 루틴 list: resolves a
// session's routine ref to its display title and preview link. Returns null for a symptom
// id no longer in content (a row the caller should skip); a soft-deleted user routine still
// resolves, showing DELETED_ROUTINE_LABEL with no link.
export function resolveRoutineRefTitle(
  ref: SessionRoutineRef,
  userRoutines: ReadonlyMap<string, UserRoutine | null>,
): ResolvedRoutineRefTitle | null {
  if (ref.kind === 'symptom') {
    const symptom = content.symptom(ref.symptomId);
    if (!symptom) return null;
    return { title: symptom.name, href: `/symptom/${symptom.id}` };
  }
  const routine = userRoutines.get(ref.routineId);
  const usable = isUserRoutineUsable(routine);
  return { title: usable ? routine.name : DELETED_ROUTINE_LABEL, href: usable ? `/routine/${routine.id}` : null };
}

// "내 루틴으로 복사" copies the symptom's full step list, not the pregnancy-filtered view
// on screen: filtering is re-applied wherever the resulting user routine is shown or run.
export function symptomRoutineName(name: string): string {
  return name.trim().slice(0, USER_ROUTINE_LIMITS.nameMaxLength);
}

export function copySymptomToUserRoutine(symptom: Symptom, id: string, now: string): UserRoutine {
  // Defensive: content is already within these bounds (a symptom has at most 3 steps,
  // each 10-300s), but go through the same shared limits/clamp a hand-built routine
  // would, rather than trusting content to stay that way forever.
  const steps = symptom.steps
    .slice(0, USER_ROUTINE_LIMITS.stepsMax)
    .reduce<RoutineStep[]>((acc, step) => addStep(acc, step), []);
  return {
    id,
    name: symptomRoutineName(symptom.name),
    steps,
    sourceSymptomId: symptom.id,
    repeat: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
