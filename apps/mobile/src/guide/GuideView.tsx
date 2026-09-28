import { buildGuideSegments, rhythmAt, type GuideSegment, type RoutineStep, type SessionLog } from '@ggookggook/shared';
import { insertSession } from '@ggookggook/store';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { GUIDE_SPEED } from '@/config/env';
import { useDb } from '@/db/DbProvider';
import { useGuide } from '@/guide/useGuide';
import { newId } from '@/id';
import { firstSentence } from '@/routine';
import { toSessionRoutineRef, type RoutineRef } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽 함께', center: '' } as const;

export interface GuideViewProps {
  routineRef: RoutineRef;
  title: string;
  steps: RoutineStep[];
}

export function GuideView({ routineRef, title, steps }: GuideViewProps) {
  useKeepAwake();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const startedAt = useRef(new Date().toISOString());

  const segments = useMemo<GuideSegment[]>(() => buildGuideSegments(steps, content.acupoints), [steps]);
  const totalSeconds = useMemo(() => segments.reduce((sum, segment) => sum + segment.seconds, 0), [segments]);

  // The engine emits ['segment', 'press'] together on a segment change: the Success
  // notification below already marks the change, so the immediately following press
  // event skips its own Heavy impact instead of doubling up in the same tick.
  const skipNextPressHaptic = useRef(false);

  const onEvent = useCallback(
    (event: 'press' | 'rest' | 'segment') => {
      if (event === 'press') AccessibilityInfo.announceForAccessibility('꾹 누르세요');
      else if (event === 'rest') AccessibilityInfo.announceForAccessibility('잠시 떼세요');
      if (!settings.rhythmHaptics) return;
      if (event === 'segment') {
        skipNextPressHaptic.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      if (event === 'press') {
        const skip = skipNextPressHaptic.current;
        skipNextPressHaptic.current = false;
        if (skip) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        return;
      }
      skipNextPressHaptic.current = false;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [settings.rhythmHaptics],
  );

  const [failedLog, setFailedLog] = useState<SessionLog | null>(null);
  const [saving, setSaving] = useState(false);
  // Guards a save that outlives the screen (the user left through some other path while
  // insertSession was still pending): its resolution must not set state or navigate.
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const saveSession = useCallback(
    async (log: SessionLog) => {
      setSaving(true);
      try {
        await insertSession(db, log);
        if (!isMounted.current) return;
        setFailedLog(null);
        router.replace({ pathname: '/done', params: { sessionId: log.id } });
      } catch (error) {
        if (!isMounted.current) return;
        console.error('Failed to save the session', error);
        setFailedLog(log);
      } finally {
        if (isMounted.current) setSaving(false);
      }
    },
    [db],
  );

  const onFinish = useCallback(
    async (elapsedTotal: number) => {
      const log: SessionLog = {
        id: newId(),
        routine: toSessionRoutineRef(routineRef),
        startedAt: startedAt.current,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedTotal,
        feedback: null,
      };
      await saveSession(log);
    },
    [routineRef, saveSession],
  );

  const { progress, paused, setPaused } = useGuide({
    segments,
    pressSeconds: settings.pressSeconds,
    restSeconds: settings.restSeconds,
    tickMs: 1000 / GUIDE_SPEED,
    onEvent,
    onFinish,
  });

  const [confirmClose, setConfirmClose] = useState(false);
  const pausedBeforeConfirm = useRef(false);

  const handleClosePress = useCallback(() => {
    // A session save in flight must not be abandoned mid-write: 닫기 (and hardware back,
    // which funnels through here too) does nothing until it settles.
    if (saving) return;
    const started = progress.index > 0 || progress.elapsed > 0;
    if (!started) {
      router.back();
      return;
    }
    pausedBeforeConfirm.current = paused;
    setPaused(true);
    setConfirmClose(true);
  }, [saving, progress.index, progress.elapsed, paused, setPaused]);

  const handleContinueRoutine = useCallback(() => {
    setConfirmClose(false);
    setPaused(pausedBeforeConfirm.current);
  }, [setPaused]);

  const handleQuit = useCallback(() => {
    setConfirmClose(false);
    router.back();
  }, []);

  // Android hardware back must go through the same close logic as the 닫기 button, not bypass
  // it: continue the confirmation if it's open, otherwise treat it exactly like a 닫기 press.
  useFocusEffect(
    useCallback(() => {
      // BackHandler has no web implementation; registering there only logs a console error.
      if (Platform.OS === 'web') return;
      const onBackPress = () => {
        if (confirmClose) {
          handleContinueRoutine();
          return true;
        }
        handleClosePress();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [confirmClose, handleClosePress, handleContinueRoutine]),
  );

  const { width, height } = useWindowDimensions();
  const plateSize = Math.min(width - 40, 320, Math.round(height * 0.34));
  const segment = segments[progress.index];
  if (!segment) {
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
      <View testID="guide-body" style={styles.body} importantForAccessibility={confirmClose ? 'no-hide-descendants' : 'auto'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.top}>
            <Txt style={styles.topName}>{title}</Txt>
            <Txt variant="caption">{`${segment.stepIndex + 1} / ${stepCount}`}</Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={handleClosePress}
              hitSlop={12}
            >
              <Txt variant="sub" style={saving && styles.pauseDisabled}>닫기</Txt>
            </Pressable>
          </View>

          <PlateView view={content.plateFor(segment.acupointId)} side={segment.side} size={plateSize} />

          <View style={styles.nameRow}>
            <Txt variant="point">{acupoint.name.ko}</Txt>
            {SIDE_LABEL[segment.side] !== '' && <Txt style={styles.side}>{SIDE_LABEL[segment.side]}</Txt>}
          </View>
          <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>
          <Txt variant="sub">{acupoint.technique}</Txt>
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
                  accessibilityState={{ disabled: saving }}
                  disabled={saving}
                  onPress={() => void saveSession(failedLog)}
                  style={[styles.pause, saving && styles.pauseDisabled]}
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
          ) : saving ? (
            <View style={styles.savingBox}>
              <Txt variant="body">기록하는 중…</Txt>
            </View>
          ) : (
            <>
              <View style={styles.timerRow}>
                <Txt variant="number" style={styles.number} accessibilityLiveRegion="polite">{String(rhythm.secondsLeftInPhase)}</Txt>
                <View style={styles.timerText}>
                  <Txt style={styles.action} accessibilityLiveRegion="polite">{rhythm.phase === 'press' ? '꾹 누르세요' : '잠시 떼세요'}</Txt>
                  <Txt variant="sub">{`${rhythm.pressNumber} / ${rhythm.pressCount}회`}</Txt>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={paused ? '계속' : '일시정지'}
                onPress={() => setPaused(!paused)}
                style={styles.bigButton}
              >
                <Txt style={styles.bigButtonLabel}>{paused ? '계속' : '일시정지'}</Txt>
              </Pressable>
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

      {confirmClose && (
        <View testID="confirm-overlay" style={styles.confirmOverlay} accessibilityViewIsModal>
          <View style={styles.confirmBox}>
            <Txt variant="body" style={styles.confirmText}>루틴을 그만할까요?</Txt>
            <View style={styles.confirmButtons}>
              <Pressable accessibilityRole="button" accessibilityLabel="그만하기" onPress={handleQuit} style={styles.confirmButton}>
                <Txt style={styles.confirmButtonLabel}>그만하기</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="계속하기"
                onPress={handleContinueRoutine}
                style={[styles.confirmButton, styles.confirmPrimary]}
              >
                <Txt style={[styles.confirmButtonLabel, styles.confirmPrimaryLabel]}>계속하기</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  number: { minWidth: space(10) },
  timerText: { flex: 1, gap: space(0.5) },
  action: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  bigButton: {
    minHeight: space(14),
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
  },
  bigButtonLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  pause: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 2,
    paddingHorizontal: space(3),
    minHeight: space(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  pauseDisabled: { opacity: 0.6 },
  track: { height: 2, backgroundColor: colors.rule },
  fill: { height: 2, backgroundColor: colors.accent },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  errorBox: { gap: space(3), paddingTop: space(2) },
  errorButtons: { flexDirection: 'row', gap: space(3) },
  savingBox: { paddingTop: space(2) },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(5),
    backgroundColor: colors.scrim,
  },
  confirmBox: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: 2,
    padding: space(5),
    gap: space(4),
  },
  confirmText: { textAlign: 'center' },
  confirmButtons: { gap: space(3) },
  confirmButton: {
    minHeight: space(13),
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  confirmPrimary: { backgroundColor: colors.ink },
  confirmPrimaryLabel: { color: colors.bg },
});
