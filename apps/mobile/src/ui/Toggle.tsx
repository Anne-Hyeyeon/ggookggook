import { Platform, StyleSheet, Switch, View } from 'react-native';
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
  onValueChange: (value: boolean) => void;
}

export function Toggle({ label, sub, value, onValueChange }: ToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Txt variant="body">{label}</Txt>
        {sub && <Txt variant="sub">{sub}</Txt>}
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
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
