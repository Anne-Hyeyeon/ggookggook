import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { content } from '@/content';
import { loadWidgetUpdater } from './native';
import { WIDGET_SNAPSHOT_KEY } from './storage';
import { buildWidgetSnapshot } from './snapshot';
import { syncWidgets } from './sync';

jest.mock('@ggookggook/store', () => ({
  latestCompletedSession: jest.fn(),
  countSessionsBySymptom: jest.fn(),
  getUserRoutine: jest.fn(),
  setValue: jest.fn(),
}));
jest.mock('./native', () => ({ loadWidgetUpdater: jest.fn() }));
const updateWidget = jest.fn();

const mockedStore = store as jest.Mocked<typeof store>;
const db: store.SqlDatabase = { execAsync: jest.fn(), runAsync: jest.fn(), getFirstAsync: jest.fn(), getAllAsync: jest.fn() };
const NOW = new Date(2026, 9, 1, 15, 30);

const userSession: SessionLog = {
  id: 's1',
  routine: { kind: 'user', routineId: 'r1' },
  startedAt: '2026-10-01T05:00:00.000Z',
  completedAt: '2026-10-01T05:04:00.000Z',
  durationSeconds: 240,
  feedback: null,
};

const routine: UserRoutine = {
  id: 'r1',
  name: '아침 루틴',
  steps: [],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  updateWidget.mockReset();
  jest.mocked(loadWidgetUpdater).mockReturnValue(updateWidget);
  mockedStore.latestCompletedSession.mockResolvedValue(userSession);
  mockedStore.countSessionsBySymptom.mockResolvedValue({ headache: 4 });
  mockedStore.getUserRoutine.mockResolvedValue(routine);
  mockedStore.setValue.mockResolvedValue(undefined);
});

const expectedSnapshot = () =>
  buildWidgetSnapshot({
    now: NOW,
    symptoms: content.symptoms,
    usage: { headache: 4 },
    recentSession: userSession,
    recentUserRoutine: routine,
  });

it('builds the snapshot from the store, persists it, and hands it to the platform widget', async () => {
  await syncWidgets(db, NOW);

  expect(mockedStore.getUserRoutine).toHaveBeenCalledWith(db, 'r1');
  expect(mockedStore.setValue).toHaveBeenCalledWith(db, WIDGET_SNAPSHOT_KEY, JSON.stringify(expectedSnapshot()), NOW);
  expect(updateWidget).toHaveBeenCalledWith(expectedSnapshot(), NOW);
});

it('does not look up a user routine for a symptom session', async () => {
  mockedStore.latestCompletedSession.mockResolvedValue({ ...userSession, routine: { kind: 'symptom', symptomId: 'headache' } });
  await syncWidgets(db, NOW);

  expect(mockedStore.getUserRoutine).not.toHaveBeenCalled();
  expect(updateWidget).toHaveBeenCalledWith(expect.objectContaining({ recent: expect.objectContaining({ ref: { kind: 'symptom', id: 'headache' } }) }), NOW);
});

it('does nothing, not even a store read, when no widget is available (web, Expo Go)', async () => {
  jest.mocked(loadWidgetUpdater).mockReturnValue(null);
  await syncWidgets(db, NOW);

  expect(mockedStore.latestCompletedSession).not.toHaveBeenCalled();
  expect(mockedStore.setValue).not.toHaveBeenCalled();
});

it('logs and swallows a store failure, leaving the widget untouched', async () => {
  const failure = new Error('db closed');
  mockedStore.latestCompletedSession.mockRejectedValue(failure);

  await expect(syncWidgets(db, NOW)).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledWith('Failed to update the home-screen widget', failure);
  expect(updateWidget).not.toHaveBeenCalled();
});

it('logs and swallows a native widget update failure, sync or async', async () => {
  const failure = new Error('no app group');
  updateWidget.mockImplementationOnce(() => {
    throw failure;
  });
  await expect(syncWidgets(db, NOW)).resolves.toBeUndefined();
  updateWidget.mockRejectedValueOnce(failure);
  await expect(syncWidgets(db, NOW)).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledTimes(2);
  expect(console.error).toHaveBeenCalledWith('Failed to update the home-screen widget', failure);
});
