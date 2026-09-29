import { DEFAULT_REMINDER_ROUTINE, DEFAULT_SETTINGS, type Reminder } from '@ggookggook/shared';
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

  it('round-trips getReadyEnabled turned off', async () => {
    const settings = { ...DEFAULT_SETTINGS, getReadyEnabled: false };
    await saveSettings(db, settings, new Date('2026-09-28T00:00:00Z'));
    expect(await loadSettings(db)).toEqual(settings);
  });

  it('falls back to getReadyEnabled default when the stored value is mistyped', async () => {
    await setValue(db, 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, getReadyEnabled: 'no' }), new Date());
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when the stored value is not JSON', async () => {
    await setValue(db, 'settings', 'not json', new Date());
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores a JSON array and falls back to defaults', async () => {
    await setValue(db, 'settings', JSON.stringify([1, 2, 3]), new Date());
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps an out-of-range pressSeconds and restSeconds to the nearest bound', async () => {
    await setValue(db, 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, pressSeconds: 20, restSeconds: 0 }), new Date());
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, pressSeconds: 10, restSeconds: 1 });
  });

  it('rounds a fractional pressSeconds and restSeconds to the nearest integer', async () => {
    await setValue(db, 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, pressSeconds: 6.6, restSeconds: 2.4 }), new Date());
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, pressSeconds: 7, restSeconds: 2 });
  });

  describe('reminder', () => {
    const reminder: Reminder = { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } };

    it('round-trips a saved reminder', async () => {
      const settings = { ...DEFAULT_SETTINGS, reminder };
      await saveSettings(db, settings, new Date('2026-09-28T00:00:00Z'));
      expect(await loadSettings(db)).toEqual(settings);
    });

    it('round-trips a reminder pointing at a user routine', async () => {
      const userReminder: Reminder = { ...reminder, routine: { kind: 'user', id: 'r1' } };
      await saveSettings(db, { ...DEFAULT_SETTINGS, reminder: userReminder }, new Date());
      expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, reminder: userReminder });
    });

    it('clamps an out-of-range hour and minute, and snaps minute to the nearest 10-minute step', async () => {
      await setValue(
        db,
        'settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, reminder: { ...reminder, hour: 30, minute: -5 } }),
        new Date(),
      );
      expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, reminder: { ...reminder, hour: 23, minute: 0 } });
    });

    it('rounds a minute between two 10-minute steps to the nearest one', async () => {
      await setValue(
        db,
        'settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, reminder: { ...reminder, minute: 24 } }),
        new Date(),
      );
      expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, reminder: { ...reminder, minute: 20 } });
    });

    it('falls back to the default symptom routine when the stored routine has a bad shape', async () => {
      await setValue(
        db,
        'settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, reminder: { ...reminder, routine: { kind: 'nope', id: 'x' } } }),
        new Date(),
      );
      expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, reminder: { ...reminder, routine: DEFAULT_REMINDER_ROUTINE } });
    });

    it('falls back to no reminder when enabled, hour, or minute is missing or mistyped', async () => {
      await setValue(db, 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, reminder: { hour: 15, minute: 0 } }), new Date());
      expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);

      await setValue(
        db,
        'settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, reminder: { ...reminder, hour: '15' } }),
        new Date(),
      );
      expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
    });

    it('falls back to no reminder when the stored reminder is not an object', async () => {
      await setValue(db, 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, reminder: 'on' }), new Date());
      expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
    });
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
