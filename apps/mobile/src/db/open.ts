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

// Shared by the app's DbProvider and the Android widget's headless task, which runs without
// the React tree and so has to open the same database on its own.
export async function openAppDatabase(): Promise<SqlDatabase> {
  const opened = adapt(await SQLite.openDatabaseAsync(DATABASE_NAME));
  await migrate(opened);
  return opened;
}
