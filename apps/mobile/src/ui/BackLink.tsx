import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Txt } from './Txt';

export function BackLink() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => router.back()} hitSlop={12}>
      <Txt variant="sub">← 뒤로</Txt>
    </Pressable>
  );
}
