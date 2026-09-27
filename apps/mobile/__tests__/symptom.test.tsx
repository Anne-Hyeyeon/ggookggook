import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import SymptomScreen from '../app/symptom/[id]';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'headache' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'headache' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
});

it('shows the routine, the pregnancy caution, and when to see a doctor', async () => {
  await render(<SymptomScreen />);
  expect(screen.getByText('두통')).toBeTruthy();
  expect(screen.getByText('머리 아플 때')).toBeTruthy();
  expect(screen.getByText('3곳 · 약 4분')).toBeTruthy();
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('임신 중이면 합곡은 누르지 마세요.')).toBeTruthy();
  expect(screen.getByText('이럴 땐 병원에 가세요')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '시작' }));
  expect(router.push).toHaveBeenCalledWith('/guide/headache');
});

it('leaves out contraindicated points in pregnancy mode and says so', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  await render(<SymptomScreen />);
  expect(screen.queryByText('합곡')).toBeNull();
  expect(screen.getByText('임신 중이라 합곡은 뺐어요.')).toBeTruthy();
  expect(screen.getByText('2곳 · 약 2분')).toBeTruthy();
});

it('handles an unknown symptom', async () => {
  mockParams = { id: 'nope' };
  await render(<SymptomScreen />);
  expect(screen.getByText('찾을 수 없는 증상이에요.')).toBeTruthy();
});
