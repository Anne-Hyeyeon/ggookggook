import type { SessionLog, SessionRoutineRef } from '@ggookggook/shared';
import type { RoutineStats } from '@ggookggook/store';
import { localDayKey, localMidnight } from '@/format';

export interface WeekTotals {
  count: number;
  totalSeconds: number;
}

export interface CalendarDay {
  date: Date;
  count: number;
  hasBetter: boolean;
  isToday: boolean;
}

export interface TopRoutine {
  ref: SessionRoutineRef;
  count: number;
  totalSeconds: number;
  betterCount: number;
}

// Fixed Monday-first header for the 4-week calendar grid: unlike a rolling column order, a real calendar always reads 월..일.
export const CALENDAR_WEEKDAYS: readonly string[] = ['월', '화', '수', '목', '금', '토', '일'];

// Date constructor field overflow, not a fixed 24h offset, so a step across a DST transition still lands on local midnight.
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Monday-indexed weekday (0=월 ... 6=일), unlike Date#getDay's Sunday-indexed 0-6.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Monday 00:00 local of the week containing `now`.
export function startOfWeek(now: Date): Date {
  return addDays(localMidnight(now), -mondayIndex(localMidnight(now)));
}

// The calendar grid's first row; shared by the calendar and 자주 한 루틴's stats query, so the two never disagree on "recent".
export function recordsWindowStart(now: Date): Date {
  return addDays(startOfWeek(now), -21);
}

// 4 full Monday..Sunday rows, oldest first, ending in the week containing `now`; a day after `now` is `null`, not a zero-count day.
export function calendarDays(sessions: SessionLog[], now: Date): (CalendarDay | null)[] {
  const today = localMidnight(now);
  const gridStart = recordsWindowStart(now);
  const byDay = new Map<string, { count: number; hasBetter: boolean }>();
  for (const session of sessions) {
    const timestamp = session.completedAt ?? session.startedAt;
    const key = localDayKey(timestamp);
    const entry = byDay.get(key) ?? { count: 0, hasBetter: false };
    entry.count += 1;
    if (session.feedback === 'better') entry.hasBetter = true;
    byDay.set(key, entry);
  }
  const days: (CalendarDay | null)[] = [];
  for (let i = 0; i < 28; i++) {
    const date = addDays(gridStart, i);
    if (date.getTime() > today.getTime()) {
      days.push(null);
      continue;
    }
    const entry = byDay.get(localDayKey(date.toISOString())) ?? { count: 0, hasBetter: false };
    days.push({ date, count: entry.count, hasBetter: entry.hasBetter, isToday: date.getTime() === today.getTime() });
  }
  return days;
}

// Half-open [from, toExclusive): the boundary Monday shared between "지난주" and "이번 주" is never double-counted.
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

// "이번 주" = Monday 00:00 local through `now` itself; "지난주" = the previous Monday-Sunday week in full.
export function thisAndLastWeek(sessions: SessionLog[], now: Date): { thisWeek: WeekTotals; lastWeek: WeekTotals } {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  return {
    thisWeek: weekTotals(sessions, thisWeekStart, new Date(now.getTime() + 1)),
    lastWeek: weekTotals(sessions, lastWeekStart, thisWeekStart),
  };
}

// Shared with the records screen (for a stable list key), so the two never drift apart.
export function refKey(ref: SessionRoutineRef): string {
  return ref.kind === 'symptom' ? `symptom:${ref.symptomId}` : `user:${ref.routineId}`;
}

// The ref's own "나아졌어요" count (never a ratio): sorted by completed count descending, tie-broken by ref for a stable order.
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
