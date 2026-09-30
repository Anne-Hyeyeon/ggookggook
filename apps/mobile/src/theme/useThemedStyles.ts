import { useMemo } from 'react';
import type { Colors } from '@/theme';
import { useTheme } from './ThemeProvider';

// `makeStyles` is expected to be a stable, module-scope reference (the usual
// `const makeStyles = (colors: Colors) => StyleSheet.create({...})` factory), so it is safe to
// list in the dependency array: the memo only recomputes when the resolved theme's colors change.
export function useThemedStyles<T>(makeStyles: (colors: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors, makeStyles]);
}
