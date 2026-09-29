import { DEFAULT_SETTINGS, type UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { act } from 'react-test-renderer';
import TodayScreen from '../app/(tabs)/index';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({
  latestCompletedSession: jest.fn(),
  countSessionsByFeedback: jest.fn(),
  countSessionsBySymptom: jest.fn(),
  getUserRoutine: jest.fn(),
  getSymptomRepeat: jest.fn(),
  listUserRoutines: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

const at = (hour: number, minute = 0) => new Date(2026, 8, 29, hour, minute, 0);

beforeEach(() => {
  jest.clearAllMocks();
  // A fixed default time (05:00-10:00 window: 기운이 없을 때/목이 뻐근할 때), so tests that
  // don't care about the suggestion block aren't at the mercy of the real wall clock landing
  // on a window whose symptom collides with a name a test asserts elsewhere on screen.
  jest.useFakeTimers().setSystemTime(at(7));
  jest.spyOn(AppState, 'addEventListener');
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  mocked.latestCompletedSession.mockResolvedValue(null);
  mocked.countSessionsByFeedback.mockResolvedValue(0);
  mocked.countSessionsBySymptom.mockResolvedValue({});
  mocked.getSymptomRepeat.mockResolvedValue(1);
  mocked.listUserRoutines.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

it('lists every symptom with its minutes and opens one', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  expect(screen.getByText('급똥참기')).toBeTruthy();
  await fireEvent.press(screen.getByText('머리가 아플 때'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('opens settings from the header button', async () => {
  await render(<TodayScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '설정' }));
  expect(router.push).toHaveBeenCalledWith('/settings');
});

it('updates the displayed minutes for 머리가 아플 때 when pregnancy mode changes', async () => {
  await render(<TodayScreen />);
  expect(screen.getByTestId('minutes-headache')).toHaveTextContent('4분');

  act(() => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });

  expect(screen.getByTestId('minutes-headache')).toHaveTextContent('2분');
});

it('filters by alias and by acupoint name, and shows an empty state', async () => {
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '불면');
  expect(screen.getByText('잠이 안 올 때')).toBeTruthy();
  expect(screen.queryByText('머리가 아플 때')).toBeNull();

  await fireEvent.changeText(input, '합곡');
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();

  await fireEvent.changeText(input, '없는말');
  expect(screen.getByText('찾는 증상이 없어요. 다른 말로 찾아보세요.')).toBeTruthy();
});

it('finds symptoms by their old disease-name alias', async () => {
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '불면증');
  expect(screen.getByText('잠이 안 올 때')).toBeTruthy();

  await fireEvent.changeText(input, '두통');
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();
});

it('shows the most recent routine', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: 'better',
  });
  await render(<TodayScreen />);
  expect(await screen.findByText('최근 · 머리가 아플 때 · 오늘')).toBeTruthy();
});

it('starts the recent routine again from its 다시 하기 affordance', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: null,
  });
  await render(<TodayScreen />);
  await fireEvent.press(await screen.findByText('다시 하기'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('does not double-push when 다시 하기 is tapped twice before navigation lands', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: null,
  });
  await render(<TodayScreen />);
  const again = await screen.findByText('다시 하기');
  await fireEvent.press(again);
  await fireEvent.press(again);
  expect(router.push).toHaveBeenCalledTimes(1);
});

it('shows a recent user routine by name and starts it again from /routine/<id>', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'user', routineId: 'r1' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 120,
    feedback: null,
  });
  mocked.getUserRoutine.mockResolvedValue({
    id: 'r1',
    name: '아침 루틴',
    steps: [{ acupointId: 'LI4', seconds: 60 }],
    sourceSymptomId: null,
    repeat: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
  });
  await render(<TodayScreen />);

  expect(await screen.findByText('최근 · 아침 루틴 · 오늘')).toBeTruthy();
  await fireEvent.press(screen.getByText('다시 하기'));
  expect(router.push).toHaveBeenCalledWith('/routine/r1');
});

it('hides the recent row when the recent user routine was deleted', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'user', routineId: 'r1' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 120,
    feedback: null,
  });
  mocked.getUserRoutine.mockResolvedValue({
    id: 'r1',
    name: '아침 루틴',
    steps: [{ acupointId: 'LI4', seconds: 60 }],
    sourceSymptomId: null,
    repeat: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: '2026-09-20T00:00:00.000Z',
  });
  await render(<TodayScreen />);

  await waitFor(() => expect(mocked.getUserRoutine).toHaveBeenCalledWith({}, 'r1'));
  expect(screen.queryByText('다시 하기')).toBeNull();
});

