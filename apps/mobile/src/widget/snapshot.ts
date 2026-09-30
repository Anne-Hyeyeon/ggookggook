import { suggestFor, type SessionLog, type Symptom, type UserRoutine } from '@ggookggook/shared';
import { isRecord } from '@/isRecord';
import { isUserRoutineUsable, type RoutineRef } from '@/routines';

export const WIDGET_SCHEME = 'ggookggook';

export interface WidgetEntry {
  ref: RoutineRef;
  title: string;
  url: string;
}

// [fromHour, toHour) in local time; windows never wrap past midnight (23-05 is split in two).
export interface WidgetSuggestion extends WidgetEntry {
  fromHour: number;
  toHour: number;
}

export interface WidgetSnapshot {
  generatedAt: string;
  recent: WidgetEntry | null;
  suggestions: WidgetSuggestion[];
}

export interface WidgetSnapshotInput {
  now: Date;
  symptoms: readonly Symptom[];
  usage: Record<string, number>;
  recentSession: SessionLog | null;
  // The user routine the recent session points at, if it is a user routine session.
  recentUserRoutine: UserRoutine | null;
}

export function widgetUrl(ref: RoutineRef): string {
  const path = ref.kind === 'symptom' ? 'symptom' : 'routine';
  return `${WIDGET_SCHEME}://${path}/${encodeURIComponent(ref.id)}`;
}

function entry(ref: RoutineRef, title: string): WidgetEntry {
  return { ref, title, url: widgetUrl(ref) };
}

function resolveRecent(input: WidgetSnapshotInput): WidgetEntry | null {
  const session = input.recentSession;
  if (!session) return null;
  if (session.routine.kind === 'symptom') {
    const { symptomId } = session.routine;
    const symptom = input.symptoms.find((candidate) => candidate.id === symptomId);
    return symptom ? entry({ kind: 'symptom', id: symptom.id }, symptom.name) : null;
  }
  const routine = input.recentUserRoutine;
  if (!isUserRoutineUsable(routine) || routine.id !== session.routine.routineId) return null;
  return entry({ kind: 'user', id: routine.id }, routine.name);
}

// Evaluates the app's own suggestFor at every hour of `now`'s day, so the widget can pick the
// right one later without the app running, and merges neighbouring hours with the same pick.
function suggestionsByHour(input: WidgetSnapshotInput): WidgetSuggestion[] {
  const result: WidgetSuggestion[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const at = new Date(input.now);
    at.setHours(hour, 0, 0, 0);
    const symptom = suggestFor(at, input.symptoms, input.usage)[0];
    if (!symptom) continue;
    const previous = result[result.length - 1];
    if (previous && previous.toHour === hour && previous.ref.id === symptom.id) {
      previous.toHour = hour + 1;
      continue;
    }
    result.push({ ...entry({ kind: 'symptom', id: symptom.id }, symptom.name), fromHour: hour, toHour: hour + 1 });
  }
  return result;
}

export function buildWidgetSnapshot(input: WidgetSnapshotInput): WidgetSnapshot {
  return {
    generatedAt: input.now.toISOString(),
    recent: resolveRecent(input),
    suggestions: suggestionsByHour(input),
  };
}

export function suggestionAt(snapshot: WidgetSnapshot, hour: number): WidgetSuggestion | null {
  return snapshot.suggestions.find((suggestion) => hour >= suggestion.fromHour && hour < suggestion.toHour) ?? null;
}

// Timeline entry dates for the iOS widget: `now`, then each suggestion window start within
// the next `days` days, so WidgetKit re-renders when the suggestion should change.
export function widgetTimelineDates(now: Date, snapshot: WidgetSnapshot, days: number): Date[] {
  const dates = [now];
  const end = now.getTime() + days * 24 * 60 * 60 * 1000;
  for (let day = 0; day <= days; day += 1) {
    for (const suggestion of snapshot.suggestions) {
      const at = new Date(now);
      at.setDate(now.getDate() + day);
      at.setHours(suggestion.fromHour, 0, 0, 0);
      if (at.getTime() > now.getTime() && at.getTime() <= end) dates.push(at);
    }
  }
  return dates;
}

function parseRef(value: unknown): RoutineRef | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  if (value.kind === 'symptom') return { kind: 'symptom', id: value.id };
  if (value.kind === 'user') return { kind: 'user', id: value.id };
  return null;
}

function parseEntry(value: unknown): WidgetEntry | null {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.url !== 'string') return null;
  const ref = parseRef(value.ref);
  return ref ? { ref, title: value.title, url: value.url } : null;
}

function parseSuggestion(value: unknown): WidgetSuggestion | null {
  const parsed = parseEntry(value);
  if (!parsed || !isRecord(value) || typeof value.fromHour !== 'number' || typeof value.toHour !== 'number') return null;
  return { ...parsed, fromHour: value.fromHour, toHour: value.toHour };
}

// The Android widget reads the snapshot back from storage in a headless task: anything left by
// an older app version or otherwise malformed is dropped rather than rendered.
export function parseWidgetSnapshot(raw: string | null): WidgetSnapshot | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || Array.isArray(value)) return null;
  if (typeof value.generatedAt !== 'string' || !Array.isArray(value.suggestions)) return null;
  return {
    generatedAt: value.generatedAt,
    recent: parseEntry(value.recent),
    suggestions: value.suggestions.map(parseSuggestion).filter((s): s is WidgetSuggestion => s !== null),
  };
}
