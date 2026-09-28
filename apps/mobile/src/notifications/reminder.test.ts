import type { Reminder } from '@ggookggook/shared';
import { Platform } from 'react-native';
import {
  addReminderResponseListener,
  cancelReminder,
  DAILY_REMINDER_ID,
  ensurePermission,
  getLastNotificationRoute,
  registerNotificationHandler,
  reminderBody,
  reminderRouteFromResponse,
  reminderRoutineFallback,
  scheduleDailyReminder,
} from './reminder';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetLastNotificationResponse = jest.fn();
const mockClearLastNotificationResponse = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  AndroidImportance: { DEFAULT: 5 },
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancelScheduledNotificationAsync(...args),
  getLastNotificationResponse: (...args: unknown[]) => mockGetLastNotificationResponse(...args),
  clearLastNotificationResponse: (...args: unknown[]) => mockClearLastNotificationResponse(...args),
  addNotificationResponseReceivedListener: (...args: unknown[]) => mockAddNotificationResponseReceivedListener(...args),
  setNotificationHandler: (...args: unknown[]) => mockSetNotificationHandler(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
}));

// Each call gets its own default request id, so tests don't accidentally collide through the
// module-level "already handled" guard; a test exercising that guard passes the same id twice
// on purpose instead.
let responseSeq = 0;
function response(data: unknown, identifier?: string) {
  responseSeq += 1;
  return { notification: { request: { identifier: identifier ?? `req-${responseSeq}`, content: { data } } } } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
  mockScheduleNotificationAsync.mockResolvedValue(DAILY_REMINDER_ID);
  mockSetNotificationChannelAsync.mockResolvedValue(null);
});

