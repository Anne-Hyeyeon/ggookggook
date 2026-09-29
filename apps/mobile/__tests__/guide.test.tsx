import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { AccessibilityInfo, AppState, BackHandler, Platform, StyleSheet } from 'react-native';
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
let mockParams: { id: string; rounds?: string } = { id: 'food_stagnation' };
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
  jest.spyOn(AppState, 'addEventListener');
  mockParams = { id: 'food_stagnation' };
  // Get-ready is on by default (a setting covered in its own describe block below); off here
  // so the rest of this file exercises the guide itself starting immediately, as before.
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS, getReadyEnabled: false } });
});
afterEach(() => jest.useRealTimers());

async function pressAppState(state: 'active' | 'background' | 'inactive') {
  const call = (AppState.addEventListener as jest.Mock).mock.calls.findLast(([name]) => name === 'change');
  await act(async () => {
    call?.[1](state);
  });
}

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
  // This view is marked no-hide-descendants, so RNTL's hidden-element filtering would otherwise skip it.
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
  // The routine underneath is hidden while the confirmation is open, so this query opts back in.
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

describe('get-ready countdown', () => {
  beforeEach(() => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, getReadyEnabled: true } });
  });

  it('counts down before the first press, deferring the press announcement and haptic until it ends', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(<GuideScreen />);
    expect(screen.getByText('곧 시작해요 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '바로 시작' })).toBeTruthy();
    expect(screen.queryByText('꾹 누르세요')).toBeNull();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalledWith('꾹 누르세요');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('곧 시작해요 2')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('곧 시작해요 1')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('꾹 누르세요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    expect(announce).toHaveBeenCalledWith('꾹 누르세요');

    announce.mockRestore();
  });

  it('skips the countdown immediately when 바로 시작 is tapped', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '바로 시작' }));
    expect(screen.getByText('꾹 누르세요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('does not count the get-ready time toward the recorded duration', async () => {
    await render(<GuideScreen />);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(240_000);
    });
    expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ durationSeconds: 240 }));
  });

  it('is skipped entirely when the setting is off', async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, getReadyEnabled: false } });
    await render(<GuideScreen />);
    expect(screen.queryByText(/곧 시작해요/)).toBeNull();
    expect(screen.getByText('꾹 누르세요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeTruthy();
  });

  it('다음 during the countdown exits it immediately instead of leaving it stuck on screen', async () => {
    await render(<GuideScreen />);
    expect(screen.getByText('합곡')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('내관')).toBeTruthy();
    expect(screen.queryByText(/곧 시작해요/)).toBeNull();
    expect(screen.getByText('꾹 누르세요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeTruthy();

    // The countdown's own interval must not keep running in the background after being
    // cut short like this: advancing well past 3 (game) seconds must not revive it.
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText(/곧 시작해요/)).toBeNull();
  });
});

describe('이전 / 다음 controls', () => {
  it('renders each control at least 56pt tall', async () => {
    await render(<GuideScreen />);
    for (const name of ['이전', '일시정지', '다음']) {
      const flatStyle = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(56);
    }
  });

  it('이전 is disabled on the very first point', async () => {
    await render(<GuideScreen />);
    expect(screen.getByRole('button', { name: '이전' }).props.accessibilityState.disabled).toBe(true);
  });

  it('다음 moves to the next point (both sides of the current one), without waiting for the timer', async () => {
    await render(<GuideScreen />);
    expect(screen.getByText('합곡')).toBeTruthy();
    expect(screen.getByText('왼쪽')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('내관')).toBeTruthy();
    expect(screen.getByText('왼쪽')).toBeTruthy();
  });

  it('다음 becomes 마치기 once on the last point, which records the actual elapsed time and finishes', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' })); // 합곡 -> 내관 (the last point)
    expect(screen.getByRole('button', { name: '마치기' })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    await fireEvent.press(screen.getByRole('button', { name: '마치기' }));
    // 60s (합곡, both sides, skipped by 다음) + 10s actually spent on 내관, not the full 120s.
    expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ durationSeconds: 130, feedback: null }));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
  });

  it('이전 restarts the current point in place once elapsed time has passed, instead of moving to the previous point', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' })); // -> 내관, elapsed 0
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await fireEvent.press(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByText('내관')).toBeTruthy();
    expect(screen.getByText('1 / 9회')).toBeTruthy();
  });

  it('이전 moves to the previous point when pressed right after landing on the current one', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' })); // -> 내관, elapsed 0
    await fireEvent.press(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByText('합곡')).toBeTruthy();
  });

  it('fires the press haptic and announcement again for the point landed on by 다음', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(<GuideScreen />);
    jest.clearAllMocks();

    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    expect(announce).toHaveBeenCalledWith('꾹 누르세요');

    announce.mockRestore();
  });
});

describe('rounds', () => {
  it('does not show a round indicator for a single round', async () => {
    await render(<GuideScreen />);
    expect(screen.queryByText(/회차/)).toBeNull();
  });

  it('shows the round indicator once rounds > 1, and advances it as the routine repeats', async () => {
    mockParams = { id: 'food_stagnation', rounds: '2' };
    await render(<GuideScreen />);
    expect(screen.getByText('1회차 / 2')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(240_000);
    });
    expect(screen.getByText('2회차 / 2')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(240_000);
    });
    expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ durationSeconds: 480 }));
  });

  it('다음 from the last point of a round crosses into the next round instead of finishing', async () => {
    mockParams = { id: 'food_stagnation', rounds: '2' };
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '다음' })); // 합곡 -> 내관 (round 1)
    expect(screen.getByRole('button', { name: '다음' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '다음' })); // -> 합곡 (round 2)
    expect(screen.getByText('2회차 / 2')).toBeTruthy();
    expect(screen.getByText('합곡')).toBeTruthy();
  });

  it('clamps an out-of-range rounds param instead of trusting the URL', async () => {
    mockParams = { id: 'food_stagnation', rounds: '99' };
    await render(<GuideScreen />);
    expect(screen.getByText('1회차 / 5')).toBeTruthy();
  });
});

describe('background pause', () => {
  it('pauses automatically when the app backgrounds, and shows 잠시 멈췄어요 on the play button', async () => {
    await render(<GuideScreen />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await pressAppState('background');
    expect(screen.getByRole('button', { name: '잠시 멈췄어요' })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    // Still paused: the routine must never keep counting in the background.
    expect(screen.getByRole('button', { name: '잠시 멈췄어요' })).toBeTruthy();
  });

  it('stays paused when returning to the foreground, requiring an explicit tap to resume', async () => {
    await render(<GuideScreen />);
    await pressAppState('background');
    await pressAppState('active');
    expect(screen.getByRole('button', { name: '잠시 멈췄어요' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '잠시 멈췄어요' }));
    expect(screen.getByRole('button', { name: '일시정지' })).toBeTruthy();
  });

  it('does not flag an auto pause when the app backgrounds while already paused manually', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '일시정지' }));
    await pressAppState('background');
    expect(screen.getByRole('button', { name: '계속' })).toBeTruthy();
  });

  it('pauses the get-ready countdown too, and resumes it in place on tap', async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, getReadyEnabled: true } });
    await render(<GuideScreen />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('곧 시작해요 2')).toBeTruthy();

    await pressAppState('background');
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('곧 시작해요 2')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '잠시 멈췄어요' }));
    expect(screen.getByText('곧 시작해요 2')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('곧 시작해요 1')).toBeTruthy();
  });

  it('does not register a background listener on web', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    try {
      await render(<GuideScreen />);
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });
});
