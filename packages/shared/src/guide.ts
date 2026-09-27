import type { RoutineStep } from './content';
import type { AcupointLookup } from './routine';

export type GuideSide = 'left' | 'right' | 'both' | 'center';

export interface GuideSegment {
  stepIndex: number;
  acupointId: string;
  side: GuideSide;
  seconds: number;
}

export function resolveSteps(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[] {
  return steps.filter((step) => lookup.has(step.acupointId));
}

export function buildGuideSegments(steps: readonly RoutineStep[], lookup: AcupointLookup): GuideSegment[] {
  const segments: GuideSegment[] = [];
  steps.forEach((step, stepIndex) => {
    const acupoint = lookup.get(step.acupointId);
    if (!acupoint) return;
    if (acupoint.sides === 'sequential') {
      segments.push({ stepIndex, acupointId: step.acupointId, side: 'left', seconds: step.seconds });
      segments.push({ stepIndex, acupointId: step.acupointId, side: 'right', seconds: step.seconds });
      return;
    }
    segments.push({ stepIndex, acupointId: step.acupointId, side: acupoint.sides === 'together' ? 'both' : 'center', seconds: step.seconds });
  });
  return segments;
}

export type RhythmPhase = 'press' | 'rest';

export interface RhythmState {
  phase: RhythmPhase;
  secondsLeftInPhase: number;
  pressNumber: number;
  pressCount: number;
}

export function rhythmAt(elapsedSeconds: number, segmentSeconds: number, pressSeconds: number, restSeconds: number): RhythmState {
  const cycle = pressSeconds + restSeconds;
  const pressCount = Math.max(1, Math.ceil(segmentSeconds / cycle));
  const clamped = Math.min(Math.max(elapsedSeconds, 0), segmentSeconds);
  const cycleIndex = Math.min(Math.floor(clamped / cycle), pressCount - 1);
  const position = clamped - cycleIndex * cycle;
  const segmentLeft = segmentSeconds - clamped;
  if (position < pressSeconds || segmentLeft === 0) {
    return { phase: 'press', secondsLeftInPhase: Math.min(pressSeconds - position, segmentLeft), pressNumber: cycleIndex + 1, pressCount };
  }
  return { phase: 'rest', secondsLeftInPhase: Math.min(cycle - position, segmentLeft), pressNumber: cycleIndex + 1, pressCount };
}

export interface GuideProgress {
  index: number;
  elapsed: number;
  finished: boolean;
}

export type GuideEvent = 'press' | 'rest' | 'segment' | 'finish';

export function advanceGuide(
  progress: GuideProgress,
  segments: readonly GuideSegment[],
  pressSeconds: number,
  restSeconds: number,
): { progress: GuideProgress; events: GuideEvent[] } {
  if (progress.finished) return { progress, events: [] };
  const segment = segments[progress.index];
  if (!segment) return { progress: { ...progress, finished: true }, events: ['finish'] };

  const elapsed = progress.elapsed + 1;
  if (elapsed >= segment.seconds) {
    if (progress.index + 1 >= segments.length) {
      return { progress: { index: progress.index, elapsed: segment.seconds, finished: true }, events: ['finish'] };
    }
    return { progress: { index: progress.index + 1, elapsed: 0, finished: false }, events: ['segment', 'press'] };
  }

  const before = rhythmAt(progress.elapsed, segment.seconds, pressSeconds, restSeconds).phase;
  const after = rhythmAt(elapsed, segment.seconds, pressSeconds, restSeconds).phase;
  return { progress: { ...progress, elapsed }, events: before === after ? [] : [after] };
}

export function guideElapsedTotal(progress: GuideProgress, segments: readonly GuideSegment[]): number {
  return segments.slice(0, progress.index).reduce((sum, segment) => sum + segment.seconds, 0) + progress.elapsed;
}
