import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet } from 'react-native';
import GuideScreen from '../app/guide/[id]';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ insertSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
let mockParams: { id: string } = { id: 'food_stagnation' };
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
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

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(BackHandler, 'addEventListener');
  mockParams = { id: 'food_stagnation' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
});
afterEach(() => jest.useRealTimers());

it('guides through each side of each point and records the session', async () => {
  await render(<GuideScreen />);
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('왼쪽')).toBeTruthy();
  expect(screen.getByText('꾹 누르세요')).toBeTruthy();
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText('잠시 떼세요')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(55_000);
  });
  expect(screen.getByText('오른쪽')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(180_000);
  });
  expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ routine: { kind: 'symptom', symptomId: 'food_stagnation' }, durationSeconds: 240, feedback: null }));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});

it('pauses and resumes', async () => {
  await render(<GuideScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '일시정지' }));
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '계속' }));
  await act(async () => {
    jest.advanceTimersByTime(7000);
  });
  expect(screen.getByText('2 / 9회')).toBeTruthy();
});

it('announces the press and rest phases for screen readers', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  await render(<GuideScreen />);
  expect(announce).toHaveBeenCalledWith('꾹 누르세요');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(announce).toHaveBeenCalledWith('잠시 떼세요');

  announce.mockRestore();
});

it('skips haptics when rhythm haptics are off', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: false } });
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

it('shows a retry option when saving the session fails, and recovers on retry', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  await render(<GuideScreen />);

  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  expect(consoleError).toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: '다시 저장' }));
  await act(async () => {});
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });

  consoleError.mockRestore();
});

it('lets you leave the failed-save state via 처음으로 without growing the stack', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  await render(<GuideScreen />);

  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.dismissTo).toHaveBeenCalledWith('/');

  consoleError.mockRestore();
});

it('lets you leave the empty-state fallback via 닫기', async () => {
  mockParams = { id: 'nope' };
  await render(<GuideScreen />);
  expect(screen.getByText('안내할 혈자리가 없어요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('shows the technique text under the location, and hides the WHO code and hanja', async () => {
  await render(<GuideScreen />);
  expect(screen.getByText('반대쪽 엄지로 검지 뼈 쪽을 향해 꾹 누르세요. 뻐근할 정도가 적당합니다.')).toBeTruthy();
  expect(screen.queryByText('LI4')).toBeNull();
  expect(screen.queryByText('合谷')).toBeNull();
});

it('renders the pause control as a full-width thumb-zone button at least 56pt tall', async () => {
  await render(<GuideScreen />);
  const button = screen.getByRole('button', { name: '일시정지' });
  const flatStyle = StyleSheet.flatten(button.props.style);
  expect(flatStyle.minHeight).toBeGreaterThanOrEqual(56);
});

it('closes immediately when nothing has happened yet', async () => {
  await render(<GuideScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();
});

it('marks the close confirmation as a modal and hides the routine underneath it from screen readers', async () => {
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(screen.getByText('루틴을 그만할까요?')).toBeTruthy();
  expect(screen.getByTestId('confirm-overlay').props.accessibilityViewIsModal).toBe(true);
  // includeHiddenElements: this view is the one marked importantForAccessibility="no-hide-descendants",
  // so RNTL's default hidden-element filtering (working as intended) would otherwise skip it.
  expect(screen.getByTestId('guide-body', { includeHiddenElements: true }).props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );

  await fireEvent.press(screen.getByRole('button', { name: '계속하기' }));
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();
  expect(screen.getByTestId('guide-body').props.importantForAccessibility).toBe('auto');
});

it('asks for confirmation before closing once progress has been made, pausing the timer meanwhile', async () => {
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(screen.getByText('루틴을 그만할까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  // The routine underneath is importantForAccessibility="no-hide-descendants" while the
  // confirmation is open, so this query must opt back in to see it.
  expect(screen.getByText('1 / 9회', { includeHiddenElements: true })).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '그만하기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('resumes the timer when 계속하기 dismisses the close confirmation', async () => {
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  await fireEvent.press(screen.getByRole('button', { name: '계속하기' }));
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(7000);
  });
  expect(screen.getByText('2 / 9회')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});

it('fires only the success haptic on a segment change, without the extra press haptic', async () => {
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(59_000);
  });
  jest.clearAllMocks();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText('오른쪽')).toBeTruthy();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

it('shows a saving indicator while the finished session is being recorded, then navigates on', async () => {
  let resolveInsert: (() => void) | undefined;
  mocked.insertSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveInsert = resolve;
      }),
  );
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록하는 중…')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => {
    resolveInsert?.();
  });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});

it('disables 다시 저장 while a retry is in flight', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();

  let resolveRetry: (() => void) | undefined;
  mocked.insertSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRetry = resolve;
      }),
  );
  await fireEvent.press(screen.getByRole('button', { name: '다시 저장' }));
  expect(screen.getByRole('button', { name: '다시 저장' }).props.accessibilityState.disabled).toBe(true);

  await act(async () => {
    resolveRetry?.();
  });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
  expect(screen.queryByText('다시 저장')).toBeNull();

  consoleError.mockRestore();
});

it('routes Android hardware back through the same close confirmation once the routine has started', async () => {
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  const handled = await pressHardwareBack();
  expect(handled).toBe(true);
  expect(screen.getByText('루틴을 그만할까요?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();

  await pressHardwareBack();
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();
  expect(router.back).not.toHaveBeenCalled();
});

it('skips registering a hardware back handler on web, where BackHandler has no implementation', async () => {
  const originalOS = Platform.OS;
  Platform.OS = 'web';
  try {
    await render(<GuideScreen />);
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  } finally {
    Platform.OS = originalOS;
  }
});

it('hardware back closes immediately when nothing has happened yet, same as 닫기', async () => {
  await render(<GuideScreen />);
  await pressHardwareBack();
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();
});

it('keeps 닫기 and hardware back inert while the finished session is still saving', async () => {
  let resolveInsert: (() => void) | undefined;
  mocked.insertSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveInsert = resolve;
      }),
  );
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록하는 중…')).toBeTruthy();

  expect(screen.getByRole('button', { name: '닫기' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();

  await pressHardwareBack();
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.queryByText('루틴을 그만할까요?')).toBeNull();

  await act(async () => {
    resolveInsert?.();
  });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});

it('does not navigate to /done if the screen unmounts before the save resolves', async () => {
  let resolveInsert: (() => void) | undefined;
  mocked.insertSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveInsert = resolve;
      }),
  );
  const view = await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  await view.unmount();

  await act(async () => {
    resolveInsert?.();
  });
  expect(router.replace).not.toHaveBeenCalled();
});

it('does not navigate to /done if the screen unmounts before a retried save resolves', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  const view = await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();

  let resolveRetry: (() => void) | undefined;
  mocked.insertSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRetry = resolve;
      }),
  );
  await fireEvent.press(screen.getByRole('button', { name: '다시 저장' }));
  await view.unmount();

  await act(async () => {
    resolveRetry?.();
  });
  expect(router.replace).not.toHaveBeenCalled();

  consoleError.mockRestore();
});
