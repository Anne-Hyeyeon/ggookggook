import type { Settings, Symptom } from '@ggookggook/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { content } from '@/content';
import { routineSummary, summaryLine, visibleSteps } from '@/routine';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { Txt } from '@/ui/Txt';

export interface SuggestionRowProps {
  symptom: Symptom;
  settings: Settings;
  repeat: number;
  onStart: (symptomId: string, repeat: number) => void;
}

export function SuggestionRow({ symptom, settings, repeat, onStart }: SuggestionRowProps) {
  const styles = useThemedStyles(makeStyles);
  const steps = visibleSteps(symptom, settings);
  const { count, minutes } = routineSummary(steps, repeat);
  const names = steps.map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '').join(' · ');
  // Two sibling Pressables, not one nested in the other: react-native-web renders a
  // `Pressable` with accessibilityRole="button" as an actual <button>, and a <button>
  // inside a <button> is invalid HTML that breaks web hydration.
  return (
    <View style={styles.suggestRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${symptom.name} 미리보기`}
        onPress={() => router.push(`/symptom/${symptom.id}`)}
        style={styles.suggestText}
      >
        <Txt maxFontSizeMultiplier={1.4} style={styles.suggestName}>{symptom.name}</Txt>
        <Txt variant="pointSmall">{names}</Txt>
        <Txt variant="sub">{summaryLine(count, minutes, repeat)}</Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${symptom.name} 시작`}
        hitSlop={10}
        onPress={() => onStart(symptom.id, repeat)}
        style={styles.suggestStart}
      >
        <Txt style={styles.suggestStartLabel}>시작</Txt>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    suggestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3), gap: space(3) },
    suggestText: { flex: 1, gap: space(0.75) },
    suggestName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
    suggestStart: {
      minWidth: space(14),
      height: space(9),
      borderRadius: 2,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(3),
    },
    suggestStartLabel: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.bg },
  });
