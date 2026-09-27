import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { Txt } from '@/ui/Txt';

export default function BrowseScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Txt variant="heading">찾아보기</Txt>
        <Txt variant="sub">전신 지도는 곧 열려요.</Txt>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(2) },
});
