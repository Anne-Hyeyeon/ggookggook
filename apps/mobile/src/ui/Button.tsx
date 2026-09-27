import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts, space } from '@/theme';
import { Txt } from './Txt';

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onPress, kind = 'primary', disabled = false }: ButtonProps) {
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

const styles = StyleSheet.create({
  base: { height: space(13), borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
  primary: { backgroundColor: colors.ink },
  secondary: { borderWidth: 1, borderColor: colors.ink },
  dim: { opacity: 0.6 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
});
