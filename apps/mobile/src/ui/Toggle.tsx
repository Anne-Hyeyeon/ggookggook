import { Platform, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space } from '@/theme';
import { Txt } from './Txt';

// react-native-web's Switch ignores `thumbColor` for the on-state thumb; `activeThumbColor` is
// its web-only fix. It isn't part of RN's SwitchProps type, so it's spread in through a
// platform-guarded object instead of a direct JSX prop, to avoid a TS error on native builds.
const webActiveThumbColorProps: { activeThumbColor?: string } =
  Platform.OS === 'web' ? { activeThumbColor: colors.card } : {};

interface ToggleProps {
  label: string;
  sub?: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export function Toggle({ label, sub, value, disabled, onValueChange, style }: ToggleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <Txt variant="body">{label}</Txt>
        {sub && <Txt variant="sub">{sub}</Txt>}
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.rule }}
        thumbColor={colors.card}
        {...webActiveThumbColorProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  text: { flex: 1, gap: space(1) },
});
