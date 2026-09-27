import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function Rule({ strong = false }: { strong?: boolean }) {
  return <View style={strong ? styles.strong : styles.hairline} />;
}

const styles = StyleSheet.create({
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule },
  strong: { height: 1.5, backgroundColor: colors.ink },
});