describe('ensurePermission', () => {
  it('returns true without prompting when already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await ensurePermission()).toBe(true);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission and returns the result when not yet granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await ensurePermission()).toBe(true);

    mockRequestPermissionsAsync.mockResolvedValue({ granted: false });
    expect(await ensurePermission()).toBe(false);
  });

  it('returns false on web without touching the native module', async () => {
    Platform.OS = 'web';
    expect(await ensurePermission()).toBe(false);
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('scheduleDailyReminder', () => {
  it('cancels any existing schedule and schedules a new daily trigger under the stable id', async () => {
    await scheduleDailyReminder({ hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } }, '눈이 뻑뻑할 때');

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: '꾹꾹',
        body: '잠깐 눈이 뻑뻑할 때 루틴을 해 볼까요?',
        data: { routine: { kind: 'symptom', id: 'eye_fatigue' } },
      },
      trigger: { type: 'daily', hour: 15, minute: 0, channelId: 'reminders' },
    });
  });

  it('uses the routine name as-is when it already ends with 루틴, instead of doubling the word', async () => {
    await scheduleDailyReminder({ hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } }, '아침 루틴');

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.objectContaining({ body: '잠깐 아침 루틴 해 볼까요?' }) }),
    );
  });

  it('creates the reminders notification channel on Android before scheduling', async () => {
    Platform.OS = 'android';
    await scheduleDailyReminder({ hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } }, '눈이 뻑뻑할 때');

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('reminders', { name: '리마인더', importance: 5 });
  });

  it('does not touch the notification channel on iOS', async () => {
    await scheduleDailyReminder({ hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } }, '눈이 뻑뻑할 때');
    expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('does nothing on web', async () => {
    Platform.OS = 'web';
    await scheduleDailyReminder({ hour: 15, minute: 0, routine: { kind: 'symptom', id: 'eye_fatigue' } }, '눈이 뻑뻑할 때');
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('reminderBody', () => {
  it('says the routine name plainly when it already ends with 루틴', () => {
    expect(reminderBody('아침 루틴')).toBe('잠깐 아침 루틴 해 볼까요?');
  });

  it('spells out 루틴 when the name does not end with it', () => {
    expect(reminderBody('눈이 뻑뻑할 때')).toBe('잠깐 눈이 뻑뻑할 때 루틴을 해 볼까요?');
  });
});

describe('cancelReminder', () => {
  it('cancels the stable id', async () => {
    await cancelReminder();
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
  });

  it('does nothing on web', async () => {
    Platform.OS = 'web';
    await cancelReminder();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('reminderRouteFromResponse', () => {
  it('routes a symptom reminder to its symptom screen', () => {
    expect(reminderRouteFromResponse(response({ routine: { kind: 'symptom', id: 'eye_fatigue' } }))).toBe('/symptom/eye_fatigue');
  });

  it('routes a user routine reminder to its routine preview', () => {
    expect(reminderRouteFromResponse(response({ routine: { kind: 'user', id: 'r1' } }))).toBe('/routine/r1');
  });

  it.each([
    ['no response', undefined],
    ['no data', response(undefined)],
    ['a non-object data', response('nope')],
    ['a missing routine', response({})],
    ['a non-object routine', response({ routine: 'nope' })],
    ['an unknown kind', response({ routine: { kind: 'other', id: 'x' } })],
    ['a missing id', response({ routine: { kind: 'symptom' } })],
    ['an empty id', response({ routine: { kind: 'symptom', id: '' } })],
  ])('ignores %s', (_label, value) => {
    expect(reminderRouteFromResponse(value as never)).toBeNull();
  });
});

describe('getLastNotificationRoute', () => {
  it('resolves the route from the last notification response, then clears it', () => {
    mockGetLastNotificationResponse.mockReturnValue(response({ routine: { kind: 'symptom', id: 'eye_fatigue' } }));
    expect(getLastNotificationRoute()).toBe('/symptom/eye_fatigue');
    expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it('does not route to the same request id twice, simulating a remount before the clear lands', () => {
    mockGetLastNotificationResponse.mockReturnValue(response({ routine: { kind: 'symptom', id: 'eye_fatigue' } }, 'evt-1'));
    expect(getLastNotificationRoute()).toBe('/symptom/eye_fatigue');

    // The mocked native module doesn't actually forget the response just because
    // clearLastNotificationResponse() was called; the module-level guard has to.
    expect(getLastNotificationRoute()).toBeNull();
    expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it('returns null on web without touching the native module', () => {
    Platform.OS = 'web';
    expect(getLastNotificationRoute()).toBeNull();
    expect(mockGetLastNotificationResponse).not.toHaveBeenCalled();
  });
});

describe('addReminderResponseListener', () => {
  it('forwards a well-formed tap as a route and ignores a malformed one', () => {
    let handler: (response: unknown) => void = () => {};
    mockAddNotificationResponseReceivedListener.mockImplementation((callback: (response: unknown) => void) => {
      handler = callback;
      return { remove: jest.fn() };
    });

    const onRoute = jest.fn();
    addReminderResponseListener(onRoute);

    handler(response({ routine: { kind: 'user', id: 'r1' } }));
    expect(onRoute).toHaveBeenCalledWith('/routine/r1');
    expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(1);

    handler(response({ routine: { kind: 'nope', id: 'r1' } }));
    expect(onRoute).toHaveBeenCalledTimes(1);
  });

  it('does not forward the same live response twice', () => {
    let handler: (response: unknown) => void = () => {};
    mockAddNotificationResponseReceivedListener.mockImplementation((callback: (response: unknown) => void) => {
      handler = callback;
      return { remove: jest.fn() };
    });

    const onRoute = jest.fn();
    addReminderResponseListener(onRoute);
    const tap = response({ routine: { kind: 'user', id: 'r1' } }, 'evt-2');
    handler(tap);
    handler(tap);

    expect(onRoute).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op subscription on web', () => {
    Platform.OS = 'web';
    const subscription = addReminderResponseListener(jest.fn());
    expect(mockAddNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(() => subscription.remove()).not.toThrow();
  });
});

describe('registerNotificationHandler', () => {
  it('registers a handler that shows the notification without sound or a badge', async () => {
    registerNotificationHandler();

    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
    const handler = mockSetNotificationHandler.mock.calls[0][0];
    await expect(handler.handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });

  it('does nothing on web', () => {
    Platform.OS = 'web';
    registerNotificationHandler();
    expect(mockSetNotificationHandler).not.toHaveBeenCalled();
  });
});

describe('reminderRoutineFallback', () => {
  const reminder: Reminder = { enabled: true, hour: 15, minute: 0, routine: { kind: 'user', id: 'r1' } };

  it('returns the exact same reference when the reminder is null', () => {
    expect(reminderRoutineFallback(null, 'r1')).toBeNull();
  });

  it('falls back even while disabled, so a later re-enable never targets the deleted routine', () => {
    const disabled = { ...reminder, enabled: false };
    expect(reminderRoutineFallback(disabled, 'r1')).toEqual({
      ...disabled,
      routine: { kind: 'symptom', id: 'eye_fatigue' },
    });
  });

  it('returns the exact same reference when a disabled reminder points elsewhere', () => {
    const disabled = { ...reminder, enabled: false, routine: { kind: 'symptom' as const, id: 'eye_fatigue' } };
    expect(reminderRoutineFallback(disabled, 'r1')).toBe(disabled);
  });

  it('returns the exact same reference when the reminder points at a symptom', () => {
    const symptomReminder: Reminder = { ...reminder, routine: { kind: 'symptom', id: 'eye_fatigue' } };
    expect(reminderRoutineFallback(symptomReminder, 'r1')).toBe(symptomReminder);
  });

  it('returns the exact same reference when the reminder points at a different user routine', () => {
    expect(reminderRoutineFallback(reminder, 'other')).toBe(reminder);
  });

  it('falls back to the default symptom when the reminder points at the deleted routine', () => {
    expect(reminderRoutineFallback(reminder, 'r1')).toEqual({
      ...reminder,
      routine: { kind: 'symptom', id: 'eye_fatigue' },
    });
  });
});
