import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { getSymptomRepeat, getValue, setSymptomRepeat, setValue } from './kv';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('getValue / setValue', () => {
  it('returns null for a key that was never set', async () => {
    expect(await getValue(db, 'missing')).toBeNull();
  });

  it('round-trips a value', async () => {
    await setValue(db, 'a', 'hello', new Date('2026-09-28T00:00:00.000Z'));
    expect(await getValue(db, 'a')).toBe('hello');
  });

  it('overwrites an existing value', async () => {
    await setValue(db, 'a', 'first', new Date('2026-09-28T00:00:00.000Z'));
    await setValue(db, 'a', 'second', new Date('2026-09-29T00:00:00.000Z'));
    expect(await getValue(db, 'a')).toBe('second');
  });
});

describe('getSymptomRepeat / setSymptomRepeat', () => {
  it('defaults to 1 when nothing is saved for a symptom', async () => {
    expect(await getSymptomRepeat(db, 'headache')).toBe(1);
  });

  it('round-trips a saved repeat, keyed per symptom', async () => {
    await setSymptomRepeat(db, 'headache', 3, new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(3);
    expect(await getSymptomRepeat(db, 'food_stagnation')).toBe(1);
  });

  it('overwrites a previously saved repeat for the same symptom', async () => {
    await setSymptomRepeat(db, 'headache', 2, new Date('2026-09-28T00:00:00.000Z'));
    await setSymptomRepeat(db, 'headache', 5, new Date('2026-09-29T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(5);
  });

  it('falls back to 1 for a stored value outside 1-5', async () => {
    await setValue(db, 'repeat:headache', '9', new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(1);
  });

  it('falls back to 1 for a non-numeric stored value', async () => {
    await setValue(db, 'repeat:headache', 'not a number', new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(1);
  });

  it('clamps a repeat above 5 down to 5 on write', async () => {
    await setSymptomRepeat(db, 'headache', 9, new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(5);
  });

  it('clamps a repeat below 1 up to 1 on write', async () => {
    await setSymptomRepeat(db, 'headache', 0, new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(1);
  });

  it('rounds a non-integer repeat to the nearest whole number on write', async () => {
    await setSymptomRepeat(db, 'headache', 2.6, new Date('2026-09-28T00:00:00.000Z'));
    expect(await getSymptomRepeat(db, 'headache')).toBe(3);
  });
});
