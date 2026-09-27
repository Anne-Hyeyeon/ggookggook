import Database from 'better-sqlite3';
import type { SqlDatabase } from './db';

export function openTestDb(): SqlDatabase {
  const db = new Database(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      return db.prepare(source).run(...params);
    },
    async getFirstAsync<T>(source: string, params: (string | number | null)[]) {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: (string | number | null)[]) {
      return db.prepare(source).all(...params) as T[];
    },
  };
}
