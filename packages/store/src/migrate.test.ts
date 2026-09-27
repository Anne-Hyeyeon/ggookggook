import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

describe('migrate', () => {
  it('creates the schema once and is idempotent', async () => {
    const db = openTestDb();
    expect(await migrate(db)).toBe(1);
    expect(await migrate(db)).toBe(1);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(['kv', 'sessions']);
  });
});
