import { DEFAULT_SETTINGS, type UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';
import RoutinePreviewScreen from '../app/routine/[id]/index';
import * as reminderModule from '@/notifications/reminder';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'r1' };
jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({
  getUserRoutine: jest.fn(),
  deleteUserRoutine: jest.fn(),
  saveUserRoutine: jest.fn(),
  saveSettings: jest.fn(),
}));
jest.mock('@/notifications/reminder', () => {
  const actual = jest.requireActual('@/notifications/reminder');
  // Only the Notifications-touching call is mocked; reminderRoutineFallback stays real (it's
  // pure), so these tests exercise the same fallback logic the app runs.
  return { ...actual, scheduleDailyReminder: jest.fn() };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

async function pressHardwareBack() {
  const call = (BackHandler.addEventListener as jest.Mock).mock.calls.findLast(([name]) => name === 'hardwareBackPress');
  let handled: boolean | undefined;
  await act(async () => {
    handled = call?.[1]();
  });
  return handled;
}

const mocked = store as jest.Mocked<typeof store>;
const mockedReminder = reminderModule as jest.Mocked<typeof reminderModule>;

const routine: UserRoutine = {
  id: 'r1',
  name: '아침 루틴',
  steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'ST36', seconds: 90 }],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(BackHandler, 'addEventListener');
  mockParams = { id: 'r1' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
});

it('shows nothing while loading, then the routine once it resolves', async () => {
  let resolveGet: ((routine: UserRoutine | null) => void) | undefined;
  mocked.getUserRoutine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGet = resolve;
    }),
  );
  await render(<RoutinePreviewScreen />);
  expect(screen.queryByText('아침 루틴')).toBeNull();

  await act(async () => {
    resolveGet?.(routine);
  });
  expect(screen.getByText('아침 루틴')).toBeTruthy();
  expect(screen.getByText('2곳 · 약 5분')).toBeTruthy();
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('족삼리')).toBeTruthy();
  expect(screen.getByText('임신 중이면 합곡은 누르지 마세요.')).toBeTruthy();
});

it('de-duplicates a repeated acupoint name in the pregnancy caution', async () => {
  mocked.getUserRoutine.mockResolvedValue({
    ...routine,
    steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'ST36', seconds: 60 }, { acupointId: 'LI4', seconds: 30 }],
  });
  await render(<RoutinePreviewScreen />);
  expect(await screen.findByText('임신 중이면 합곡은 누르지 마세요.')).toBeTruthy();
});

it('leaves out contraindicated points in pregnancy mode and says so', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<RoutinePreviewScreen />);
  expect(await screen.findByText('족삼리')).toBeTruthy();
  expect(screen.queryByText('합곡')).toBeNull();
  expect(screen.getByText('임신 중이라 합곡은 뺐어요.')).toBeTruthy();
  expect(screen.getByText('1곳 · 약 3분')).toBeTruthy();
});

it('shows a not-found state via 뒤로 when the routine is missing', async () => {
  mocked.getUserRoutine.mockResolvedValue(null);
  await render(<RoutinePreviewScreen />);
  expect(await screen.findByText('지운 루틴이에요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('shows a not-found state for a soft-deleted routine', async () => {
  mocked.getUserRoutine.mockResolvedValue({ ...routine, deletedAt: '2026-09-25T00:00:00.000Z' });
  await render(<RoutinePreviewScreen />);
  expect(await screen.findByText('지운 루틴이에요.')).toBeTruthy();
});

it('shows a not-found state and logs an error when the load fails', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.getUserRoutine.mockRejectedValueOnce(new Error('read failed'));
  await render(<RoutinePreviewScreen />);
  expect(await screen.findByText('지운 루틴이에요.')).toBeTruthy();
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

it('starts the routine', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<RoutinePreviewScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: '시작' }));
  expect(router.push).toHaveBeenCalledWith('/guide/routine/r1?rounds=1');
});

describe('반복', () => {
  it('shows the stored repeat and disables 반복 줄이기 at 1', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    await render(<RoutinePreviewScreen />);
    expect(await screen.findByText('1회')).toBeTruthy();
    expect(screen.getByRole('button', { name: '반복 줄이기' }).props.accessibilityState.disabled).toBe(true);
  });

  it('steps the repeat, updates the summary, saves the routine, and passes it to the guide', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    mocked.saveUserRoutine.mockResolvedValue(undefined);
    await render(<RoutinePreviewScreen />);
    await screen.findByText('1회');

    await fireEvent.press(screen.getByRole('button', { name: '반복 늘리기' }));
    expect(screen.getByText('2회')).toBeTruthy();
    expect(screen.getByText('2곳 · 2회 · 약 10분')).toBeTruthy();
    expect(mocked.saveUserRoutine).toHaveBeenCalledWith({}, expect.objectContaining({ id: 'r1', repeat: 2 }), expect.any(Date));

    await fireEvent.press(screen.getByRole('button', { name: '시작' }));
    expect(router.push).toHaveBeenCalledWith('/guide/routine/r1?rounds=2');
  });

  it('disables 반복 늘리기 at 5', async () => {
    mocked.getUserRoutine.mockResolvedValue({ ...routine, repeat: 5 });
    await render(<RoutinePreviewScreen />);
    expect(await screen.findByText('5회')).toBeTruthy();
    expect(screen.getByRole('button', { name: '반복 늘리기' }).props.accessibilityState.disabled).toBe(true);
  });

  it('does not lose an increment when 반복 늘리기 is pressed twice before either settles', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    mocked.saveUserRoutine.mockResolvedValue(undefined);
    await render(<RoutinePreviewScreen />);
    await screen.findByText('1회');
    const button = screen.getByRole('button', { name: '반복 늘리기' });
    await act(async () => {
      button.props.onClick();
      button.props.onClick();
    });
    expect(screen.getByText('3회')).toBeTruthy();
  });

  it('shows an error and rolls back the repeat when saving fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.getUserRoutine.mockResolvedValue(routine);
    mocked.saveUserRoutine.mockRejectedValueOnce(new Error('write failed'));
    await render(<RoutinePreviewScreen />);
    await screen.findByText('1회');
    await fireEvent.press(screen.getByRole('button', { name: '반복 늘리기' }));

    expect(await screen.findByText('반복 횟수를 저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
    expect(screen.getByText('1회')).toBeTruthy();
    consoleError.mockRestore();
  });
});

