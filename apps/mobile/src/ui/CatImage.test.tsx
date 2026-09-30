import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { darkColors, lightColors } from '@/theme';
import { ThemeContext } from '@/theme/ThemeProvider';
import { CatImage } from './CatImage';

it('renders the image directly, with no backing, in the default (light) theme', async () => {
  await render(<CatImage source={1} style={{ width: 100, height: 100 }} />);
  expect(screen.queryByTestId('cat-backing')).toBeNull();
  expect(screen.getByTestId('cat-image')).toBeTruthy();
});

it('renders a light-bg-colored, clipped backing behind the image in dark mode', async () => {
  await render(
    <ThemeContext.Provider value={{ scheme: 'dark', colors: darkColors }}>
      <CatImage source={1} style={{ width: 100, height: 100 }} />
    </ThemeContext.Provider>,
  );
  const backing = screen.getByTestId('cat-backing');
  const backingStyle = StyleSheet.flatten(backing.props.style);
  expect(backingStyle.backgroundColor).toBe(lightColors.bg);
  expect(backingStyle.overflow).toBe('hidden');
  expect(screen.getByTestId('cat-image')).toBeTruthy();
});
