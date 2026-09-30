import { migrate } from '@ggookggook/store';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('@ggookggook/store', () => ({ migrate: jest.fn() }));

const native = { execAsync: jest.fn(), runAsync: jest.fn(), getFirstAsync: jest.fn(), getAllAsync: jest.fn() };

// Fresh module state per test: the in-flight promise is module-level by design.
function loadOpen(): typeof import('./open') {
  let loaded: typeof import('./open') | undefined;
  jest.isolateModules(() => {
    loaded = require('./open');
  });
  if (!loaded) throw new Error('failed to load ./open');
  return loaded;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue(native as never);
  jest.mocked(migrate).mockResolvedValue(1);
});

it('opens and migrates once for concurrent callers, handing both the same database', async () => {
  const { openAppDatabase } = loadOpen();
  const [first, second] = await Promise.all([openAppDatabase(), openAppDatabase()]);

  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('ggookggook.db');
  expect(migrate).toHaveBeenCalledTimes(1);
  expect(first).toBe(second);
});

it('reuses the opened database for later callers', async () => {
  const { openAppDatabase } = loadOpen();
  await openAppDatabase();
  await openAppDatabase();

  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(migrate).toHaveBeenCalledTimes(1);
});

it('retries on the next call after a failed open', async () => {
  const { openAppDatabase } = loadOpen();
  jest.mocked(SQLite.openDatabaseAsync).mockRejectedValueOnce(new Error('locked'));

  await expect(openAppDatabase()).rejects.toThrow('locked');
  await expect(openAppDatabase()).resolves.toBeDefined();
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(2);
});

it('retries on the next call after a failed migration', async () => {
  const { openAppDatabase } = loadOpen();
  jest.mocked(migrate).mockRejectedValueOnce(new Error('duplicate column'));

  await expect(openAppDatabase()).rejects.toThrow('duplicate column');
  await expect(openAppDatabase()).resolves.toBeDefined();
  expect(migrate).toHaveBeenCalledTimes(2);
});

it('passes queries through to the native database', async () => {
  const { openAppDatabase } = loadOpen();
  const db = await openAppDatabase();
  await db.runAsync('UPDATE x SET y = ?', [1]);
  expect(native.runAsync).toHaveBeenCalledWith('UPDATE x SET y = ?', [1]);
});
