import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/state/settings';
import { colorSchemes, type ColorScheme, type Colors } from '@/theme';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: Colors;
}

const defaultTheme: ThemeContextValue = { scheme: 'light', colors: colorSchemes.light };

// Exported so a test can force a scheme via `<ThemeContext.Provider value={...}>`; the light default matches unprovided renders, so existing component tests stay pixel-identical.
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
