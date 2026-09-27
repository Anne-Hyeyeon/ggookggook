import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import BrowseScreen from '../app/(tabs)/browse';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows the front-side regions as rows and navigates to one', async () => {
  await render(<BrowseScreen />);
  expect(screen.getByText('손 · 혈자리 5곳')).toBeTruthy();
  await fireEvent.press(screen.getByText('손 · 혈자리 5곳'));
  expect(router.push).toHaveBeenCalledWith('/region/body-front/hand');
});

it('shows an accessible hit area for each positioned region on the map image', async () => {
  await render(<BrowseScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '손' }));
  expect(router.push).toHaveBeenCalledWith('/region/body-front/hand');
});

it('switches to the back side, showing the placeholder caption and its regions', async () => {
  await render(<BrowseScreen />);
  await fireEvent.press(screen.getByText('뒷면'));
  expect(screen.getByText('뒷면 그림은 준비 중이에요.')).toBeTruthy();
  expect(screen.getByText('등 · 혈자리 2곳')).toBeTruthy();
  await fireEvent.press(screen.getByText('등 · 혈자리 2곳'));
  expect(router.push).toHaveBeenCalledWith('/region/body-back/upper-back');
});
