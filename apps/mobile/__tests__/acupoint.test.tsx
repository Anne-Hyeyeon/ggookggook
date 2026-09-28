import { DEFAULT_SETTINGS, type UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';
import AcupointScreen from '../app/acupoint/[id]';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'LI4' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));
jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ listUserRoutines: jest.fn(), saveUserRoutine: jest.fn() }));

async function pressHardwareBack() {
  const call = (BackHandler.addEventListener as jest.Mock).mock.calls.findLast(([name]) => name === 'hardwareBackPress');
  let handled: boolean | undefined;
  await act(async () => {
    handled = call?.[1]();
  });
  return handled;
}

const mocked = store as jest.Mocked<typeof store>;
const toggle = jest.fn().mockResolvedValue(undefined);

const routine = (id: string, overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id,
  name: `루틴 ${id}`,
  steps: [{ acupointId: 'ST36', seconds: 60 }],
  sourceSymptomId: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(BackHandler, 'addEventListener');
  toggle.mockResolvedValue(undefined);
  mockParams = { id: 'LI4' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  useFavorites.setState({ loaded: true, ids: new Set(), toggle });
  mocked.listUserRoutines.mockResolvedValue([]);
  mocked.saveUserRoutine.mockResolvedValue(undefined);
});

it('shows the location, technique, pregnancy caution, and related routines for 합곡', async () => {
  await render(<AcupointScreen />);
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('合谷')).toBeTruthy();
  expect(screen.getByText('Hapgok')).toBeTruthy();
  expect(screen.getByText('양쪽 번갈아')).toBeTruthy();
  expect(screen.getByText('위치')).toBeTruthy();
  expect(screen.getByText(/손등에서 엄지와 검지 뼈 사이입니다\./)).toBeTruthy();
  expect(screen.getByText('누르는 법')).toBeTruthy();
  expect(screen.getByText('임신 중에는 누르지 마세요.')).toBeTruthy();
  expect(screen.getByText('이 혈자리를 쓰는 루틴')).toBeTruthy();
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  await fireEvent.press(screen.getByText('머리가 아플 때'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('navigates back', async () => {
  await render(<AcupointScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});

it('handles an unknown acupoint without crashing', async () => {
  mockParams = { id: 'nope' };
  await render(<AcupointScreen />);
  expect(screen.getByText('찾을 수 없는 혈자리예요.')).toBeTruthy();
});

describe('favorite toggle', () => {
  it('shows the unfavorited label and state by default', async () => {
    await render(<AcupointScreen />);
    const button = screen.getByRole('button', { name: '즐겨찾기에 추가' });
    expect(button.props.accessibilityState.selected).toBe(false);
    expect(screen.getByText('즐겨찾기')).toBeTruthy();
  });

  it('shows the favorited label and state when already a favorite', async () => {
    useFavorites.setState({ ids: new Set(['LI4']) });
    await render(<AcupointScreen />);
    const button = screen.getByRole('button', { name: '즐겨찾기에서 빼기' });
    expect(button.props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('즐겨찾는 중')).toBeTruthy();
  });

  it('toggles the favorite for this acupoint', async () => {
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    expect(toggle).toHaveBeenCalledWith({}, 'LI4');
  });

  it('shows an error message when toggling fails', async () => {
    toggle.mockRejectedValueOnce(new Error('write failed'));
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    expect(await screen.findByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
  });

  it('clears a previous error on the next press', async () => {
    toggle.mockRejectedValueOnce(new Error('write failed'));
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    expect(await screen.findByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    expect(screen.queryByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeNull();
  });
});

describe('루틴에 추가', () => {
  it('opens the sheet and lists my routines with their step counts, plus 새 루틴 만들기', async () => {
    mocked.listUserRoutines.mockResolvedValue([
      routine('r1', { name: '아침 루틴', steps: [{ acupointId: 'ST36', seconds: 60 }, { acupointId: 'PC6', seconds: 30 }] }),
      routine('r2', { name: '저녁 루틴' }),
    ]);
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));

    expect(await screen.findByText('아침 루틴')).toBeTruthy();
    expect(screen.getByText('2개')).toBeTruthy();
    expect(screen.getByText('저녁 루틴')).toBeTruthy();
    expect(screen.getByText('1개')).toBeTruthy();
    expect(screen.getByRole('button', { name: '새 루틴 만들기' })).toBeTruthy();
  });

  it('adds this acupoint to a routine and shows 추가했어요', async () => {
    mocked.listUserRoutines.mockResolvedValue([routine('r1', { name: '아침 루틴', steps: [{ acupointId: 'ST36', seconds: 60 }] })]);
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    await fireEvent.press(await screen.findByRole('button', { name: /아침 루틴/ }));

    expect(mocked.saveUserRoutine).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: 'r1',
        steps: [{ acupointId: 'ST36', seconds: 60 }, { acupointId: 'LI4', seconds: 60 }],
      }),
      expect.any(Date),
    );
    expect(await screen.findByText('추가했어요')).toBeTruthy();
    expect(screen.getByText('2개')).toBeTruthy();
  });

  it('disables a full routine and shows the 10-step limit message', async () => {
    const fullSteps = Array.from({ length: 10 }, (_, i) => ({ acupointId: 'ST36', seconds: 10 + i }));
    mocked.listUserRoutines.mockResolvedValue([routine('r1', { name: '꽉 찬 루틴', steps: fullSteps })]);
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));

    const row = await screen.findByRole('button', { name: /꽉 찬 루틴/ });
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('혈자리는 10개까지 넣을 수 있어요.')).toBeTruthy();

    await fireEvent.press(row);
    expect(mocked.saveUserRoutine).not.toHaveBeenCalled();
  });

  it('opens a prefilled new routine draft from 새 루틴 만들기', async () => {
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    await fireEvent.press(await screen.findByRole('button', { name: '새 루틴 만들기' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/routine/new', params: { prefillAcupointId: 'LI4' } });
  });

  it('closes the sheet', async () => {
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    await screen.findByRole('button', { name: '새 루틴 만들기' });
    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('새 루틴 만들기')).toBeNull();
  });

  it('closes the sheet on Android hardware back, without popping the screen', async () => {
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    await screen.findByRole('button', { name: '새 루틴 만들기' });

    const handled = await pressHardwareBack();
    expect(handled).toBe(true);
    expect(screen.queryByText('새 루틴 만들기')).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('leaves hardware back unhandled (lets the screen pop) when the sheet is closed', async () => {
    await render(<AcupointScreen />);
    await screen.findByText('합곡');

    const handled = await pressHardwareBack();
    expect(handled).toBe(false);
  });

  it('shows an error when the routine list fails to load', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.listUserRoutines.mockRejectedValueOnce(new Error('read failed'));
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    expect(await screen.findByText('불러오지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('shows an error when adding to a routine fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.listUserRoutines.mockResolvedValue([routine('r1', { name: '아침 루틴' })]);
    mocked.saveUserRoutine.mockRejectedValueOnce(new Error('write failed'));
    await render(<AcupointScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '루틴에 추가' }));
    await fireEvent.press(await screen.findByRole('button', { name: /아침 루틴/ }));
    expect(await screen.findByText('추가하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
    consoleError.mockRestore();
  });
});