it('shows the better-feedback count only when it is at least one', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: 'better',
  });
  mocked.countSessionsByFeedback.mockResolvedValue(3);
  await render(<TodayScreen />);
  expect(await screen.findByText('나아졌어요를 3번 남겼어요')).toBeTruthy();
});

it('hides the better-feedback line when there is no positive feedback yet', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: null,
  });
  mocked.countSessionsByFeedback.mockResolvedValue(0);
  await render(<TodayScreen />);
  await screen.findByText('최근 · 머리가 아플 때 · 오늘');
  expect(screen.queryByText(/나아졌어요/)).toBeNull();
});

it('keeps search order instead of re-sorting by usage while searching', async () => {
  mocked.countSessionsBySymptom.mockResolvedValue({ neck_pain: 5, shoulder_pain: 1 });
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '통증');
  const order = (await screen.findAllByTestId(/^minutes-/)).map((node) => node.props.testID);
  expect(order).toEqual([
    'minutes-shoulder_pain',
    'minutes-back_pain',
    'minutes-neck_pain',
    'minutes-toothache_temporary',
    'minutes-wrist_strain',
    'minutes-knee_ache',
    'minutes-jaw_tmj',
  ]);
});

it('falls back to no history when the store rejects', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.countSessionsByFeedback.mockRejectedValue(new Error('boom'));
  mocked.countSessionsBySymptom.mockRejectedValue(new Error('boom'));
  await render(<TodayScreen />);
  await waitFor(() => expect(consoleError).toHaveBeenCalled());
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  consoleError.mockRestore();
});

describe('greeting', () => {
  it('greets by time of day', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    await render(<TodayScreen />);
    expect(screen.getByText('좋은 아침이에요')).toBeTruthy();
  });

  it('greets differently in the afternoon', async () => {
    jest.useFakeTimers().setSystemTime(at(15));
    await render(<TodayScreen />);
    expect(screen.getByText('오후도 잠깐 쉬어 가요')).toBeTruthy();
  });

  it('greets differently at night', async () => {
    jest.useFakeTimers().setSystemTime(at(22));
    await render(<TodayScreen />);
    expect(screen.getByText('편안한 밤 되세요')).toBeTruthy();
  });
});

