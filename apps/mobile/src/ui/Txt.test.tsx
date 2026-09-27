import { render, screen } from '@testing-library/react-native';
import { Txt } from '@/ui/Txt';

it('renders text', async () => {
  await render(<Txt variant="title">어디가 불편하세요?</Txt>);
  expect(screen.getByText('어디가 불편하세요?')).toBeTruthy();
});
