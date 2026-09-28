import type { UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler, Platform } from 'react-native';
import NewRoutineScreen from '../app/routine/new';
import { useRoutineDraft } from '@/state/routineDraft';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ saveUserRoutine: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

async function withStore(mutate: () => void) {
  await act(async () => {
    mutate();
  });
}

async function pressHardwareBack() {
  const call = (BackHandler.addEventListener as jest.Mock).mock.calls.findLast(([name]) => name === 'hardwareBackPress');
  let handled: boolean | undefined;
  await act(async () => {
    handled = call?.[1]();
  });
  return handled;
}

const mocked = store as jest.Mocked<typeof store>;

const previousRoutine: UserRoutine = {
  id: 'old',
  name: '이전 편집',
  steps: [{ acupointId: 'ST36', seconds: 90 }],
  sourceSymptomId: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(BackHandler, 'addEventListener');
  mocked.saveUserRoutine.mockResolvedValue(undefined);
  useRoutineDraft.getState().startEdit(previousRoutine);
});

it('starts empty and resets any leftover draft from a previous edit', async () => {
  await render(<NewRoutineScreen />);
  expect(screen.getByText('새 루틴')).toBeTruthy();
  expect(screen.queryByText('이전 편집')).toBeNull();
  expect(screen.queryByText('족삼리')).toBeNull();
  expect(screen.getByRole('button', { name: '저장' }).props.accessibilityState.disabled).toBe(true);
});

it('enables save once a name and at least one step exist', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('60초')).toBeTruthy();
  expect(screen.getByRole('button', { name: '저장' }).props.accessibilityState.disabled).toBe(false);
});

it('shows no validation errors before the draft is touched, even though it starts invalid', async () => {
  await render(<NewRoutineScreen />);
  expect(screen.queryByText('이름을 적어 주세요.')).toBeNull();
  expect(screen.queryByText('혈자리를 하나 이상 넣어 주세요.')).toBeNull();
});

it('shows the remaining validation error inline once the draft is touched', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');
  expect(screen.getByText('혈자리를 하나 이상 넣어 주세요.')).toBeTruthy();
  expect(screen.queryByText('이름을 적어 주세요.')).toBeNull();
});

it('navigates to the picker from 혈자리 추가', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '혈자리 추가' }));
  expect(router.push).toHaveBeenCalledWith('/routine/pick');
});

it('disables 혈자리 추가 once the draft has 10 steps', async () => {
  await render(<NewRoutineScreen />);
  await withStore(() => {
    for (let i = 0; i < 10; i += 1) useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  const addButton = screen.getByRole('button', { name: '혈자리 추가' });
  expect(addButton.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(addButton);
  expect(router.push).not.toHaveBeenCalled();
});

it('reorders steps with 위로 and 아래로, disabling at each end', async () => {
  await render(<NewRoutineScreen />);
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
    useRoutineDraft.getState().addAcupoint({ acupointId: 'PC6', seconds: 60 });
  });
  expect(screen.getByRole('button', { name: '합곡 위로' }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByRole('button', { name: '내관 아래로' }).props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(screen.getByRole('button', { name: '합곡 아래로' }));

  expect(screen.getByRole('button', { name: '내관 위로' }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByRole('button', { name: '합곡 아래로' }).props.accessibilityState.disabled).toBe(true);
});

it('steps the seconds by 10 within 10 to 600, disabling at each bound', async () => {
  await render(<NewRoutineScreen />);
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  await fireEvent.press(screen.getByRole('button', { name: '합곡 시간 늘리기' }));
  expect(screen.getByText('70초')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '합곡 시간 줄이기' }));
  expect(screen.getByText('60초')).toBeTruthy();

  await withStore(() => useRoutineDraft.getState().setStepSeconds(0, 10));
  expect(screen.getByRole('button', { name: '합곡 시간 줄이기' }).props.accessibilityState.disabled).toBe(true);

  await withStore(() => useRoutineDraft.getState().setStepSeconds(0, 600));
  expect(screen.getByRole('button', { name: '합곡 시간 늘리기' }).props.accessibilityState.disabled).toBe(true);
});

it('does not lose an increment when the stepper is pressed twice before either settles', async () => {
  await render(<NewRoutineScreen />);
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  const button = screen.getByRole('button', { name: '합곡 시간 늘리기' });
  await act(async () => {
    button.props.onClick();
    button.props.onClick();
  });
  expect(useRoutineDraft.getState().draft.steps[0]).toEqual({ acupointId: 'LI4', seconds: 80 });
});

it('removes a step with 빼기', async () => {
  await render(<NewRoutineScreen />);
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  await fireEvent.press(screen.getByRole('button', { name: '합곡 빼기' }));
  expect(screen.queryByText('합곡')).toBeNull();
});

it('saves the routine and goes back', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(mocked.saveUserRoutine).toHaveBeenCalledWith(
    {},
    expect.objectContaining({
      name: '아침 루틴',
      steps: [{ acupointId: 'LI4', seconds: 60 }],
      sourceSymptomId: null,
      deletedAt: null,
    }),
    expect.any(Date),
  );
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('shows an error and stays editable when saving fails', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.saveUserRoutine.mockRejectedValueOnce(new Error('write failed'));
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');
  await withStore(() => {
    useRoutineDraft.getState().addAcupoint({ acupointId: 'LI4', seconds: 60 });
  });
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(await screen.findByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '저장' }).props.accessibilityState.disabled).toBe(false);
  consoleError.mockRestore();
});

it('goes back directly when nothing has changed', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('저장하지 않고 나갈까요?')).toBeNull();
});

it('asks for confirmation before leaving once the draft has changed', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');

  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(screen.getByText('저장하지 않고 나갈까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: '계속 편집' }));
  expect(screen.queryByText('저장하지 않고 나갈까요?')).toBeNull();
  expect(router.back).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  await fireEvent.press(screen.getByRole('button', { name: '그만두기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('routes Android hardware back through the same leave confirmation', async () => {
  await render(<NewRoutineScreen />);
  await fireEvent.changeText(screen.getByLabelText('루틴 이름'), '아침 루틴');

  const handled = await pressHardwareBack();
  expect(handled).toBe(true);
  expect(screen.getByText('저장하지 않고 나갈까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();

  await pressHardwareBack();
  expect(screen.queryByText('저장하지 않고 나갈까요?')).toBeNull();
  expect(router.back).not.toHaveBeenCalled();
});

it('skips registering a hardware back handler on web', async () => {
  const originalOS = Platform.OS;
  Platform.OS = 'web';
  try {
    await render(<NewRoutineScreen />);
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  } finally {
    Platform.OS = originalOS;
  }
});
