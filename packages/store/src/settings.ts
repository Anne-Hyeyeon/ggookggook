import { DEFAULT_SETTINGS, type Settings } from '@ggookggook/shared';
import type { SqlDatabase } from './db';
import { getValue, setValue } from './kv';

const SETTINGS_KEY = 'settings';
const DISCLAIMER_KEY = 'disclaimerAcceptedAt';

function parse(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function loadSettings(db: SqlDatabase): Promise<Settings> {
  const stored = parse(await getValue(db, SETTINGS_KEY));
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = stored[key];
    if (typeof value === typeof DEFAULT_SETTINGS[key]) (settings as Record<keyof Settings, unknown>)[key] = value;
  }
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
