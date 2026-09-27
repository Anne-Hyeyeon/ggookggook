import { describe, expect, it } from 'vitest';
import type { Acupoint } from './content';
import { advanceGuide, buildGuideSegments, guideElapsedTotal, resolveSteps, rhythmAt, type GuideProgress } from './guide';
import type { AcupointLookup } from './routine';

const lookup: AcupointLookup = new Map<string, Pick<Acupoint, 'sides' | 'cautions'>>([
  ['LI4', { sides: 'sequential', cautions: ['pregnancy'] }],
  ['EX-HN5', { sides: 'together', cautions: [] }],
  ['GV29', { sides: 'single', cautions: [] }],
]);

describe('resolveSteps', () => {
  it('drops steps whose acupoint no longer exists', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'ST36', seconds: 60 },
    ];
    expect(resolveSteps(steps, lookup)).toEqual([{ acupointId: 'LI4', seconds: 60 }]);
  });
});

describe('buildGuideSegments', () => {
  it('splits sequential points into left then right and keeps others whole', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'EX-HN5', seconds: 30 },
      { acupointId: 'GV29', seconds: 40 },
    ];
    expect(buildGuideSegments(steps, lookup)).toEqual([
      { stepIndex: 0, acupointId: 'LI4', side: 'left', seconds: 60 },
      { stepIndex: 0, acupointId: 'LI4', side: 'right', seconds: 60 },
      { stepIndex: 1, acupointId: 'EX-HN5', side: 'both', seconds: 30 },
      { stepIndex: 2, acupointId: 'GV29', side: 'center', seconds: 40 },
    ]);
  });
});

describe('rhythmAt', () => {
  it('alternates 5 seconds of pressing with 2 seconds of rest', () => {
    expect(rhythmAt(0, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 5, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(4, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 1, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(5, 60, 5, 2)).toEqual({ phase: 'rest', secondsLeftInPhase: 2, pressNumber: 1, pressCount: 9 });
    expect(rhythmAt(7, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 5, pressNumber: 2, pressCount: 9 });
  });

  it('never counts past the end of the segment', () => {
    expect(rhythmAt(56, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 4, pressNumber: 9, pressCount: 9 });
    expect(rhythmAt(60, 60, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 0, pressNumber: 9, pressCount: 9 });
    expect(rhythmAt(90, 60, 5, 2).pressNumber).toBe(9);
  });
});

describe('advanceGuide', () => {
  const segments = buildGuideSegments([{ acupointId: 'GV29', seconds: 10 }, { acupointId: 'EX-HN5', seconds: 10 }], lookup);
  const start: GuideProgress = { index: 0, elapsed: 0, finished: false };

  it('emits rest and press when the rhythm phase changes', () => {
    let progress = start;
    const events: string[] = [];
    for (let i = 0; i < 7; i++) {
      const result = advanceGuide(progress, segments, 5, 2);
      progress = result.progress;
      events.push(...result.events);
    }
    expect(progress).toEqual({ index: 0, elapsed: 7, finished: false });
    expect(events).toEqual(['rest', 'press']);
  });

  it('moves to the next segment and emits segment then press', () => {
    const result = advanceGuide({ index: 0, elapsed: 9, finished: false }, segments, 5, 2);
    expect(result.progress).toEqual({ index: 1, elapsed: 0, finished: false });
    expect(result.events).toEqual(['segment', 'press']);
  });

  it('finishes after the last segment and then stays finished', () => {
    const result = advanceGuide({ index: 1, elapsed: 9, finished: false }, segments, 5, 2);
    expect(result.progress).toEqual({ index: 1, elapsed: 10, finished: true });
    expect(result.events).toEqual(['finish']);
    expect(advanceGuide(result.progress, segments, 5, 2).events).toEqual([]);
  });

  it('finishes immediately when there are no segments', () => {
    expect(advanceGuide(start, [], 5, 2)).toEqual({ progress: { index: 0, elapsed: 0, finished: true }, events: ['finish'] });
  });
});

describe('guideElapsedTotal', () => {
  it('adds finished segments to the current elapsed time', () => {
    const segments = buildGuideSegments([{ acupointId: 'LI4', seconds: 60 }], lookup);
    expect(guideElapsedTotal({ index: 1, elapsed: 15, finished: false }, segments)).toBe(75);
  });
});
