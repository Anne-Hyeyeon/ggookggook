import { fireEvent, render, screen } from '@testing-library/react-native';
import { Toggle } from '@/ui/Toggle';

it('renders the label and sub text, and reports its value through the switch', async () => {
  const onValueChange = jest.fn();
  await render(<Toggle label="임신 중이에요" sub="켜면 빼고 안내해요." value={false} onValueChange={onValueChange} />);
  expect(screen.getByText('임신 중이에요')).toBeTruthy();
  expect(screen.getByText('켜면 빼고 안내해요.')).toBeTruthy();
  expect(screen.getByRole('switch', { name: '임신 중이에요' }).props.value).toBe(false);

  await fireEvent(screen.getByRole('switch', { name: '임신 중이에요' }), 'valueChange', true);
  expect(onValueChange).toHaveBeenCalledWith(true);
});

it('omits the sub text when none is given', async () => {
  await render(<Toggle label="리듬 진동" value onValueChange={jest.fn()} />);
  expect(screen.getByRole('switch', { name: '리듬 진동' }).props.value).toBe(true);
});
