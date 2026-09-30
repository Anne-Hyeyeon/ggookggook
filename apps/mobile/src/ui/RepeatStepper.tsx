import { USER_ROUTINE_LIMITS } from '@ggookggook/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { Txt } from './Txt';

interface RepeatStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function RepeatStepper({ value, onDecrement, onIncrement }: RepeatStepperProps) {
  const styles = useThemedStyles(makeStyles);
  const atMin = value <= USER_ROUTINE_LIMITS.repeatMin;
  const atMax = value >= USER_ROUTINE_LIMITS.repeatMax;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ min: USER_ROUTINE_LIMITS.repeatMin, max: USER_ROUTINE_LIMITS.repeatMax, now: value, text: `${value}회` }}
      accessibilityActions={[
        { name: 'increment', label: '반복 늘리기' },
        { name: 'decrement', label: '반복 줄이기' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          if (!atMax) onIncrement();
        } else if (event.nativeEvent.actionName === 'decrement') {
          if (!atMin) onDecrement();
        }
      }}
    >
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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
