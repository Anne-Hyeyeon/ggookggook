import type { SqlDatabase } from './db';

const MIGRATIONS: readonly string[] = [
  `
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
  `,
];

export async function migrate(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw error;
    }
    version += 1;
  }
  return version;
}
