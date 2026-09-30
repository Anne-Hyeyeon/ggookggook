import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import appJson from '../../app.json';
import { content } from '@/content';
import {
  buildWidgetSnapshot,
  parseWidgetSnapshot,
  suggestionAt,
  WIDGET_SCHEME,
  widgetTimelineDates,
  widgetUrl,
  type WidgetSnapshot,
} from './snapshot';

const NOW = new Date(2026, 9, 1, 15, 30); // Thu 2026-10-01, 15:30 local

const session = (overrides: Partial<SessionLog> = {}): SessionLog => ({
  id: 's1',
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: '2026-10-01T05:00:00.000Z',
  completedAt: '2026-10-01T05:04:00.000Z',
  durationSeconds: 240,
  feedback: null,
  ...overrides,
});

const userRoutine = (overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id: 'r1',
  name: '아침 루틴',
  steps: [],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

const nameOf = (id: string) => content.symptom(id)?.name ?? '';

const build = (overrides: Partial<Parameters<typeof buildWidgetSnapshot>[0]> = {}) =>
  buildWidgetSnapshot({
    now: NOW,
    symptoms: content.symptoms,
    usage: {},
    recentSession: null,
    recentUserRoutine: null,
    ...overrides,
  });

describe('WIDGET_SCHEME', () => {
  it('matches the app config scheme, so widget links open this app', () => {
    expect(WIDGET_SCHEME).toBe(appJson.expo.scheme);
  });
});

describe('widgetUrl', () => {
  it('builds a symptom preview link', () => {
    expect(widgetUrl({ kind: 'symptom', id: 'headache' })).toBe('ggookggook://symptom/headache');
  });

  it('builds a user routine preview link', () => {
    expect(widgetUrl({ kind: 'user', id: 'r1' })).toBe('ggookggook://routine/r1');
  });

  it('encodes an id that is not URL-safe', () => {
    expect(widgetUrl({ kind: 'user', id: 'a b/c' })).toBe('ggookggook://routine/a%20b%2Fc');
  });
});

describe('buildWidgetSnapshot', () => {
  it('stamps generatedAt from now', () => {
    expect(build().generatedAt).toBe(NOW.toISOString());
  });

  it('has no recent entry when there is no completed session', () => {
    expect(build().recent).toBeNull();
  });

  it('resolves a recent symptom session to its name and link', () => {
    expect(build({ recentSession: session() }).recent).toEqual({
      ref: { kind: 'symptom', id: 'headache' },
      title: nameOf('headache'),
      url: 'ggookggook://symptom/headache',
    });
  });

  it('drops a recent symptom session whose symptom is no longer in content', () => {
    const recentSession = session({ routine: { kind: 'symptom', symptomId: 'gone' } });
    expect(build({ recentSession }).recent).toBeNull();
  });

  it('resolves a recent user routine session to the routine name and link', () => {
    const recentSession = session({ routine: { kind: 'user', routineId: 'r1' } });
    expect(build({ recentSession, recentUserRoutine: userRoutine() }).recent).toEqual({
      ref: { kind: 'user', id: 'r1' },
      title: '아침 루틴',
      url: 'ggookggook://routine/r1',
    });
  });

  it('drops a recent user routine that was deleted', () => {
    const recentSession = session({ routine: { kind: 'user', routineId: 'r1' } });
    const recentUserRoutine = userRoutine({ deletedAt: '2026-09-30T00:00:00.000Z' });
    expect(build({ recentSession, recentUserRoutine }).recent).toBeNull();
  });

  it('drops a recent user routine when the loaded routine is missing or a different one', () => {
    const recentSession = session({ routine: { kind: 'user', routineId: 'r1' } });
    expect(build({ recentSession }).recent).toBeNull();
    expect(build({ recentSession, recentUserRoutine: userRoutine({ id: 'r2' }) }).recent).toBeNull();
  });

  it('covers every hour of the day with one suggestion per time window, merging equal neighbours', () => {
    const hours = build().suggestions.map(({ fromHour, toHour, ref }) => [fromHour, toHour, ref.id]);
    expect(hours).toEqual([
      [0, 5, 'insomnia'],
      [5, 10, 'fatigue'],
      [10, 12, 'eye_fatigue'],
      [12, 14, 'indigestion'],
      [14, 18, 'eye_fatigue'],
      [18, 20, 'indigestion'],
      [20, 24, 'insomnia'],
    ]);
  });

  it('gives each suggestion its symptom name and preview link', () => {
    const first = build().suggestions[1];
    expect(first).toEqual({
      fromHour: 5,
      toHour: 10,
      ref: { kind: 'symptom', id: 'fatigue' },
      title: nameOf('fatigue'),
      url: 'ggookggook://symptom/fatigue',
    });
  });

  it("uses the app's own suggestion order, so heavy usage alone does not replace the time-of-day pick", () => {
    const hours = build({ usage: { headache: 9 } }).suggestions.map(({ ref }) => ref.id);
    expect(hours).toEqual(['insomnia', 'fatigue', 'eye_fatigue', 'indigestion', 'eye_fatigue', 'indigestion', 'insomnia']);
  });

  it('falls back to the most used symptom for an hour whose window symptoms are missing from content', () => {
    const symptoms = content.symptoms.filter((symptom) => symptom.id !== 'fatigue' && symptom.id !== 'neck_pain');
    const morning = build({ symptoms, usage: { headache: 3 } }).suggestions.find((s) => s.fromHour === 5);
    expect(morning?.ref.id).toBe('headache');
  });

  it('leaves an hour out entirely when nothing at all can be suggested for it', () => {
    const symptoms = content.symptoms.filter((symptom) => symptom.id !== 'fatigue' && symptom.id !== 'neck_pain');
    const ranges = build({ symptoms }).suggestions.map(({ fromHour, toHour }) => [fromHour, toHour]);
    expect(ranges).not.toContainEqual([5, 10]);
    expect(ranges[1]).toEqual([10, 12]);
  });
});

describe('suggestionAt', () => {
  const snapshot = build();

  it('picks the suggestion whose window contains the hour', () => {
    expect(suggestionAt(snapshot, 15)?.ref.id).toBe('eye_fatigue');
    expect(suggestionAt(snapshot, 5)?.ref.id).toBe('fatigue');
    expect(suggestionAt(snapshot, 23)?.ref.id).toBe('insomnia');
    expect(suggestionAt(snapshot, 0)?.ref.id).toBe('insomnia');
  });

  it('returns null for an hour with no suggestion', () => {
    expect(suggestionAt({ ...snapshot, suggestions: [] }, 9)).toBeNull();
  });
});

describe('widgetTimelineDates', () => {
  const snapshot = build();

  it('starts with now, then every upcoming window start, for the given number of days', () => {
    const dates = widgetTimelineDates(NOW, snapshot, 1);
    expect(dates).toEqual([
      NOW,
      new Date(2026, 9, 1, 18),
      new Date(2026, 9, 1, 20),
      new Date(2026, 9, 2, 0),
      new Date(2026, 9, 2, 5),
      new Date(2026, 9, 2, 10),
      new Date(2026, 9, 2, 12),
      new Date(2026, 9, 2, 14),
    ]);
  });

  it('skips a window start equal to now', () => {
    const atBoundary = new Date(2026, 9, 1, 18);
    expect(widgetTimelineDates(atBoundary, snapshot, 1).filter((date) => date.getTime() === atBoundary.getTime())).toHaveLength(1);
  });

  it('spans the requested number of days', () => {
    const dates = widgetTimelineDates(NOW, snapshot, 7);
    const last = dates[dates.length - 1];
    expect(last).toEqual(new Date(2026, 9, 8, 14));
    expect(dates).toHaveLength(1 + 7 * 7);
  });

  it('is just now when there are no suggestions to rotate through', () => {
    expect(widgetTimelineDates(NOW, { ...snapshot, suggestions: [] }, 7)).toEqual([NOW]);
  });
});

describe('parseWidgetSnapshot', () => {
  const snapshot: WidgetSnapshot = build({ recentSession: session() });

  it('round-trips a serialized snapshot', () => {
    expect(parseWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('returns null for missing or malformed data', () => {
    expect(parseWidgetSnapshot(null)).toBeNull();
    expect(parseWidgetSnapshot('not json')).toBeNull();
    expect(parseWidgetSnapshot('[]')).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snapshot, generatedAt: 3 }))).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snapshot, suggestions: 'x' }))).toBeNull();
  });

  it('drops individual malformed entries rather than the whole snapshot', () => {
    const raw = JSON.stringify({
      ...snapshot,
      recent: { ref: { kind: 'other', id: 'x' }, title: 't', url: 'u' },
      suggestions: [...snapshot.suggestions, { fromHour: 'a' }],
    });
    expect(parseWidgetSnapshot(raw)).toEqual({ ...snapshot, recent: null });
  });
});
