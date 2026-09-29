import { describe, expect, it } from 'vitest';
import type { Acupoint } from './content';
import {
  advanceGuide,
  buildGuideSegments,
  guideElapsedTotal,
  nextSegmentIndex,
  previousSegmentIndex,
  resolveSteps,
  rhythmAt,
  seekSegment,
  type GuideProgress,
} from './guide';
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
  it('splits sequential points into left then right and keeps others whole, defaulting to a single round', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'EX-HN5', seconds: 30 },
      { acupointId: 'GV29', seconds: 40 },
    ];
    expect(buildGuideSegments(steps, lookup)).toEqual([
      { stepIndex: 0, round: 1, acupointId: 'LI4', side: 'left', seconds: 60 },
      { stepIndex: 0, round: 1, acupointId: 'LI4', side: 'right', seconds: 60 },
      { stepIndex: 1, round: 1, acupointId: 'EX-HN5', side: 'both', seconds: 30 },
      { stepIndex: 2, round: 1, acupointId: 'GV29', side: 'center', seconds: 40 },
    ]);
  });

  it('repeats the full step list for each round, tagging each segment with its 1-based round', () => {
    const steps = [{ acupointId: 'GV29', seconds: 40 }];
    expect(buildGuideSegments(steps, lookup, 3)).toEqual([
      { stepIndex: 0, round: 1, acupointId: 'GV29', side: 'center', seconds: 40 },
      { stepIndex: 0, round: 2, acupointId: 'GV29', side: 'center', seconds: 40 },
      { stepIndex: 0, round: 3, acupointId: 'GV29', side: 'center', seconds: 40 },
    ]);
  });

  it('produces no segments for zero rounds', () => {
    expect(buildGuideSegments([{ acupointId: 'GV29', seconds: 40 }], lookup, 0)).toEqual([]);
  });
});

describe('seekSegment', () => {
  const steps = [
    { acupointId: 'LI4', seconds: 60 },
    { acupointId: 'GV29', seconds: 40 },
  ];
  const segments = buildGuideSegments(steps, lookup, 2);

  it('jumps to the given index, resetting elapsed and finished', () => {
    expect(seekSegment({ index: 0, elapsed: 20, finished: false }, segments, 3)).toEqual({ index: 3, elapsed: 0, finished: false });
  });

  it('clamps an index below zero to the first segment', () => {
    expect(seekSegment({ index: 2, elapsed: 5, finished: true }, segments, -1)).toEqual({ index: 0, elapsed: 0, finished: false });
  });

  it('clamps an index past the end to the last segment', () => {
    expect(seekSegment({ index: 0, elapsed: 0, finished: false }, segments, 99)).toEqual({ index: segments.length - 1, elapsed: 0, finished: false });
  });
});

describe('nextSegmentIndex / previousSegmentIndex', () => {
  // LI4 is sequential (left/right), GV29 and EX-HN5 are single-segment steps.
  const steps = [
    { acupointId: 'LI4', seconds: 60 },
    { acupointId: 'GV29', seconds: 40 },
    { acupointId: 'EX-HN5', seconds: 30 },
  ];
  const segments = buildGuideSegments(steps, lookup, 2);
  // index: 0 LI4 left r1, 1 LI4 right r1, 2 GV29 r1, 3 EX-HN5 r1,
  //        4 LI4 left r2, 5 LI4 right r2, 6 GV29 r2, 7 EX-HN5 r2

  it('moves from either side of a sequential point to the first segment of the next step', () => {
    expect(nextSegmentIndex({ index: 0, elapsed: 0, finished: false }, segments)).toBe(2);
    expect(nextSegmentIndex({ index: 1, elapsed: 0, finished: false }, segments)).toBe(2);
  });

  it('crosses into the next round from the last step of the current round', () => {
    expect(nextSegmentIndex({ index: 3, elapsed: 0, finished: false }, segments)).toBe(4);
  });

  it('returns null when already on the last step of the last round', () => {
    expect(nextSegmentIndex({ index: 7, elapsed: 0, finished: false }, segments)).toBeNull();
  });

  it('returns null for an empty segment list', () => {
    expect(nextSegmentIndex({ index: 0, elapsed: 0, finished: false }, [])).toBeNull();
  });

  it('restarts the current step when elapsed time has passed', () => {
    expect(previousSegmentIndex({ index: 2, elapsed: 5, finished: false }, segments)).toBe(2);
  });

  it('restarts the current step from its right side even at elapsed 0', () => {
    expect(previousSegmentIndex({ index: 1, elapsed: 0, finished: false }, segments)).toBe(0);
  });

  it('moves to the first segment of the previous step at elapsed 0 on the step\'s first segment', () => {
    expect(previousSegmentIndex({ index: 2, elapsed: 0, finished: false }, segments)).toBe(0);
    expect(previousSegmentIndex({ index: 3, elapsed: 0, finished: false }, segments)).toBe(2);
  });

  it('crosses back into the previous round from the first step of the current round', () => {
    expect(previousSegmentIndex({ index: 4, elapsed: 0, finished: false }, segments)).toBe(3);
  });

  it('returns null when already on the first segment of the first step of the first round, at zero elapsed', () => {
    expect(previousSegmentIndex({ index: 0, elapsed: 0, finished: false }, segments)).toBeNull();
  });

  it('restarts the first step in place, rather than returning null, once elapsed time has passed', () => {
    expect(previousSegmentIndex({ index: 0, elapsed: 5, finished: false }, segments)).toBe(0);
  });

  it('returns null for an empty segment list', () => {
    expect(previousSegmentIndex({ index: 0, elapsed: 0, finished: false }, [])).toBeNull();
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

  it('never reports negative time at an exact cycle boundary', () => {
    expect(rhythmAt(70, 70, 5, 2)).toEqual({ phase: 'press', secondsLeftInPhase: 0, pressNumber: 10, pressCount: 10 });
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
