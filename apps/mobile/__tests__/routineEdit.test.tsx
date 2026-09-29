import type { UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import EditRoutineScreen from '../app/routine/[id]/edit';
import * as reminderModule from '@/notifications/reminder';
import { useRoutineDraft } from '@/state/routineDraft';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'r1' };
jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ getUserRoutine: jest.fn(), saveUserRoutine: jest.fn() }));
jest.mock('@/notifications/reminder', () => ({ scheduleDailyReminder: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

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
  mockParams = { id: 'r1' };
  useRoutineDraft.getState().startNew();
  useSettings.setState({ settings: { ...useSettings.getState().settings, reminder: null } });
  mockedReminder.scheduleDailyReminder.mockResolvedValue(undefined);
});

it('shows nothing while the routine loads, then the editor once it resolves', async () => {
  let resolveGet: ((routine: UserRoutine | null) => void) | undefined;
  mocked.getUserRoutine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGet = resolve;
    }),
  );
  await render(<EditRoutineScreen />);
  expect(screen.queryByText('루틴 편집')).toBeNull();

  await act(async () => {
    resolveGet?.(routine);
  });
  expect(screen.getByText('루틴 편집')).toBeTruthy();
  expect(screen.getByLabelText('루틴 이름').props.value).toBe('아침 루틴');
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('족삼리')).toBeTruthy();
});

it('shows a not-found state via 뒤로 when the routine is missing', async () => {
  mocked.getUserRoutine.mockResolvedValue(null);
  await render(<EditRoutineScreen />);
  expect(await screen.findByText('찾을 수 없는 루틴이에요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('shows a not-found state for a soft-deleted routine', async () => {
  mocked.getUserRoutine.mockResolvedValue({ ...routine, deletedAt: '2026-09-25T00:00:00.000Z' });
  await render(<EditRoutineScreen />);
  expect(await screen.findByText('찾을 수 없는 루틴이에요.')).toBeTruthy();
});

it('shows a not-found state and logs an error when the load fails', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.getUserRoutine.mockRejectedValueOnce(new Error('read failed'));
  await render(<EditRoutineScreen />);
  expect(await screen.findByText('찾을 수 없는 루틴이에요.')).toBeTruthy();
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

it('enables save right away, since the loaded routine is already valid', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');
  expect(screen.getByRole('button', { name: '저장' }).props.accessibilityState.disabled).toBe(false);
});

it('saves an edited routine, keeping its id and created date, and goes back', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '저녁 루틴');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(mocked.saveUserRoutine).toHaveBeenCalledWith(
    {},
    expect.objectContaining({
      id: 'r1',
      name: '저녁 루틴',
      steps: routine.steps,
      createdAt: routine.createdAt,
      deletedAt: null,
    }),
    expect.any(Date),
  );
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('keeps the loaded routine\'s repeat count on save when the stepper is untouched', async () => {
  mocked.getUserRoutine.mockResolvedValue({ ...routine, repeat: 3 });
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  expect(screen.getByText('3회')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '저녁 루틴');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(mocked.saveUserRoutine).toHaveBeenCalledWith(
    {},
    expect.objectContaining({ id: 'r1', repeat: 3 }),
    expect.any(Date),
  );
});

it('steps the repeat count within 1 to 5, disabling at each bound, and saves the new value', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  expect(screen.getByRole('button', { name: '반복 줄이기' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: '반복 늘리기' }));
  expect(screen.getByText('2회')).toBeTruthy();
  expect(screen.getByRole('button', { name: '반복 줄이기' }).props.accessibilityState.disabled).toBe(false);

  await fireEvent.press(screen.getByRole('button', { name: '저장' }));
  expect(mocked.saveUserRoutine).toHaveBeenCalledWith({}, expect.objectContaining({ id: 'r1', repeat: 2 }), expect.any(Date));
});

it('does not lose an increment when 반복 늘리기 is pressed twice before either settles', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  const button = screen.getByRole('button', { name: '반복 늘리기' });
  await act(async () => {
    button.props.onClick();
    button.props.onClick();
  });
  expect(screen.getByText('3회')).toBeTruthy();
});

it('asks for confirmation before leaving once only the repeat count has changed', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  await fireEvent.press(screen.getByRole('button', { name: '반복 늘리기' }));
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(screen.getByText('저장하지 않고 나갈까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});

it('reschedules the enabled reminder with the new name when it points at the edited routine', async () => {
  useSettings.setState({
    settings: {
      ...useSettings.getState().settings,
      reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
    },
  });
  mocked.getUserRoutine.mockResolvedValue(routine);
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '저녁 루틴');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(mockedReminder.scheduleDailyReminder).toHaveBeenCalledWith(
    { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } },
    '저녁 루틴',
  );
});

it('does not reschedule when the enabled reminder points at a different routine', async () => {
  useSettings.setState({
    settings: {
      ...useSettings.getState().settings,
      reminder: { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'other' } },
    },
  });
  mocked.getUserRoutine.mockResolvedValue(routine);
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '저녁 루틴');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(mockedReminder.scheduleDailyReminder).not.toHaveBeenCalled();
});

it('saves only once when 저장 is double-tapped before the first save settles', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  let resolveSave: (() => void) | undefined;
  mocked.saveUserRoutine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveSave = () => resolve(undefined);
    }),
  );
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  const saveButton = screen.getByRole('button', { name: '저장' });
  await act(async () => {
    saveButton.props.onClick();
    saveButton.props.onClick();
  });
  await act(async () => {
    resolveSave?.();
  });

  expect(mocked.saveUserRoutine).toHaveBeenCalledTimes(1);
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('asks for confirmation before leaving once the loaded routine has been changed', async () => {
  mocked.getUserRoutine.mockResolvedValue(routine);
  await render(<EditRoutineScreen />);
  await screen.findByText('루틴 편집');

  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalledTimes(1);

  jest.clearAllMocks();
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '저녁 루틴');
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(screen.getByText('저장하지 않고 나갈까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});
