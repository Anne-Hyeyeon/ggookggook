import { countSessionsBySymptom, getUserRoutine, latestCompletedSession, setValue, type SqlDatabase } from '@ggookggook/store';
import { content } from '@/content';
import { loadWidgetUpdater } from '@/widget/native';
import { buildWidgetSnapshot, type WidgetSnapshot } from '@/widget/snapshot';
import { WIDGET_SNAPSHOT_KEY } from '@/widget/storage';

async function loadWidgetSnapshot(db: SqlDatabase, now: Date): Promise<WidgetSnapshot> {
  const [recentSession, usage] = await Promise.all([latestCompletedSession(db), countSessionsBySymptom(db)]);
  const recentUserRoutine = recentSession?.routine.kind === 'user' ? await getUserRoutine(db, recentSession.routine.routineId) : null;
  return buildWidgetSnapshot({ now, symptoms: content.symptoms, usage, recentSession, recentUserRoutine });
}

// Never throws, so callers can fire and forget: a stale widget must not surface as an app error.
export async function syncWidgets(db: SqlDatabase, now: Date = new Date()): Promise<void> {
  const updateWidget = loadWidgetUpdater();
  if (!updateWidget) return;
  try {
    const snapshot = await loadWidgetSnapshot(db, now);
    await setValue(db, WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot), now);
    await updateWidget(snapshot, now);
  } catch (error) {
    console.error('Failed to update the home-screen widget', error);
  }
}
