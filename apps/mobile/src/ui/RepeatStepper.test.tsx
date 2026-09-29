import { fireEvent, render, screen } from '@testing-library/react-native';
import { RepeatStepper } from '@/ui/RepeatStepper';

it('shows the current value and calls onDecrement/onIncrement', async () => {
  const onDecrement = jest.fn();
  const onIncrement = jest.fn();
  await render(<RepeatStepper value={3} onDecrement={onDecrement} onIncrement={onIncrement} />);
  expect(screen.getByText('3회')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '반복 줄이기' }));
  expect(onDecrement).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByRole('button', { name: '반복 늘리기' }));
  expect(onIncrement).toHaveBeenCalledTimes(1);
});

it('disables 반복 줄이기 at 1', async () => {
  const onDecrement = jest.fn();
  await render(<RepeatStepper value={1} onDecrement={onDecrement} onIncrement={jest.fn()} />);
  const decrement = screen.getByRole('button', { name: '반복 줄이기' });
  expect(decrement.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(decrement);
  expect(onDecrement).not.toHaveBeenCalled();
});

it('disables 반복 늘리기 at 5', async () => {
  const onIncrement = jest.fn();
  await render(<RepeatStepper value={5} onDecrement={jest.fn()} onIncrement={onIncrement} />);
  const increment = screen.getByRole('button', { name: '반복 늘리기' });
  expect(increment.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(increment);
  expect(onIncrement).not.toHaveBeenCalled();
});
