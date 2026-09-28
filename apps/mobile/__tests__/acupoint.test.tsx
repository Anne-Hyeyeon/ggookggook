import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AcupointScreen from '../app/acupoint/[id]';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'LI4' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});

const toggle = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  toggle.mockResolvedValue(undefined);
  mockParams = { id: 'LI4' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  useFavorites.setState({ loaded: true, ids: new Set(), toggle });
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
