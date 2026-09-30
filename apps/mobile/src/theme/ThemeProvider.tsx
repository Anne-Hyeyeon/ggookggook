import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/state/settings';
import { colorSchemes, type ColorScheme, type Colors } from '@/theme';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: Colors;
}

const defaultTheme: ThemeContextValue = { scheme: 'light', colors: colorSchemes.light };

// Exported so a test can render a forced scheme directly (`<ThemeContext.Provider value={...}>`)
// without going through settings/system-scheme plumbing. The default value (light) is what any
// component gets when rendered without a provider at all, which is how most component tests
// render today, so the light look stays pixel-identical for them without extra test setup.
export const ThemeContext = createContext<ThemeContextValue>(defaultTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const appearance = useSettings((state) => state.settings.appearance);
  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme = appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;
    return { scheme, colors: colorSchemes[scheme] };
  }, [appearance, systemScheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
