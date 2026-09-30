import type { SessionLog, SessionRoutineRef } from '@ggookggook/shared';
import type { RoutineStats } from '@ggookggook/store';

export interface WeekTotals {
  count: number;
  totalSeconds: number;
}

export interface CalendarDay {
  date: Date;
  count: number;
  hasBetter: boolean;
}

export interface TopRoutine {
  ref: SessionRoutineRef;
  count: number;
  totalSeconds: number;
  betterCount: number;
}

const DAY_MS = 86_400_000;
const WEEKDAY_KO_MONDAY_FIRST = ['월', '화', '수', '목', '금', '토', '일'];

function localMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Monday-indexed weekday (0=월 ... 6=일), unlike Date#getDay's Sunday-indexed 0-6.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Monday 00:00 local of the week containing `now`.
export function startOfWeek(now: Date): Date {
  const midnight = localMidnight(now);
  return new Date(midnight.getTime() - mondayIndex(midnight) * DAY_MS);
}

// The earliest timestamp the records screen needs to fetch: covers both the 28-day
// calendar and (since a week is 7 days) last week's totals, in a single query.
export function recordsWindowStart(now: Date): Date {
  return new Date(localMidnight(now).getTime() - 27 * DAY_MS);
}

// 28 local calendar days, oldest first, ending on `now`'s local day.
//
// The grid's columns roll with `now`'s weekday always last, rather than a fixed
// Monday-first layout: a fixed Mon..Sun grid can only end exactly on today, as a clean
// 4x7 rectangle with no dropped or blank days, when today happens to be a Sunday. Rolling
// the columns (see `calendarWeekdayLabels`, built from the same rotation) keeps every one
// of the 28 real days, with no padding, for any weekday `now` falls on.
export function calendarDays(sessions: SessionLog[], now: Date): CalendarDay[] {
  const today = localMidnight(now);
  const byDay = new Map<string, { count: number; hasBetter: boolean }>();
  for (const session of sessions) {
    const timestamp = new Date(session.completedAt ?? session.startedAt);
    const key = localDayKey(localMidnight(timestamp));
    const entry = byDay.get(key) ?? { count: 0, hasBetter: false };
    entry.count += 1;
    if (session.feedback === 'better') entry.hasBetter = true;
    byDay.set(key, entry);
  }
  const days: CalendarDay[] = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const entry = byDay.get(localDayKey(date)) ?? { count: 0, hasBetter: false };
    days.push({ date, count: entry.count, hasBetter: entry.hasBetter });
  }
  return days;
}

// `i` is always taken mod 7 by every caller, so this can never actually miss; the throw
// just keeps the return type `string` instead of `string | undefined`.
function requireWeekdayLabel(index: number): string {
  const label = WEEKDAY_KO_MONDAY_FIRST[index];
  if (label === undefined) throw new Error(`Invalid weekday index: ${index}`);
  return label;
}

// Weekday header labels for `calendarDays`' rolling column order: 7 labels, in column
// order, with the last one always `now`'s own weekday.
export function calendarWeekdayLabels(now: Date): string[] {
  const todayIndex = mondayIndex(localMidnight(now));
  return Array.from({ length: 7 }, (_, i) => requireWeekdayLabel((todayIndex + 1 + i) % 7));
}

// Half-open [from, toExclusive): callers pick `toExclusive` so a boundary instant (the
// Monday shared between "지난주" and "이번 주") is never double-counted.
function weekTotals(sessions: SessionLog[], from: Date, toExclusive: Date): WeekTotals {
  let count = 0;
  let totalSeconds = 0;
  for (const session of sessions) {
    const timestamp = new Date(session.completedAt ?? session.startedAt);
    if (timestamp >= from && timestamp < toExclusive) {
      count += 1;
      totalSeconds += session.durationSeconds;
    }
  }
  return { count, totalSeconds };
}

// "이번 주" = Monday 00:00 local of the current week through `now` (inclusive of the
// instant `now` itself); "지난주" = the previous Monday-Sunday week in full.
export function thisAndLastWeek(sessions: SessionLog[], now: Date): { thisWeek: WeekTotals; lastWeek: WeekTotals } {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * DAY_MS);
  return {
    thisWeek: weekTotals(sessions, thisWeekStart, new Date(now.getTime() + 1)),
    lastWeek: weekTotals(sessions, lastWeekStart, thisWeekStart),
  };
}

function refKey(ref: SessionRoutineRef): string {
  return ref.kind === 'symptom' ? `symptom:${ref.symptomId}` : `user:${ref.routineId}`;
}

// The routine ref's own "나아졌어요" count (never a ratio/percentage): sorted by
// completed count descending, tie-broken by ref for a deterministic order.
export function topRoutines(stats: RoutineStats[], limit: number): TopRoutine[] {
  return [...stats]
    .sort((a, b) => b.completedCount - a.completedCount || refKey(a.ref).localeCompare(refKey(b.ref)))
    .slice(0, limit)
    .map((stat) => ({ ref: stat.ref, count: stat.completedCount, totalSeconds: stat.totalSeconds, betterCount: stat.feedbackCounts.better }));
}

// Rounds to the nearest minute, but a nonzero duration never rounds down to "0분".
export function recordMinutes(totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.max(1, Math.round(totalSeconds / 60));
}
