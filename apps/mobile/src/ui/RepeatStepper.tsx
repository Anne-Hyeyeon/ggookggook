import { USER_ROUTINE_LIMITS } from '@ggookggook/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/theme';
import { Txt } from './Txt';

interface RepeatStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function RepeatStepper({ value, onDecrement, onIncrement }: RepeatStepperProps) {
  const atMin = value <= USER_ROUTINE_LIMITS.repeatMin;
  const atMax = value >= USER_ROUTINE_LIMITS.repeatMax;
  return (
    <View style={styles.row}>
      <Txt variant="body">반복</Txt>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="반복 줄이기"
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          hitSlop={8}
          onPress={onDecrement}
          style={({ pressed }) => [styles.stepButton, (pressed || atMin) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>−</Txt>
        </Pressable>
        <Txt variant="body" style={styles.stepValue}>{`${value}회`}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="반복 늘리기"
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          hitSlop={8}
          onPress={onIncrement}
          style={({ pressed }) => [styles.stepButton, (pressed || atMax) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>+</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  stepButton: {
    width: space(8),
    height: space(8),
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDim: { opacity: 0.3 },
  stepSymbol: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  stepValue: { minWidth: 40, textAlign: 'center' },
});
