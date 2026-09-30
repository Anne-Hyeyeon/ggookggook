import { countSessionsBySymptom, getUserRoutine, latestCompletedSession, setValue, type SqlDatabase } from '@ggookggook/store';
import { Platform } from 'react-native';
import { content } from '@/content';
import { updateAndroidWidget } from './androidWidget';
import { updateIosWidget } from './iosWidget';
import { buildWidgetSnapshot, type WidgetSnapshot } from './snapshot';
import { WIDGET_SNAPSHOT_KEY } from './storage';

async function loadWidgetSnapshot(db: SqlDatabase, now: Date): Promise<WidgetSnapshot> {
  const [recentSession, usage] = await Promise.all([latestCompletedSession(db), countSessionsBySymptom(db)]);
  const recentUserRoutine = recentSession?.routine.kind === 'user' ? await getUserRoutine(db, recentSession.routine.routineId) : null;
  return buildWidgetSnapshot({ now, symptoms: content.symptoms, usage, recentSession, recentUserRoutine });
}

// Never throws: a widget that fails to refresh must not surface as an app error, so callers
// can fire and forget (`void syncWidgets(db)`).
export async function syncWidgets(db: SqlDatabase, now: Date = new Date()): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const snapshot = await loadWidgetSnapshot(db, now);
    await setValue(db, WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot), now);
    if (Platform.OS === 'ios') updateIosWidget(snapshot, now);
    if (Platform.OS === 'android') await updateAndroidWidget(snapshot, now);
  } catch (error) {
    console.error('Failed to update the home-screen widget', error);
  }
}
