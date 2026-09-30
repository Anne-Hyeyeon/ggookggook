import { StyleSheet, View } from 'react-native';
import type { Colors } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export function Rule({ strong = false }: { strong?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={strong ? styles.strong : styles.hairline} />;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule },
    strong: { height: 1.5, backgroundColor: colors.ink },
  });
