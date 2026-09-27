import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import RegionScreen from '../app/region/[mapId]/[regionId]';

let mockParams: { mapId: string; regionId: string } = { mapId: 'body-front', regionId: 'hand' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { mapId: 'body-front', regionId: 'hand' };
});

it('lists the acupoints of every plate linked to 손 and navigates to one', async () => {
  await render(<RegionScreen />);
  expect(screen.getByText('손')).toBeTruthy();
  expect(screen.getByText('손목 안쪽')).toBeTruthy();
  expect(screen.getByText('손등')).toBeTruthy();
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('후계')).toBeTruthy();
  expect(screen.getByText('내관')).toBeTruthy();
  await fireEvent.press(screen.getByText('합곡'));
  expect(router.push).toHaveBeenCalledWith('/acupoint/LI4');
});

it('navigates back', async () => {
  await render(<RegionScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});

it('handles an unknown map or region without crashing', async () => {
  mockParams = { mapId: 'body-front', regionId: 'nope' };
  await render(<RegionScreen />);
  expect(screen.getByText('찾을 수 없는 부위예요.')).toBeTruthy();

  mockParams = { mapId: 'nope', regionId: 'hand' };
  await render(<RegionScreen />);
  expect(screen.getAllByText('찾을 수 없는 부위예요.').length).toBeGreaterThan(0);
});
