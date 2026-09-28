import type { RoutineStep } from './content';

export const USER_ROUTINE_LIMITS = {
  nameMaxLength: 20,
  stepsMax: 10,
  secondsMin: 10,
  secondsMax: 600,
  secondsStep: 10,
} as const;

export interface UserRoutineInput {
  name: string;
  steps: RoutineStep[];
  sourceSymptomId: string | null;
}

export type ValidateUserRoutineResult =
  | { ok: true; value: UserRoutineInput }
  | { ok: false; errors: string[] };

export function validateUserRoutine(input: UserRoutineInput): ValidateUserRoutineResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) errors.push('이름을 적어 주세요.');
  else if (name.length > USER_ROUTINE_LIMITS.nameMaxLength) errors.push(`이름은 ${USER_ROUTINE_LIMITS.nameMaxLength}자까지 적을 수 있어요.`);

  if (input.steps.length === 0) errors.push('혈자리를 하나 이상 넣어 주세요.');
  else if (input.steps.length > USER_ROUTINE_LIMITS.stepsMax) errors.push(`혈자리는 ${USER_ROUTINE_LIMITS.stepsMax}개까지 넣을 수 있어요.`);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, steps: input.steps, sourceSymptomId: input.sourceSymptomId } };
}

function clampSeconds(seconds: number): number {
  const snapped = Math.round(seconds / USER_ROUTINE_LIMITS.secondsStep) * USER_ROUTINE_LIMITS.secondsStep;
  return Math.min(USER_ROUTINE_LIMITS.secondsMax, Math.max(USER_ROUTINE_LIMITS.secondsMin, snapped));
}

function inRange(steps: readonly RoutineStep[], index: number): boolean {
  return index >= 0 && index < steps.length;
}

export function addStep(steps: readonly RoutineStep[], step: RoutineStep): RoutineStep[] {
  return [...steps, { ...step, seconds: clampSeconds(step.seconds) }];
}

export function removeStep(steps: readonly RoutineStep[], index: number): RoutineStep[] {
  if (!inRange(steps, index)) return [...steps];
  return steps.filter((_, i) => i !== index);
}

export function moveStep(steps: readonly RoutineStep[], from: number, to: number): RoutineStep[] {
  if (!inRange(steps, from) || !inRange(steps, to)) return [...steps];
  const next = [...steps];
  const moved = next[from];
  if (moved === undefined) return [...steps];
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function setStepSeconds(steps: readonly RoutineStep[], index: number, seconds: number): RoutineStep[] {
  if (!inRange(steps, index)) return [...steps];
  return steps.map((step, i) => (i === index ? { ...step, seconds: clampSeconds(seconds) } : step));
}
