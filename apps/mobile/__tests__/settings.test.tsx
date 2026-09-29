import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import type { UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act } from 'react-test-renderer';
import SettingsScreen from '../app/settings';
import * as reminderModule from '@/notifications/reminder';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.1.0' } }));
jest.mock('@ggookggook/store', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  listUserRoutines: jest.fn(),
  getUserRoutine: jest.fn(),
}));
jest.mock('@/notifications/reminder', () => ({
  isReminderSupported: jest.fn(() => true),
  ensurePermission: jest.fn(),
  scheduleDailyReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

const mocked = store as jest.Mocked<typeof store>;
const mockedReminder = reminderModule as jest.Mocked<typeof reminderModule>;
// Captured before any test replaces it with a mock, so the race-condition test below can
// restore the real update implementation instead of the stubbed one the other tests use.
const realUpdate = useSettings.getState().update;

const update = jest.fn().mockResolvedValue(undefined);

const userRoutine = (overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id: 'r1',
  name: '아침 루틴',
  steps: [{ acupointId: 'LI4', seconds: 30 }],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.saveSettings.mockResolvedValue(undefined);
  mocked.listUserRoutines.mockResolvedValue([]);
  mocked.getUserRoutine.mockResolvedValue(null);
  mockedReminder.isReminderSupported.mockReturnValue(true);
  mockedReminder.ensurePermission.mockResolvedValue(true);
  mockedReminder.scheduleDailyReminder.mockResolvedValue(undefined);
  mockedReminder.cancelReminder.mockResolvedValue(undefined);
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, update });
});

it('goes back', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});

it('toggles rhythm haptics', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByRole('switch', { name: '리듬 진동' }).props.activeThumbColor).toBeUndefined();
  await fireEvent(screen.getByRole('switch', { name: '리듬 진동' }), 'valueChange', false);
  expect(update).toHaveBeenCalledWith({}, { rhythmHaptics: false });
});

it('toggles pregnancy mode with the welcome screen sub text', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('켜면 임신 중 피해야 할 혈자리를 빼고 안내해요.')).toBeTruthy();
  await fireEvent(screen.getByRole('switch', { name: '임신 중이에요' }), 'valueChange', true);
  expect(update).toHaveBeenCalledWith({}, { pregnancyMode: true });
});

it('steps the press seconds by one within 3 to 10', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('5초')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '누르는 시간 늘리기' }));
  expect(update).toHaveBeenCalledWith({}, { pressSeconds: 6 });

  await fireEvent.press(screen.getByRole('button', { name: '누르는 시간 줄이기' }));
  expect(update).toHaveBeenCalledWith({}, { pressSeconds: 4 });
});

it('does not lose an update when the increase button is pressed twice before either settles', async () => {
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, update: realUpdate });
  await render(<SettingsScreen />);

  // Fires the underlying press handler directly, twice, inside one act() scope: this is what "no
  // await between presses" means in practice (two separate fireEvent.press calls each open their
  // own act scope, and firing the second before the first settles trips React's "overlapping act
  // calls" error instead of exercising the race this test is for).
  const button = screen.getByRole('button', { name: '누르는 시간 늘리기' });
  act(() => {
    button.props.onClick();
    button.props.onClick();
  });

  expect(useSettings.getState().settings.pressSeconds).toBe(7);
});

it('disables the press seconds increase button at the upper bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pressSeconds: 10 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '누르는 시간 늘리기' }).props.accessibilityState.disabled).toBe(true);
});

it('disables the press seconds decrease button at the lower bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pressSeconds: 3 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '누르는 시간 줄이기' }).props.accessibilityState.disabled).toBe(true);
});

it('steps the rest seconds by one within 1 to 5', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('2초')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '쉬는 시간 늘리기' }));
  expect(update).toHaveBeenCalledWith({}, { restSeconds: 3 });

  await fireEvent.press(screen.getByRole('button', { name: '쉬는 시간 줄이기' }));
  expect(update).toHaveBeenCalledWith({}, { restSeconds: 1 });
});

it('disables the rest seconds increase button at the upper bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, restSeconds: 5 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '쉬는 시간 늘리기' }).props.accessibilityState.disabled).toBe(true);
});

it('disables the rest seconds decrease button at the lower bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, restSeconds: 1 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '쉬는 시간 줄이기' }).props.accessibilityState.disabled).toBe(true);
});

it('expands the disclaimer notices inline and reports its expanded state', async () => {
  await render(<SettingsScreen />);
  expect(screen.queryByText('통증이 심하거나 오래가면 병원 진료를 받으세요.')).toBeNull();
  expect(screen.getByRole('button', { name: '안내 다시 보기' }).props.accessibilityState.expanded).toBe(false);

  await fireEvent.press(screen.getByRole('button', { name: '안내 다시 보기' }));
  expect(screen.getByText('꾹꾹은 지압 방법을 안내하는 앱이에요. 진단이나 치료를 대신하지 않아요.')).toBeTruthy();
  expect(screen.getByText('통증이 심하거나 오래가면 병원 진료를 받으세요.')).toBeTruthy();
  expect(screen.getByText('지병이 있으면 전문가와 먼저 상의하세요.')).toBeTruthy();
  expect(screen.getByText('상처나 염증, 부기가 있는 곳은 누르지 마세요.')).toBeTruthy();
  expect(screen.getByRole('button', { name: '안내 다시 보기' }).props.accessibilityState.expanded).toBe(true);
});

