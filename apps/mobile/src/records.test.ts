import type { SessionLog } from '@ggookggook/shared';
import type { RoutineStats } from '@ggookggook/store';
import {
  calendarDays,
  calendarWeekdayLabels,
  recordMinutes,
  recordsWindowStart,
  startOfWeek,
  thisAndLastWeek,
  topRoutines,
} from './records';

// A fixed anchor so every test is deterministic regardless of the real clock: 2026-09-28 is a
// Monday, so the surrounding week (Mon 09-28 .. Sun 10-04) and the day before it (Sun 09-27)
// give known weekday boundaries to assert against.
const THURSDAY = new Date(2026, 9, 1, 15, 30); // Thu 2026-10-01, 15:30 local

const log = (id: string, completedAt: Date, overrides: Partial<SessionLog> = {}): SessionLog => ({
  id,
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: completedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationSeconds: 240,
  feedback: null,
  ...overrides,
});

describe('startOfWeek', () => {
  it('returns Monday 00:00 local for a weekday later in the same week', () => {
    expect(startOfWeek(THURSDAY)).toEqual(new Date(2026, 8, 28));
  });

  it('returns the same Monday for Monday itself', () => {
    expect(startOfWeek(new Date(2026, 8, 28, 0, 0))).toEqual(new Date(2026, 8, 28));
  });

  it('returns the same Monday for Sunday, the last day of that week', () => {
    expect(startOfWeek(new Date(2026, 9, 4, 23, 59))).toEqual(new Date(2026, 8, 28));
  });
});

describe('recordsWindowStart', () => {
  it('returns local midnight 27 days before now, so the window covers 28 calendar days total', () => {
    expect(recordsWindowStart(THURSDAY)).toEqual(new Date(2026, 8, 4));
  });
});

describe('calendarDays', () => {
  it('returns 28 days, oldest first, ending on the local day of `now`', () => {
    const days = calendarDays([], THURSDAY);
    expect(days).toHaveLength(28);
    expect(days[0]!.date).toEqual(new Date(2026, 8, 4));
    expect(days[27]!.date).toEqual(new Date(2026, 9, 1));
  });

  it('buckets sessions by local day, counting multiple sessions and flagging a 나아졌어요 day', () => {
    const days = calendarDays(
      [
        log('a', new Date(2026, 9, 1, 9, 0)),
        log('b', new Date(2026, 9, 1, 20, 0), { feedback: 'better' }),
        log('c', new Date(2026, 8, 30, 8, 0), { feedback: 'same' }),
      ],
      THURSDAY,
    );
    const today = days[27]!;
    expect(today.count).toBe(2);
    expect(today.hasBetter).toBe(true);
    const yesterday = days[26]!;
    expect(yesterday.count).toBe(1);
    expect(yesterday.hasBetter).toBe(false);
    expect(days[0]!.count).toBe(0);
  });

  it('ignores a session outside the 28-day window', () => {
    const days = calendarDays([log('old', new Date(2026, 7, 1))], THURSDAY);
    expect(days.every((day) => day.count === 0)).toBe(true);
  });
});

describe('calendarWeekdayLabels', () => {
  it('rotates so the last label is always the weekday of `now`', () => {
    expect(calendarWeekdayLabels(THURSDAY)).toEqual(['금', '토', '일', '월', '화', '수', '목']);
  });

  it('reads in the familiar 월..일 order when `now` is a Sunday', () => {
    expect(calendarWeekdayLabels(new Date(2026, 9, 4))).toEqual(['월', '화', '수', '목', '금', '토', '일']);
  });
});

describe('thisAndLastWeek', () => {
  it('splits sessions into this week (Monday through now) and last week (the prior Monday-Sunday)', () => {
    const { thisWeek, lastWeek } = thisAndLastWeek(
      [
        log('this-1', new Date(2026, 8, 29, 10, 0), { durationSeconds: 120 }),
        log('this-2', new Date(2026, 9, 1, 9, 0), { durationSeconds: 60 }),
        log('last-1', new Date(2026, 8, 25, 10, 0), { durationSeconds: 300 }),
        log('too-old', new Date(2026, 8, 20, 10, 0), { durationSeconds: 999 }),
      ],
      THURSDAY,
    );
    expect(thisWeek).toEqual({ count: 2, totalSeconds: 180 });
    expect(lastWeek).toEqual({ count: 1, totalSeconds: 300 });
  });

  it('excludes a session that falls exactly at the boundary between last week and this week', () => {
    const { thisWeek, lastWeek } = thisAndLastWeek([log('boundary', new Date(2026, 8, 28, 0, 0))], THURSDAY);
    expect(thisWeek.count).toBe(1);
    expect(lastWeek.count).toBe(0);
  });

  it('returns zeros for both weeks when there are no sessions', () => {
    expect(thisAndLastWeek([], THURSDAY)).toEqual({ thisWeek: { count: 0, totalSeconds: 0 }, lastWeek: { count: 0, totalSeconds: 0 } });
  });
});

describe('topRoutines', () => {
  const stats = (ref: RoutineStats['ref'], completedCount: number, better: number): RoutineStats => ({
    ref,
    completedCount,
    totalSeconds: completedCount * 60,
    feedbackCounts: { better, same: 0, worse: 0 },
  });

  it('sorts by completed count descending and carries the better count, never a ratio', () => {
    const result = topRoutines(
      [
        stats({ kind: 'symptom', symptomId: 'headache' }, 2, 1),
        stats({ kind: 'user', routineId: 'r1' }, 5, 2),
        stats({ kind: 'symptom', symptomId: 'insomnia' }, 3, 0),
      ],
      10,
    );
    expect(result).toEqual([
      { ref: { kind: 'user', routineId: 'r1' }, count: 5, totalSeconds: 300, betterCount: 2 },
      { ref: { kind: 'symptom', symptomId: 'insomnia' }, count: 3, totalSeconds: 180, betterCount: 0 },
      { ref: { kind: 'symptom', symptomId: 'headache' }, count: 2, totalSeconds: 120, betterCount: 1 },
    ]);
  });

  it('respects the limit', () => {
    const result = topRoutines(
      [stats({ kind: 'symptom', symptomId: 'a' }, 1, 0), stats({ kind: 'symptom', symptomId: 'b' }, 2, 0)],
      1,
    );
    expect(result).toEqual([{ ref: { kind: 'symptom', symptomId: 'b' }, count: 2, totalSeconds: 120, betterCount: 0 }]);
  });

  it('tie-breaks equal counts deterministically by ref', () => {
    const result = topRoutines(
      [stats({ kind: 'symptom', symptomId: 'b' }, 1, 0), stats({ kind: 'symptom', symptomId: 'a' }, 1, 0)],
      10,
    );
    expect(result.map((r) => r.ref)).toEqual([{ kind: 'symptom', symptomId: 'a' }, { kind: 'symptom', symptomId: 'b' }]);
  });
});

describe('recordMinutes', () => {
  it('rounds to the nearest minute', () => {
    expect(recordMinutes(90)).toBe(2);
    expect(recordMinutes(89)).toBe(1);
    expect(recordMinutes(120)).toBe(2);
  });

  it('shows at least 1분 for any nonzero duration', () => {
    expect(recordMinutes(1)).toBe(1);
    expect(recordMinutes(29)).toBe(1);
  });

  it('shows 0 for a zero duration', () => {
    expect(recordMinutes(0)).toBe(0);
  });
});
