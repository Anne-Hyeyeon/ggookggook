export type SqlValue = string | number | null;

// Mirrors the subset of expo-sqlite's SQLiteDatabase that the store uses,
// so the app can pass an expo-sqlite database and tests can pass better-sqlite3.
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
}
