import { buildGuideSegments, rhythmAt, type GuideSegment, type SessionLog } from '@ggookggook/shared';
import { insertSession } from '@ggookggook/store';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { GUIDE_SPEED } from '@/config/env';
import { useDb } from '@/db/DbProvider';
import { useGuide } from '@/guide/useGuide';
import { newId } from '@/id';
import { firstSentence, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽 함께', center: '' } as const;

export default function GuideScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const symptom = content.symptom(id);
  const startedAt = useRef(new Date().toISOString());

  const segments = useMemo<GuideSegment[]>(
    () => (symptom ? buildGuideSegments(visibleSteps(symptom, settings), content.acupoints) : []),
    // Built once per symptom: a settings change mid-routine must not rebuild the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symptom],
  );
  const totalSeconds = useMemo(() => segments.reduce((sum, segment) => sum + segment.seconds, 0), [segments]);

  const onEvent = useCallback(
    (event: 'press' | 'rest' | 'segment') => {
      if (event === 'press') AccessibilityInfo.announceForAccessibility('꾹 누르세요');
      else if (event === 'rest') AccessibilityInfo.announceForAccessibility('잠시 떼세요');
      if (!settings.rhythmHaptics) return;
      if (event === 'press') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (event === 'rest') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [settings.rhythmHaptics],
  );

  const [failedLog, setFailedLog] = useState<SessionLog | null>(null);

  const saveSession = useCallback(
    async (log: SessionLog) => {
      try {
        await insertSession(db, log);
        setFailedLog(null);
        router.replace({ pathname: '/done', params: { sessionId: log.id } });
      } catch (error) {
        console.error('Failed to save the session', error);
        setFailedLog(log);
      }
    },
    [db],
  );

  const onFinish = useCallback(
    async (elapsedTotal: number) => {
      if (!symptom) return;
      const log: SessionLog = {
        id: newId(),
        routine: { kind: 'symptom', symptomId: symptom.id },
        startedAt: startedAt.current,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedTotal,
        feedback: null,
      };
      await saveSession(log);
    },
    [symptom, saveSession],
  );

  const { progress, paused, setPaused } = useGuide({
    segments,
    pressSeconds: settings.pressSeconds,
    restSeconds: settings.restSeconds,
    tickMs: 1000 / GUIDE_SPEED,
    onEvent,
    onFinish,
  });

  const { width, height } = useWindowDimensions();
  const plateSize = Math.min(width - 40, 320, Math.round(height * 0.34));
  const segment = segments[progress.index];
  if (!symptom || !segment) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.body, styles.scrollContent]}>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => router.back()} hitSlop={12}>
            <Txt variant="sub">닫기</Txt>
          </Pressable>
          <Txt variant="body">안내할 혈자리가 없어요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const acupoint = content.requireAcupoint(segment.acupointId);
  const stepCount = new Set(segments.map((s) => s.stepIndex)).size;
  const rhythm = rhythmAt(progress.elapsed, segment.seconds, settings.pressSeconds, settings.restSeconds);
  const doneSeconds = segments.slice(0, progress.index).reduce((sum, s) => sum + s.seconds, 0) + progress.elapsed;
  const next = segments[progress.index + 1];
  const nextLabel = !next
    ? '마지막이에요'
    : next.acupointId === segment.acupointId
      ? `다음 ${SIDE_LABEL[next.side]}`
      : `다음 ${content.acupoints.get(next.acupointId)?.name.ko ?? ''}`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.top}>
            <Txt style={styles.topName}>{symptom.name}</Txt>
            <Txt variant="caption">{`${segment.stepIndex + 1} / ${stepCount}`}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => router.back()} hitSlop={12}>
              <Txt variant="sub">닫기</Txt>
            </Pressable>
          </View>

          <PlateView view={content.plateFor(segment.acupointId)} side={segment.side} size={plateSize} />

          <View style={styles.nameRow}>
            <Txt variant="point">{acupoint.name.ko}</Txt>
            <Txt variant="caption">{acupoint.id}</Txt>
            {SIDE_LABEL[segment.side] !== '' && <Txt style={styles.side}>{SIDE_LABEL[segment.side]}</Txt>}
          </View>
          <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>
        </ScrollView>

        <View style={styles.timer}>
          <Rule strong />
          {failedLog ? (
            <View style={styles.errorBox}>
              <Txt variant="body">기록을 저장하지 못했어요.</Txt>
              <View style={styles.errorButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다시 저장"
                  onPress={() => void saveSession(failedLog)}
                  style={styles.pause}
                >
                  <Txt style={styles.pauseLabel}>다시 저장</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="처음으로"
                  onPress={() => router.dismissTo('/')}
                  style={styles.pause}
                >
                  <Txt style={styles.pauseLabel}>처음으로</Txt>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.timerRow}>
                <Txt variant="number" style={styles.number} accessibilityLiveRegion="polite">{String(rhythm.secondsLeftInPhase)}</Txt>
                <View style={styles.timerText}>
                  <Txt style={styles.action} accessibilityLiveRegion="polite">{rhythm.phase === 'press' ? '꾹 누르세요' : '잠시 떼세요'}</Txt>
                  <Txt variant="sub">{`${rhythm.pressNumber} / ${rhythm.pressCount}회`}</Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={paused ? '계속' : '일시정지'}
                  onPress={() => setPaused(!paused)}
                  style={styles.pause}
                >
                  <Txt style={styles.pauseLabel}>{paused ? '계속' : '일시정지'}</Txt>
                </Pressable>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, (doneSeconds / totalSeconds) * 100)}%` }]} />
              </View>
              <View style={styles.nextRow}>
                <Txt variant="caption">{nextLabel}</Txt>
                <Txt variant="caption">{`약 ${Math.max(1, Math.ceil((totalSeconds - doneSeconds) / 60))}분 남음`}</Txt>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  scrollContent: { padding: space(5), gap: space(3) },
  top: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  topName: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space(2), marginTop: space(2) },
  side: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  timer: { gap: space(3), paddingHorizontal: space(5), paddingBottom: space(5) },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(2) },
  number: { minWidth: 40 },
  timerText: { flex: 1, gap: 2 },
  action: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  pause: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 2,
    paddingHorizontal: space(3),
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  track: { height: 2, backgroundColor: colors.rule },
  fill: { height: 2, backgroundColor: colors.accent },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  errorBox: { gap: space(3), paddingTop: space(2) },
  errorButtons: { flexDirection: 'row', gap: space(3) },
});
