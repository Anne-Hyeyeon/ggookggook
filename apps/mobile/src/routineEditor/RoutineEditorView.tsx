import { USER_ROUTINE_LIMITS, validateUserRoutine } from '@ggookggook/shared';
import { saveUserRoutine } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { newId } from '@/id';
import { scheduleDailyReminder } from '@/notifications/reminder';
import { isRoutineDraftDirty, toRoutineSteps, useRoutineDraft } from '@/state/routineDraft';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export function RoutineEditorView() {
  const db = useDb();
  const original = useRoutineDraft((state) => state.original);
  const draft = useRoutineDraft((state) => state.draft);
  const setName = useRoutineDraft((state) => state.setName);
  const removeStep = useRoutineDraft((state) => state.removeStep);
  const moveStep = useRoutineDraft((state) => state.moveStep);
  const setStepSeconds = useRoutineDraft((state) => state.setStepSeconds);
  const dirty = useRoutineDraft((state) => isRoutineDraftDirty(state.draft, state.baseline));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Guards against two synchronous 저장 presses (fired before the `saving` state's own
  // re-render lands, so the `disabled` prop hasn't taken effect yet): a plain state check
  // inside the handler would still read `false` for both.
  const savingRef = useRef(false);

  const validation = validateUserRoutine({ name: draft.name, steps: toRoutineSteps(draft.steps), sourceSymptomId: draft.sourceSymptomId });
  const showErrors = dirty && !validation.ok;
  const atStepsMax = draft.steps.length >= USER_ROUTINE_LIMITS.stepsMax;

  // Every step action below resolves a stable draft key to its live index at press time,
  // via useRoutineDraft.getState() rather than the index closed over by this row's render:
  // two taps fired before a re-render lands must each build on the other's result. A step
  // removed by the first tap is simply not found by the second (a no-op), and a step moved
  // by the first tap is found at its new position by the second, so both taps still land.
  const stepSeconds = useCallback(
    (key: string, direction: 1 | -1) => {
      const steps = useRoutineDraft.getState().draft.steps;
      const index = steps.findIndex((step) => step.key === key);
      const current = steps[index]?.seconds;
      if (index === -1 || current === undefined) return;
      setStepSeconds(index, current + direction * USER_ROUTINE_LIMITS.secondsStep);
    },
    [setStepSeconds],
  );

  const moveByKey = useCallback(
    (key: string, direction: -1 | 1) => {
      const index = useRoutineDraft.getState().draft.steps.findIndex((step) => step.key === key);
      if (index === -1) return;
      moveStep(index, index + direction);
    },
    [moveStep],
  );

  const removeByKey = useCallback(
    (key: string) => {
      const index = useRoutineDraft.getState().draft.steps.findIndex((step) => step.key === key);
      if (index === -1) return;
      removeStep(index);
    },
    [removeStep],
  );

  const handleBackPress = useCallback(() => {
    if (saving) return;
    if (!dirty) {
      router.back();
      return;
    }
    setConfirmLeave(true);
  }, [saving, dirty]);

  const handleContinueEditing = useCallback(() => setConfirmLeave(false), []);
  const handleDiscard = useCallback(() => {
    setConfirmLeave(false);
    router.back();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const onBackPress = () => {
        if (confirmLeave) {
          handleContinueEditing();
          return true;
        }
        handleBackPress();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [confirmLeave, handleBackPress, handleContinueEditing]),
  );

  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    const state = useRoutineDraft.getState();
    const steps = toRoutineSteps(state.draft.steps);
    const result = validateUserRoutine({ name: state.draft.name, steps, sourceSymptomId: state.draft.sourceSymptomId });
    if (!result.ok) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    const now = new Date();
    const isNew = state.original === null;
    const id = state.original?.id ?? newId();
    saveUserRoutine(
      db,
      {
        id,
        name: result.value.name,
        steps: result.value.steps,
        sourceSymptomId: result.value.sourceSymptomId,
        createdAt: state.original?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
      },
      now,
    )
      .then(() => {
        // If the reminder is enabled and points at this exact routine, its scheduled body
        // still names the pre-edit title until this reschedules it with the new one.
        const reminder = useSettings.getState().settings.reminder;
        if (reminder?.enabled && reminder.routine.kind === 'user' && reminder.routine.id === id) {
          scheduleDailyReminder(reminder, result.value.name).catch((error: unknown) => {
            console.error('Failed to reschedule the reminder after editing its routine', error);
          });
        }
        // A new routine has no preview to go back to yet, so it opens its own; editing
        // an existing one always started from that preview, so 뒤로 returns to it directly
        // instead of pushing a second copy onto the stack.
        if (isNew) router.replace(`/routine/${id}`);
        else router.back();
      })
      .catch((error: unknown) => {
        console.error('Failed to save the routine', error);
        setSaveError(true);
        setSaving(false);
        savingRef.current = false;
      });
  }, [db]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body} importantForAccessibility={confirmLeave ? 'no-hide-descendants' : 'auto'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <BackLink onPress={handleBackPress} />
          <Txt variant="title">{original ? '루틴 편집' : '새 루틴'}</Txt>

          {saveError && (
            <Txt variant="sub" style={styles.error}>
              저장하지 못했어요. 다시 눌러 주세요.
            </Txt>
          )}

          <TextInput
            value={draft.name}
            onChangeText={setName}
            placeholder="루틴 이름"
            placeholderTextColor={colors.faint}
            maxLength={USER_ROUTINE_LIMITS.nameMaxLength}
            accessibilityLabel="루틴 이름"
            style={styles.nameInput}
          />

          {showErrors && (
            <View style={styles.errors}>
              {validation.ok
                ? null
                : validation.errors.map((message) => (
                    <Txt key={message} variant="sub" style={styles.error}>
                      {message}
                    </Txt>
                  ))}
            </View>
          )}

          <Rule strong />

          <View>
            {draft.steps.map((step, index) => {
              const acupoint = content.acupoints.get(step.acupointId);
              const name = acupoint?.name.ko ?? step.acupointId;
              const atFirst = index === 0;
              const atLast = index === draft.steps.length - 1;
              const atSecondsMin = step.seconds <= USER_ROUTINE_LIMITS.secondsMin;
              const atSecondsMax = step.seconds >= USER_ROUTINE_LIMITS.secondsMax;
              return (
                <View key={step.key}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepHead}>
                      <Txt variant="pointSmall" style={styles.stepName}>{name}</Txt>
                      {acupoint && <Txt variant="caption">{acupoint.name.hanja}</Txt>}
                    </View>
                    <View style={styles.stepper}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${name} 시간 줄이기`}
                        accessibilityState={{ disabled: atSecondsMin }}
                        disabled={atSecondsMin}
                        hitSlop={8}
                        onPress={() => stepSeconds(step.key, -1)}
                        style={({ pressed }) => [styles.stepButton, (pressed || atSecondsMin) && styles.stepButtonDim]}
                      >
                        <Txt style={styles.stepSymbol}>−</Txt>
                      </Pressable>
                      <Txt variant="body" style={styles.stepValue}>{`${step.seconds}초`}</Txt>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${name} 시간 늘리기`}
                        accessibilityState={{ disabled: atSecondsMax }}
                        disabled={atSecondsMax}
                        hitSlop={8}
                        onPress={() => stepSeconds(step.key, 1)}
                        style={({ pressed }) => [styles.stepButton, (pressed || atSecondsMax) && styles.stepButtonDim]}
                      >
                        <Txt style={styles.stepSymbol}>+</Txt>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.stepActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${name} 위로`}
                      accessibilityState={{ disabled: atFirst }}
                      disabled={atFirst}
                      onPress={() => moveByKey(step.key, -1)}
                      style={({ pressed }) => [styles.actionButton, (pressed || atFirst) && styles.actionButtonDim]}
                    >
                      <Txt variant="sub">위로</Txt>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${name} 아래로`}
                      accessibilityState={{ disabled: atLast }}
                      disabled={atLast}
                      onPress={() => moveByKey(step.key, 1)}
                      style={({ pressed }) => [styles.actionButton, (pressed || atLast) && styles.actionButtonDim]}
                    >
                      <Txt variant="sub">아래로</Txt>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${name} 빼기`}
                      onPress={() => removeByKey(step.key)}
                      style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonDim]}
                    >
                      <Txt variant="sub" style={styles.removeLabel}>빼기</Txt>
                    </Pressable>
                  </View>
                  <Rule />
                </View>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="혈자리 추가"
            accessibilityState={{ disabled: atStepsMax }}
            disabled={atStepsMax}
            onPress={() => router.push('/routine/pick')}
            style={({ pressed }) => [styles.addRow, (pressed || atStepsMax) && styles.addRowDim]}
          >
            <Txt variant="body" style={styles.addLabel}>혈자리 추가</Txt>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Rule strong />
          <View style={styles.footerBody}>
            <Button
              label={saving ? '저장하는 중…' : '저장'}
              onPress={handleSave}
              disabled={!validation.ok || saving}
            />
          </View>
        </View>
      </View>

      {confirmLeave && (
        <View testID="confirm-overlay" style={styles.confirmOverlay} accessibilityViewIsModal>
          <View style={styles.confirmBox}>
            <Txt variant="body" style={styles.confirmText}>저장하지 않고 나갈까요?</Txt>
            <View style={styles.confirmButtons}>
              <Pressable accessibilityRole="button" accessibilityLabel="그만두기" onPress={handleDiscard} style={styles.confirmButton}>
                <Txt style={styles.confirmButtonLabel}>그만두기</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="계속 편집"
                onPress={handleContinueEditing}
                style={[styles.confirmButton, styles.confirmPrimary]}
              >
                <Txt style={[styles.confirmButtonLabel, styles.confirmPrimaryLabel]}>계속 편집</Txt>
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
  scrollContent: { padding: space(5), gap: space(3), paddingBottom: space(8) },
  error: { color: colors.accent },
  errors: { gap: space(1) },
  nameInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingVertical: space(2),
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3), paddingTop: space(3) },
  stepHead: { flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space(1.5) },
  stepName: { fontSize: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  stepButton: {
    width: space(8),
    height: space(8),
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDim: { opacity: 0.3 },
  stepSymbol: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  stepValue: { minWidth: 40, textAlign: 'center' },
  stepActions: { flexDirection: 'row', gap: space(2), paddingTop: space(2), paddingBottom: space(3) },
  actionButton: {
    minHeight: space(11),
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(2),
  },
  actionButtonDim: { opacity: 0.3 },
  removeLabel: { color: colors.accent },
  addRow: {
    minHeight: space(13),
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space(2),
  },
  addRowDim: { opacity: 0.3 },
  addLabel: { fontFamily: fonts.semibold },
  footer: { paddingHorizontal: space(5), paddingBottom: space(5) },
  footerBody: { paddingTop: space(3) },
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
