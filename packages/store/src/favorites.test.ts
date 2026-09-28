import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { isFavorite, listFavorites, setFavorite } from './favorites';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('setFavorite / isFavorite', () => {
  it('is not a favorite until set', async () => {
    expect(await isFavorite(db, 'LI4')).toBe(false);
  });

  it('marks an acupoint as favorite', async () => {
    await setFavorite(db, 'LI4', true, new Date('2026-09-28T00:00:00.000Z'));
    expect(await isFavorite(db, 'LI4')).toBe(true);
  });

  it('soft-deletes on unfavorite and restores on re-favorite', async () => {
    await setFavorite(db, 'LI4', true, new Date('2026-09-28T00:00:00.000Z'));
    await setFavorite(db, 'LI4', false, new Date('2026-09-28T01:00:00.000Z'));
    expect(await isFavorite(db, 'LI4')).toBe(false);

    await setFavorite(db, 'LI4', true, new Date('2026-09-28T02:00:00.000Z'));
    expect(await isFavorite(db, 'LI4')).toBe(true);
  });

  it('keeps created_at across unfavorite/re-favorite and bumps updated_at', async () => {
    await setFavorite(db, 'LI4', true, new Date('2026-09-28T00:00:00.000Z'));
    await setFavorite(db, 'LI4', false, new Date('2026-09-28T01:00:00.000Z'));
    await setFavorite(db, 'LI4', true, new Date('2026-09-28T02:00:00.000Z'));
    const [favorite] = await listFavorites(db);
    expect(favorite).toEqual({
      acupointId: 'LI4',
      createdAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-28T02:00:00.000Z',
      deletedAt: null,
    });
  });
});

describe('listFavorites', () => {
  it('lists favorites that are not deleted', async () => {
    await setFavorite(db, 'LI4', true, new Date('2026-09-28T00:00:00.000Z'));
    await setFavorite(db, 'ST36', true, new Date('2026-09-28T00:01:00.000Z'));
    await setFavorite(db, 'SP6', true, new Date('2026-09-28T00:02:00.000Z'));
    await setFavorite(db, 'ST36', false, new Date('2026-09-28T00:03:00.000Z'));
    expect((await listFavorites(db)).map((f) => f.acupointId).sort()).toEqual(['LI4', 'SP6']);
  });
});
