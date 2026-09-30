import type { Settings, UserRoutine } from '@ggookggook/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { routineSummary, summaryLine, visibleStepsFor } from '@/routine';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { Txt } from '@/ui/Txt';

export interface MyRoutineChipProps {
  routine: UserRoutine;
  settings: Settings;
}

export function MyRoutineChip({ routine, settings }: MyRoutineChipProps) {
  const styles = useThemedStyles(makeStyles);
  const { count, minutes } = routineSummary(visibleStepsFor(routine.steps, settings), routine.repeat);
  const summary = summaryLine(count, minutes, routine.repeat);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}, ${summary}`}
      onPress={() => router.push(`/routine/${routine.id}`)}
      style={styles.myRoutineChip}
    >
      <Txt maxFontSizeMultiplier={1.4} style={styles.myRoutineName}>{routine.name}</Txt>
      <Txt variant="caption">{summary}</Txt>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    myRoutineChip: {
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: 2,
      minHeight: space(11),
      paddingHorizontal: space(3.5),
      paddingVertical: space(1.5),
      justifyContent: 'center',
      gap: space(0.5),
    },
    myRoutineName: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  });
