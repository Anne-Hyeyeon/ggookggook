import { DEFAULT_REMINDER_ROUTINE, type Reminder } from '@ggookggook/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// A stable identifier so scheduling again (a changed hour, minute, or routine) replaces the
// one existing daily reminder instead of piling up duplicates.
export const DAILY_REMINDER_ID = 'daily-reminder';

export type ReminderRoute = `/symptom/${string}` | `/routine/${string}`;

// Local notifications are unsupported on web (the screenshot harness's target): every export
// here is a no-op there instead of throwing, so callers don't need their own Platform checks.
export function isReminderSupported(): boolean {
  return Platform.OS !== 'web';
}

// Without this, a reminder that fires while the app is already open is silently dropped
// instead of shown: the default handler (unset) suppresses foreground notifications.
export function registerNotificationHandler(): void {
  if (!isReminderSupported()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!isReminderSupported()) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyReminder(reminder: Pick<Reminder, 'hour' | 'minute' | 'routine'>, title: string): Promise<void> {
  if (!isReminderSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '꾹꾹',
      body: `잠깐 ${title} 루틴을 해 볼까요?`,
      data: { routine: reminder.routine },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
    },
  });
}

export async function cancelReminder(): Promise<void> {
  if (!isReminderSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

// Pure: a deleted user routine that an enabled reminder points at falls back to the default
// symptom, so a later reschedule never targets a routine that no longer exists. Returns the
// exact same reference when nothing needs to change, so a caller can cheaply tell via `!==`
// whether it needs to persist and reschedule.
export function reminderRoutineFallback(reminder: Reminder | null, deletedRoutineId: string): Reminder | null {
  if (!reminder?.enabled) return reminder;
  if (reminder.routine.kind !== 'user' || reminder.routine.id !== deletedRoutineId) return reminder;
  return { ...reminder, routine: DEFAULT_REMINDER_ROUTINE };
}

// Malformed or unrecognized notification data (a stale shape from a previous app version, a
// tampered payload) is ignored rather than navigated to, so a bad tap never crashes or routes
// somewhere nonsensical.
export function reminderRouteFromResponse(response: Notifications.NotificationResponse | null | undefined): ReminderRoute | null {
  const data = response?.notification.request.content.data;
  if (typeof data !== 'object' || data === null) return null;
  const routine = (data as Record<string, unknown>).routine;
  if (typeof routine !== 'object' || routine === null) return null;
  const { kind, id } = routine as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (kind === 'symptom') return `/symptom/${id}`;
  if (kind === 'user') return `/routine/${id}`;
  return null;
}

// For a cold start: the app was launched by tapping the notification, so there's no listener
// event to catch it, only this last-response snapshot.
export function getLastNotificationRoute(): ReminderRoute | null {
  if (!isReminderSupported()) return null;
  return reminderRouteFromResponse(Notifications.getLastNotificationResponse());
}

export function addReminderResponseListener(onRoute: (route: ReminderRoute) => void): { remove: () => void } {
  if (!isReminderSupported()) return { remove: () => {} };
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = reminderRouteFromResponse(response);
    if (route) onRoute(route);
  });
  return subscription;
}
