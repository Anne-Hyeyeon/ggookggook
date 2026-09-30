import { migrate, type SqlDatabase, type SqlValue } from '@ggookggook/store';
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'ggookggook.db';

function adapt(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync(source: string) {
      return db.execAsync(source);
    },
    runAsync(source: string, params: SqlValue[]) {
      return db.runAsync(source, params);
    },
    getFirstAsync<T>(source: string, params: SqlValue[]) {
      return db.getFirstAsync<T>(source, params);
    },
    getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.getAllAsync<T>(source, params);
    },
  };
}

async function openAndMigrate(): Promise<SqlDatabase> {
  const opened = adapt(await SQLite.openDatabaseAsync(DATABASE_NAME));
  await migrate(opened);
  return opened;
}

// One shared open+migrate: the app and the Android widget's headless task run in the same JS runtime.
let opening: Promise<SqlDatabase> | null = null;

export function openAppDatabase(): Promise<SqlDatabase> {
  if (!opening) {
    opening = openAndMigrate().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}
