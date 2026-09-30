import {
  APPEARANCE_VALUES,
  DEFAULT_REMINDER_ROUTINE,
  DEFAULT_SETTINGS,
  PRESS_SECONDS_MAX,
  PRESS_SECONDS_MIN,
  REMINDER_HOUR_MAX,
  REMINDER_HOUR_MIN,
  REMINDER_MINUTE_MAX,
  REMINDER_MINUTE_MIN,
  REMINDER_MINUTE_STEP,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  type Appearance,
  type Reminder,
  type ReminderRoutineRef,
  type Settings,
} from '@ggookggook/shared';
import type { SqlDatabase } from './db';
import { getValue, setValue } from './kv';

const SETTINGS_KEY = 'settings';
const DISCLAIMER_KEY = 'disclaimerAcceptedAt';

function parse(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampAppearance(value: unknown): Appearance {
  return APPEARANCE_VALUES.find((option) => option === value) ?? DEFAULT_SETTINGS.appearance;
}

function clampMinute(value: number): number {
  const clamped = clampInt(value, REMINDER_MINUTE_MIN, REMINDER_MINUTE_MAX);
  return Math.round(clamped / REMINDER_MINUTE_STEP) * REMINDER_MINUTE_STEP;
}

function sanitizeReminderRoutine(value: unknown): ReminderRoutineRef {
  if (typeof value === 'object' && value !== null) {
    const { kind, id } = value as Record<string, unknown>;
    if ((kind === 'symptom' || kind === 'user') && typeof id === 'string' && id.length > 0) {
      return { kind, id };
    }
  }
  return DEFAULT_REMINDER_ROUTINE;
}

// A malformed `routine` falls back to the default symptom rather than dropping the whole
// reminder: only a missing/mistyped `enabled`, `hour`, or `minute` is bad enough to fall back
// to no reminder at all (matching how the top-level keys below fall back to their defaults).
function sanitizeReminder(value: unknown): Reminder | null {
  if (typeof value !== 'object' || value === null) return null;
  const { enabled, hour, minute, routine } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean' || typeof hour !== 'number' || typeof minute !== 'number') return null;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return {
    enabled,
    hour: clampInt(hour, REMINDER_HOUR_MIN, REMINDER_HOUR_MAX),
    minute: clampMinute(minute),
    routine: sanitizeReminderRoutine(routine),
  };
}

export async function loadSettings(db: SqlDatabase): Promise<Settings> {
  const stored = parse(await getValue(db, SETTINGS_KEY));
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (key === 'reminder') continue;
    const value = stored[key];
    if (typeof value === typeof DEFAULT_SETTINGS[key]) (settings as Record<keyof Settings, unknown>)[key] = value;
  }
  settings.pressSeconds = clampInt(settings.pressSeconds, PRESS_SECONDS_MIN, PRESS_SECONDS_MAX);
  settings.restSeconds = clampInt(settings.restSeconds, REST_SECONDS_MIN, REST_SECONDS_MAX);
  settings.appearance = clampAppearance(settings.appearance);
  settings.reminder = sanitizeReminder(stored.reminder);
  return settings;
}

export async function saveSettings(db: SqlDatabase, settings: Settings, now: Date): Promise<void> {
  await setValue(db, SETTINGS_KEY, JSON.stringify(settings), now);
}

export async function getDisclaimerAcceptedAt(db: SqlDatabase): Promise<string | null> {
  return getValue(db, DISCLAIMER_KEY);
}

export async function acceptDisclaimer(db: SqlDatabase, now: Date): Promise<string> {
  const at = now.toISOString();
  await setValue(db, DISCLAIMER_KEY, at, now);
  return at;
}
