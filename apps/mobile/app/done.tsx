import type { SessionFeedback, SessionLog } from '@ggookggook/shared';
import { getSession, setSessionFeedback } from '@ggookggook/store';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDuration } from '@/format';
import { visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Txt } from '@/ui/Txt';

const OPTIONS: { value: SessionFeedback; label: string }[] = [
  { value: 'better', label: '나아졌어요' },
  { value: 'same', label: '비슷해요' },
  { value: 'worse', label: '더 불편해요' },
];

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [session, setSession] = useState<SessionLog | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSession(db, sessionId)
      .then((loaded) => {
        if (cancelled) return;
        setSession(loaded);
        // A feedback choice the user already made while this was loading must win.
        setFeedback((current) => current ?? loaded?.feedback ?? null);
      })
      .catch((error) => {
        console.error('Failed to load the session', error);
      });
    return () => {
      cancelled = true;
    };
    // db is a stable context value in production; only reload when the session id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const symptom = session?.routine.kind === 'symptom' ? content.symptom(session.routine.symptomId) : undefined;
  const names = symptom
    ? visibleSteps(symptom, settings)
        .map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '')
        .filter(Boolean)
        .join(' · ')
    : '';
  const cat = content.image('cat-shoulder');

  const choose = (value: SessionFeedback) => {
    setFeedback(value);
    setSessionFeedback(db, sessionId, value).catch((error) => {
      console.error('Failed to save the feedback', error);
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        {cat !== null && <Image source={cat} style={styles.cat} contentFit="contain" accessibilityIgnoresInvertColors />}
        <Txt variant="heading" style={styles.center}>
          {symptom ? `${symptom.name} 루틴을 마쳤어요` : '루틴을 마쳤어요'}
        </Txt>
        {names !== '' && (
          <Txt variant="pointSmall" style={styles.center}>
            {names}
          </Txt>
        )}
        {session && (
          <Txt variant="sub" style={styles.center}>
            {formatDuration(session.durationSeconds)}
          </Txt>
        )}

        <Txt style={styles.question}>지금은 좀 어때요?</Txt>
        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const selected = feedback === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => choose(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Txt style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="처음으로" onPress={() => router.dismissTo('/')} style={styles.home}>
        <Txt variant="sub" style={styles.homeLabel}>
          처음으로
        </Txt>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space(6), gap: space(2) },
  cat: { width: 200, height: 200, marginBottom: space(2) },
  center: { textAlign: 'center' },
  question: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(6) },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space(2), marginTop: space(2) },
  option: { borderWidth: 1, borderColor: colors.ink, borderRadius: 2, paddingHorizontal: space(3), paddingVertical: space(2.5) },
  optionSelected: { backgroundColor: colors.ink },
  optionLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  optionLabelSelected: { color: colors.bg },
  home: { alignItems: 'center', padding: space(6) },
  homeLabel: { textDecorationLine: 'underline' },
});
