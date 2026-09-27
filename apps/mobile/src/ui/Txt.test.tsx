import { render, screen } from '@testing-library/react-native';
import { Txt } from '@/ui/Txt';

it('renders text', async () => {
  await render(<Txt variant="title">어디가 불편하세요?</Txt>);
  expect(screen.getByText('어디가 불편하세요?')).toBeTruthy();
});

it('applies a word-keeping line-break strategy for Korean text', async () => {
  await render(<Txt>적당합니다</Txt>);
  expect(screen.getByText('적당합니다').props.lineBreakStrategyIOS).toBe('hangul-word');
});

it('clamps the display variant to a tighter font scale than the other clamped variants', async () => {
  await render(<Txt variant="display">꾹꾹</Txt>);
  expect(screen.getByText('꾹꾹').props.maxFontSizeMultiplier).toBe(1.3);
});

it('leaves body text unclamped', async () => {
  await render(<Txt variant="body">본문</Txt>);
  expect(screen.getByText('본문').props.maxFontSizeMultiplier).toBeUndefined();
});
