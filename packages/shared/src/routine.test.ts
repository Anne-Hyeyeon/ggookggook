import { describe, expect, it } from 'vitest';
import type { Acupoint } from './content';
import type { AcupointLookup } from './routine';
import { routineDurationSeconds, routineMinutes, stepDurationSeconds, stepsForPregnancy } from './routine';

const lookup: AcupointLookup = new Map<string, Pick<Acupoint, 'sides' | 'cautions'>>([
  ['LI4', { sides: 'sequential', cautions: ['pregnancy'] }],
  ['GV29', { sides: 'single', cautions: [] }],
  ['EX-HN5', { sides: 'together', cautions: [] }],
]);

describe('stepDurationSeconds', () => {
  it('doubles sequential points because each side gets the full time', () => {
    expect(stepDurationSeconds({ acupointId: 'LI4', seconds: 60 }, { sides: 'sequential' })).toBe(120);
  });

  it('keeps single and together points as is', () => {
    expect(stepDurationSeconds({ acupointId: 'GV29', seconds: 60 }, { sides: 'single' })).toBe(60);
    expect(stepDurationSeconds({ acupointId: 'EX-HN5', seconds: 60 }, { sides: 'together' })).toBe(60);
  });
});

describe('routineDurationSeconds', () => {
  it('sums every step', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'EX-HN5', seconds: 60 },
      { acupointId: 'GV29', seconds: 30 },
    ];
    expect(routineDurationSeconds(steps, lookup)).toBe(210);
  });

  it('throws on an unknown acupoint', () => {
    expect(() => routineDurationSeconds([{ acupointId: 'ST36', seconds: 60 }], lookup)).toThrow('ST36');
  });
});

describe('routineMinutes', () => {
  it('rounds up to whole minutes with a floor of 1', () => {
    expect(routineMinutes(240)).toBe(4);
    expect(routineMinutes(150)).toBe(3);
    expect(routineMinutes(30)).toBe(1);
  });
});

describe('stepsForPregnancy', () => {
  it('drops steps whose acupoint is contraindicated in pregnancy', () => {
    const steps = [
      { acupointId: 'LI4', seconds: 60 },
      { acupointId: 'GV29', seconds: 60 },
    ];
    expect(stepsForPregnancy(steps, lookup)).toEqual([{ acupointId: 'GV29', seconds: 60 }]);
  });
});
