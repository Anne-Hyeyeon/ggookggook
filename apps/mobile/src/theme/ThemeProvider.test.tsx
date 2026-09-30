import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';
import { useSettings } from '@/state/settings';
import { darkColors, lightColors } from '@/theme';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { scheme, colors } = useTheme();
  return <RN.Text>{`${scheme}:${colors.bg}`}</RN.Text>;
}

let colorSchemeSpy: jest.SpyInstance;

beforeEach(() => {
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  colorSchemeSpy = jest.spyOn(RN, 'useColorScheme');
});

afterEach(() => {
  colorSchemeSpy.mockRestore();
});

it('resolves to the light theme with no provider at all (existing component tests keep the light look)', async () => {
  await render(<Probe />);
  expect(screen.getByText(`light:${lightColors.bg}`)).toBeTruthy();
});

it('follows the system scheme when appearance is "system"', async () => {
  colorSchemeSpy.mockReturnValue('dark');
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, appearance: 'system' } });
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`dark:${darkColors.bg}`)).toBeTruthy();
});

it('falls back to light when the system scheme is unknown, under "system"', async () => {
  colorSchemeSpy.mockReturnValue(null);
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, appearance: 'system' } });
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`light:${lightColors.bg}`)).toBeTruthy();
});

it('forces light regardless of the system scheme when appearance is "light"', async () => {
  colorSchemeSpy.mockReturnValue('dark');
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, appearance: 'light' } });
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`light:${lightColors.bg}`)).toBeTruthy();
});

it('forces dark regardless of the system scheme when appearance is "dark"', async () => {
  colorSchemeSpy.mockReturnValue('light');
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, appearance: 'dark' } });
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`dark:${darkColors.bg}`)).toBeTruthy();
});
