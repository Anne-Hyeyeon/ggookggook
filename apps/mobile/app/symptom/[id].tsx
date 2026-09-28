import { saveUserRoutine } from '@ggookggook/store';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { ROUTINE_DISCLAIMER } from '@/disclaimers';
import { newId } from '@/id';
import { routineSummary, sideLabel, topic, visibleSteps } from '@/routine';
import { copySymptomToUserRoutine } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const nameOf = (id: string) => content.acupoints.get(id)?.name.ko ?? id;

export default function SymptomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const symptom = content.symptom(id);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = useCallback(() => {
    if (!symptom) return;
    setCopyError(false);
    setCopying(true);
    const now = new Date();
    const routineId = newId();
    saveUserRoutine(db, copySymptomToUserRoutine(symptom, routineId, now.toISOString()), now)
      .then(() => {
        router.push(`/routine/${routineId}/edit`);
      })
      .catch((error: unknown) => {
        console.error('Failed to copy the symptom into a routine', error);
        setCopyError(true);
      })
      .finally(() => setCopying(false));
  }, [db, symptom]);

  if (!symptom) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink onPress={() => router.back()} />
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
        <BackLink onPress={() => router.back()} />
        <View style={styles.head}>
          <Txt variant="title" numberOfLines={2}>{symptom.name}</Txt>
          <Txt style={styles.summary}>{`${count}곳 · 약 ${minutes}분`}</Txt>
        </View>

        <View>
          {steps.map((step, index) => {
            const acupoint = content.requireAcupoint(step.acupointId);
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
        {copyError && (
          <Txt variant="sub" style={styles.error}>
            저장하지 못했어요. 다시 눌러 주세요.
          </Txt>
        )}

        <View style={styles.doctor}>
          <Rule strong />
          <Txt style={styles.doctorTitle}>이럴 땐 병원에 가세요</Txt>
          <Txt variant="sub">{symptom.seeDoctor}</Txt>
        </View>

        <Txt variant="caption">{ROUTINE_DISCLAIMER}</Txt>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="시작" onPress={() => router.push(`/guide/${symptom.id}`)} disabled={steps.length === 0} />
        <Button
          label={copying ? '복사하는 중…' : '내 루틴으로 복사'}
          kind="secondary"
          onPress={handleCopy}
          disabled={copying}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
  head: { gap: space(1.5) },
  summary: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent, marginTop: space(1) },
  step: { flexDirection: 'row', gap: space(3), paddingVertical: space(3.5) },
  stepNo: { width: space(5), paddingTop: space(2.5) },
  stepText: { flex: 1, gap: space(1) },
  stepName: { flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) },
  pointName: { fontSize: 21, lineHeight: 28 },
  seconds: { textAlign: 'right', paddingTop: space(2) },
  caution: { color: colors.accent },
  doctor: { gap: space(2) },
  doctorTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(2) },
  error: { color: colors.accent },
  footer: { padding: space(5), paddingTop: space(2), gap: space(3) },
});
