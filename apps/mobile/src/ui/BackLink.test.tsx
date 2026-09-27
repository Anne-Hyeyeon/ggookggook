import { fireEvent, render, screen } from '@testing-library/react-native';
import { BackLink } from './BackLink';

it('renders a back link that calls its onPress', async () => {
  const onPress = jest.fn();
  await render(<BackLink onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(onPress).toHaveBeenCalled();
});