it('shows the app version and content version', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('0.1.0', { exact: false })).toBeTruthy();
  expect(screen.getByText('1', { exact: false })).toBeTruthy();
});

describe('daily reminder', () => {
  it('hides the time and routine rows while the reminder is off', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByRole('switch', { name: '매일 알려 주기' }).props.value).toBe(false);
    expect(screen.queryByText('오후 3시')).toBeNull();
    expect(screen.queryByText('00분')).toBeNull();
    expect(screen.queryByRole('button', { name: '루틴 선택' })).toBeNull();
  });

  it('shows the time and routine rows with their default values once enabled', async () => {
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
    });
    await render(<SettingsScreen />);
    expect(screen.getByText('오후 3시')).toBeTruthy();
    expect(screen.getByText('00분')).toBeTruthy();
    expect(screen.getByRole('button', { name: '루틴 선택' })).toBeTruthy();
    expect(screen.getByText('눈이 뻑뻑할 때')).toBeTruthy();
  });

  it('requests permission, then persists and schedules when turned on and granted', async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', true);

    expect(mockedReminder.ensurePermission).toHaveBeenCalled();
    await waitFor(() => expect(update).toHaveBeenCalledWith(
      {},
      { reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    ));
    expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(
      { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      '눈이 뻑뻑할 때',
    );
  });

  it('shows the permission-denied notice and does not persist or schedule when denied', async () => {
    mockedReminder.ensurePermission.mockResolvedValue(false);
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', true);

    await waitFor(() => expect(screen.getByText('알림 권한이 꺼져 있어요. 기기 설정에서 켜 주세요.')).toBeTruthy());
    expect(update).not.toHaveBeenCalled();
    expect(mockedReminder.scheduleDailyReminder).not.toHaveBeenCalled();
  });

  it('cancels and persists when turned off', async () => {
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
    });
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', false);

    expect(update).toHaveBeenCalledWith(
      {},
      { reminder: { enabled: false, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
    await waitFor(() => expect(mockedReminder.cancelReminder).toHaveBeenCalled());
    expect(mockedReminder.scheduleDailyReminder).not.toHaveBeenCalled();
  });

  it('shows the unsupported notice on web and disables the switch instead of a permission error', async () => {
    mockedReminder.isReminderSupported.mockReturnValue(false);
    await render(<SettingsScreen />);
    expect(screen.getByText('이 기기에서는 알림을 쓸 수 없어요.')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '매일 알려 주기' }).props.disabled).toBe(true);
  });

  it('steps the hour and minute, wrapping at both ends, and reschedules while enabled', async () => {
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 23, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
    });
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: '알림 시각 늘리기' }));
    expect(update).toHaveBeenCalledWith(
      {},
      { reminder: { enabled: true, hour: 0, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
    await waitFor(() => expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(
      { enabled: true, hour: 0, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      '눈이 뻑뻑할 때',
    ));

    await fireEvent.press(screen.getByRole('button', { name: '알림 분 줄이기' }));
    expect(update).toHaveBeenCalledWith(
      {},
      { reminder: { enabled: true, hour: 23, minute: 50, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
  });

  it('lists symptoms and my routines in the routine picker, selects one, and collapses the list', async () => {
    mocked.listUserRoutines.mockResolvedValue([userRoutine()]);
    mocked.getUserRoutine.mockResolvedValue(userRoutine());
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
    });
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: '루틴 선택' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '아침 루틴' })).toBeTruthy());
    expect(screen.getByRole('button', { name: '눈이 뻑뻑할 때' }).props.accessibilityState.selected).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: '아침 루틴' }));
    expect(update).toHaveBeenCalledWith(
      {},
      { reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } } },
    );
    await waitFor(() => expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(
      { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
      '아침 루틴',
    ));
    expect(screen.queryByRole('button', { name: '아침 루틴' })).toBeNull();
  });

  it('falls back to the default symptom title when the chosen user routine is missing', async () => {
    mocked.listUserRoutines.mockResolvedValue([]);
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'deleted' } },
      },
    });
    await render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByText('눈이 뻑뻑할 때')).toBeTruthy());
  });

  it('schedules with the correct routine name even while the my-routines list is still loading', async () => {
    // Never resolves during this test: simulates the focus-effect list load still being in
    // flight when the toggle is pressed, right after the screen mounts.
    mocked.listUserRoutines.mockReturnValue(new Promise(() => {}));
    mocked.getUserRoutine.mockResolvedValue(userRoutine());
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: false, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
      },
    });
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', true);

    await waitFor(() => expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(
      { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
      '아침 루틴',
    ));
  });

  it('rolls the reminder back and shows the save error when scheduling fails after the write succeeds', async () => {
    mockedReminder.scheduleDailyReminder.mockRejectedValue(new Error('schedule failed'));
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', true);

    await waitFor(() => expect(screen.getByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy());
    expect(update).toHaveBeenNthCalledWith(
      1,
      {},
      { reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
    expect(update).toHaveBeenNthCalledWith(2, {}, { reminder: null });
  });

  it('rolls the reminder back and shows the save error when canceling fails after the write succeeds', async () => {
    useSettings.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
    });
    mockedReminder.cancelReminder.mockRejectedValue(new Error('cancel failed'));
    await render(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: '매일 알려 주기' }), 'valueChange', false);

    await waitFor(() => expect(screen.getByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy());
    expect(update).toHaveBeenNthCalledWith(
      1,
      {},
      { reminder: { enabled: false, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      {},
      { reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } } },
    );
  });
});
