import type { Acupoint, RoutineStep } from './content';

export type AcupointLookup = ReadonlyMap<string, Pick<Acupoint, 'sides' | 'cautions'>>;

export function stepDurationSeconds(step: RoutineStep, acupoint: Pick<Acupoint, 'sides'>): number {
  return acupoint.sides === 'sequential' ? step.seconds * 2 : step.seconds;
}

function requireAcupoint(lookup: AcupointLookup, id: string): Pick<Acupoint, 'sides' | 'cautions'> {
  const acupoint = lookup.get(id);
  if (!acupoint) throw new Error(`Unknown acupoint: ${id}`);
  return acupoint;
}

export function routineDurationSeconds(steps: readonly RoutineStep[], lookup: AcupointLookup): number {
  return steps.reduce((sum, step) => sum + stepDurationSeconds(step, requireAcupoint(lookup, step.acupointId)), 0);
}

export function routineMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

export function stepsForPregnancy(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[] {
  return steps.filter((step) => !requireAcupoint(lookup, step.acupointId).cautions.includes('pregnancy'));
}