it('opens the editor', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<RoutinePreviewScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: '편집' }));
  expect(router.push).toHaveBeenCalledWith('/routine/r1/edit');
});

describe('deleting', () => {
  it('asks for confirmation before deleting', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    await render(<RoutinePreviewScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
    expect(screen.getByText('이 루틴을 지울까요?')).toBeTruthy();
    expect(mocked.deleteUserRoutine).not.toHaveBeenCalled();
  });

  it('cancels without deleting', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    await render(<RoutinePreviewScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
    await fireEvent.press(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByText('이 루틴을 지울까요?')).toBeNull();
    expect(mocked.deleteUserRoutine).not.toHaveBeenCalled();
  });

  it('closes the confirm overlay on Android hardware back, without popping the screen', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    await render(<RoutinePreviewScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
    expect(screen.getByText('이 루틴을 지울까요?')).toBeTruthy();

    const handled = await pressHardwareBack();
    expect(handled).toBe(true);
    expect(screen.queryByText('이 루틴을 지울까요?')).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
    expect(mocked.deleteUserRoutine).not.toHaveBeenCalled();
  });

  it('leaves hardware back unhandled (lets the screen pop) when the overlay is closed', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    await render(<RoutinePreviewScreen />);
    await screen.findByText('아침 루틴');

    const handled = await pressHardwareBack();
    expect(handled).toBe(false);
  });

  it('soft deletes and returns to 내 루틴 on confirm', async () => {
    mocked.getUserRoutine.mockResolvedValue(routine);
    mocked.deleteUserRoutine.mockResolvedValue(undefined);
    await render(<RoutinePreviewScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
    await fireEvent.press(screen.getByTestId('confirm-delete-button'));
    expect(mocked.deleteUserRoutine).toHaveBeenCalledWith({}, 'r1', expect.any(Date));
    expect(router.dismissTo).toHaveBeenCalledWith('/mine');
  });

  it('shows an error and keeps the routine visible when the delete fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.getUserRoutine.mockResolvedValue(routine);
    mocked.deleteUserRoutine.mockRejectedValueOnce(new Error('write failed'));
    await render(<RoutinePreviewScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
    await fireEvent.press(screen.getByTestId('confirm-delete-button'));
    expect(await screen.findByText('지우지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByText('아침 루틴')).toBeTruthy();
    consoleError.mockRestore();
  });

  describe('reminder fallback', () => {
    it('falls the reminder back to the default symptom and reschedules when it pointed at the deleted routine', async () => {
      useSettings.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
        },
      });
      mocked.getUserRoutine.mockResolvedValue(routine);
      mocked.deleteUserRoutine.mockResolvedValue(undefined);
      mocked.saveSettings.mockResolvedValue(undefined);
      await render(<RoutinePreviewScreen />);
      await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
      await fireEvent.press(screen.getByTestId('confirm-delete-button'));

      const fallenBack = { enabled: true, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } };
      await waitFor(() => expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(fallenBack, '눈이 뻑뻑할 때'));
      expect(mocked.saveSettings).toHaveBeenCalledWith({}, expect.objectContaining({ reminder: fallenBack }), expect.any(Date));
    });

    it('leaves a reminder pointed at a different routine untouched', async () => {
      useSettings.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'other' } },
        },
      });
      mocked.getUserRoutine.mockResolvedValue(routine);
      mocked.deleteUserRoutine.mockResolvedValue(undefined);
      await render(<RoutinePreviewScreen />);
      await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
      await fireEvent.press(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/mine'));
      expect(mockedReminder.scheduleDailyReminder).not.toHaveBeenCalled();
      expect(mocked.saveSettings).not.toHaveBeenCalled();
    });

    it('persists the fallback for a disabled reminder pointed at the deleted routine, but does not reschedule', async () => {
      useSettings.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          reminder: { enabled: false, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
        },
      });
      mocked.getUserRoutine.mockResolvedValue(routine);
      mocked.deleteUserRoutine.mockResolvedValue(undefined);
      mocked.saveSettings.mockResolvedValue(undefined);
      await render(<RoutinePreviewScreen />);
      await fireEvent.press(await screen.findByRole('button', { name: '지우기' }));
      await fireEvent.press(screen.getByTestId('confirm-delete-button'));

      const fallenBack = { enabled: false, hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } };
      await waitFor(() => expect(mocked.saveSettings).toHaveBeenCalledWith({}, expect.objectContaining({ reminder: fallenBack }), expect.any(Date)));
      expect(mockedReminder.scheduleDailyReminder).not.toHaveBeenCalled();
    });
  });
});
