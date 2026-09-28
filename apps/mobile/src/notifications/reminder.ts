import { DEFAULT_REMINDER_ROUTINE, type Reminder } from '@ggookggook/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isRecord } from '@/isRecord';

// A stable identifier so scheduling again (a changed hour, minute, or routine) replaces the
// one existing daily reminder instead of piling up duplicates.
export const DAILY_REMINDER_ID = 'daily-reminder';

// Android groups notifications by channel; without one, a scheduled notification falls back
// to a default channel with no user-facing name.
export const REMINDER_CHANNEL_ID = 'reminders';

export type ReminderRoute = `/symptom/${string}` | `/routine/${string}`;

// Module state, not a ref: it must survive a RootLayout remount (a fast refresh, or the
// component tree unmounting and remounting), so a stale cold-start snapshot or a redelivered
// live event is never routed to a second time. `undefined` never counts as a repeat, so a
// response missing an identifier is always treated as new.
let handledRequestId: string | undefined;

function isNewRequest(requestId: string | undefined): boolean {
  return requestId === undefined || requestId !== handledRequestId;
}

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

// "루틴" already reads as a routine name on its own ("아침 루틴"), so appending it a second
// time ("아침 루틴 루틴을 해 볼까요?") would repeat the word; a name that doesn't end with it
// still needs it spelled out ("눈이 뻑뻑할 때 루틴을 해 볼까요?").
export function reminderBody(title: string): string {
  return title.endsWith('루틴') ? `잠깐 ${title} 해 볼까요?` : `잠깐 ${title} 루틴을 해 볼까요?`;
}

// Android only; a no-op elsewhere (setNotificationChannelAsync itself is Android-specific).
// Idempotent, so calling it before every schedule is cheap and keeps the channel from ever
// going missing after an app data clear.
async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: '리마인더',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function scheduleDailyReminder(reminder: Pick<Reminder, 'hour' | 'minute' | 'routine'>, title: string): Promise<void> {
  if (!isReminderSupported()) return;
  await ensureReminderChannel();
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '꾹꾹',
      body: reminderBody(title),
      data: { routine: reminder.routine },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export async function cancelReminder(): Promise<void> {
  if (!isReminderSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

// Pure: a deleted user routine that a reminder points at falls back to the default symptom,
// so a later reschedule never targets a routine that no longer exists. Applied whether or
// not the reminder is currently enabled, so a disabled reminder never comes back to life
// pointed at a routine that's gone; only the reschedule itself (an OS-level call) is left to
// the caller to gate on `enabled`. Returns the exact same reference when nothing needs to
// change, so a caller can cheaply tell via `!==` whether it needs to persist.
export function reminderRoutineFallback(reminder: Reminder | null, deletedRoutineId: string): Reminder | null {
  if (!reminder) return reminder;
  if (reminder.routine.kind !== 'user' || reminder.routine.id !== deletedRoutineId) return reminder;
  return { ...reminder, routine: DEFAULT_REMINDER_ROUTINE };
}

// Malformed or unrecognized notification data (a stale shape from a previous app version, a
// tampered payload) is ignored rather than navigated to, so a bad tap never crashes or routes
// somewhere nonsensical.
export function reminderRouteFromResponse(response: Notifications.NotificationResponse | null | undefined): ReminderRoute | null {
  const data = response?.notification.request.content.data;
  if (!isRecord(data)) return null;
  const routine = data.routine;
  if (!isRecord(routine)) return null;
  const { kind, id } = routine;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (kind === 'symptom') return `/symptom/${id}`;
  if (kind === 'user') return `/routine/${id}`;
  return null;
}

// For a cold start: the app was launched by tapping the notification, so there's no listener
// event to catch it, only this last-response snapshot. Clears it and remembers its request id
// once handled, so a RootLayout remount (a fast refresh, or the effect re-running) never
// routes to the same tap twice, even before the clear's effect has round-tripped.
export function getLastNotificationRoute(): ReminderRoute | null {
  if (!isReminderSupported()) return null;
  const response = Notifications.getLastNotificationResponse();
  const requestId = response?.notification.request.identifier;
  if (!isNewRequest(requestId)) return null;
  const route = reminderRouteFromResponse(response);
  if (!route) return null;
  handledRequestId = requestId;
  Notifications.clearLastNotificationResponse();
  return route;
}

export function addReminderResponseListener(onRoute: (route: ReminderRoute) => void): { remove: () => void } {
  if (!isReminderSupported()) return { remove: () => {} };
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const requestId = response.notification.request.identifier;
    if (!isNewRequest(requestId)) return;
    const route = reminderRouteFromResponse(response);
    if (!route) return;
    handledRequestId = requestId;
    Notifications.clearLastNotificationResponse();
    onRoute(route);
  });
  return subscription;
}
