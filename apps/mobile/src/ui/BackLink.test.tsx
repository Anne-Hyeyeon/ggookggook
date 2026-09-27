import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackLink } from './BackLink';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

it('renders a back link that navigates back', async () => {
  await render(<BackLink />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});