describe('foreground refresh', () => {
  it('recomputes the greeting and suggestions when the app returns to the foreground', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    // A fresh object every call, the same as a real SQL query would return: proves the
    // re-render comes from an actual reload rather than a stale, reference-equal state set.
    mocked.countSessionsBySymptom.mockImplementation(async () => ({}));
    await render(<TodayScreen />);
    expect(screen.getByText('좋은 아침이에요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '기운이 없을 때 미리보기' })).toBeTruthy();

    jest.setSystemTime(at(15));
    const call = (AppState.addEventListener as jest.Mock).mock.calls.findLast(([name]) => name === 'change');
    await act(async () => {
      call?.[1]('active');
    });

    expect(screen.getByText('오후도 잠깐 쉬어 가요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '눈이 뻑뻑할 때 미리보기' })).toBeTruthy();
  });

  it('does not register a foreground listener on web', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    try {
      await render(<TodayScreen />);
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });
});

describe('지금 해 보기', () => {
  it('suggests up to two symptoms for the time of day, with their acupoint names and minutes', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    await render(<TodayScreen />);
    expect(screen.getByText('지금 해 보기')).toBeTruthy();
    // Suggested symptoms also appear in their own group section further down the same
    // screen, so their row is found by its unique preview accessibility label instead of
    // its plain (and elsewhere-duplicated) name text.
    expect(screen.getByRole('button', { name: '기운이 없을 때 미리보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '목이 뻐근할 때 미리보기' })).toBeTruthy();
  });

  it('opens the symptom preview when a suggestion row is tapped', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    await render(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '기운이 없을 때 미리보기' }));
    expect(router.push).toHaveBeenCalledWith('/symptom/fatigue');
  });

  it('starts a suggestion at its remembered repeat count, not always 1', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    mocked.getSymptomRepeat.mockImplementation(async (_db, symptomId: string) => (symptomId === 'fatigue' ? 3 : 1));
    await render(<TodayScreen />);
    // The repeat is already loaded by the time 시작 is tappable, from the focus effect
    // itself rather than a second read fired by the tap.
    await waitFor(() => expect(mocked.getSymptomRepeat).toHaveBeenCalledWith({}, 'fatigue'));
    await fireEvent.press(screen.getByRole('button', { name: '기운이 없을 때 시작' }));
    expect(router.push).toHaveBeenCalledWith('/guide/fatigue?rounds=3');
  });

  it('shows a suggestion repeat count in its summary line', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    mocked.getSymptomRepeat.mockImplementation(async (_db, symptomId: string) => (symptomId === 'fatigue' ? 2 : 1));
    await render(<TodayScreen />);
    expect(await screen.findByText('3곳 · 2회 · 약 8분')).toBeTruthy();
  });

  it('does not double-push when 시작 is tapped twice before navigation lands', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    await render(<TodayScreen />);
    const button = screen.getByRole('button', { name: '기운이 없을 때 시작' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('hides the suggestion block while searching', async () => {
    jest.useFakeTimers().setSystemTime(at(7));
    await render(<TodayScreen />);
    const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
    await fireEvent.changeText(input, '두통');
    expect(screen.queryByText('지금 해 보기')).toBeNull();
  });
});

describe('내 루틴 quick row', () => {
  const routine = (overrides: Partial<UserRoutine> = {}): UserRoutine => ({
    id: 'r1',
    name: '아침 루틴',
    steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'GV29', seconds: 60 }],
    sourceSymptomId: null,
    repeat: 2,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  });

  it('shows my routines as chips with minutes including the stored repeat, navigable to their preview', async () => {
    mocked.listUserRoutines.mockResolvedValue([routine()]);
    await render(<TodayScreen />);
    expect(await screen.findByText('아침 루틴')).toBeTruthy();
    expect(screen.getByText('2곳 · 2회 · 약 6분')).toBeTruthy();

    await fireEvent.press(screen.getByText('아침 루틴'));
    expect(router.push).toHaveBeenCalledWith('/routine/r1');
  });

  it('shows nothing when the user has no routines', async () => {
    mocked.listUserRoutines.mockResolvedValue([]);
    await render(<TodayScreen />);
    await waitFor(() => expect(mocked.listUserRoutines).toHaveBeenCalled());
    expect(screen.queryByText('내 루틴')).toBeNull();
  });
});

describe('group chips and sections', () => {
  it('groups the full list under caption section headers in 전체', async () => {
    await render(<TodayScreen />);
    // Each group label appears twice in 전체: once as its chip, once as its section header.
    expect(screen.getAllByText('머리·눈')).toHaveLength(2);
    expect(screen.getAllByText('목·어깨·허리')).toHaveLength(2);
    expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  });

  it('filters to a flat, usage-sorted list of one group when its chip is selected', async () => {
    mocked.countSessionsBySymptom.mockResolvedValue({ neck_pain: 3, shoulder_pain: 1 });
    await render(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '목·어깨·허리' }));

    expect(screen.queryByText('머리가 아플 때')).toBeNull();
    // Only the chip's own label remains; its section header (and every other group's) is
    // gone, but the chip row itself, including other groups' chips, stays on screen.
    expect(screen.getAllByText('목·어깨·허리')).toHaveLength(1);
    expect(screen.getAllByText('머리·눈')).toHaveLength(1);
    const order = (await screen.findAllByTestId(/^minutes-/)).map((node) => node.props.testID);
    expect(order).toEqual(['minutes-neck_pain', 'minutes-shoulder_pain', 'minutes-back_pain']);
  });

  it('returns to sections when 전체 is selected again', async () => {
    await render(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '목·어깨·허리' }));
    expect(screen.queryByText('머리가 아플 때')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '전체' }));
    expect(screen.getByText('머리가 아플 때')).toBeTruthy();
    expect(screen.getAllByText('머리·눈')).toHaveLength(2);
  });

  it('search overrides grouping: a selected chip has no effect while searching', async () => {
    await render(<TodayScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '목·어깨·허리' }));
    const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
    await fireEvent.changeText(input, '두통');
    expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  });
});
