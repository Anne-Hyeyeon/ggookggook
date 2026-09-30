import type { Pin, Plate } from '@ggookggook/shared';
import { render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';
import type { PlateView as PlateData } from '@/content';
import { darkColors } from '@/theme';
import { ThemeContext } from '@/theme/ThemeProvider';
import { PlateView } from '@/ui/PlateView';

const pin: Pin = { acupointId: 'LI4', x: 0.6, y: 0.3, side: 'right' };

function plate(depicts: Plate['depicts']): Plate {
  return { id: 'hand', name: '손', subject: 's', depicts, acupointIds: ['LI4'], pins: [pin] };
}

function view(depicts: Plate['depicts']): PlateData {
  return { plate: plate(depicts), pins: [pin], image: 7 };
}

it('renders a halo behind the pin dot', async () => {
  await render(<PlateView view={view('right')} side="right" size={200} />);
  expect(screen.getByTestId('halo')).toBeTruthy();
  expect(screen.getByTestId('pin')).toBeTruthy();
});

it('does not mirror when the segment side matches the plate depicts side', async () => {
  await render(<PlateView view={view('right')} side="right" size={200} />);
  const imageStyle = StyleSheet.flatten(screen.getByTestId('plate-image').props.style);
  expect(imageStyle.transform).toBeUndefined();

  const pinNode = screen.getByTestId('pin').parent;
  const pinStyle = StyleSheet.flatten(pinNode?.props.style);
  expect(pinStyle.left).toBeCloseTo(0.6 * 200 - pinStyle.width / 2);
});

it('mirrors the image and pin x when the plate depicts the opposite side of the segment', async () => {
  await render(<PlateView view={view('left')} side="right" size={200} />);
  const imageStyle = StyleSheet.flatten(screen.getByTestId('plate-image').props.style);
  expect(imageStyle.transform).toEqual([{ scaleX: -1 }]);

  const pinNode = screen.getByTestId('pin').parent;
  const pinStyle = StyleSheet.flatten(pinNode?.props.style);
  expect(pinStyle.left).toBeCloseTo((1 - 0.6) * 200 - pinStyle.width / 2);
});

it('does not mirror a plate depicting both sides', async () => {
  await render(<PlateView view={view('both')} side="right" size={200} />);
  const imageStyle = StyleSheet.flatten(screen.getByTestId('plate-image').props.style);
  expect(imageStyle.transform).toBeUndefined();
});

it('does not mirror when the segment side is both or center', async () => {
  await render(<PlateView view={view('left')} side="both" size={200} />);
  const imageStyle = StyleSheet.flatten(screen.getByTestId('plate-image').props.style);
  expect(imageStyle.transform).toBeUndefined();
});

it('leaves the plate image untinted in the default (light) theme', async () => {
  await render(<PlateView view={view('right')} side="right" size={200} />);
  expect(screen.getByTestId('plate-image').props.tintColor).toBeUndefined();
});

it('tints the plate image with the dark line token in dark mode', async () => {
  await render(
    <ThemeContext.Provider value={{ scheme: 'dark', colors: darkColors }}>
      <PlateView view={view('right')} side="right" size={200} />
    </ThemeContext.Provider>,
  );
  // expo-image (like RN's own Image) runs a color prop through processColor into a packed
  // int, so this compares against that same processing rather than the raw hex string.
  expect(screen.getByTestId('plate-image').props.tintColor).toBe(processColor(darkColors.line));
});

it('renders a placeholder when there is no plate', async () => {
  await render(<PlateView view={null} side="left" size={200} />);
  expect(screen.getByText('그림 준비 중')).toBeTruthy();
});
