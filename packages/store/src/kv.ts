import type { SqlDatabase } from './db';

export async function getValue(db: SqlDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setValue(db: SqlDatabase, key: string, value: string, now: Date): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, now.toISOString()],
  );
}
