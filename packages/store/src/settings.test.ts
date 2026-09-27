import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { setValue } from './kv';
import { migrate } from './migrate';
import { acceptDisclaimer, getDisclaimerAcceptedAt, loadSettings, saveSettings } from './settings';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('settings', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const settings = { ...DEFAULT_SETTINGS, pregnancyMode: true, pressSeconds: 6 };
    await saveSettings(db, settings, new Date('2026-09-28T00:00:00Z'));
    expect(await loadSettings(db)).toEqual(settings);
  });

  it('ignores unknown or mistyped keys and keeps defaults for them', async () => {
    await setValue(db, 'settings', JSON.stringify({ pregnancyMode: 'yes', rhythmHaptics: false, extra: 1 }), new Date());
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, rhythmHaptics: false });
  });

  it('falls back to defaults when the stored value is not JSON', async () => {
    await setValue(db, 'settings', 'not json', new Date());
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('disclaimer', () => {
  it('is unset until accepted', async () => {
    expect(await getDisclaimerAcceptedAt(db)).toBeNull();
    const at = await acceptDisclaimer(db, new Date('2026-09-28T01:02:03Z'));
    expect(at).toBe('2026-09-28T01:02:03.000Z');
    expect(await getDisclaimerAcceptedAt(db)).toBe(at);
  });
});
