import { Pressable } from 'react-native';
import { Txt } from './Txt';

interface BackLinkProps {
  onPress: () => void;
}

export function BackLink({ onPress }: BackLinkProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onPress} hitSlop={12}>
      <Txt variant="sub">← 뒤로</Txt>
    </Pressable>
  );
}
