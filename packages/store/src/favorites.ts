import type { FavoriteAcupoint } from '@ggookggook/shared';
import type { SqlDatabase } from './db';

interface FavoriteRow {
  acupoint_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toFavorite(row: FavoriteRow): FavoriteAcupoint {
  return {
    acupointId: row.acupoint_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listFavorites(db: SqlDatabase): Promise<FavoriteAcupoint[]> {
  const rows = await db.getAllAsync<FavoriteRow>(
    'SELECT * FROM favorites WHERE deleted_at IS NULL ORDER BY updated_at DESC',
    [],
  );
  return rows.map(toFavorite);
}

export async function isFavorite(db: SqlDatabase, acupointId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ acupoint_id: string }>(
    'SELECT acupoint_id FROM favorites WHERE acupoint_id = ? AND deleted_at IS NULL',
    [acupointId],
  );
  return row !== null;
}

export async function setFavorite(db: SqlDatabase, acupointId: string, on: boolean, now: Date): Promise<void> {
  const timestamp = now.toISOString();
  const deletedAt = on ? null : timestamp;
  await db.runAsync(
    `INSERT INTO favorites (acupoint_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(acupoint_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [acupointId, timestamp, timestamp, deletedAt],
  );
}
