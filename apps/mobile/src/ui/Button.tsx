import { Pressable, StyleSheet } from 'react-native';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { Txt } from './Txt';

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onPress, kind = 'primary', disabled = false }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, primary ? styles.primary : styles.secondary, (pressed || disabled) && styles.dim]}
    >
      <Txt style={[styles.label, { color: primary ? colors.bg : colors.ink }]}>{label}</Txt>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    base: { height: space(13), borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
    primary: { backgroundColor: colors.ink },
    secondary: { borderWidth: 1, borderColor: colors.ink },
    dim: { opacity: 0.6 },
    label: { fontFamily: fonts.semibold, fontSize: 15 },
  });
