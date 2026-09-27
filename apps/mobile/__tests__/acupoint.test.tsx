import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AcupointScreen from '../app/acupoint/[id]';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'LI4' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'LI4' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
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
  expect(screen.getByText('두통')).toBeTruthy();
  await fireEvent.press(screen.getByText('두통'));
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
