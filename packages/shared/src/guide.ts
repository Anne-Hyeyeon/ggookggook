import type { RoutineStep } from './content';
import type { AcupointLookup } from './routine';

export type GuideSide = 'left' | 'right' | 'both' | 'center';

export interface GuideSegment {
  stepIndex: number;
  round: number;
  acupointId: string;
  side: GuideSide;
  seconds: number;
}

export function resolveSteps(steps: readonly RoutineStep[], lookup: AcupointLookup): RoutineStep[] {
  return steps.filter((step) => lookup.has(step.acupointId));
}

function buildRound(steps: readonly RoutineStep[], lookup: AcupointLookup, round: number): GuideSegment[] {
  return steps.flatMap((step, stepIndex): GuideSegment[] => {
    const acupoint = lookup.get(step.acupointId);
    if (!acupoint) return [];
    if (acupoint.sides === 'sequential') {
      return [
        { stepIndex, round, acupointId: step.acupointId, side: 'left', seconds: step.seconds },
        { stepIndex, round, acupointId: step.acupointId, side: 'right', seconds: step.seconds },
      ];
    }
    return [{ stepIndex, round, acupointId: step.acupointId, side: acupoint.sides === 'together' ? 'both' : 'center', seconds: step.seconds }];
  });
}

export function buildGuideSegments(steps: readonly RoutineStep[], lookup: AcupointLookup, rounds = 1): GuideSegment[] {
  const result: GuideSegment[] = [];
  for (let round = 1; round <= rounds; round++) {
    result.push(...buildRound(steps, lookup, round));
  }
  return result;
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
    return { phase: 'press', secondsLeftInPhase: Math.max(0, Math.min(pressSeconds - position, segmentLeft)), pressNumber: cycleIndex + 1, pressCount };
  }
  return { phase: 'rest', secondsLeftInPhase: Math.max(0, Math.min(cycle - position, segmentLeft)), pressNumber: cycleIndex + 1, pressCount };
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

export function seekSegment(progress: GuideProgress, segments: readonly GuideSegment[], index: number): GuideProgress {
  if (segments.length === 0) return { index: 0, elapsed: 0, finished: true };
  const clamped = Math.min(Math.max(index, 0), segments.length - 1);
  return { index: clamped, elapsed: 0, finished: false };
}

function sameStep(a: GuideSegment, b: GuideSegment): boolean {
  return a.round === b.round && a.stepIndex === b.stepIndex;
}

// The first segment of the acupoint step that `index` belongs to (the left side of a
// sequential point, when `index` lands on its right side).
function firstSegmentOfStep(segments: readonly GuideSegment[], index: number): number {
  const current = segments[index];
  if (!current) return index;
  let i = index;
  while (i > 0) {
    const previous = segments[i - 1];
    if (!previous || !sameStep(previous, current)) break;
    i -= 1;
  }
  return i;
}

// Both sides of a sequential point move together: "next" always lands on the first segment
// of the next acupoint step, whichever side of the current point it was called from, and
// naturally crosses into the next round since rounds are just more steps appended in order.
export function nextSegmentIndex(progress: GuideProgress, segments: readonly GuideSegment[]): number | null {
  const current = segments[progress.index];
  if (!current) return null;
  let i = progress.index;
  while (i < segments.length) {
    const segment = segments[i];
    if (!segment || !sameStep(segment, current)) break;
    i += 1;
  }
  return i < segments.length ? i : null;
}

// Music-player semantics: partway into a step, or on a step's non-first segment (the right
// side of a sequential point), "previous" restarts that step; otherwise it moves to the
// first segment of the previous step (crossing back into the previous round when needed).
export function previousSegmentIndex(progress: GuideProgress, segments: readonly GuideSegment[]): number | null {
  const current = segments[progress.index];
  if (!current) return null;
  const stepStart = firstSegmentOfStep(segments, progress.index);
  if (progress.elapsed > 0 || stepStart !== progress.index) return stepStart;
  if (stepStart === 0) return null;
  return firstSegmentOfStep(segments, stepStart - 1);
}
