import {
  resolveSteps,
  routineDurationSeconds,
  routineMinutes,
  stepsForPregnancy,
  type RoutineStep,
  type Settings,
  type Sides,
  type Symptom,
} from '@ggookggook/shared';
import { content } from '@/content';

export function visibleStepsFor(steps: readonly RoutineStep[], settings: Settings): RoutineStep[] {
  const resolved = resolveSteps(steps, content.acupoints);
  return settings.pregnancyMode ? stepsForPregnancy(resolved, content.acupoints) : resolved;
}

export function visibleSteps(symptom: Symptom, settings: Settings): RoutineStep[] {
  return visibleStepsFor(symptom.steps, settings);
}

export function routineSummary(steps: RoutineStep[]): { count: number; minutes: number } {
  return { count: steps.length, minutes: routineMinutes(routineDurationSeconds(steps, content.acupoints)) };
}

export function sideLabel(sides: Sides): string {
  if (sides === 'sequential') return '양쪽 번갈아';
  if (sides === 'together') return '양쪽 함께';
  return '';
}

export function firstSentence(text: string): string {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
}

export function topic(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul && (last - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? '은' : '는'}`;
}
