import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

describe('migrate', () => {
  it('creates the schema once and is idempotent', async () => {
    const db = openTestDb();
    expect(await migrate(db)).toBe(2);
    expect(await migrate(db)).toBe(2);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(['favorites', 'kv', 'sessions', 'user_routines']);
  });

  it('upgrades a v1 database that already has a session row, keeping it intact', async () => {
    const db = openTestDb();
    await db.execAsync(`
      CREATE TABLE kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        routine_kind TEXT NOT NULL CHECK (routine_kind IN ('symptom', 'user')),
        routine_ref TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_seconds INTEGER NOT NULL,
        feedback TEXT CHECK (feedback IN ('better', 'same', 'worse'))
      );
      CREATE INDEX sessions_completed_at ON sessions (completed_at);
      PRAGMA user_version = 1;
    `);
    await db.runAsync(
      "INSERT INTO sessions (id, routine_kind, routine_ref, started_at, completed_at, duration_seconds, feedback) VALUES ('a', 'symptom', 'headache', '2026-09-28T00:00:00.000Z', '2026-09-28T00:04:00.000Z', 240, NULL)",
      [],
    );

    expect(await migrate(db)).toBe(2);

    const session = await db.getFirstAsync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', ['a']);
    expect(session?.id).toBe('a');

    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(['favorites', 'kv', 'sessions', 'user_routines']);
  });
});
