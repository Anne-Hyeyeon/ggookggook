import type { SessionLog } from '@ggookggook/shared';
import type { RoutineStats } from '@ggookggook/store';
import { CALENDAR_WEEKDAYS, calendarDays, recordMinutes, recordsWindowStart, startOfWeek, thisAndLastWeek, topRoutines } from './records';

// A fixed anchor so every test is deterministic regardless of the real clock: 2026-09-28 is a
// Monday, so the surrounding week (Mon 09-28 .. Sun 10-04) and the day before it (Sun 09-27)
// give known weekday boundaries to assert against.
const THURSDAY = new Date(2026, 9, 1, 15, 30); // Thu 2026-10-01, 15:30 local
const MONDAY = new Date(2026, 8, 28, 8, 0); // Mon 2026-09-28, 08:00 local (start of THURSDAY's week)
const SUNDAY = new Date(2026, 9, 4, 20, 0); // Sun 2026-10-04, 20:00 local (end of THURSDAY's week)

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
  it('returns the calendar grid\'s first row (21 days before the start of this week)', () => {
    expect(recordsWindowStart(THURSDAY)).toEqual(new Date(2026, 8, 7));
  });

  it('matches calendarDays\'s first day exactly, so 자주 한 루틴 and the calendar share one window', () => {
    expect(recordsWindowStart(THURSDAY)).toEqual(calendarDays([], THURSDAY)[0]!.date);
  });
});

describe('CALENDAR_WEEKDAYS', () => {
  it('is the fixed Monday-first header, independent of `now`', () => {
    expect(CALENDAR_WEEKDAYS).toEqual(['월', '화', '수', '목', '금', '토', '일']);
  });
});

describe('calendarDays', () => {
  it('returns 28 days (4 full Monday..Sunday weeks), oldest first, the last row being the week containing `now`', () => {
    const days = calendarDays([], THURSDAY);
    expect(days).toHaveLength(28);
    expect(days[0]!.date).toEqual(new Date(2026, 8, 7)); // 3 Mondays before THURSDAY's week
    expect(days[21]!.date).toEqual(new Date(2026, 8, 28)); // Monday of THURSDAY's own week
  });

  it('renders every day up to and including `now` as real, and nothing after it', () => {
    const days = calendarDays([], THURSDAY); // Thursday: index 24 of the grid
    expect(days.slice(0, 25).every((day) => day !== null)).toBe(true);
    expect(days.slice(25)).toEqual([null, null, null]);
    expect(days[24]!.isToday).toBe(true);
    expect(days.filter((day) => day?.isToday).length).toBe(1);
  });

  it('renders every day as real, no blanks, when `now` is a Sunday (the last day of its week)', () => {
    const days = calendarDays([], SUNDAY);
    expect(days.every((day) => day !== null)).toBe(true);
    expect(days[27]!.date).toEqual(new Date(2026, 9, 4));
    expect(days[27]!.isToday).toBe(true);
  });

  it('renders only today as real and the rest of the current week as blank, when `now` is a Monday', () => {
    const days = calendarDays([], MONDAY);
    expect(days[21]!.date).toEqual(new Date(2026, 8, 28));
    expect(days[21]!.isToday).toBe(true);
    expect(days.slice(22)).toEqual([null, null, null, null, null, null]);
  });

  it('buckets sessions by local day across a month boundary, counting multiple sessions and flagging a 나아졌어요 day', () => {
    const days = calendarDays(
      [
        log('a', new Date(2026, 9, 1, 9, 0)),
        log('b', new Date(2026, 9, 1, 20, 0), { feedback: 'better' }),
        log('c', new Date(2026, 8, 30, 8, 0), { feedback: 'same' }),
      ],
      THURSDAY,
    );
    const today = days[24]!; // Thu 2026-10-01
    expect(today.count).toBe(2);
    expect(today.hasBetter).toBe(true);
    const yesterday = days[23]!; // Wed 2026-09-30
    expect(yesterday.count).toBe(1);
    expect(yesterday.hasBetter).toBe(false);
    expect(days[0]!.count).toBe(0);
  });

  it('ignores a session outside the calendar window', () => {
    const days = calendarDays([log('old', new Date(2026, 7, 1))], THURSDAY);
    expect(days.every((day) => day === null || day.count === 0)).toBe(true);
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

describe('calendar day stepping across a DST transition', () => {
  const originalTZ = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it('keeps every grid day at local midnight, not shifted by a fixed 24h step', () => {
    process.env.TZ = 'America/New_York';
    // The grid for this `now` spans Feb 23 - Mar 22 2026, which crosses the US spring-forward
    // transition (Mar 8 2026, clocks jump 2am -> 3am, a 23-hour day). Stepping by a fixed
    // 24h offset instead of by calendar day would land the days after it at 01:00, not 00:00.
    const now = new Date(2026, 2, 20, 12, 0);
    const days = calendarDays([], now);
    for (const day of days) {
      if (day === null) continue;
      expect(day.date.getHours()).toBe(0);
    }
  });
});
