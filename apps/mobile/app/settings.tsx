import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  DEFAULT_REMINDER_ROUTINE,
  PRESS_SECONDS_MAX,
  PRESS_SECONDS_MIN,
  REMINDER_MINUTE_STEP,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  type Reminder,
  type UserRoutine,
} from '@ggookggook/shared';
import { getUserRoutine, listUserRoutines, type SqlDatabase } from '@ggookggook/store';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { DISCLAIMER_NOTICES } from '@/disclaimers';
import { cancelReminder, ensurePermission, isReminderSupported, scheduleDailyReminder } from '@/notifications/reminder';
import { isUserRoutineUsable, type RoutineRef } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Rule } from '@/ui/Rule';
import { Toggle } from '@/ui/Toggle';
import { Txt } from '@/ui/Txt';

const DEFAULT_REMINDER: Reminder = {
  enabled: false,
  hour: DEFAULT_REMINDER_HOUR,
  minute: DEFAULT_REMINDER_MINUTE,
  routine: DEFAULT_REMINDER_ROUTINE,
};

function reminderHourLabel(hour: number): string {
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}시`;
}

function reminderMinuteLabel(minute: number): string {
  return `${String(minute).padStart(2, '0')}분`;
}

function reminderRoutineTitle(routine: RoutineRef, myRoutines: UserRoutine[]): string {
  if (routine.kind === 'symptom') {
    return content.symptom(routine.id)?.name ?? content.symptom(DEFAULT_REMINDER_ROUTINE.id)?.name ?? '';
  }
  // A deleted (or not-yet-loaded) user routine falls back to the default symptom's name,
  // both for display here and for whatever gets scheduled next: never a broken/empty body.
  const found = myRoutines.find((routineCandidate) => routineCandidate.id === routine.id);
  return found?.name ?? content.symptom(DEFAULT_REMINDER_ROUTINE.id)?.name ?? '';
}

// Used right before scheduling (never for the on-screen label, which `reminderRoutineTitle`
// still covers): a user-routine reminder always loads its own routine directly instead of
// trusting the picker's `myRoutines` list, which loads on focus and can still be empty (or
// stale) the moment the toggle is flipped or the hour/minute is stepped, right after the
// screen mounts. That race would otherwise schedule the OS notification with the wrong body.
async function resolveScheduledReminderTitle(db: SqlDatabase, routine: RoutineRef): Promise<string> {
  if (routine.kind === 'symptom') {
    return content.symptom(routine.id)?.name ?? content.symptom(DEFAULT_REMINDER_ROUTINE.id)?.name ?? '';
  }
  const found = await getUserRoutine(db, routine.id).catch((error: unknown) => {
    console.error('Failed to load the reminder routine before scheduling', error);
    return null;
  });
  return isUserRoutineUsable(found) ? found.name : content.symptom(DEFAULT_REMINDER_ROUTINE.id)?.name ?? '';
}

export default function SettingsScreen() {
  const db = useDb();
  const { settings, update } = useSettings();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [myRoutines, setMyRoutines] = useState<UserRoutine[]>([]);

  // Reloaded on every focus: a routine renamed or deleted on another screen (편집, 지우기)
  // must show up here the next time the reminder's routine picker or label is shown.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listUserRoutines(db)
        .then((routines) => {
          if (active) setMyRoutines(routines);
        })
        .catch((error: unknown) => {
          console.error('Failed to load my routines for the reminder picker', error);
          if (active) setMyRoutines([]);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const apply = useCallback(
    (patch: Partial<typeof settings>) => {
      setSaveError(false);
      update(db, patch).catch((error: unknown) => {
        console.error('Failed to save a setting', error);
        setSaveError(true);
      });
    },
    [db, update],
  );

  // Reads the live store instead of the render-time `settings` prop: two taps fired before a
  // re-render lands must each build on the other's result, not both on the same stale value.
  const stepPressSeconds = useCallback(
    (direction: 1 | -1) => {
      const current = useSettings.getState().settings.pressSeconds;
      const next = Math.min(PRESS_SECONDS_MAX, Math.max(PRESS_SECONDS_MIN, current + direction));
      apply({ pressSeconds: next });
    },
    [apply],
  );

  const stepRestSeconds = useCallback(
    (direction: 1 | -1) => {
      const current = useSettings.getState().settings.restSeconds;
      const next = Math.min(REST_SECONDS_MAX, Math.max(REST_SECONDS_MIN, current + direction));
      apply({ restSeconds: next });
    },
    [apply],
  );

  // The single place that both persists a reminder change and keeps the OS-level schedule in
  // sync with it (cancel and reschedule on any change), so every caller below just describes
  // what changed instead of repeating the schedule/cancel dance. If the OS-level part fails
  // after the settings write already landed, the write is rolled back to `previous` (through
  // the same `update`) and the standard save-error line is shown: storage must never end up
  // claiming a schedule that was never actually set.
  const commitReminder = useCallback(
    (patch: Partial<Reminder>) => {
      const previous = useSettings.getState().settings.reminder;
      const next: Reminder = { ...(previous ?? DEFAULT_REMINDER), ...patch };
      setSaveError(false);
      update(db, { reminder: next })
        .then(() => {
          const synced = next.enabled
            ? resolveScheduledReminderTitle(db, next.routine).then((title) => scheduleDailyReminder(next, title))
            : cancelReminder();
          return synced.catch((error: unknown) => {
            console.error('Failed to sync the daily reminder with the OS', error);
            return update(db, { reminder: previous }).then(
              () => setSaveError(true),
              (rollbackError: unknown) => {
                console.error('Failed to roll back the reminder after a failed schedule', rollbackError);
                setSaveError(true);
              },
            );
          });
        })
        .catch((error: unknown) => {
          console.error('Failed to save the reminder', error);
          setSaveError(true);
        });
    },
    [db, update],
  );

  const handleReminderToggle = useCallback(
    (value: boolean) => {
      setPermissionDenied(false);
      if (!value) {
        setRoutinePickerOpen(false);
        commitReminder({ enabled: false });
        return;
      }
      ensurePermission()
        .then((granted) => {
          if (granted) commitReminder({ enabled: true });
          else setPermissionDenied(true);
        })
        .catch((error: unknown) => {
          console.error('Failed to request notification permission', error);
          setPermissionDenied(true);
        });
    },
    [commitReminder],
  );

  // Hour and minute cover the whole clock (0-23, 0-50 in 10-minute steps), so stepping wraps
  // around at either end instead of disabling like the bounded press/rest-second steppers.
  const stepReminderHour = useCallback(
    (direction: 1 | -1) => {
      const current = (useSettings.getState().settings.reminder ?? DEFAULT_REMINDER).hour;
      commitReminder({ hour: (current + direction + 24) % 24 });
    },
    [commitReminder],
  );

  const stepReminderMinute = useCallback(
    (direction: 1 | -1) => {
      const current = (useSettings.getState().settings.reminder ?? DEFAULT_REMINDER).minute;
      commitReminder({ minute: (current + direction * REMINDER_MINUTE_STEP + 60) % 60 });
    },
    [commitReminder],
  );

  const pickReminderRoutine = useCallback(
    (routine: RoutineRef) => {
      commitReminder({ routine });
      setRoutinePickerOpen(false);
    },
    [commitReminder],
  );

  const reminder = settings.reminder ?? DEFAULT_REMINDER;
  const reminderRoutineName = reminderRoutineTitle(reminder.routine, myRoutines);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink onPress={() => router.back()} />
        <Txt variant="title">설정</Txt>
        {saveError && (
          <Txt variant="sub" style={styles.error}>
            저장하지 못했어요. 다시 눌러 주세요.
          </Txt>
        )}

        <View>
          <Rule />
          <Toggle
            label="리듬 진동"
            value={settings.rhythmHaptics}
            onValueChange={(value) => apply({ rhythmHaptics: value })}
            style={styles.row}
          />
          <Rule />
          <StepperRow
            label="누르는 시간"
            value={settings.pressSeconds}
            min={PRESS_SECONDS_MIN}
            max={PRESS_SECONDS_MAX}
            onDecrement={() => stepPressSeconds(-1)}
            onIncrement={() => stepPressSeconds(1)}
          />
          <Rule />
          <StepperRow
            label="쉬는 시간"
            value={settings.restSeconds}
            min={REST_SECONDS_MIN}
            max={REST_SECONDS_MAX}
            onDecrement={() => stepRestSeconds(-1)}
            onIncrement={() => stepRestSeconds(1)}
          />
          <Rule />
          <Toggle
            label="임신 중이에요"
            sub="켜면 임신 중 피해야 할 혈자리를 빼고 안내해요."
            value={settings.pregnancyMode}
            onValueChange={(value) => apply({ pregnancyMode: value })}
            style={styles.row}
          />
          <Rule />
          <Txt variant="sub" style={styles.sectionLabel}>알림</Txt>
          <Toggle
            label="매일 알려 주기"
            sub={isReminderSupported() ? undefined : '이 기기에서는 알림을 쓸 수 없어요.'}
            value={reminder.enabled}
            disabled={!isReminderSupported()}
            onValueChange={handleReminderToggle}
            style={styles.row}
          />
          {permissionDenied && (
            <Txt variant="sub" style={styles.error}>
              알림 권한이 꺼져 있어요. 기기 설정에서 켜 주세요.
            </Txt>
          )}
          {reminder.enabled && (
            <>
              <WrapStepperRow
                label="시"
                valueLabel={reminderHourLabel(reminder.hour)}
                decrementLabel="알림 시각 줄이기"
                incrementLabel="알림 시각 늘리기"
                onDecrement={() => stepReminderHour(-1)}
                onIncrement={() => stepReminderHour(1)}
              />
              <WrapStepperRow
                label="분"
                valueLabel={reminderMinuteLabel(reminder.minute)}
                decrementLabel="알림 분 줄이기"
                incrementLabel="알림 분 늘리기"
                onDecrement={() => stepReminderMinute(-1)}
                onIncrement={() => stepReminderMinute(1)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="루틴 선택"
                accessibilityState={{ expanded: routinePickerOpen }}
                onPress={() => setRoutinePickerOpen((open) => !open)}
                style={styles.row}
              >
                <Txt variant="body">루틴</Txt>
                <Txt variant="sub">{reminderRoutineName}</Txt>
              </Pressable>
              {routinePickerOpen && (
                <View>
                  {content.symptoms.map((symptom) => (
                    <View key={`symptom-${symptom.id}`}>
                      <Rule />
                      <ReminderRoutineOption
                        label={symptom.name}
                        selected={reminder.routine.kind === 'symptom' && reminder.routine.id === symptom.id}
                        onPress={() => pickReminderRoutine({ kind: 'symptom', id: symptom.id })}
                      />
                    </View>
                  ))}
                  {myRoutines.map((routine) => (
                    <View key={`user-${routine.id}`}>
                      <Rule />
                      <ReminderRoutineOption
                        label={routine.name}
                        selected={reminder.routine.kind === 'user' && reminder.routine.id === routine.id}
                        onPress={() => pickReminderRoutine({ kind: 'user', id: routine.id })}
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <Rule />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: noticesOpen }}
            onPress={() => setNoticesOpen((open) => !open)}
            style={styles.row}
          >
            <Txt variant="body">안내 다시 보기</Txt>
          </Pressable>
          {noticesOpen && (
            <View style={styles.notices}>
              {DISCLAIMER_NOTICES.map((notice) => (
                <Txt key={notice} variant="sub" style={styles.notice}>
                  {notice}
                </Txt>
              ))}
            </View>
          )}
          <Rule />
          <View style={styles.row}>
            <Txt variant="body">앱 정보</Txt>
            <Txt variant="sub">{`버전 ${Constants.expoConfig?.version ?? '-'} · 콘텐츠 v${content.version}`}</Txt>
          </View>
          <Rule />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StepperRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

function StepperRow({ label, value, min, max, onDecrement, onIncrement }: StepperRowProps) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <View style={styles.row}>
      <Txt variant="body">{label}</Txt>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          hitSlop={8}
          onPress={onDecrement}
          style={({ pressed }) => [styles.stepButton, (pressed || atMin) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>−</Txt>
        </Pressable>
        <Txt variant="body" style={styles.stepValue}>{`${value}초`}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          hitSlop={8}
          onPress={onIncrement}
          style={({ pressed }) => [styles.stepButton, (pressed || atMax) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>+</Txt>
        </Pressable>
      </View>
    </View>
  );
}

interface WrapStepperRowProps {
  label: string;
  valueLabel: string;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

// Like StepperRow, but for a value that wraps around a full cycle (a clock's hour or minute)
// instead of clamping at a min/max, so neither button is ever disabled.
function WrapStepperRow({ label, valueLabel, decrementLabel, incrementLabel, onDecrement, onIncrement }: WrapStepperRowProps) {
  return (
    <View style={styles.row}>
      <Txt variant="body">{label}</Txt>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decrementLabel}
          hitSlop={8}
          onPress={onDecrement}
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>−</Txt>
        </Pressable>
        <Txt variant="body" style={styles.timeValue}>{valueLabel}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={incrementLabel}
          hitSlop={8}
          onPress={onIncrement}
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>+</Txt>
        </Pressable>
      </View>
    </View>
  );
}

function ReminderRoutineOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.routineOption}
    >
      <Txt variant="body" style={selected ? styles.routineOptionSelected : undefined}>
        {selected ? `✓ ${label}` : label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(4), paddingBottom: space(10) },
  error: { color: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(4), gap: space(3) },
  sectionLabel: { paddingTop: space(3) },
  notices: { gap: space(3), paddingBottom: space(3) },
  notice: { paddingLeft: space(1) },
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
  stepValue: { minWidth: 34, textAlign: 'center' },
  timeValue: { minWidth: 64, textAlign: 'center' },
  routineOption: { paddingVertical: space(3) },
  routineOptionSelected: { fontFamily: fonts.semibold, color: colors.accent },
});
