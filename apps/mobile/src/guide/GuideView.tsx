import {
  buildGuideSegments,
  GET_READY_SECONDS,
  nextSegmentIndex,
  previousSegmentIndex,
  rhythmAt,
  type GuideSegment,
  type RoutineStep,
  type SessionLog,
} from '@ggookggook/shared';
import { insertSession } from '@ggookggook/store';
import { AccessibilityInfo, AppState, BackHandler, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽 함께', center: '' } as const;

export interface GuideViewProps {
  routineRef: RoutineRef;
  title: string;
  steps: RoutineStep[];
  rounds?: number;
}

export function GuideView({ routineRef, title, steps, rounds = 1 }: GuideViewProps) {
  const styles = useThemedStyles(makeStyles);
  useKeepAwake();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const startedAt = useRef(new Date().toISOString());

  const segments = useMemo<GuideSegment[]>(() => buildGuideSegments(steps, content.acupoints, rounds), [steps, rounds]);
  const totalSeconds = useMemo(() => segments.reduce((sum, segment) => sum + segment.seconds, 0), [segments]);

  // The engine emits ['segment', 'press'] together on a segment change: the Success
  // notification below already marks the change, so the immediately following press
  // event skips its own Heavy impact instead of doubling up in the same tick.
  const skipNextPressHaptic = useRef(false);
  // Set right before a seek (이전/다음) that lands while the routine is genuinely paused
  // (not mid get-ready): the rhythm isn't actually running, so that landing announces the
  // point's name instead of "꾹 누르세요" and skips the haptic buzz entirely.
  const seekAnnounceRef = useRef<string | null>(null);

  const onEvent = useCallback(
    (event: 'press' | 'rest' | 'segment') => {
      if (event === 'press') {
        const silentPoint = seekAnnounceRef.current;
        seekAnnounceRef.current = null;
        if (silentPoint !== null) {
          AccessibilityInfo.announceForAccessibility(silentPoint);
          return;
        }
        AccessibilityInfo.announceForAccessibility('꾹 누르세요');
      } else if (event === 'rest') {
        AccessibilityInfo.announceForAccessibility('잠시 떼세요');
      }
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

  // Get-ready: a short "준비" countdown before the first press, skipped entirely when the
  // setting is off. It holds the guide paused (via `initialPaused`) until it ends or is
  // skipped, and never counts toward the recorded duration since useGuide hasn't started yet.
  const [readyLeft, setReadyLeft] = useState<number | null>(settings.getReadyEnabled ? GET_READY_SECONDS : null);
  // Set only by the AppState listener, and only when the guide (or the get-ready countdown)
  // was actually running at the time: distinguishes "paused because you left the app" from an
  // ordinary manual pause, so the timer row can show 잠시 멈췄어요 instead of the rhythm cue.
  const [autoPaused, setAutoPaused] = useState(false);

  // Announced once, when the countdown starts: the number itself has no live region (it would
  // otherwise be re-announced every second), so this is the only spoken cue that it's running.
  useEffect(() => {
    if (readyLeft !== null) AccessibilityInfo.announceForAccessibility('곧 시작해요');
    // Intentionally mount-only: readyLeft ticking down every second must not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { progress, paused, setPaused, seek, finishNow, elapsedTicksRef } = useGuide({
    segments,
    pressSeconds: settings.pressSeconds,
    restSeconds: settings.restSeconds,
    tickMs: 1000 / GUIDE_SPEED,
    initialPaused: readyLeft !== null,
    onEvent,
    onFinish,
  });

  // Read here (rather than only further down, past the empty-state early return) so the
  // round/caution announcements below can depend on it: every hook in this component must
  // run on every render, including the one where there's nothing to guide.
  const segment = segments[progress.index];

  // Spoken once per point landed on, not on every tick: keyed on the segment index rather
  // than the caution text itself, since two different cautioned points share the same text
  // and a dependency on that text alone would never re-fire between them.
  const cautionText =
    segment && !settings.pregnancyMode && content.requireAcupoint(segment.acupointId).cautions.includes('pregnancy')
      ? '임신 중이면 이 혈자리는 누르지 마세요.'
      : null;
  useEffect(() => {
    if (cautionText) AccessibilityInfo.announceForAccessibility(cautionText);
  }, [progress.index, cautionText]);

  // Spoken when the round actually changes, never on the first render (undefined guards that).
  const previousRoundRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (segment && previousRoundRef.current !== undefined && previousRoundRef.current !== segment.round) {
      AccessibilityInfo.announceForAccessibility(`${segment.round}회차`);
    }
    previousRoundRef.current = segment?.round;
  }, [segment]);

  // Whichever clock is currently relevant (the get-ready countdown, or the guide itself once
  // it's started): read by the AppState listener below to decide whether backgrounding is an
  // *auto* pause worth flagging, versus a no-op over a pause the user already chose.
  const runningRef = useRef(false);
  useEffect(() => {
    runningRef.current = readyLeft !== null ? !autoPaused : !paused;
  }, [readyLeft, autoPaused, paused]);

  // The countdown ticks on its own clock, independent of `paused` (which starts, and stays,
  // true for the whole get-ready phase so the guide underneath never ticks): only an auto pause
  // from the background listener below halts it. One persistent interval (a ref mirrors the
  // count, same shape as useGuide's own timer) rather than a new setTimeout scheduled through
  // an effect after every tick, so a single `jest.advanceTimersByTime` jump past several
  // seconds still runs every step instead of stalling after the first.
  const readyLeftRef = useRef(readyLeft);
  useEffect(() => {
    readyLeftRef.current = readyLeft;
  }, [readyLeft]);

  useEffect(() => {
    if (readyLeftRef.current === null || autoPaused) return;
    const timer = setInterval(() => {
      const current = readyLeftRef.current;
      // Cancelled from outside (스킵 or a control that exits the get-ready phase early):
      // stop ticking instead of running an idle interval until the screen unmounts.
      if (current === null) {
        clearInterval(timer);
        return;
      }
      if (current <= 0) return;
      const next = current - 1;
      if (next === 0) {
        clearInterval(timer);
        readyLeftRef.current = null;
        setReadyLeft(null);
        setPaused(false);
        seek(0);
        return;
      }
      readyLeftRef.current = next;
      setReadyLeft(next);
    }, 1000 / GUIDE_SPEED);
    return () => clearInterval(timer);
    // seek is a fresh function each render; including it would tear this interval down and
    // recreate it every render instead of only when the countdown starts or is auto-paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPaused, setPaused]);

  // Pausing on background/inactive keeps both the guide and the get-ready countdown from
  // ever counting while the app isn't visible. react-native-web's AppState is noisy around
  // focus changes (Playwright's screenshot harness would otherwise trip it constantly), so
  // this only runs on native.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      // Pauses on 'background' *and* 'inactive' (not just 'active' → anything-else): iOS
      // reports 'inactive' for the app switcher and Control Center too, and the routine
      // must not keep counting through those either.
      if (nextState === 'active') return;
      if (runningRef.current) setAutoPaused(true);
      setPaused(true);
    });
    return () => subscription.remove();
  }, [setPaused]);

  // Shared by every control that implies the user is taking over from the countdown
  // (재생/일시정지, 이전, 다음): leaves the get-ready phase without waiting it out. Also clears
  // an auto-pause flagged during the countdown itself, so returning from the background and
  // then taking over doesn't leave the routine stuck reporting 잠시 멈췄어요 after it's resumed.
  const exitReady = useCallback(() => {
    if (readyLeft === null) return;
    setReadyLeft(null);
    setPaused(false);
    setAutoPaused(false);
  }, [readyLeft, setPaused]);

  const handlePlayPress = useCallback(() => {
    if (autoPaused) {
      setAutoPaused(false);
      if (readyLeft === null) setPaused(false);
      return;
    }
    if (readyLeft !== null) {
      exitReady();
      seek(0);
      return;
    }
    setPaused(!paused);
  }, [autoPaused, readyLeft, paused, setPaused, seek, exitReady]);

  const [confirmClose, setConfirmClose] = useState(false);
  const pausedBeforeConfirm = useRef(false);

  const openConfirmClose = useCallback(() => {
    pausedBeforeConfirm.current = paused;
    setPaused(true);
    setConfirmClose(true);
  }, [paused, setPaused]);

  const previousIndex = previousSegmentIndex(progress, segments);
  const nextIndex = nextSegmentIndex(progress, segments);
  const isLastPoint = nextIndex === null;

  const handlePrevious = useCallback(() => {
    if (previousIndex === null) return;
    // Paused (not mid get-ready, which exitReady is about to end anyway): landing here won't
    // start ticking, so announce the point instead of the press cue and skip the haptic.
    const landing = segments[previousIndex];
    if (readyLeft === null && paused && landing) {
      seekAnnounceRef.current = content.requireAcupoint(landing.acupointId).name.ko;
    }
    exitReady();
    seek(previousIndex);
  }, [previousIndex, readyLeft, paused, segments, seek, exitReady]);

  const handleNext = useCallback(() => {
    const wasReady = readyLeft !== null;
    const silentSeek = !wasReady && paused;
    exitReady();
    if (wasReady) {
      // 다음 during the get-ready countdown only ends the countdown: it starts the current
      // point in place, it does not also skip ahead to the next one.
      seek(0);
      return;
    }
    if (nextIndex === null) {
      // A 마치기 tap that landed here with nothing actually ticked yet (a mistaken double
      // tap, or a routine reached via 다음 without waiting) must not save a 0-second session:
      // fall back to the same confirmation a deliberate 닫기 would show instead.
      if (elapsedTicksRef.current === 0) {
        openConfirmClose();
        return;
      }
      finishNow();
      return;
    }
    const landing = segments[nextIndex];
    if (silentSeek && landing) seekAnnounceRef.current = content.requireAcupoint(landing.acupointId).name.ko;
    seek(nextIndex);
  }, [readyLeft, paused, nextIndex, segments, seek, finishNow, exitReady, openConfirmClose, elapsedTicksRef]);

  const handleClosePress = useCallback(() => {
    // A session save in flight must not be abandoned mid-write: 닫기 (and hardware back,
    // which funnels through here too) does nothing until it settles.
    if (saving) return;
    const started = progress.index > 0 || progress.elapsed > 0;
    if (!started) {
      router.back();
      return;
    }
    openConfirmClose();
  }, [saving, progress.index, progress.elapsed, openConfirmClose]);

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

  // Auto vs. manual pause is no longer distinguished on the button itself (both read 계속,
  // since either way pressing it resumes): the timer row's status line below carries that
  // distinction instead.
  const playLabel = readyLeft !== null ? '바로 시작' : paused ? '계속' : '일시정지';
  // Never 마치기 during get-ready, even on a routine with a single point: the countdown
  // hasn't started the point yet, so 다음 here can only ever end the countdown, not finish.
  const nextButtonLabel = readyLeft !== null || !isLastPoint ? '다음' : '마치기';

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="guide-body" style={styles.body} importantForAccessibility={confirmClose ? 'no-hide-descendants' : 'auto'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.top}>
            <Txt style={styles.topName}>{title}</Txt>
            <Txt variant="caption">
              {rounds > 1
                ? `${segment.round}/${rounds}회차 · ${segment.stepIndex + 1} / ${stepCount}`
                : `${segment.stepIndex + 1} / ${stepCount}`}
            </Txt>
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
          {cautionText && <Txt variant="sub" style={styles.caution}>{cautionText}</Txt>}
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
                {readyLeft !== null ? (
                  <>
                    <Txt variant="number" style={styles.number}>{String(readyLeft)}</Txt>
                    <View style={styles.timerText}>
                      <Txt style={styles.action}>곧 시작해요</Txt>
                    </View>
                  </>
                ) : (
                  <>
                    <Txt variant="number" style={styles.number} accessibilityLiveRegion="polite">{String(rhythm.secondsLeftInPhase)}</Txt>
                    <View style={styles.timerText}>
                      <Txt style={styles.action} accessibilityLiveRegion="polite">
                        {autoPaused ? '잠시 멈췄어요' : rhythm.phase === 'press' ? '꾹 누르세요' : '잠시 떼세요'}
                      </Txt>
                      <Txt variant="sub">{`${rhythm.pressNumber} / ${rhythm.pressCount}회`}</Txt>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.controlsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이전"
                  accessibilityState={{ disabled: previousIndex === null }}
                  disabled={previousIndex === null}
                  onPress={handlePrevious}
                  style={[styles.sideButton, previousIndex === null && styles.pauseDisabled]}
                >
                  <Txt style={styles.pauseLabel}>이전</Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={playLabel} onPress={handlePlayPress} style={styles.bigButton}>
                  <Txt style={styles.bigButtonLabel}>{playLabel}</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={nextButtonLabel}
                  onPress={handleNext}
                  style={styles.sideButton}
                >
                  <Txt style={styles.pauseLabel}>{nextButtonLabel}</Txt>
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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1 },
    scrollContent: { padding: space(5), gap: space(3) },
    top: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
    topName: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space(2), marginTop: space(2) },
    side: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
    caution: { color: colors.accent },
    timer: { gap: space(3), paddingHorizontal: space(5), paddingBottom: space(5) },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(2) },
    number: { minWidth: space(10) },
    timerText: { flex: 1, gap: space(0.5) },
    action: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
    controlsRow: { flexDirection: 'row', gap: space(3) },
    bigButton: {
      flex: 2,
      minHeight: space(14),
      borderWidth: 1.5,
      borderColor: colors.ink,
      borderRadius: 2,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(3),
    },
    bigButtonLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.bg },
    sideButton: {
      flex: 1,
      minHeight: space(14),
      borderWidth: 1.5,
      borderColor: colors.ink,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(2),
    },
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
