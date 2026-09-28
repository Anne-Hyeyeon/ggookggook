import type { UserRoutine } from '@ggookggook/shared';
import { deleteUserRoutine, getUserRoutine } from '@ggookggook/store';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { ROUTINE_DISCLAIMER } from '@/disclaimers';
import { routineSummary, sideLabel, topic, visibleStepsFor } from '@/routine';
import { isUserRoutineUsable } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function RoutinePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [routine, setRoutine] = useState<UserRoutine | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRoutine(undefined);
    getUserRoutine(db, id)
      .then((loaded) => {
        if (!cancelled) setRoutine(loaded);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the routine', error);
        if (!cancelled) setRoutine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const handleDelete = useCallback(() => {
    setDeleteError(false);
    setDeleting(true);
    deleteUserRoutine(db, id, new Date())
      .then(() => {
        router.dismissTo('/mine');
      })
      .catch((error: unknown) => {
        console.error('Failed to delete the routine', error);
        // Close the confirm overlay so the error (and the still-there routine) are
        // visible again, instead of leaving it stuck open over hidden content.
        setConfirmDelete(false);
        setDeleteError(true);
        setDeleting(false);
      });
  }, [db, id]);

  if (routine === undefined) return null;

  if (!isUserRoutineUsable(routine)) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink onPress={() => router.back()} />
          <Txt variant="body">지운 루틴이에요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const steps = visibleStepsFor(routine.steps, settings);
  const { count, minutes } = routineSummary(steps);
  const contraindicated = routine.steps
    .filter((step) => content.acupoints.get(step.acupointId)?.cautions.includes('pregnancy'))
    .map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? step.acupointId);
  const cautionText =
    contraindicated.length === 0
      ? null
      : settings.pregnancyMode
        ? `임신 중이라 ${topic(contraindicated.join(', '))} 뺐어요.`
        : `임신 중이면 ${topic(contraindicated.join(', '))} 누르지 마세요.`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap} importantForAccessibility={confirmDelete ? 'no-hide-descendants' : 'auto'}>
        <ScrollView contentContainerStyle={styles.body}>
          <BackLink onPress={() => router.back()} />
          <View style={styles.head}>
            <Txt variant="title" numberOfLines={2}>{routine.name}</Txt>
            <Txt style={styles.summary}>{`${count}곳 · 약 ${minutes}분`}</Txt>
          </View>

          <View>
            {steps.map((step, index) => {
              const acupoint = content.requireAcupoint(step.acupointId);
              const sides = sideLabel(acupoint.sides);
              return (
                <View key={`${step.acupointId}-${index}`}>
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
          {deleteError && <Txt variant="sub" style={styles.error}>지우지 못했어요. 다시 눌러 주세요.</Txt>}

          <Txt variant="caption">{ROUTINE_DISCLAIMER}</Txt>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="시작" onPress={() => router.push(`/guide/routine/${routine.id}`)} disabled={steps.length === 0} />
          <View style={styles.footerLinks}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="편집"
              hitSlop={12}
              onPress={() => router.push(`/routine/${routine.id}/edit`)}
              style={styles.footerLink}
            >
              <Txt variant="sub">편집</Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지우기"
              hitSlop={12}
              onPress={() => setConfirmDelete(true)}
              style={styles.footerLink}
            >
              <Txt variant="sub" style={styles.deleteLabel}>지우기</Txt>
            </Pressable>
          </View>
        </View>
      </View>

      {confirmDelete && (
        <View testID="confirm-overlay" style={styles.confirmOverlay} accessibilityViewIsModal>
          <View style={styles.confirmBox}>
            <Txt variant="body" style={styles.confirmText}>이 루틴을 지울까요?</Txt>
            <View style={styles.confirmButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="삭제"
                accessibilityState={{ disabled: deleting }}
                disabled={deleting}
                onPress={handleDelete}
                style={styles.confirmButton}
              >
                <Txt style={[styles.confirmButtonLabel, styles.deleteLabel]}>삭제</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="취소"
                accessibilityState={{ disabled: deleting }}
                disabled={deleting}
                onPress={() => setConfirmDelete(false)}
                style={[styles.confirmButton, styles.confirmPrimary]}
              >
                <Txt style={[styles.confirmButtonLabel, styles.confirmPrimaryLabel]}>취소</Txt>
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
  wrap: { flex: 1 },
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
  error: { color: colors.accent },
  footer: { padding: space(5), paddingTop: space(2), gap: space(3) },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: space(6) },
  footerLink: { minHeight: space(10), alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { color: colors.accent },
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
