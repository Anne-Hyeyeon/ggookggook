import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@/ui/Button';
import { Txt } from '@/ui/Txt';

describe('ui primitives', () => {
  it('renders text', async () => {
    await render(<Txt variant="title">어디가 불편하세요?</Txt>);
    expect(screen.getByText('어디가 불편하세요?')).toBeTruthy();
  });

  it('calls onPress and respects disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="시작" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: '시작' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="시작" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: '시작' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
