import type { UserRoutine } from '@ggookggook/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SqlDatabase } from './db';
import { migrate } from './migrate';
import { deleteUserRoutine, getUserRoutine, listUserRoutines, saveUserRoutine } from './user-routines';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

const routine = (id: string, overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id,
  name: '아침 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }],
  sourceSymptomId: null,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

describe('saveUserRoutine / getUserRoutine', () => {
  it('round-trips a routine', async () => {
    await saveUserRoutine(db, routine('r1'), new Date('2026-09-28T00:00:00.000Z'));
    expect(await getUserRoutine(db, 'r1')).toEqual(routine('r1'));
    expect(await getUserRoutine(db, 'missing')).toBeNull();
  });

  it('round-trips a routine sourced from a symptom', async () => {
    await saveUserRoutine(db, routine('r1', { sourceSymptomId: 'headache' }), new Date('2026-09-28T00:00:00.000Z'));
    expect((await getUserRoutine(db, 'r1'))?.sourceSymptomId).toBe('headache');
  });

  it('upserts and bumps updated_at while keeping created_at', async () => {
    await saveUserRoutine(db, routine('r1'), new Date('2026-09-28T00:00:00.000Z'));
    await saveUserRoutine(
      db,
      { ...routine('r1'), name: '저녁 루틴', steps: [{ acupointId: 'ST36', seconds: 90 }] },
      new Date('2026-09-29T00:00:00.000Z'),
    );
    const saved = await getUserRoutine(db, 'r1');
    expect(saved?.name).toBe('저녁 루틴');
    expect(saved?.steps).toEqual([{ acupointId: 'ST36', seconds: 90 }]);
    expect(saved?.createdAt).toBe('2026-09-28T00:00:00.000Z');
    expect(saved?.updatedAt).toBe('2026-09-29T00:00:00.000Z');
  });

  it('does not resurrect a soft-deleted row: a later save while deleted stays deleted', async () => {
    await saveUserRoutine(db, routine('r1'), new Date('2026-09-28T00:00:00.000Z'));
    await deleteUserRoutine(db, 'r1', new Date('2026-09-29T00:00:00.000Z'));

    // A stale save (e.g. an in-flight edit that lands after the routine was deleted
    // elsewhere) must not bring the row back with deleted_at cleared.
    await saveUserRoutine(
      db,
      { ...routine('r1'), name: '저녁 루틴' },
      new Date('2026-09-30T00:00:00.000Z'),
    );

    const saved = await getUserRoutine(db, 'r1');
    expect(saved?.deletedAt).toBe('2026-09-29T00:00:00.000Z');
    expect(saved?.name).toBe('아침 루틴');
    expect(saved?.updatedAt).toBe('2026-09-29T00:00:00.000Z');
  });

  it('parses steps JSON defensively, logging and returning an empty array on bad data', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await db.runAsync(
      "INSERT INTO user_routines (id, name, steps, source_symptom_id, created_at, updated_at, deleted_at) VALUES ('bad', 'name', 'not json', NULL, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z', NULL)",
      [],
    );
    const saved = await getUserRoutine(db, 'bad');
    expect(saved?.steps).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('rejects a JSON array of malformed step objects, logging and returning an empty array', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const malformed = JSON.stringify([{ acupointId: 123, seconds: 'sixty' }, { acupointId: 'LI4' }]);
    await db.runAsync(
      'INSERT INTO user_routines (id, name, steps, source_symptom_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, NULL, ?, ?, NULL)',
      ['malformed', 'name', malformed, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'],
    );
    const saved = await getUserRoutine(db, 'malformed');
    expect(saved?.steps).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('listUserRoutines', () => {
  it('lists routines that are not deleted, newest updated first', async () => {
    await saveUserRoutine(db, routine('old'), new Date('2026-09-27T00:00:00.000Z'));
    await saveUserRoutine(db, routine('new'), new Date('2026-09-28T00:00:00.000Z'));
    expect((await listUserRoutines(db)).map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('excludes soft-deleted routines', async () => {
    await saveUserRoutine(db, routine('a'), new Date('2026-09-28T00:00:00.000Z'));
    await saveUserRoutine(db, routine('b'), new Date('2026-09-28T00:00:00.000Z'));
    await deleteUserRoutine(db, 'a', new Date('2026-09-28T00:01:00.000Z'));
    expect((await listUserRoutines(db)).map((r) => r.id)).toEqual(['b']);
  });
});

describe('deleteUserRoutine', () => {
  it('soft-deletes a routine, setting deleted_at and bumping updated_at', async () => {
    await saveUserRoutine(db, routine('r1'), new Date('2026-09-28T00:00:00.000Z'));
    await deleteUserRoutine(db, 'r1', new Date('2026-09-29T00:00:00.000Z'));
    const saved = await getUserRoutine(db, 'r1');
    expect(saved?.deletedAt).toBe('2026-09-29T00:00:00.000Z');
    expect(saved?.updatedAt).toBe('2026-09-29T00:00:00.000Z');
  });
});
