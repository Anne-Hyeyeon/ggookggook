import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import type { SqlDatabase } from '@ggookggook/store';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useSettings } from '@/state/settings';
import { syncWidgets } from './sync';
import { useWidgetSync } from './useWidgetSync';

jest.mock('./sync', () => ({ syncWidgets: jest.fn().mockResolvedValue(undefined) }));

const db: SqlDatabase = { execAsync: jest.fn(), runAsync: jest.fn(), getFirstAsync: jest.fn(), getAllAsync: jest.fn() };
let appStateListener: (state: AppStateStatus) => void = () => {};
const removeAppStateListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
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

it('syncs when settings change', async () => {
  await renderHook(() => useWidgetSync(db));
  jest.mocked(syncWidgets).mockClear();

  await act(async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });
  expect(syncWidgets).toHaveBeenCalledTimes(1);

  await act(async () => {
    useSettings.setState({ loaded: true });
  });
  expect(syncWidgets).toHaveBeenCalledTimes(1);
});

it('stops listening on unmount', async () => {
  const { unmount } = await renderHook(() => useWidgetSync(db));
  await unmount();
  jest.mocked(syncWidgets).mockClear();

  await act(async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });
  expect(removeAppStateListener).toHaveBeenCalled();
  expect(syncWidgets).not.toHaveBeenCalled();
});

it('does nothing on web', async () => {
  Platform.OS = 'web';
  await renderHook(() => useWidgetSync(db));
  await act(async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });

  expect(syncWidgets).not.toHaveBeenCalled();
  expect(AppState.addEventListener).not.toHaveBeenCalled();
});
