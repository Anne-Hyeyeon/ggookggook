import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const NOTICES = [
  '꾹꾹은 지압 방법을 안내하는 앱이에요. 진단이나 치료를 대신하지 않아요.',
  '통증이 심하거나 오래가면 병원 진료를 받으세요.',
  '지병이 있으면 전문가와 먼저 상의하세요.',
  '상처나 염증, 부기가 있는 곳은 누르지 마세요.',
];

export default function WelcomeScreen() {
  const db = useDb();
  const { settings, update } = useSettings();
  const accept = useOnboarding((state) => state.accept);
  const [step, setStep] = useState<0 | 1>(0);
  const [saveError, setSaveError] = useState(false);
  const cat = content.image('cat-shoulder');

  const handlePregnancyChange = useCallback(
    (value: boolean) => {
      setSaveError(false);
      update(db, { pregnancyMode: value }).catch((error: unknown) => {
        console.error('Failed to save the pregnancy setting', error);
        setSaveError(true);
      });
    },
    [db, update],
  );

  const handleAccept = useCallback(() => {
    setSaveError(false);
    accept(db).catch((error: unknown) => {
      console.error('Failed to accept the disclaimer', error);
      setSaveError(true);
    });
  }, [db, accept]);

  if (step === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.intro}>
          {cat !== null && <Image source={cat} style={styles.cat} contentFit="contain" accessibilityIgnoresInvertColors />}
          <Txt variant="title">꾹꾹</Txt>
          <Txt variant="body" style={styles.center}>
            불편한 곳을 고르면{'\n'}누를 곳을 순서대로 알려드려요.
          </Txt>
        </View>
        <View style={styles.footer}>
          <Button label="다음" onPress={() => setStep(1)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="heading">시작하기 전에 확인해 주세요</Txt>
        <View style={styles.list}>
          {NOTICES.map((notice) => (
            <View key={notice} style={styles.notice}>
              <Rule />
              <Txt variant="body" style={styles.noticeText}>
                {notice}
              </Txt>
            </View>
          ))}
          <Rule />
        </View>
        <View style={styles.toggle}>
          <View style={styles.toggleText}>
            <Txt variant="body">임신 중이에요</Txt>
            <Txt variant="sub">켜면 임신 중 피해야 할 혈자리를 빼고 안내해요.</Txt>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="임신 중이에요"
            value={settings.pregnancyMode}
            onValueChange={handlePregnancyChange}
            trackColor={{ true: colors.accent, false: colors.rule }}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {saveError && (
          <Txt variant="sub" style={styles.error}>
            저장하지 못했어요. 다시 눌러 주세요.
          </Txt>
        )}
        <Button label="확인했어요" onPress={handleAccept} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(4), padding: space(8) },
  cat: { width: 220, height: 220 },
  center: { textAlign: 'center', color: colors.sub },
  body: { padding: space(6), gap: space(6) },
  list: { gap: 0 },
  notice: { gap: space(3), paddingTop: 0 },
  noticeText: { paddingVertical: space(3) },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  toggleText: { flex: 1, gap: space(1) },
  footer: { padding: space(5), gap: space(2) },
  error: { color: colors.accent, textAlign: 'center' },
});
