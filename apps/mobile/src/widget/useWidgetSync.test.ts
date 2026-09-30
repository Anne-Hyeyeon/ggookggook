import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import type { SqlDatabase } from '@ggookggook/store';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useSettings } from '@/state/settings';
import { isWidgetRuntime } from './native';
import { syncWidgets } from './sync';
import { useWidgetSync } from './useWidgetSync';

jest.mock('./sync', () => ({ syncWidgets: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./native', () => ({ isWidgetRuntime: jest.fn() }));

const db: SqlDatabase = { execAsync: jest.fn(), runAsync: jest.fn(), getFirstAsync: jest.fn(), getAllAsync: jest.fn() };
let appStateListener: (state: AppStateStatus) => void = () => {};
const removeAppStateListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isWidgetRuntime).mockReturnValue(true);
  useSettings.setState({ loaded: false, settings: { ...DEFAULT_SETTINGS } });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: removeAppStateListener };
  });
});

it('syncs once on mount', async () => {
  await renderHook(() => useWidgetSync(db));
  expect(syncWidgets).toHaveBeenCalledTimes(1);
  expect(syncWidgets).toHaveBeenCalledWith(db);
});

it('syncs when the app comes to the foreground or goes to the background, not when inactive', async () => {
  await renderHook(() => useWidgetSync(db));
  jest.mocked(syncWidgets).mockClear();

  await act(async () => {
    appStateListener('active');
  });
  await act(async () => {
    appStateListener('background');
  });
  await act(async () => {
    appStateListener('inactive');
  });

  expect(syncWidgets).toHaveBeenCalledTimes(2);
});

it('does not sync on the initial settings load or later settings changes, which never feed the snapshot', async () => {
  await renderHook(() => useWidgetSync(db));
  jest.mocked(syncWidgets).mockClear();

  await act(async () => {
    useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  });
  await act(async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });

  expect(syncWidgets).not.toHaveBeenCalled();
});

it('stops listening on unmount', async () => {
  const { unmount } = await renderHook(() => useWidgetSync(db));
  await unmount();
  expect(removeAppStateListener).toHaveBeenCalled();
});

it('does nothing without a widget runtime (web, Expo Go)', async () => {
  jest.mocked(isWidgetRuntime).mockReturnValue(false);
  await renderHook(() => useWidgetSync(db));

  expect(syncWidgets).not.toHaveBeenCalled();
  expect(AppState.addEventListener).not.toHaveBeenCalled();
});
