import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { openTestDb } from './test-db';

describe('migrate', () => {
  it('creates the schema once and is idempotent', async () => {
    const db = openTestDb();
    expect(await migrate(db)).toBe(3);
    expect(await migrate(db)).toBe(3);
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

    expect(await migrate(db)).toBe(3);

    const session = await db.getFirstAsync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', ['a']);
    expect(session?.id).toBe('a');

    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(['favorites', 'kv', 'sessions', 'user_routines']);
  });

  it('upgrades a v2 database that already has a user routine, defaulting its repeat to 1', async () => {
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
      CREATE TABLE user_routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        steps TEXT NOT NULL,
        source_symptom_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX user_routines_updated_at ON user_routines (updated_at);
      CREATE TABLE favorites (
        acupoint_id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      PRAGMA user_version = 2;
    `);
    await db.runAsync(
      "INSERT INTO user_routines (id, name, steps, source_symptom_id, created_at, updated_at, deleted_at) VALUES ('r1', '아침 루틴', '[]', NULL, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z', NULL)",
      [],
    );

    expect(await migrate(db)).toBe(3);

    const row = await db.getFirstAsync<{ id: string; repeat: number }>('SELECT id, repeat FROM user_routines WHERE id = ?', ['r1']);
    expect(row).toEqual({ id: 'r1', repeat: 1 });
  });
});
