import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { routineSummary, sideLabel, topic, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const nameOf = (id: string) => content.acupoints.get(id)?.name.ko ?? id;

export default function SymptomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings((state) => state.settings);
  const symptom = content.symptom(id);

  if (!symptom) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink />
          <Txt variant="body">찾을 수 없는 증상이에요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const steps = visibleSteps(symptom, settings);
  const { count, minutes } = routineSummary(steps);
  const contraindicated = symptom.steps
    .filter((step) => content.acupoints.get(step.acupointId)?.cautions.includes('pregnancy'))
    .map((step) => nameOf(step.acupointId));
  const cautionText =
    contraindicated.length === 0
      ? null
      : settings.pregnancyMode
        ? `임신 중이라 ${topic(contraindicated.join(', '))} 뺐어요.`
        : `임신 중이면 ${topic(contraindicated.join(', '))} 누르지 마세요.`;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink />
        <View style={styles.head}>
          <Txt variant="title">{symptom.name}</Txt>
          {symptom.aliases.length > 0 && <Txt variant="sub">{symptom.aliases.join(' · ')}</Txt>}
          <Txt style={styles.summary}>{`${count}곳 · 약 ${minutes}분`}</Txt>
        </View>

        <View>
          {steps.map((step, index) => {
            const acupoint = content.acupoints.get(step.acupointId)!;
            const sides = sideLabel(acupoint.sides);
            return (
              <View key={step.acupointId}>
                <Rule />
                <View style={styles.step}>
                  <Txt variant="caption" style={styles.stepNo}>{String(index + 1).padStart(2, '0')}</Txt>
                  <View style={styles.stepText}>
                    <View style={styles.stepName}>
                      <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
                      <Txt variant="caption">{acupoint.name.hanja}</Txt>
                    </View>
                    <Txt variant="sub">{acupoint.location}</Txt>
                  </View>
                  <Txt variant="caption" style={styles.seconds}>
                    {`${step.seconds}초${acupoint.sides === 'sequential' ? '씩' : ''}${sides ? `\n${sides}` : ''}`}
                  </Txt>
                </View>
              </View>
            );
          })}
          <Rule />
        </View>

        {cautionText && <Txt variant="sub" style={styles.caution}>{cautionText}</Txt>}

        <View style={styles.doctor}>
          <Rule strong />
          <Txt style={styles.doctorTitle}>이럴 땐 병원에 가세요</Txt>
          <Txt variant="sub">{symptom.seeDoctor}</Txt>
        </View>

        <Txt variant="caption">지압은 불편함을 덜어줄 수 있지만 진료를 대신하지 않아요.</Txt>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="시작" onPress={() => router.push(`/guide/${symptom.id}`)} disabled={steps.length === 0} />
      </View>
    </SafeAreaView>
  );
}

function BackLink() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => router.back()} hitSlop={12}>
      <Txt variant="sub">← 뒤로</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
  head: { gap: space(1.5) },
  summary: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent, marginTop: space(1) },
  step: { flexDirection: 'row', gap: space(3), paddingVertical: space(3.5) },
  stepNo: { width: 20, paddingTop: 10 },
  stepText: { flex: 1, gap: space(1) },
  stepName: { flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) },
  pointName: { fontSize: 21, lineHeight: 28 },
  seconds: { textAlign: 'right', paddingTop: 8 },
  caution: { color: colors.accent },
  doctor: { gap: space(2) },
  doctorTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(2) },
  footer: { padding: space(5), paddingTop: space(2) },
});
